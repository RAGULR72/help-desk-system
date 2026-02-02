from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum as SQLEnum
from datetime import datetime
from database import Base
import enum

class ExpenseCategory(str, enum.Enum):
    TRAVEL = "Travel"
    MEALS = "Meals"
    ACCOMMODATION = "Accommodation"
    EQUIPMENT = "Equipment"
    OFFICE_SUPPLIES = "Office Supplies"
    OTHER = "Other"

class ExpenseStatus(str, enum.Enum):
    SAVED = "Saved"
    SUBMITTED = "Submitted"
    PENDING_APPROVAL = "Pending Approval"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    REIMBURSED = "Reimbursed"
    PAID = "Paid"

class RequestType(str, enum.Enum):
    EXPENSE = "Expense"
    ADVANCE = "Advance"
    TRIP = "Trip"

class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    custom_id = Column(String, unique=True, index=True)  # REI5821, etc.
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(SQLEnum(ExpenseCategory), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(Text)
    date = Column(DateTime)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    status = Column(SQLEnum(ExpenseStatus), default=ExpenseStatus.SAVED)
    
    # Travel Details
    travel_mode = Column(String)
    distance = Column(Float)
    from_location = Column(String)
    to_location = Column(String)
    trip_type = Column(String)
    
    # Booking Details
    project_code = Column(String)
    customer_name = Column(String)
    company_name = Column(String)
    manager_name = Column(String)
    
    # Attachments
    receipt_url = Column(String)
    
    # Approval workflow
    submitted_at = Column(DateTime)
    approved_by = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(DateTime)
    rejection_reason = Column(Text)
    reimbursed_at = Column(DateTime)
    overridden_amount = Column(Float)
    override_reason = Column(Text)
    paid_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ExpenseReport(Base):
    __tablename__ = "expense_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    custom_id = Column(String, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    total_amount = Column(Float, default=0.0)
    status = Column(SQLEnum(ExpenseStatus), default=ExpenseStatus.SAVED)
    
    # Workflow
    submitted_at = Column(DateTime)
    approved_by = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(DateTime)
    rejection_reason = Column(Text)
    overridden_amount = Column(Float)
    override_reason = Column(Text)
    paid_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ExpenseReportLine(Base):
    __tablename__ = "expense_report_lines"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("expense_reports.id", ondelete="CASCADE"), nullable=False)
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=False)

class AdvanceRequest(Base):
    __tablename__ = "advance_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    custom_id = Column(String, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    purpose = Column(Text, nullable=False)
    status = Column(SQLEnum(ExpenseStatus), default=ExpenseStatus.SAVED)
    
    # Workflow
    submitted_at = Column(DateTime)
    approved_by = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(DateTime)
    rejection_reason = Column(Text)
    disbursed_at = Column(DateTime)
    overridden_amount = Column(Float)
    override_reason = Column(Text)
    paid_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TripRequest(Base):
    __tablename__ = "trip_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    custom_id = Column(String, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    destination = Column(String, nullable=False)
    purpose = Column(Text, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    estimated_cost = Column(Float)
    status = Column(SQLEnum(ExpenseStatus), default=ExpenseStatus.SAVED)
    
    # Workflow
    submitted_at = Column(DateTime)
    approved_by = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(DateTime)
    rejection_reason = Column(Text)
    overridden_amount = Column(Float)
    override_reason = Column(Text)
    paid_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TravelRate(Base):
    __tablename__ = "travel_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    mode = Column(String, unique=True, nullable=False) # Bike, Car, Taxi, Bus, Auto, Rapido
    rate_per_km = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
