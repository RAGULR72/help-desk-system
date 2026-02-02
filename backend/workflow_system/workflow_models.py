"""
Workflow automation models for the help desk application
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime
import enum
import models # Add this to ensure User is registered


class WorkflowStatus(enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class WorkflowNodeType(enum.Enum):
    START = "start"
    CONDITION = "condition"
    ACTION = "action"
    APPROVAL = "approval"
    END = "end"


class WorkflowTemplate(Base):
    """
    Table to store workflow templates
    """
    __tablename__ = "workflow_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)  # Name of the workflow
    description = Column(Text, nullable=True)  # Description of the workflow
    category = Column(String(100), nullable=True)  # Category for organization
    status = Column(Enum(WorkflowStatus), default=WorkflowStatus.DRAFT)  # Status of the workflow
    definition = Column(JSON, nullable=False)  # JSON definition of the workflow (nodes and connections)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who created the workflow
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User")
    instances = relationship("WorkflowInstance", back_populates="template")


class WorkflowInstance(Base):
    """
    Table to store running instances of workflows
    """
    __tablename__ = "workflow_instances"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_template_id = Column(Integer, ForeignKey("workflow_templates.id"), nullable=False)
    entity_type = Column(String(50), nullable=False)  # Type of entity (e.g., 'ticket', 'leave_request')
    entity_id = Column(Integer, nullable=False)  # ID of the entity this workflow is running for
    status = Column(String(50), default="running")  # Current status (running, completed, failed, etc.)
    current_node_id = Column(String(100), nullable=True)  # ID of the current node in the workflow
    context = Column(JSON, nullable=True)  # Current context/data for the workflow
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    template = relationship("WorkflowTemplate", back_populates="instances")


class WorkflowRule(Base):
    """
    Table to store conditional routing rules
    """
    __tablename__ = "workflow_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)  # Name of the rule
    description = Column(Text, nullable=True)  # Description of the rule
    condition = Column(JSON, nullable=False)  # JSON definition of the condition
    action = Column(JSON, nullable=False)  # JSON definition of the action to take
    priority = Column(Integer, default=0)  # Priority of the rule (higher number = higher priority)
    is_active = Column(Boolean, default=True)  # Whether the rule is active
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who created the rule
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User")


class WorkflowApproval(Base):
    """
    Table to store approval requests within workflows
    """
    __tablename__ = "workflow_approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_instance_id = Column(Integer, ForeignKey("workflow_instances.id"), nullable=False)
    node_id = Column(String(100), nullable=False)  # ID of the approval node in the workflow
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who needs to approve
    status = Column(String(50), default="pending")  # pending, approved, rejected
    comments = Column(Text, nullable=True)  # Approver comments
    approved_at = Column(DateTime(timezone=True), nullable=True)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workflow_instance = relationship("WorkflowInstance")
    approver = relationship("User")


class WorkflowEscalation(Base):
    """
    Table to store escalation rules and history
    """
    __tablename__ = "workflow_escalations"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_instance_id = Column(Integer, ForeignKey("workflow_instances.id"), nullable=False)
    rule_name = Column(String(255), nullable=False)  # Name of the escalation rule
    trigger_condition = Column(Text, nullable=False)  # What triggered the escalation
    target = Column(JSON, nullable=False)  # Who/what to escalate to (JSON format)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)  # Additional notes about the escalation
    
    # Relationships
    workflow_instance = relationship("WorkflowInstance")


class WorkflowCategory(Base):
    """
    Table to store ticket categories/classifications
    """
    __tablename__ = "workflow_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(20), default="#6366f1")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


def extend_user_model():
    """
    Extend User model with workflow relationships
    """
    from models import User
    
    User.created_workflows = relationship("WorkflowTemplate", back_populates="creator", lazy="dynamic")
    User.workflow_approvals = relationship("WorkflowApproval", back_populates="approver", lazy="dynamic")


# Call this function to establish relationships
extend_user_model()