from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime, timedelta, date as py_date
from pydantic import BaseModel
import logging

from database import get_db
from models import User, Notification
from auth import get_current_user, require_roles
from email_service import send_travel_notification_email
from expense_system.models import (
    Expense, ExpenseReport, ExpenseReportLine, AdvanceRequest, TripRequest,
    ExpenseCategory, ExpenseStatus, RequestType, TravelRate
)
from admin_system import models as admin_models
from attendance_system.models import LeaveRequest, Attendance

router = APIRouter(prefix="/api/expenses", tags=["Expense Management"])

def generate_custom_id(db: Session, item_type: str = "expense") -> str:
    """Generate custom ID based on settings"""
    if item_type == "expense":
        # Use with_for_update to handle concurrent requests
        seq = db.query(admin_models.ExpenseSequence).with_for_update().first()
        if not seq:
            seq = admin_models.ExpenseSequence(prefix="REI", next_number=1001)
            db.add(seq)
            db.flush()
        
        custom_id = f"{seq.prefix}{seq.next_number}"
        seq.next_number += 1
        db.commit()
        return custom_id
    
    # Defaults for others
    count = db.query(ExpenseReport if item_type == "report" else 
                    AdvanceRequest if item_type == "advance" else TripRequest).count() + 1
    prefix = "RPT" if item_type == "report" else "ADV" if item_type == "advance" else "TRP"
    base = 1000 if item_type == "report" else 2000 if item_type == "advance" else 3000
    return f"{prefix}{base + count}"

# ============================================================================
# SCHEMAS
# ============================================================================

class ApprovalRequest(BaseModel):
    overridden_amount: Optional[float] = None
    override_reason: Optional[str] = None

class ExpenseCreate(BaseModel):
    category: str
    amount: float
    description: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    travelMode: Optional[str] = None
    distance: Optional[str] = None
    fromLocation: Optional[str] = None
    toLocation: Optional[str] = None
    tripType: Optional[str] = None
    projectCode: Optional[str] = None
    customerName: Optional[str] = None
    companyName: Optional[str] = None
    managerName: Optional[str] = None

class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    travelMode: Optional[str] = None
    distance: Optional[str] = None
    fromLocation: Optional[str] = None
    toLocation: Optional[str] = None
    tripType: Optional[str] = None
    projectCode: Optional[str] = None
    customerName: Optional[str] = None
    companyName: Optional[str] = None
    managerName: Optional[str] = None
    status: Optional[str] = None

class ReportCreate(BaseModel):
    title: str
    description: Optional[str] = None
    expense_ids: List[int] = []

class AdvanceCreate(BaseModel):
    amount: float
    purpose: str

class TripCreate(BaseModel):
    destination: str
    purpose: str
    start_date: datetime
    end_date: datetime
    estimated_cost: Optional[float] = None

class TravelRateUpdate(BaseModel):
    mode: str
    rate_per_km: float
    is_active: Optional[bool] = True

# ============================================================================
# DASHBOARD & STATISTICS
# ============================================================================

