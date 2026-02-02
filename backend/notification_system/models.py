"""
Enhanced notification models for the help desk application
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime
import enum


class NotificationChannel(str, enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"


class NotificationPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class NotificationTemplate(Base):
    """
    Table to store notification templates
    """
    __tablename__ = "notification_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)  # Template name
    subject = Column(String(500), nullable=False)  # Subject for email notifications
    body = Column(Text, nullable=False)  # Notification body with placeholders
    channel = Column(Enum(NotificationChannel), nullable=False)  # Channel type
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.NORMAL)  # Priority level
    is_active = Column(Boolean, default=True)  # Whether template is active
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship back to notifications
    notifications = relationship("Notification", back_populates="template")


class UserNotificationPreference(Base):
    """
    Table to store user's notification preferences
    """
    __tablename__ = "user_notification_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # User who set the preference
    channel = Column(Enum(NotificationChannel), nullable=False)  # Channel type
    is_enabled = Column(Boolean, default=True)  # Whether this channel is enabled
    priority_threshold = Column(Enum(NotificationPriority), default=NotificationPriority.NORMAL)  # Minimum priority to receive
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="notification_preferences")


class MobilePushToken(Base):
    """
    Table to store mobile push tokens for users
    """
    __tablename__ = "mobile_push_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # User who owns the token
    token = Column(String(500), nullable=False)  # Push notification token
    device_type = Column(String(50), nullable=True)  # Device type (iOS, Android, etc.)
    is_active = Column(Boolean, default=True)  # Whether token is still valid
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="mobile_push_tokens")


def extend_existing_models():
    """
    Extend existing models with new relationships
    """
    from models import User, Notification
    
    # Add relationships to User model
    User.notification_preferences = relationship("UserNotificationPreference", back_populates="user", lazy="dynamic")
    User.mobile_push_tokens = relationship("MobilePushToken", back_populates="user", lazy="dynamic")
    
    # Add template relationship to Notification model
    Notification.template_id = Column(Integer, ForeignKey("notification_templates.id"))
    # Use String to be compatible with existing VARCHAR columns 
    Notification.priority = Column(String, default="normal") 
    Notification.channel = Column(String, default="in_app")
    Notification.template = relationship("NotificationTemplate", back_populates="notifications")


# Call this function to establish relationships
extend_existing_models()

# Also add the template relationship to the Notification model in models.py
from sqlalchemy import event
from models import User

@event.listens_for(User, 'class_instrument')
def setup_notification_relationships(target, cls):
    if not hasattr(cls, 'notifications'):
        from models import Notification
        cls.notifications = relationship("Notification", back_populates="user")