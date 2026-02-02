"""
Auto-Assignment System Models
Intelligent ticket routing based on skills, workload, and performance
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from database import Base

def get_ist():
    return datetime.utcnow() + timedelta(hours=5, minutes=30)


class AssignmentRule(Base):
    """
    Configuration for auto-assignment rules
    Defines how tickets should be automatically assigned
    """
    __tablename__ = "assignment_rules"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Rule Type
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)  # Higher number = higher priority
    
    # Matching Criteria (JSON format)
    # Example: {"category": "Hardware", "priority": "critical", "location": "Mumbai"}
    criteria = Column(JSON, default={})
    
    # Assignment Strategy
    strategy = Column(String(50), default='balanced')  # balanced, skill_match, round_robin, least_busy
    
    # Technician Pool (JSON array of user IDs or roles)
    # Example: [12, 45, 67] or ["technician", "senior_technician"]
    tech_pool = Column(JSON, default=[])
    
    # Advanced Settings
    consider_workload = Column(Boolean, default=True)
    consider_skills = Column(Boolean, default=True)
    consider_location = Column(Boolean, default=False)
    consider_performance = Column(Boolean, default=True)
    
    # Workload Limits
    max_tickets_per_tech = Column(Integer, default=10)
    
    # Timestamps
    created_at = Column(DateTime, default=get_ist)
    updated_at = Column(DateTime, default=get_ist, onupdate=get_ist)
    created_by = Column(Integer, ForeignKey('users.id'))


class TechnicianSkill(Base):
    """
    Skills/Specializations for each technician
    Used for intelligent skill-based routing
    """
    __tablename__ = "technician_skills"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    
    # Skill Details
    skill_name = Column(String(100), nullable=False)  # e.g., "Network", "Hardware", "Software"
    proficiency_level = Column(Integer, default=3)  # 1-5 (1=Beginner, 5=Expert)
    
    # Certification/Training
    is_certified = Column(Boolean, default=False)
    certification_name = Column(String(200), nullable=True)
    
    # Performance Metrics
    tickets_resolved = Column(Integer, default=0)
    avg_resolution_time_hours = Column(Float, default=0.0)
    customer_satisfaction = Column(Float, default=0.0)  # Average rating (0-5)
    
    # Timestamps
    created_at = Column(DateTime, default=get_ist)
    updated_at = Column(DateTime, default=get_ist, onupdate=get_ist)


class TechnicianAvailability(Base):
    """
    Real-time availability tracking for technicians
    Includes working hours, leaves, and current status
    """
    __tablename__ = "technician_availability"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True, index=True)
    
    # Current Status
    status = Column(String(50), default='available')  # available, busy, on_leave, offline
    
    # Working Hours (JSON format)
    # Example: {"monday": {"start": "09:00", "end": "17:00"}, ...}
    working_hours = Column(JSON, default={
        "monday": {"start": "09:00", "end": "18:00"},
        "tuesday": {"start": "09:00", "end": "18:00"},
        "wednesday": {"start": "09:00", "end": "18:00"},
        "thursday": {"start": "09:00", "end": "18:00"},
        "friday": {"start": "09:00", "end": "18:00"},
        "saturday": {"start": "09:00", "end": "14:00"},
        "sunday": {"start": "off", "end": "off"}
    })
    
    # Current Workload
    active_tickets = Column(Integer, default=0)
    max_capacity = Column(Integer, default=10)
    
    # Location
    current_location = Column(String(200), nullable=True)
    is_field_tech = Column(Boolean, default=False)  # Can travel to customer sites
    
    # Timestamps
    last_active_at = Column(DateTime, default=get_ist)
    updated_at = Column(DateTime, default=get_ist, onupdate=get_ist)


class AssignmentHistory(Base):
    """
    Historical record of all auto-assignments
    Used for analytics and algorithm improvement
    """
    __tablename__ = "assignment_history"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey('tickets.id'), nullable=False, index=True)
    
    # Assignment Details
    assigned_to = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    assigned_by = Column(String(50), default='auto')  # 'auto' or 'manual' or user_id
    
    # Assignment Method
    rule_id = Column(Integer, ForeignKey('assignment_rules.id'), nullable=True)
    strategy_used = Column(String(50), nullable=True)  # balanced, skill_match, etc.
    
    # Matching Scores (for analytics)
    skill_match_score = Column(Float, default=0.0)  # 0-100
    workload_score = Column(Float, default=0.0)  # 0-100
    location_score = Column(Float, default=0.0)  # 0-100
    overall_score = Column(Float, default=0.0)  # 0-100
    
    # Outcome Tracking
    was_reassigned = Column(Boolean, default=False)
    reassignment_reason = Column(String(200), nullable=True)
    resolution_time_hours = Column(Float, nullable=True)
    customer_rating = Column(Integer, nullable=True)
    
    # Metadata
    assignment_metadata = Column(JSON, nullable=True)  # Additional context
    
    # Timestamps
    assigned_at = Column(DateTime, default=get_ist)
    resolved_at = Column(DateTime, nullable=True)


class AutoAssignmentConfig(Base):
    """
    Global configuration for auto-assignment system
    System-wide settings and toggles
    """
    __tablename__ = "auto_assignment_config"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Global Toggle
    is_enabled = Column(Boolean, default=True)
    
    # Default Strategy (if no rules match)
    default_strategy = Column(String(50), default='balanced')
    
    # Scoring Weights (0-100, should sum to 100)
    skill_weight = Column(Integer, default=40)
    workload_weight = Column(Integer, default=30)
    performance_weight = Column(Integer, default=20)
    location_weight = Column(Integer, default=10)
    
    # Fallback Behavior
    fallback_to_manager = Column(Boolean, default=True)
    manager_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # Notification Settings
    notify_on_assignment = Column(Boolean, default=True)
    notify_tech_via_email = Column(Boolean, default=True)
    notify_tech_via_sms = Column(Boolean, default=False)
    
    # Business Rules
    prevent_overload = Column(Boolean, default=True)
    respect_working_hours = Column(Boolean, default=True)
    
    # Timestamps
    updated_at = Column(DateTime, default=get_ist, onupdate=get_ist)
    updated_by = Column(Integer, ForeignKey('users.id'), nullable=True)
