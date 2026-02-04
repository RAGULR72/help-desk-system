from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Date
from database import Base

def get_ist():
    from datetime import datetime, timedelta
    return datetime.utcnow() + timedelta(hours=5, minutes=30)

class SystemSettings(Base):
    __tablename__ = "system_settings"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String) # "true", "false", or other strings
    description = Column(String, nullable=True)
    updated_at = Column(DateTime, default=get_ist, onupdate=get_ist)

class Holiday(Base):
    __tablename__ = "holidays"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    date = Column(Date, unique=True, nullable=False)
    type = Column(String, default="Public Holiday") # Public Holiday, Company Event, etc.
    description = Column(String, nullable=True)

class LoginLog(Base):
    __tablename__ = "login_logs"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    username = Column(String, index=True)
    login_time = Column(DateTime, default=get_ist)
    ip_address = Column(String, nullable=True)
    device = Column(String, nullable=True)
    os = Column(String, nullable=True)
    browser = Column(String, nullable=True)
    location = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

class UserActivity(Base):
    __tablename__ = "user_activity"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    activity_type = Column(String) # login, ticket_created, ticket_updated, password_changed
    description = Column(String)
    timestamp = Column(DateTime, default=get_ist)
    icon = Column(String, nullable=True)
    link = Column(String, nullable=True)
    ip_address = Column(String, nullable=True) # Added for security audit
    severity = Column(String, default="info") # info, warning, critical

class TicketSequence(Base):
    __tablename__ = "ticket_sequences"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    prefix = Column(String, default="TKT")
    fy_start_month = Column(Integer, default=4) # April
    current_fy = Column(Integer) # E.g., 2024 for FY 2024-25
    next_number = Column(Integer, default=1)
    
    updated_at = Column(DateTime, default=get_ist, onupdate=get_ist)

class ExpenseSequence(Base):
    __tablename__ = "expense_sequences"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    prefix = Column(String, default="REI")
    next_number = Column(Integer, default=1001)
    
    updated_at = Column(DateTime, default=get_ist, onupdate=get_ist)