@router.get("/dashboard")
async def get_dashboard_stats(
    view: str = "personal",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get dashboard statistics matching the UI from the image
    """
    user_id = current_user.id
    is_manager = current_user.role in ['admin', 'manager']
    
    # If user is NOT manager, ignore team view request
    effective_view = view if is_manager else "personal"
    
    # Base filters using explicit expressions for reliability
    report_filters = []
    advance_filters = []
    trip_filters = []
    expense_filters = []
    
    if effective_view == "personal":
        report_filters.append(ExpenseReport.user_id == user_id)
        advance_filters.append(AdvanceRequest.user_id == user_id)
        trip_filters.append(TripRequest.user_id == user_id)
        expense_filters.append(Expense.user_id == user_id)
    
    # Expense Reports Stats
    report_stats = {
        "saved": db.query(ExpenseReport).filter(*report_filters, ExpenseReport.status == ExpenseStatus.SAVED).count(),
        "submitted": db.query(ExpenseReport).filter(*report_filters, ExpenseReport.status == ExpenseStatus.SUBMITTED).count(),
        "pending": db.query(ExpenseReport).filter(*report_filters, ExpenseReport.status == ExpenseStatus.PENDING_APPROVAL).count(),
        "approved": db.query(ExpenseReport).filter(*report_filters, ExpenseReport.status == ExpenseStatus.APPROVED).count(),
        "rejected": db.query(ExpenseReport).filter(*report_filters, ExpenseReport.status == ExpenseStatus.REJECTED).count(),
    }
    
    # Advances Stats
    advance_stats = {
        "saved": db.query(AdvanceRequest).filter(*advance_filters, AdvanceRequest.status == ExpenseStatus.SAVED).count(),
        "submitted": db.query(AdvanceRequest).filter(*advance_filters, AdvanceRequest.status == ExpenseStatus.SUBMITTED).count(),
        "pending": db.query(AdvanceRequest).filter(*advance_filters, AdvanceRequest.status == ExpenseStatus.PENDING_APPROVAL).count(),
        "approved": db.query(AdvanceRequest).filter(*advance_filters, AdvanceRequest.status == ExpenseStatus.APPROVED).count(),
        "rejected": db.query(AdvanceRequest).filter(*advance_filters, AdvanceRequest.status == ExpenseStatus.REJECTED).count(),
    }
    
    # Travel Requests Stats
    trip_stats = {
        "saved": db.query(TripRequest).filter(*trip_filters, TripRequest.status == ExpenseStatus.SAVED).count(),
        "submitted": db.query(TripRequest).filter(*trip_filters, TripRequest.status == ExpenseStatus.SUBMITTED).count(),
        "pending": db.query(TripRequest).filter(*trip_filters, TripRequest.status == ExpenseStatus.PENDING_APPROVAL).count(),
        "approved": db.query(TripRequest).filter(*trip_filters, TripRequest.status == ExpenseStatus.APPROVED).count(),
        "rejected": db.query(TripRequest).filter(*trip_filters, TripRequest.status == ExpenseStatus.REJECTED).count(),
    }

    # Expense Claims (Individual items)
    claim_stats = {
        "saved": db.query(Expense).filter(*expense_filters, Expense.status == ExpenseStatus.SAVED).count(),
        "submitted": db.query(Expense).filter(*expense_filters, Expense.status == ExpenseStatus.SUBMITTED).count(),
        "pending": db.query(Expense).filter(*expense_filters, Expense.status == ExpenseStatus.PENDING_APPROVAL).count(),
        "approved": db.query(Expense).filter(*expense_filters, Expense.status == ExpenseStatus.APPROVED).count(),
        "rejected": db.query(Expense).filter(*expense_filters, Expense.status == ExpenseStatus.REJECTED).count(),
        "paid": db.query(Expense).filter(*expense_filters, Expense.status == ExpenseStatus.PAID).count(),
    }
    
    # Fetch recent transactions
    recent_query = db.query(Expense, User.full_name)\
        .join(User, Expense.user_id == User.id)\
        .filter(*expense_filters)\
        .order_by(Expense.created_at.desc()).limit(10)
    
    recent_results = recent_query.all()
    
    transactions = []
    for exp, full_name in recent_results:
        # Safe access to enum values
        cat_val = exp.category.value if hasattr(exp.category, 'value') else str(exp.category)
        status_val = exp.status.value if hasattr(exp.status, 'value') else str(exp.status)
        
        transactions.append({
            "id": exp.custom_id or f"EXP{exp.id}",
            "db_id": exp.id,
            "category": cat_val,
            "travel_mode": exp.travel_mode,
            "date": (exp.date or exp.start_date).strftime("%d %b %Y") if (exp.date or exp.start_date) else "",
            "amount": exp.amount,
            "status": status_val,
            "requester": full_name if effective_view == "team" else None
        })

    # Spend Trend (Last 6 Months)
    spend_trend = []
    for i in range(5, -1, -1):
        temp_date = datetime.now() - timedelta(days=i*30)
        start_of_month = temp_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        if start_of_month.month == 12:
            end_of_month = start_of_month.replace(year=start_of_month.year + 1, month=1)
        else:
            end_of_month = start_of_month.replace(month=start_of_month.month + 1)
            
        month_name = start_of_month.strftime("%b")
        
        # Use query(Expense) or query for sum(Expense.amount) with explicit filters
        stats_row = db.query(
            func.sum(Expense.amount).label("total"),
            func.count(Expense.id).label("count")
        ).filter(*expense_filters).filter(Expense.date >= start_of_month, Expense.date < end_of_month).first()
            
        spend_trend.append({
            "name": month_name, 
            "amount": float(stats_row.total or 0),
            "count": int(stats_row.count or 0)
        })

    # Weekly Trend (Last 8 Weeks)
    weekly_trend = []
    for i in range(7, -1, -1):
        # Current date back to start of week (Sunday)
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_week = today - timedelta(days=today.weekday() + (i * 7) + 1)
        end_of_week = start_of_week + timedelta(days=7)
        
        week_label = f"Wk {8-i}" if i > 0 else "This Wk"
        
        stats_row = db.query(
            func.sum(Expense.amount).label("total"),
            func.count(Expense.id).label("count")
        ).filter(*expense_filters).filter(Expense.date >= start_of_week, Expense.date < end_of_week).first()
        
        weekly_trend.append({
            "name": week_label,
            "amount": float(stats_row.total or 0),
            "count": int(stats_row.count or 0)
        })
    
    return {
        "expense_reports": report_stats,
        "expense_claims": claim_stats,
        "advances": advance_stats,
        "trip_requests": trip_stats,
        "recent_transactions": transactions,
        "spend_trend": spend_trend,
        "weekly_trend": weekly_trend
    }

@router.get("/admin/stats")
async def get_admin_expense_stats(
    period: str = "monthly", # "daily", "weekly", "monthly"
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager']))
):
    """Get aggregated stats for Admin Dashboard"""
    now = datetime.utcnow()
    if period == "daily":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "weekly":
        start_date = now - timedelta(days=now.weekday())
    else: # monthly
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Aggregated spending per user
    user_stats = db.query(
        User.username,
        User.full_name,
        func.sum(Expense.amount).label("total_amount"),
        func.count(Expense.id).label("count")
    ).join(Expense, Expense.user_id == User.id)\
     .filter(Expense.created_at >= start_date)\
     .group_by(User.id).all()

    # Spending by category
    cat_stats = db.query(
        Expense.category,
        func.sum(Expense.amount).label("total")
    ).filter(Expense.created_at >= start_date)\
     .group_by(Expense.category).all()

    # Timeline data (e.g., for charts)
    # This part can be simplified or expanded depending on chart needs
    
    return {
        "user_summaries": [
            {
                "username": u.username, 
                "name": u.full_name, 
                "amount": float(u.total_amount) if u.total_amount else 0.0, 
                "claims": u.count
            } 
            for u in user_stats
        ],
        "category_breakdown": [
            {
                "category": c.category.value if hasattr(c.category, 'value') else str(c.category), 
                "amount": float(c.total) if c.total else 0.0
            } 
            for c in cat_stats
        ],
        "total_spend": float(sum(u.total_amount for u in user_stats if u.total_amount)) if user_stats else 0.0
    }

# ============================================================================
# EXPENSE CRUD
# ============================================================================

@router.post("/create")
async def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new expense"""
    # Generate custom ID
    custom_id = generate_custom_id(db, "expense")
    
    # Parse dates safely
    def parse_dt(dt_str):
        if not dt_str: return None
        try: return datetime.strptime(dt_str, "%Y-%m-%d")
        except: 
            try: return datetime.fromisoformat(dt_str)
            except: return None

    start_dt = parse_dt(data.startDate)
    end_dt = parse_dt(data.endDate)

    expense = Expense(
        custom_id=custom_id,
        user_id=current_user.id,
        category=ExpenseCategory(data.category),
        amount=data.amount,
        description=data.description,
        date=start_dt,
        start_date=start_dt,
        end_date=end_dt,
        travel_mode=data.travelMode,
        distance=float(data.distance) if data.distance and data.distance.strip() else 0.0,
        from_location=data.fromLocation,
        to_location=data.toLocation,
        trip_type=data.tripType,
        project_code=data.projectCode,
        customer_name=data.customerName,
        company_name=data.companyName,
        manager_name=data.managerName,
        status=ExpenseStatus.SAVED
    )
    
    db.add(expense)
    db.commit()
    db.refresh(expense)
    
    return {"message": "Expense created", "id": expense.id, "custom_id": custom_id}

@router.post("/create-multiple")
async def create_multiple_expenses(
    data: List[ExpenseCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create multiple expenses in a batch"""
    results = []
    
    def parse_dt(dt_str):
        if not dt_str: return None
        try: return datetime.strptime(dt_str, "%Y-%m-%d")
        except: 
            try: return datetime.fromisoformat(dt_str)
            except: return None

    for item in data:
        custom_id = generate_custom_id(db, "expense")
        
        expense = Expense(
            custom_id=custom_id,
            user_id=current_user.id,
            category=ExpenseCategory(item.category),
            amount=item.amount,
            description=item.description,
            date=parse_dt(item.startDate),
            start_date=parse_dt(item.startDate),
            end_date=parse_dt(item.endDate),
            travel_mode=item.travelMode,
            distance=float(item.distance) if item.distance and str(item.distance).strip() else 0.0,
            from_location=item.fromLocation,
            to_location=item.toLocation,
            trip_type=item.tripType,
            project_code=item.projectCode,
            customer_name=item.customerName,
            company_name=item.companyName,
            manager_name=item.managerName,
            status=ExpenseStatus.PENDING_APPROVAL
        )
        db.add(expense)
        db.flush() # Get IDs without fully committing yet
        results.append({"id": expense.id, "custom_id": custom_id})
    
    db.commit()
    return {"message": f"{len(results)} expenses created", "items": results}

@router.get("/{expense_id}")
async def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single expense by ID"""
    expense = db.query(Expense).filter_by(id=expense_id, user_id=current_user.id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return {
        "id": expense.id,
        "custom_id": expense.custom_id,
        "category": expense.category.value,
        "amount": expense.amount,
        "description": expense.description,
        "startDate": expense.start_date.strftime("%Y-%m-%d") if expense.start_date else None,
        "endDate": expense.end_date.strftime("%Y-%m-%d") if expense.end_date else None,
        "travelMode": expense.travel_mode,
        "distance": str(expense.distance),
        "fromLocation": expense.from_location,
        "toLocation": expense.to_location,
        "tripType": expense.trip_type,
        "projectCode": expense.project_code,
        "customerName": expense.customer_name,
        "companyName": expense.company_name,
        "managerName": expense.manager_name,
        "status": expense.status.value
    }

@router.get("/list")
async def list_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all expenses for current user"""
    expenses = db.query(Expense).filter_by(user_id=current_user.id)\
        .order_by(Expense.created_at.desc()).all()
    
    return [{
        "id": e.id,
        "custom_id": e.custom_id,
        "category": e.category.value,
        "amount": e.amount,
        "description": e.description,
        "date": e.date,
        "status": e.status.value,
        "created_at": e.created_at
    } for e in expenses]

@router.put("/{expense_id}")
async def update_expense(
    expense_id: int,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an expense"""
    expense = db.query(Expense).filter_by(id=expense_id, user_id=current_user.id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.status not in [ExpenseStatus.SAVED, ExpenseStatus.REJECTED]:
        raise HTTPException(status_code=400, detail="Cannot edit submitted/approved expense")
    
    if data.category:
        expense.category = ExpenseCategory(data.category)
    if data.amount is not None:
        expense.amount = data.amount
    if data.description is not None:
        expense.description = data.description
    
    def parse_dt(dt_str):
        if not dt_str: return None
        try: return datetime.strptime(dt_str, "%Y-%m-%d")
        except:
            try: return datetime.fromisoformat(dt_str)
            except: return None

    if data.startDate:
        expense.start_date = parse_dt(data.startDate)
    if data.endDate:
        expense.end_date = parse_dt(data.endDate)
    
    if data.travelMode: expense.travel_mode = data.travelMode
    if data.distance: expense.distance = float(data.distance)
    if data.fromLocation: expense.from_location = data.fromLocation
    if data.toLocation: expense.to_location = data.toLocation
    if data.tripType: expense.trip_type = data.tripType
    if data.projectCode: expense.project_code = data.projectCode
    if data.customerName: expense.customer_name = data.customerName
    if data.companyName: expense.company_name = data.companyName
    if data.managerName: expense.manager_name = data.managerName
    
    if data.status:
        expense.status = ExpenseStatus(data.status)
    
    expense.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Expense updated"}

@router.post("/{expense_id}/submit")
async def submit_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit expense for approval"""
    expense = db.query(Expense).filter_by(id=expense_id, user_id=current_user.id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense.status = ExpenseStatus.PENDING_APPROVAL
    expense.submitted_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Expense submitted for approval"}

# ============================================================================
# EXPENSE REPORTS
# ============================================================================

@router.post("/reports/create")
async def create_report(
    data: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create expense report"""
    # Generate custom ID
    custom_id = generate_custom_id(db, "report")
    
    report = ExpenseReport(
        custom_id=custom_id,
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        status=ExpenseStatus.SAVED
    )
    
    db.add(report)
    db.flush()
    
    # Add expenses to report
    total = 0.0
    for exp_id in data.expense_ids:
        expense = db.query(Expense).filter_by(id=exp_id, user_id=current_user.id).first()
        if expense:
            line = ExpenseReportLine(report_id=report.id, expense_id=expense.id)
            db.add(line)
            total += expense.amount
    
    report.total_amount = total
    db.commit()
    db.refresh(report)
    
    return {"message": "Report created", "id": report.id, "custom_id": custom_id}

@router.get("/reports/list")
async def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all reports for current user"""
    reports = db.query(ExpenseReport).filter_by(user_id=current_user.id)\
        .order_by(ExpenseReport.created_at.desc()).all()
    
    return [{
        "id": r.id,
        "custom_id": r.custom_id,
        "title": r.title,
        "total_amount": r.total_amount,
        "status": r.status.value,
        "created_at": r.created_at,
        "items_count": db.query(ExpenseReportLine).filter_by(report_id=r.id).count()
    } for r in reports]

# ============================================================================
# ADVANCE REQUESTS
# ============================================================================

@router.post("/advances/create")
async def create_advance(
    data: AdvanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create advance request"""
    custom_id = generate_custom_id(db, "advance")
    
    advance = AdvanceRequest(
        custom_id=custom_id,
        user_id=current_user.id,
        amount=data.amount,
        purpose=data.purpose,
        status=ExpenseStatus.SAVED
    )
    
    db.add(advance)
    db.commit()
    db.refresh(advance)
    
    return {"message": "Advance request created", "id": advance.id, "custom_id": custom_id}

@router.get("/advances/list")
async def list_advances(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all advance requests"""
    advances = db.query(AdvanceRequest).filter_by(user_id=current_user.id)\
        .order_by(AdvanceRequest.created_at.desc()).all()
    
    return [{
        "id": a.id,
        "custom_id": a.custom_id,
        "amount": a.amount,
        "purpose": a.purpose,
        "status": a.status.value,
        "created_at": a.created_at
    } for a in advances]

# ============================================================================
# TRIP REQUESTS
# ============================================================================

@router.post("/trips/create")
async def create_trip(
    data: TripCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create trip request"""
    custom_id = generate_custom_id(db, "trip")
    
    trip = TripRequest(
        custom_id=custom_id,
        user_id=current_user.id,
        destination=data.destination,
        purpose=data.purpose,
        start_date=data.start_date,
        end_date=data.end_date,
        estimated_cost=data.estimated_cost,
        status=ExpenseStatus.SAVED
    )
    
    db.add(trip)
    db.commit()
    db.refresh(trip)
    
    return {"message": "Trip request created", "id": trip.id, "custom_id": custom_id}

@router.get("/trips/list")
async def list_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all trip requests"""
    trips = db.query(TripRequest).filter_by(user_id=current_user.id)\
        .order_by(TripRequest.created_at.desc()).all()
    
    return [{
        "id": t.id,
        "custom_id": t.custom_id,
        "destination": t.destination,
        "purpose": t.purpose,
        "start_date": t.start_date,
        "end_date": t.end_date,
        "estimated_cost": t.estimated_cost,
        "status": t.status.value,
        "created_at": t.created_at
    } for t in trips]

# ============================================================================
# APPROVALS (Manager/Admin)
# ============================================================================

@router.post("/approve/{item_type}/{item_id}")
async def approve_item(
    item_type: str,  # "expense", "report", "advance", "trip"
    item_id: int,
    approval: Optional[ApprovalRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager']))
):
    """Approve an item (Manager/Admin only) with optional override"""
    model_map = {
        "expense": Expense,
        "report": ExpenseReport,
        "advance": AdvanceRequest,
        "trip": TripRequest
    }
    
    if item_type not in model_map:
        raise HTTPException(status_code=400, detail="Invalid item type")
    
    item = db.query(model_map[item_type]).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item.status = ExpenseStatus.APPROVED
    item.approved_by = current_user.id
    item.approved_at = datetime.utcnow()
    
    if approval:
        if approval.overridden_amount is not None and hasattr(item, 'overridden_amount'):
            item.overridden_amount = approval.overridden_amount
        if approval.override_reason and hasattr(item, 'override_reason'):
            item.override_reason = approval.override_reason

    db.commit()
    
    return {"message": f"{item_type.capitalize()} approved"}

@router.post("/pay/{item_type}/{item_id}")
async def pay_item(
    item_type: str,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin']))
):
    """Mark an item as PAID (Admin only)"""
    model_map = {
        "expense": Expense,
        "report": ExpenseReport,
        "advance": AdvanceRequest,
        "trip": TripRequest
    }
    
    if item_type not in model_map:
        raise HTTPException(status_code=400, detail="Invalid item type")
    
    item = db.query(model_map[item_type]).filter_by(id=item_id).first()
    if not item or item.status != ExpenseStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Item must be approved before payment")
    
    item.status = ExpenseStatus.PAID
    item.paid_at = datetime.utcnow()
    db.commit()
    
    # Notify Tech and Manager
    tech = db.query(User).filter_by(id=item.user_id).first()
    manager = db.query(User).filter_by(id=item.approved_by).first()
    
    item_name = item_type.capitalize()
    msg = f"Your {item_name} claim #{item.custom_id or item.id} has been PAID by Admin."
    
    # Check if overridden_amount exists on this model type and is set
    has_override = hasattr(item, 'overridden_amount') and item.overridden_amount is not None
    if has_override:
         original_amt = getattr(item, 'amount', getattr(item, 'total_amount', 0))
         msg += f" Final amount: ₹{item.overridden_amount} (Original: ₹{original_amt})."
         if hasattr(item, 'override_reason') and item.override_reason:
             msg += f" Reason: {item.override_reason}"
    
    # App Notification to Tech
    notif = Notification(
        user_id=tech.id,
        title=f"{item_name} Paid",
        message=msg,
        type="expense",
        link="/expenses"
    )
    db.add(notif)
    
    # Email to Tech
    if tech.email:
        send_travel_notification_email(tech.email, tech.full_name or tech.username, msg, "PAID", item.id)
        
    # Email to Manager (Optional)
    if manager and manager.email:
        send_travel_notification_email(manager.email, manager.full_name or manager.username, f"Claim you approved (#{item.custom_id or item.id}) has been PAID.", "PAID", item.id)

    db.commit()
    return {"message": f"{item_name} marked as PAID and notifications sent"}


@router.post("/reject/{item_type}/{item_id}")
async def reject_item(
    item_type: str,
    item_id: int,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager']))
):
    """Reject an item (Manager/Admin only)"""
    model_map = {
        "expense": Expense,
        "report": ExpenseReport,
        "advance": AdvanceRequest,
        "trip": TripRequest
    }
    
    if item_type not in model_map:
        raise HTTPException(status_code=400, detail="Invalid item type")
    
    item = db.query(model_map[item_type]).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item.status = ExpenseStatus.REJECTED
    item.rejection_reason = reason
    item.approved_by = current_user.id
    item.approved_at = datetime.utcnow()
    db.commit()
    
    return {"message": f"{item_type.capitalize()} rejected"}

@router.delete("/{item_type}/{item_id}")
async def delete_item(
    item_type: str,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an item (User can only delete their own non-approved items)"""
    model_map = {
        "expense": Expense,
        "report": ExpenseReport,
        "advance": AdvanceRequest,
        "trip": TripRequest
    }
    
    if item_type not in model_map:
        raise HTTPException(status_code=400, detail="Invalid item type")
    
    item = db.query(model_map[item_type]).filter_by(id=item_id, user_id=current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item.status in [ExpenseStatus.APPROVED, ExpenseStatus.PAID]:
         raise HTTPException(status_code=400, detail="Cannot delete an approved or paid item")
         
    db.delete(item)
    db.commit()
    
    return {"message": f"{item_type.capitalize()} deleted successfully"}
# ============================================================================
# TRAVEL RATES CONFIGURATION
# ============================================================================

@router.get("/config/travel-rates")
async def get_travel_rates(
    db: Session = Depends(get_db)
):
    """
    Get all configured travel rates
    """
    rates = db.query(TravelRate).filter_by(is_active=True).all()
    # If no rates exist, seed defaults
    if not rates:
        defaults = [
            {"mode": "Bike", "rate_per_km": 12.0},
            {"mode": "Car", "rate_per_km": 18.0},
            {"mode": "Bus", "rate_per_km": 5.0},
            {"mode": "Train", "rate_per_km": 8.0},
            {"mode": "Auto", "rate_per_km": 15.0},
            {"mode": "Taxi", "rate_per_km": 20.0},
            {"mode": "Rapido", "rate_per_km": 10.0}
        ]
        for d in defaults:
            new_rate = TravelRate(**d)
            db.add(new_rate)
        db.commit()
        rates = db.query(TravelRate).filter_by(is_active=True).all()
    
    return rates

@router.post("/config/travel-rates")
async def update_travel_rate(
    rate_data: TravelRateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "manager"]))
):
    """
    Create or update a travel rate
    """
    rate = db.query(TravelRate).filter_by(mode=rate_data.mode).first()
    if rate:
        rate.rate_per_km = rate_data.rate_per_km
        rate.is_active = rate_data.is_active
    else:
        rate = TravelRate(**rate_data.dict())
        db.add(rate)
    
    db.commit()
    db.refresh(rate)
    return rate
@router.get("/config/approvers")
async def get_expense_approvers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get global primary and secondary expense approvers with smart leave/attendance check"""
    # Fetch settings
    p_id_setting = db.query(SystemSettings).filter_by(key="primary_expense_approver_id").first()
    s_id_setting = db.query(SystemSettings).filter_by(key="secondary_expense_approver_id").first()
    auto_detect_setting = db.query(SystemSettings).filter_by(key="expense_auto_leave_detection").first()
    
    p_id = int(p_id_setting.value) if p_id_setting and p_id_setting.value else None
    s_id = int(s_id_setting.value) if s_id_setting and s_id_setting.value else None
    auto_detect = auto_detect_setting.value == "true" if auto_detect_setting else False
    
    primary = db.query(User).filter_by(id=p_id).first() if p_id else None
    secondary = db.query(User).filter_by(id=s_id).first() if s_id else None
    
    # Status Checks
    is_unavailable = False
    status_reason = ""
    
    if p_id:
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        # 1. Check Approved Leave Requests
        leave = db.query(LeaveRequest).filter(
            LeaveRequest.user_id == p_id,
            LeaveRequest.status == "Approved",
            LeaveRequest.start_date <= today_start,
            LeaveRequest.end_date >= today_start
        ).first()
        
        if leave:
            is_unavailable = True
            status_reason = "On Approved Leave"
        
        # 2. Check Attendance (Punch-in) if auto-detect is ON
        if not is_unavailable and auto_detect:
            # Check if manager has punched in today
            attendance = db.query(Attendance).filter(
                Attendance.user_id == p_id,
                Attendance.date >= today_start,
                Attendance.date < today_end,
                Attendance.check_in != None
            ).first()
            
            if not attendance:
                is_unavailable = True
                status_reason = "No Punch-in Detected"

    return {
        "primary": {
            "id": primary.id if primary else None,
            "name": primary.full_name or primary.username if primary else "Not Assigned",
            "is_unavailable": is_unavailable,
            "status_reason": status_reason
        },
        "secondary": {
            "id": secondary.id if secondary else None,
            "name": secondary.full_name or secondary.username if secondary else "Not Assigned"
        },
        "auto_detect_enabled": auto_detect,
        "active_approver": (secondary.full_name or secondary.username) if (is_unavailable and secondary) else (primary.full_name or primary.username if primary else "Admin")
    }

@router.post("/config/approvers")
async def set_expense_approvers(
    config: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin']))
):
    """Set global approvers and toggle auto-leave detection (Admin only)"""
    updates = {
        "primary_expense_approver_id": config.get("primary_id"),
        "secondary_expense_approver_id": config.get("secondary_id"),
        "expense_auto_leave_detection": "true" if config.get("auto_detect") else "false"
    }
    
    for key, val in updates.items():
        setting = db.query(SystemSettings).filter_by(key=key).first()
        if not setting:
            db.add(SystemSettings(key=key, value=str(val) if val is not None else ""))
        else:
            setting.value = str(val) if val is not None else ""
            
    db.commit()
    return {"message": "Global approval logic updated"}
