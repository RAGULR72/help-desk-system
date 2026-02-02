"""
Enhanced notification routes for the help desk application
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from database import get_db
from auth import get_current_user
from models import User
from notification_system.service import get_notification_service
from notification_system.schemas import (
    NotificationTemplateRequest,
    NotificationTemplateResponse,
    UserNotificationPreferenceRequest,
    UserNotificationPreferenceResponse,
    PushTokenRequest,
    SendNotificationRequest,
    SendNotificationFromTemplateRequest
)
from notification_system.models import NotificationChannel, NotificationPriority

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/templates", response_model=NotificationTemplateResponse)
async def create_notification_template(
    request: NotificationTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new notification template
    """
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to create notification templates")
    
    service = get_notification_service(db)
    
    template = service.create_notification_template(
        name=request.name,
        subject=request.subject,
        body=request.body,
        channel=request.channel,
        priority=request.priority,
        is_active=request.is_active
    )
    
    if not template:
        raise HTTPException(status_code=500, detail="Failed to create notification template")
    
    return NotificationTemplateResponse(
        id=template.id,
        name=template.name,
        subject=template.subject,
        body=template.body,
        channel=template.channel.value,
        priority=template.priority.value,
        is_active=template.is_active,
        created_at=template.created_at.isoformat() if template.created_at else None,
        updated_at=template.updated_at.isoformat() if template.updated_at else None
    )


@router.get("/templates/{template_id}", response_model=NotificationTemplateResponse)
async def get_notification_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a notification template by ID
    """
    if current_user.role not in ["admin", "manager", "agent"]:
        raise HTTPException(status_code=403, detail="Not authorized to view notification templates")
    
    service = get_notification_service(db)
    
    template = service.get_notification_template(template_id)
    
    if not template:
        raise HTTPException(status_code=404, detail="Notification template not found")
    
    return NotificationTemplateResponse(
        id=template.id,
        name=template.name,
        subject=template.subject,
        body=template.body,
        channel=template.channel.value,
        priority=template.priority.value,
        is_active=template.is_active,
        created_at=template.created_at.isoformat() if template.created_at else None,
        updated_at=template.updated_at.isoformat() if template.updated_at else None
    )


@router.get("/templates", response_model=List[NotificationTemplateResponse])
async def get_notification_templates(
    channel: Optional[NotificationChannel] = Query(None, description="Filter by channel"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get notification templates, optionally filtered by channel
    """
    if current_user.role not in ["admin", "manager", "agent"]:
        raise HTTPException(status_code=403, detail="Not authorized to view notification templates")
    
    service = get_notification_service(db)
    
    templates = service.get_notification_templates(channel=channel)
    
    return [
        NotificationTemplateResponse(
            id=template.id,
            name=template.name,
            subject=template.subject,
            body=template.body,
            channel=template.channel.value,
            priority=template.priority.value,
            is_active=template.is_active,
            created_at=template.created_at.isoformat() if template.created_at else None,
            updated_at=template.updated_at.isoformat() if template.updated_at else None
        ) for template in templates
    ]


@router.put("/templates/{template_id}", response_model=NotificationTemplateResponse)
async def update_notification_template(
    template_id: int,
    request: NotificationTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a notification template
    """
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to update notification templates")
    
    service = get_notification_service(db)
    
    success = service.update_notification_template(
        template_id=template_id,
        name=request.name,
        subject=request.subject,
        body=request.body,
        channel=request.channel,
        priority=request.priority,
        is_active=request.is_active
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification template not found")
    
    # Return updated template
    template = service.get_notification_template(template_id)
    return NotificationTemplateResponse(
        id=template.id,
        name=template.name,
        subject=template.subject,
        body=template.body,
        channel=template.channel.value,
        priority=template.priority.value,
        is_active=template.is_active,
        created_at=template.created_at.isoformat() if template.created_at else None,
        updated_at=template.updated_at.isoformat() if template.updated_at else None
    )


@router.post("/preferences", response_model=UserNotificationPreferenceResponse)
async def set_user_notification_preference(
    request: UserNotificationPreferenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Set notification preferences for the current user
    """
    service = get_notification_service(db)
    
    preference = service.set_user_notification_preference(
        user_id=current_user.id,
        channel=request.channel,
        is_enabled=request.is_enabled,
        priority_threshold=request.priority_threshold
    )
    
    if not preference:
        raise HTTPException(status_code=500, detail="Failed to set notification preference")
    
    return UserNotificationPreferenceResponse(
        id=preference.id,
        user_id=preference.user_id,
        channel=preference.channel.value,
        is_enabled=preference.is_enabled,
        priority_threshold=preference.priority_threshold.value,
        created_at=preference.created_at.isoformat() if preference.created_at else None,
        updated_at=preference.updated_at.isoformat() if preference.updated_at else None
    )


@router.get("/preferences", response_model=List[UserNotificationPreferenceResponse])
async def get_user_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get notification preferences for the current user
    """
    service = get_notification_service(db)
    
    preferences = service.get_user_notification_preferences(user_id=current_user.id)
    
    return [
        UserNotificationPreferenceResponse(
            id=preference.id,
            user_id=preference.user_id,
            channel=preference.channel.value,
            is_enabled=preference.is_enabled,
            priority_threshold=preference.priority_threshold.value,
            created_at=preference.created_at.isoformat() if preference.created_at else None,
            updated_at=preference.updated_at.isoformat() if preference.updated_at else None
        ) for preference in preferences
    ]


@router.post("/push-token")
async def register_push_token(
    request: PushTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Register a mobile push token for the current user
    """
    service = get_notification_service(db)
    
    success = service.register_mobile_push_token(
        user_id=current_user.id,
        token=request.token,
        device_type=request.device_type
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to register push token")
    
    return {"message": "Push token registered successfully"}


@router.post("/send")
async def send_notification(
    request: SendNotificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a notification to a user (admin/manager only, or to self)
    """
    if current_user.role not in ["admin", "manager"] and current_user.id != request.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to send notification to this user")
    
    service = get_notification_service(db)
    
    success = service.send_notification(
        user_id=request.user_id,
        title=request.title,
        message=request.message,
        notification_type=request.type,
        link=request.link,
        template_id=request.template_id,
        priority=request.priority,
        channel_override=request.channel_override
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send notification")
    
    return {"message": "Notification sent successfully"}


@router.post("/send-template")
async def send_notification_from_template(
    request: SendNotificationFromTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a notification using a predefined template (admin/manager only, or to self)
    """
    if current_user.role not in ["admin", "manager"] and current_user.id != request.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to send notification to this user")
    
    service = get_notification_service(db)
    
    success = service.send_notification_from_template(
        user_id=request.user_id,
        template_id=request.template_id,
        context=request.context,
        link=request.link
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send notification from template")
    
    return {"message": "Notification sent successfully from template"}