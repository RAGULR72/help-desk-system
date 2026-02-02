"""
SLA (Service Level Agreement) Database Models

This module defines the database schema for SLA configuration and tracking.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class SLAPolicy(Base):
    """
    Master SLA Policy
    Represents a complete set of SLA rules (e.g., "Standard IT Support SLA")
    """
    __tablename__ = "sla_policies"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Business Hours Configuration
    business_hours_mode = Column(String(20), default='24/7')  # '24/7' or 'business_hours'
    business_start_time = Column(String(5), default='09:00')  # HH:MM
    business_end_time = Column(String(5), default='17:00')    # HH:MM
    working_days = Column(JSON, default=[1, 2, 3, 4, 5])      # [1=Mon, 2=Tue, ..., 7=Sun]
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    rules = relationship("SLARule", back_populates="policy", cascade="all, delete-orphan")
    escalation_rules = relationship("SLAEscalationRule", back_populates="policy", cascade="all, delete-orphan")
    

class SLARule(Base):
    """
    Specific SLA Time Limits for Each Priority
    Defines response and resolution times for different priorities
    """
    __tablename__ = "sla_rules"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey('sla_policies.id'), nullable=False)
    
    # Priority and Category
    priority = Column(String(20), nullable=False)  # 'critical', 'high', 'medium', 'low'
    category_name = Column(String(100))  # Optional: Override for specific categories
    # location_id = Column(Integer, ForeignKey('locations.id'))  # Optional: Location-specific
    
    # Time Limits (in minutes)
    response_time_minutes = Column(Integer, nullable=False)
    resolution_time_hours = Column(Float, nullable=False)
    
    # Escalation Settings
    escalate_at_percent = Column(Integer, default=75)  # When to trigger escalation
    enabled = Column(Boolean, default=True)
    
    # Description
    description = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    policy = relationship("SLAPolicy", back_populates="rules")


class SLAEscalationRule(Base):
    """
    Escalation Rules
    Defines what happens when SLA thresholds are reached
    """
    __tablename__ = "sla_escalation_rules"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey('sla_policies.id'), nullable=False)
    
    # Escalation Level (1=Warning, 2=Critical, 3=Breach)
    level = Column(Integer, nullable=False)  # 1=Warning, 2=Critical, 3=Breach
    name = Column(String(100))               # Rule Name (e.g., 'High Priority Warning')
    description = Column(String(500))        # Rule Description
    trigger_percent = Column(Integer, nullable=False)  # % of SLA time consumed
    is_active = Column(Boolean, default=True)
    
    # Who to notify
    notify_assignee = Column(Boolean, default=True)
    notify_manager = Column(Boolean, default=False)
    notify_admin = Column(Boolean, default=False)
    
    # Notification Channels
    channel_in_app = Column(Boolean, default=True)
    channel_email = Column(Boolean, default=True)
    channel_sms = Column(Boolean, default=False)
    
    # Actions
    auto_reassign = Column(Boolean, default=False)
    reassign_to_role = Column(String(50))  # 'senior_tech', 'manager', etc.
    
    # Relationships
    policy = relationship("SLAPolicy", back_populates="escalation_rules")


class TicketSLATracking(Base):
    """
    Real-time SLA Tracking for Each Ticket
    Tracks current SLA status and history for individual tickets
    """
    __tablename__ = "ticket_sla_tracking"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey('tickets.id'), nullable=False, unique=True)
    sla_rule_id = Column(Integer, ForeignKey('sla_rules.id'), nullable=False)
    
    # Response SLA
    response_due = Column(DateTime, nullable=False)
    response_completed_at = Column(DateTime)
    response_breached = Column(Boolean, default=False)
    response_breach_minutes = Column(Integer, default=0)  # How many minutes late
    
    # Resolution SLA
    resolution_due = Column(DateTime, nullable=False)
    resolution_completed_at = Column(DateTime)
    resolution_breached = Column(Boolean, default=False)
    resolution_breach_minutes = Column(Integer, default=0)  # How many minutes late
    
    # Current Status
    current_status = Column(String(20), default='compliant')  # 'compliant', 'at_risk', 'breached'
    
    # Pause Mechanism
    is_paused = Column(Boolean, default=False)
    pause_reason = Column(String(200))
    paused_at = Column(DateTime)
    total_paused_minutes = Column(Integer, default=0)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    ticket = relationship("Ticket", back_populates="sla_tracking")
    sla_rule = relationship("SLARule")
    escalations = relationship("SLAEscalation", back_populates="tracking", cascade="all, delete-orphan")


class SLAEscalation(Base):
    """
    Escalation History
    Records when escalations were triggered
    """
    __tablename__ = "sla_escalations"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    tracking_id = Column(Integer, ForeignKey('ticket_sla_tracking.id'), nullable=False)
    ticket_id = Column(Integer, ForeignKey('tickets.id'), nullable=False)
    
    # Escalation Details
    level = Column(Integer, nullable=False)  # 1, 2, or 3
    triggered_at = Column(DateTime, default=datetime.utcnow)
    reason = Column(String(200))  # 'response_75_percent', 'resolution_90_percent', 'breach', etc.
    
    # Actions Taken
    action_taken = Column(Text)
    notified_users = Column(JSON)  # Array of user IDs who were notified
    
    # Channels Used
    sent_in_app = Column(Boolean, default=False)
    sent_email = Column(Boolean, default=False)
    sent_sms = Column(Boolean, default=False)
    
    # Relationships
    tracking = relationship("TicketSLATracking", back_populates="escalations")
    ticket = relationship("Ticket")


class SLAHoliday(Base):
    """
    Non-working Days (Holidays)
    Days when SLA clock should not run (if using business hours mode)
    """
    __tablename__ = "sla_holidays"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey('sla_policies.id'), nullable=False)
    
    date = Column(DateTime, nullable=False)
    name = Column(String(200), nullable=False)  # e.g., "New Year's Day", "Christmas"
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    policy = relationship("SLAPolicy")


class SLACategoryOverride(Base):
    """
    Category-specific SLA Overrides
    Special SLA rules for specific issue categories
    """
    __tablename__ = "sla_category_overrides"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey('sla_policies.id'), nullable=False)
    
    category_name = Column(String(100), nullable=False)  # e.g., "Server Down", "Password Reset"
    
    # Override Settings
    force_priority = Column(String(20))  # Force this category to always be this priority
    response_time_minutes = Column(Integer)
    resolution_time_hours = Column(Float)
    
    enabled = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    policy = relationship("SLAPolicy")
