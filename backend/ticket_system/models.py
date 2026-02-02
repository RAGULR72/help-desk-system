from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from database import Base

def get_ist():
    return datetime.utcnow() + timedelta(hours=5, minutes=30)

class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    custom_id = Column(String, index=True, nullable=True) # E.g., TKT-2023-0001
    subject = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String, default="normal", index=True) # low, normal, high, critical
    category = Column(String, nullable=False, index=True)
    subcategory = Column(String, nullable=True)
    status = Column(String, default="open", index=True) # open, in_progress, repairing, hold, resolved, closed
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    hold_reason = Column(Text, nullable=True) # Explanation for why ticket is on hold
    rating = Column(Integer, nullable=True) # 1-5 stars
    feedback = Column(Text, nullable=True) # optional text feedback
    attachments = Column(Text, nullable=True) # Comma-separated list of filenames or JSON
    
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    created_at = Column(DateTime, default=get_ist, index=True)
    updated_at = Column(DateTime, default=get_ist, onupdate=get_ist)
    sla_deadline = Column(DateTime, nullable=True) # Expiration time
    sla_expired_notified = Column(Integer, default=0) # bit to track if admin was notified (0: no, 1: notified)
    resolution_note = Column(Text, nullable=True) # Explanation of the fix
    resolution_attachments = Column(Text, nullable=True) # Attachments for resolution
    asset_taken = Column(Integer, default=0) # 1 if asset (laptop etc) was taken from customer
    asset_status = Column(String, default="none", index=True) # none, taken_to_office, repairing, ready_for_delivery, delivered
    asset_reason = Column(Text, nullable=True) # Why it was taken to office
    asset_repairer_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True) # Tech who repairs at office
    reopen_count = Column(Integer, default=0)
    ticket_history = Column(Text, nullable=True) # JSON string for timeline
    sentiment = Column(String, nullable=True, index=True) # Positive, Neutral, Negative
    sentiment_data = Column(Text, nullable=True) # JSON string with AI analysis details
    ai_summary = Column(Text, nullable=True) # Short 2-line AI generated summary
    ai_auto_reply = Column(Text, nullable=True) # Automated suggestion for the user
    ai_tech_guide = Column(Text, nullable=True) # Technical co-pilot guide for technicians
    linked_to_id = Column(Integer, ForeignKey("tickets.id"), nullable=True, index=True) # Parent ticket for duplicates

    # Relationships
    # Note: We use string references for 'User' to avoid circular imports if possible, 
    # but since User is in root models, we rely on SQLAlchemy registry.
    owner = relationship("User", foreign_keys=[user_id], backref="tickets")
    assignee = relationship("User", foreign_keys=[assigned_to], backref="assigned_tickets")
    asset_repairer = relationship("User", foreign_keys=[asset_repairer_id], backref="repair_assignments")
    
    # One-to-One relationship with repair details
    repair_details = relationship("TicketRepairDetails", back_populates="ticket", uselist=False, cascade="all, delete-orphan")
    
    # SLA Tracking Relationships
    sla_tracking = relationship("TicketSLATracking", back_populates="ticket", uselist=False, cascade="all, delete-orphan")
    sla_escalations = relationship("SLAEscalation", back_populates="ticket", cascade="all, delete-orphan")
    
    # Comments Relationship
    # Relationship disabled to prevent circular import issues - Comments fetched via API

class TicketRepairDetails(Base):
    __tablename__ = "ticket_repair_details"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), index=True)
    
    # Initiation
    issue_title = Column(String, nullable=True)
    reason_for_repair = Column(Text, nullable=True)
    pickup_location = Column(String, default="Proserve Office")
    
    # Timeline Timestamps
    pickup_time = Column(DateTime, nullable=True) # Taken for repair
    tech_left_time = Column(DateTime, nullable=True) # Leaves for site
    tech_reached_time = Column(DateTime, nullable=True) # Reached site
    resolution_timestamp = Column(DateTime, nullable=True) # Checked/Fixed/Resolved
    delivery_time = Column(DateTime, nullable=True) # Delivered back
    closing_timestamp = Column(DateTime, nullable=True) # Finally closed
    
    # Visit Details
    visit_type = Column(String, nullable=True) # Check / Fix / Offline Visit
    visiting_tech_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # Site Report (Looping Tech)
    machine_photo = Column(Text, nullable=True) # URL or path
    machine_condition = Column(Text, nullable=True)
    issue_description = Column(Text, nullable=True)
    solution_provided = Column(Text, nullable=True)
    output_image = Column(Text, nullable=True) # Mandatory result image
    
    # Final Close (Main Tech)
    overall_solution_details = Column(Text, nullable=True)
    final_images = Column(Text, nullable=True)
    
    # Relationships
    ticket = relationship("Ticket", back_populates="repair_details")
    visiting_tech = relationship("User", foreign_keys=[visiting_tech_id])
