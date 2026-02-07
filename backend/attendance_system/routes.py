from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta, time
from typing import List, Optional
from database import get_db
import models as root_models
import schemas as root_schemas
from auth import get_current_user
from sqlalchemy import func
from pydantic import BaseModel
from attendance_system import models as attendance_models
from admin_system import models as admin_models
from ws_manager import manager

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

def get_user_ist(timezone="UTC+5:30"):
    """Returns current user time based on their timezone preference"""
    return root_models.get_user_time(timezone)

@router.post("/check-in")
async def check_in(db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    today = get_user_ist(current_user.timezone).date()
    existing = db.query(attendance_models.Attendance).filter(
        attendance_models.Attendance.user_id == current_user.id,
        func.date(attendance_models.Attendance.date) == today
    ).first()

    if existing and existing.check_in:
        raise HTTPException(status_code=400, detail="Already checked in today")
    
    now = get_user_ist(current_user.timezone)
    
    if not existing:
        attendance = attendance_models.Attendance(
            user_id=current_user.id,
            date=now,
            check_in=now,
            status="Present"
        )
        db.add(attendance)
    else:
        existing.check_in = now
        existing.status = "Present"
        
    db.commit()
    await manager.broadcast_all({"type": "dashboard_update", "source": "attendance"})
    return {"message": "Checked in successfully", "time": now}

@router.post("/check-out")
async def check_out(db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    today = get_user_ist(current_user.timezone).date()
    attendance = db.query(attendance_models.Attendance).filter(
        attendance_models.Attendance.user_id == current_user.id,
        func.date(attendance_models.Attendance.date) == today
    ).first()

    if not attendance or not attendance.check_in:
        raise HTTPException(status_code=400, detail="Must check in before checking out")
    
    if attendance.check_out:
        raise HTTPException(status_code=400, detail="Already checked out today")

    now = get_user_ist(current_user.timezone)
    attendance.check_out = now
    
    db.commit()
    await manager.broadcast_all({"type": "dashboard_update", "source": "attendance"})
    return {"message": "Checked out successfully", "time": now}

@router.get("/status")
def get_attendance_status(db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    try:
        now_ist = get_user_ist(current_user.timezone).replace(microsecond=0)
        today = now_ist.date()
        start_of_day = datetime.combine(today, time.min)
        end_of_day = datetime.combine(today, time.max)
        
        attendance = db.query(attendance_models.Attendance).filter(
            attendance_models.Attendance.user_id == current_user.id,
            attendance_models.Attendance.date >= start_of_day,
            attendance_models.Attendance.date <= end_of_day
        ).first()

        today_hours = 0
        if attendance and attendance.check_in:
            check_in = attendance.check_in
            end_time = attendance.check_out if attendance.check_out else now_ist
            
            duration = end_time - check_in
            seconds = duration.total_seconds()
            today_hours = round(seconds / 3600, 1)
            if 0 < seconds < 360: 
                today_hours = max(today_hours, 0.1)

        start_of_month = today.replace(day=1)
        month_start_dt = datetime.combine(start_of_month, time.min)
        
        present_days = db.query(attendance_models.Attendance).filter(
            attendance_models.Attendance.user_id == current_user.id,
            attendance_models.Attendance.date >= month_start_dt,
            attendance_models.Attendance.status.in_(['Present', 'Late', 'Half Day'])
        ).count()
        
        days_elapsed = today.day
        monthly_presence = round((present_days / days_elapsed) * 100) if days_elapsed > 0 else 0
        
        late_marks = db.query(attendance_models.Attendance).filter(
            attendance_models.Attendance.user_id == current_user.id,
            attendance_models.Attendance.date >= month_start_dt,
            attendance_models.Attendance.status == 'Late'
        ).count()
        
        leaves_count = db.query(attendance_models.LeaveRequest).filter(
            attendance_models.LeaveRequest.user_id == current_user.id,
            attendance_models.LeaveRequest.status == 'Approved',
            attendance_models.LeaveRequest.start_date >= month_start_dt
        ).count()

        return {
            "isCheckedIn": bool(attendance and attendance.check_in),
            "isCheckedOut": bool(attendance and attendance.check_out),
            "checkInTime": attendance.check_in if attendance else None,
            "checkOutTime": attendance.check_out if attendance else None,
            "status": attendance.status if attendance else "Not Checked In",
            "stats": {
                "todayHours": today_hours,
                "monthlyPresence": f"{monthly_presence}%",
                "lateMarks": f"{late_marks:02d}",
                "leavesTaken": f"{leaves_count:02d}"
            }
        }
    except Exception as e:
        import traceback
        error_detail = f"Attendance Status Error: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)
        raise HTTPException(status_code=500, detail=error_detail)

@router.get("/history")
def get_attendance_history(db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    return db.query(attendance_models.Attendance).filter(
        attendance_models.Attendance.user_id == current_user.id
    ).order_by(attendance_models.Attendance.date.desc()).limit(30).all()

@router.get("/calendar-data")
def get_calendar_data(month: int, year: int, db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
    
    attendance = db.query(attendance_models.Attendance).filter(
        attendance_models.Attendance.user_id == current_user.id,
        attendance_models.Attendance.date >= start_date,
        attendance_models.Attendance.date < end_date
    ).all()
    
    leaves = db.query(attendance_models.LeaveRequest).filter(
        attendance_models.LeaveRequest.user_id == current_user.id,
        attendance_models.LeaveRequest.status == 'Approved',
        attendance_models.LeaveRequest.start_date < end_date,
        attendance_models.LeaveRequest.end_date >= start_date
    ).all()
    
    # Format for frontend
    data = {}
    for a in attendance:
        d_str = a.date.strftime("%Y-%m-%d")
        hours = 0
        if a.check_in and a.check_out:
            hours = round((a.check_out - a.check_in).total_seconds() / 3600, 1)
        
        data[d_str] = {
            "status": a.status, 
            "type": "attendance",
            "check_in": a.check_in.strftime("%H:%M") if a.check_in else None,
            "check_out": a.check_out.strftime("%H:%M") if a.check_out else None,
            "hours": hours
        }
        
    for l in leaves:
        curr = max(l.start_date.date(), start_date)
        last = min(l.end_date.date(), end_date - timedelta(days=1))
        while curr <= last:
            d_str = curr.strftime("%Y-%m-%d")
            data[d_str] = {"status": "Leave", "type": "leave", "leave_type": l.leave_type}
            curr += timedelta(days=1)
            
    return data

@router.get("/monthly-summary")
def get_monthly_summary(month: int, year: int, db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
        
    attendance = db.query(attendance_models.Attendance).filter(
        attendance_models.Attendance.user_id == current_user.id,
        attendance_models.Attendance.date >= start_date,
        attendance_models.Attendance.date < end_date
    ).all()
    
    present_count = len([a for a in attendance if a.status in ['Present', 'Late']])
    
    leaves = db.query(attendance_models.LeaveRequest).filter(
        attendance_models.LeaveRequest.user_id == current_user.id,
        attendance_models.LeaveRequest.status == 'Approved',
        attendance_models.LeaveRequest.start_date >= start_date,
        attendance_models.LeaveRequest.start_date < end_date
    ).count()
    
    working_days = 0
    curr = start_date
    while curr < end_date:
        if curr.weekday() < 5: working_days += 1
        curr += timedelta(days=1)
        
    total_seconds = 0
    logged_days = 0
    for a in attendance:
        if a.check_in and a.check_out:
            total_seconds += (a.check_out - a.check_in).total_seconds()
            logged_days += 1
            
    avg_hours = round(total_seconds / (logged_days * 3600), 1) if logged_days > 0 else 0
    
    return {
        "totalWorkingDays": working_days,
        "presentDays": present_count,
        "absentDays": max(0, working_days - present_count - leaves),
        "leaveDays": leaves,
        "avgHours": f"{avg_hours} hours"
    }

@router.get("/all")
def get_all_attendance(date_str: Optional[str] = None, db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    today = get_user_ist(current_user.timezone).date()
    if date_str:
        today = datetime.strptime(date_str, "%Y-%m-%d").date()

    allowed_roles = ['manager', 'technician']
    staff = db.query(root_models.User).filter(root_models.User.role.in_(allowed_roles)).all()
    results = []
    
    start_of_day = datetime.combine(today, time.min)
    end_of_day = datetime.combine(today, time.max)

    for member in staff:
        att = db.query(attendance_models.Attendance).filter(
            attendance_models.Attendance.user_id == member.id,
            attendance_models.Attendance.date >= start_of_day,
            attendance_models.Attendance.date <= end_of_day
        ).first()
        
        results.append({
            "id": att.id if att else f"temp-{member.id}",
            "user_id": member.id,
            "full_name": member.full_name or member.username,
            "dept": member.department or "Staff",
            "date": att.date if att else today,
            "check_in": att.check_in if att else None,
            "check_out": att.check_out if att else None,
            "status": att.status if att else "Absent"
        })
    
    return sorted(results, key=lambda x: (x['status'] == 'Absent', x['full_name']))

@router.post("/leave-request")
def submit_leave_request(request: root_schemas.LeaveRequestCreate, db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    new_request = attendance_models.LeaveRequest(
        user_id=current_user.id,
        leave_type=request.leave_type,
        start_date=request.start_date,
        end_date=request.end_date,
        reason=request.reason,
        status="Pending"
    )
    db.add(new_request)
    db.commit()
    return {"message": "Leave request submitted successfully"}

@router.get("/leave-history")
def get_leave_history(db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    return db.query(attendance_models.LeaveRequest).filter(attendance_models.LeaveRequest.user_id == current_user.id).order_by(attendance_models.LeaveRequest.applied_at.desc()).all()

@router.get("/leaves/all")
def get_all_leaves(month: Optional[int] = None, year: Optional[int] = None, db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = db.query(attendance_models.LeaveRequest, root_models.User.full_name)\
        .join(root_models.User, attendance_models.LeaveRequest.user_id == root_models.User.id)
        
    if month and year:
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        
        query = query.filter(
            attendance_models.LeaveRequest.start_date >= start_date,
            attendance_models.LeaveRequest.start_date < end_date
        )
    
    leaves = query.order_by(attendance_models.LeaveRequest.applied_at.desc()).all()
    
    results = []
    for leave, full_name in leaves:
        l_dict = {c.name: getattr(leave, c.name) for c in leave.__table__.columns}
        l_dict['full_name'] = full_name
        results.append(l_dict)
    return results

@router.post("/leaves/{leave_id}/action")
async def leave_action(leave_id: int, action: dict, db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    leave = db.query(attendance_models.LeaveRequest).filter(attendance_models.LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
        
    leave.status = action.get('status')
    leave.admin_notes = action.get('admin_reason')
    leave.approved_by = current_user.id
    db.commit()
    await manager.broadcast_all({"type": "dashboard_update", "source": "attendance"})
    return {"message": f"Leave request {action.get('status')}"}

@router.post("/regularization")
def request_regularization(request: dict, db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    new_request = attendance_models.AttendanceRegularization(
        user_id=current_user.id,
        date=request.get('date'),
        correct_in_time=request.get('correct_in_time'),
        correct_out_time=request.get('correct_out_time'),
        reason=request.get('reason'),
        status="Pending"
    )
    db.add(new_request)
    db.commit()
    return {"message": "Regularization request submitted successfully"}

@router.get("/regularization-history")
def get_regularization_history(db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    return db.query(attendance_models.AttendanceRegularization).filter(attendance_models.AttendanceRegularization.user_id == current_user.id).all()
@router.get("/reports/monthly")
def get_all_monthly_report(month: int, year: int, db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
        
    allowed_roles = ['manager', 'technician']
    staff = db.query(root_models.User).filter(root_models.User.role.in_(allowed_roles)).all()
    results = []
    
    for member in staff:
        attendance = db.query(attendance_models.Attendance).filter(
            attendance_models.Attendance.user_id == member.id,
            attendance_models.Attendance.date >= start_date,
            attendance_models.Attendance.date < end_date
        ).all()
        
        present_days = len([a for a in attendance if a.status in ['Present', 'Late']])
        absent_days = len([a for a in attendance if a.status == 'Absent'])
        
        results.append({
            "user_id": member.id,
            "full_name": member.full_name or member.username,
            "department": member.department or "Staff",
            "present_days": present_days,
            "absent_days": absent_days,
            "late_marks": len([a for a in attendance if a.status == 'Late']),
            "total_records": len(attendance)
        })
        
    return results

# Holiday Management Endpoints
@router.post("/holidays", response_model=root_schemas.HolidayResponse)
def add_holiday(holiday: root_schemas.HolidayCreate, db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing = db.query(admin_models.Holiday).filter(admin_models.Holiday.date == holiday.date).first()
    if existing:
        raise HTTPException(status_code=400, detail="Holiday already exists for this date")
    
    new_holiday = admin_models.Holiday(**holiday.dict())
    db.add(new_holiday)
    db.commit()
    db.refresh(new_holiday)
    return new_holiday

@router.get("/holidays", response_model=List[root_schemas.HolidayResponse])
def get_holidays(year: int = None, month: int = None, db: Session = Depends(get_db)):
    query = db.query(admin_models.Holiday)
    if year:
        if month:
            start_date = date(year, month, 1)
            if month == 12:
                end_date = date(year + 1, 1, 1)
            else:
                end_date = date(year, month + 1, 1)
            query = query.filter(admin_models.Holiday.date >= start_date, admin_models.Holiday.date < end_date)
        else:
            start_date = date(year, 1, 1)
            end_date = date(year + 1, 1, 1)
            query = query.filter(admin_models.Holiday.date >= start_date, admin_models.Holiday.date < end_date)
            
    return query.order_by(admin_models.Holiday.date).all()

@router.delete("/holidays/{holiday_id}")
def delete_holiday(holiday_id: int, db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    holiday = db.query(admin_models.Holiday).filter(admin_models.Holiday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
        
    db.delete(holiday)
    db.commit()
    return {"message": "Holiday deleted"}

@router.get("/reports/matrix")
def get_attendance_matrix(month: int, year: int, db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_user)):
    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
        
    allowed_roles = ['manager', 'technician']
    staff = db.query(root_models.User).filter(root_models.User.role.in_(allowed_roles)).all()
    
    attendance_records = db.query(attendance_models.Attendance).filter(
        attendance_models.Attendance.date >= start_date,
        attendance_models.Attendance.date < end_date
    ).all()
    
    holidays = db.query(admin_models.Holiday).filter(
        admin_models.Holiday.date >= start_date,
        admin_models.Holiday.date < end_date
    ).all()
    holiday_map = {h.date.day: h.type for h in holidays}
    
    att_map = {}
    for att in attendance_records:
        day = att.date.day
        if att.user_id not in att_map:
            att_map[att.user_id] = {}
        att_map[att.user_id][day] = att.status

    results = []
    days_in_month = (end_date - start_date).days
    
    for member in staff:
        daily_status = []
        user_att = att_map.get(member.id, {})
        
        for d in range(1, days_in_month + 1):
            status = user_att.get(d)
            if not status:
                if d in holiday_map:
                    status = 'Holiday'
                else:
                    current_day_date = date(year, month, d)
                    if current_day_date.weekday() == 6:
                        status = 'Weekend'
                    else:
                        status = 'Absent'
            
            daily_status.append({
                "day": d,
                "status": status
            })
            
        results.append({
            "user_id": member.id,
            "full_name": member.full_name or member.username,
            "department": member.department or "Staff",
            "daily_status": daily_status
        })
        
    return results

# ============ No Punch Out Management ============

class NoPunchOutReasonRequest(BaseModel):
    attendance_id: int
    reason: str

@router.get("/no-punch-out/pending")
def get_pending_no_punch_out(
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_user)
):
    """Get attendance records where user didn't punch out and hasn't provided a reason"""
    pending = db.query(attendance_models.Attendance).filter(
        attendance_models.Attendance.user_id == current_user.id,
        attendance_models.Attendance.check_in != None,
        attendance_models.Attendance.check_out == None,
        attendance_models.Attendance.status == "No Punch Out",
        attendance_models.Attendance.no_punch_out_reason == None
    ).order_by(attendance_models.Attendance.date.desc()).all()
    
    return [{
        "id": record.id,
        "date": record.date.strftime("%Y-%m-%d") if record.date else None,
        "check_in": record.check_in.strftime("%I:%M %p") if record.check_in else None,
        "notified_at": record.no_punch_out_notified.isoformat() if record.no_punch_out_notified else None
    } for record in pending]

@router.post("/no-punch-out/submit-reason")
def submit_no_punch_out_reason(
    request: NoPunchOutReasonRequest,
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_user)
):
    """Submit reason for not punching out"""
    attendance = db.query(attendance_models.Attendance).filter(
        attendance_models.Attendance.id == request.attendance_id,
        attendance_models.Attendance.user_id == current_user.id
    ).first()
    
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    if attendance.no_punch_out_reason:
        raise HTTPException(status_code=400, detail="Reason already submitted")
    
    attendance.no_punch_out_reason = request.reason
    db.commit()
    
    return {"message": "Reason submitted successfully"}

@router.get("/no-punch-out/all")
def get_all_no_punch_out_records(
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_user)
):
    """Admin endpoint to get all no punch out records"""
    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    records = db.query(attendance_models.Attendance).filter(
        attendance_models.Attendance.status == "No Punch Out"
    ).order_by(attendance_models.Attendance.date.desc()).limit(100).all()
    
    result = []
    for record in records:
        user = db.query(root_models.User).filter(root_models.User.id == record.user_id).first()
        result.append({
            "id": record.id,
            "user_id": record.user_id,
            "employee_name": user.full_name or user.username if user else "Unknown",
            "department": user.department if user else None,
            "date": record.date.strftime("%Y-%m-%d") if record.date else None,
            "check_in": record.check_in.strftime("%I:%M %p") if record.check_in else None,
            "reason": record.no_punch_out_reason,
            "notified_at": record.no_punch_out_notified.isoformat() if record.no_punch_out_notified else None
        })
    
    return result


# Get attendance history for a specific user (admin/manager only)
@router.get("/user/{user_id}/history")
async def get_user_attendance_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_user)
):
    """Get full attendance history for a specific user"""
    # Check authorization - admin/manager only
    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get user info
    target_user = db.query(root_models.User).filter(root_models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all attendance records for this user, sorted by date descending
    records = db.query(attendance_models.Attendance).filter(
        attendance_models.Attendance.user_id == user_id
    ).order_by(attendance_models.Attendance.date.desc()).limit(100).all()
    
    result = []
    for record in records:
        result.append({
            "id": record.id,
            "user_id": record.user_id,
            "date": record.date.isoformat() if record.date else None,
            "check_in": record.check_in.isoformat() if record.check_in else None,
            "check_out": record.check_out.isoformat() if record.check_out else None,
            "status": record.status,
            "work_location": record.work_location,
            "no_punch_out_reason": record.no_punch_out_reason if hasattr(record, 'no_punch_out_reason') else None
        })
    
    return result
