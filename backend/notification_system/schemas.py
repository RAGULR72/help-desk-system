"""
Notification schemas for the help desk application
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class NotificationChannelEnum(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"


class NotificationPriorityEnum(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class NotificationTemplateRequest(BaseModel):
    name: str
    subject: str
    body: str
    channel: NotificationChannelEnum
    priority: Optional[NotificationPriorityEnum] = "normal"
    is_active: bool = True


class NotificationTemplateResponse(BaseModel):
    id: int
    name: str
    subject: str
    body: str
    channel: str
    priority: str
    is_active: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class UserNotificationPreferenceRequest(BaseModel):
    channel: NotificationChannelEnum
    is_enabled: bool = True
    priority_threshold: Optional[NotificationPriorityEnum] = "normal"


class UserNotificationPreferenceResponse(BaseModel):
    id: int
    user_id: int
    channel: str
    is_enabled: bool
    priority_threshold: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class PushTokenRequest(BaseModel):
    token: str
    device_type: Optional[str] = None


class SendNotificationRequest(BaseModel):
    user_id: int
    title: str
    message: str
    type: Optional[str] = "info"
    link: Optional[str] = None
    template_id: Optional[int] = None
    priority: Optional[NotificationPriorityEnum] = "normal"
    channel_override: Optional[NotificationChannelEnum] = None


class SendNotificationFromTemplateRequest(BaseModel):
    user_id: int
    template_id: int
    context: Optional[Dict[str, Any]] = {}
    link: Optional[str] = None