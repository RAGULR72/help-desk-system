from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from database import Base

def get_ist():
    from datetime import datetime, timedelta
    return datetime.utcnow() + timedelta(hours=5, minutes=30)

class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    date = Column(DateTime, default=get_ist)
    check_in = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)
    status = Column(String, default="Present") # Present, Late, Absent, WO, Half Day, No Punch Out
    work_location = Column(String, default="Office")
    no_punch_out_reason = Column(String, nullable=True)  # Reason provided by employee
    no_punch_out_notified = Column(DateTime, nullable=True)  # When notification was sent

class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    leave_type = Column(String) # Sick, Casual, Earned, etc.
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    reason = Column(String)
    status = Column(String, default="Pending") # Pending, Approved, Rejected
    admin_notes = Column(String, nullable=True)
    applied_at = Column(DateTime, default=get_ist)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)

class AttendanceRegularization(Base):
    __tablename__ = "attendance_regularization"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    date = Column(DateTime)
    correct_in_time = Column(DateTime)
    correct_out_time = Column(DateTime)
    reason = Column(String)
    status = Column(String, default="Pending") # Pending, Approved, Rejected
    applied_at = Column(DateTime, default=get_ist)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
