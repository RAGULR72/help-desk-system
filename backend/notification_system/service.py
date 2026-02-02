"""
Enhanced notification service for the help desk application
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Dict, List, Optional
import json
from datetime import datetime
from models import User, Notification as NotificationModel
from notification_system.models import (
    NotificationTemplate,
    UserNotificationPreference,
    MobilePushToken,
    NotificationChannel,
    NotificationPriority
)
from email_service import send_email
from sms_service import send_sms
from sqlalchemy.exc import SQLAlchemyError


class NotificationService:
    """
    Enhanced service class for handling notifications with templates and preferences
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_notification_template(
        self, 
        name: str, 
        subject: str, 
        body: str, 
        channel: NotificationChannel, 
        priority: NotificationPriority = NotificationPriority.NORMAL,
        is_active: bool = True
    ) -> NotificationTemplate:
        """
        Create a new notification template
        """
        try:
            template = NotificationTemplate(
                name=name,
                subject=subject,
                body=body,
                channel=channel,
                priority=priority,
                is_active=is_active
            )
            self.db.add(template)
            self.db.commit()
            self.db.refresh(template)
            return template
        except SQLAlchemyError:
            self.db.rollback()
            return None
    
    def get_notification_template(self, template_id: int) -> NotificationTemplate:
        """
        Get a notification template by ID
        """
        try:
            return self.db.query(NotificationTemplate).filter(
                NotificationTemplate.id == template_id
            ).first()
        except SQLAlchemyError:
            return None
    
    def get_notification_templates(self, channel: NotificationChannel = None) -> List[NotificationTemplate]:
        """
        Get notification templates, optionally filtered by channel
        """
        try:
            query = self.db.query(NotificationTemplate).filter(NotificationTemplate.is_active == True)
            
            if channel:
                query = query.filter(NotificationTemplate.channel == channel)
            
            return query.all()
        except SQLAlchemyError:
            return []
    
    def update_notification_template(
        self, 
        template_id: int, 
        name: str = None, 
        subject: str = None, 
        body: str = None, 
        channel: NotificationChannel = None, 
        priority: NotificationPriority = None,
        is_active: bool = None
    ) -> bool:
        """
        Update a notification template
        """
        try:
            template = self.db.query(NotificationTemplate).filter(
                NotificationTemplate.id == template_id
            ).first()
            
            if not template:
                return False
            
            if name is not None:
                template.name = name
            if subject is not None:
                template.subject = subject
            if body is not None:
                template.body = body
            if channel is not None:
                template.channel = channel
            if priority is not None:
                template.priority = priority
            if is_active is not None:
                template.is_active = is_active
            
            template.updated_at = datetime.utcnow()
            self.db.commit()
            return True
        except SQLAlchemyError:
            self.db.rollback()
            return False
    
    def set_user_notification_preference(
        self, 
        user_id: int, 
        channel: NotificationChannel, 
        is_enabled: bool = True, 
        priority_threshold: NotificationPriority = NotificationPriority.NORMAL
    ) -> UserNotificationPreference:
        """
        Set notification preferences for a user
        """
        try:
            # Check if preference already exists
            preference = self.db.query(UserNotificationPreference).filter(
                and_(
                    UserNotificationPreference.user_id == user_id,
                    UserNotificationPreference.channel == channel
                )
            ).first()
            
            if preference:
                # Update existing preference
                preference.is_enabled = is_enabled
                preference.priority_threshold = priority_threshold
                preference.updated_at = datetime.utcnow()
            else:
                # Create new preference
                preference = UserNotificationPreference(
                    user_id=user_id,
                    channel=channel,
                    is_enabled=is_enabled,
                    priority_threshold=priority_threshold
                )
                self.db.add(preference)
            
            self.db.commit()
            if not preference.id:
                self.db.refresh(preference)
            return preference
        except SQLAlchemyError:
            self.db.rollback()
            return None
    
    def get_user_notification_preferences(self, user_id: int) -> List[UserNotificationPreference]:
        """
        Get notification preferences for a user
        """
        try:
            return self.db.query(UserNotificationPreference).filter(
                UserNotificationPreference.user_id == user_id
            ).all()
        except SQLAlchemyError:
            return []
    
    def get_user_preference_for_channel(self, user_id: int, channel: NotificationChannel) -> UserNotificationPreference:
        """
        Get notification preference for a specific channel
        """
        try:
            return self.db.query(UserNotificationPreference).filter(
                and_(
                    UserNotificationPreference.user_id == user_id,
                    UserNotificationPreference.channel == channel
                )
            ).first()
        except SQLAlchemyError:
            return None
    
    def register_mobile_push_token(self, user_id: int, token: str, device_type: str = None) -> bool:
        """
        Register a mobile push token for a user
        """
        try:
            # Check if token already exists for this user
            existing_token = self.db.query(MobilePushToken).filter(
                and_(
                    MobilePushToken.user_id == user_id,
                    MobilePushToken.token == token
                )
            ).first()
            
            if existing_token:
                # Update existing token
                existing_token.is_active = True
                existing_token.device_type = device_type
                existing_token.updated_at = datetime.utcnow()
            else:
                # Create new token
                push_token = MobilePushToken(
                    user_id=user_id,
                    token=token,
                    device_type=device_type
                )
                self.db.add(push_token)
            
            self.db.commit()
            return True
        except SQLAlchemyError:
            self.db.rollback()
            return False
    
    def get_user_push_tokens(self, user_id: int) -> List[MobilePushToken]:
        """
        Get active push tokens for a user
        """
        try:
            return self.db.query(MobilePushToken).filter(
                and_(
                    MobilePushToken.user_id == user_id,
                    MobilePushToken.is_active == True
                )
            ).all()
        except SQLAlchemyError:
            return []
    
    def send_notification(
        self, 
        user_id: int, 
        title: str, 
        message: str, 
        notification_type: str = "info", 
        link: str = None, 
        template_id: int = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        channel_override: NotificationChannel = None
    ) -> bool:
        """
        Send a notification to a user respecting their preferences
        """
        try:
            # Get user
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            
            # Determine channel to use
            channel = channel_override
            if not channel:
                # If using a template, use its channel
                if template_id:
                    template = self.get_notification_template(template_id)
                    if template:
                        channel = template.channel
                else:
                    # Default to in-app notification
                    channel = NotificationChannel.IN_APP
            
            # Check user preferences for this channel
            preference = self.get_user_preference_for_channel(user_id, channel)
            if preference:
                # Check if channel is enabled and priority meets threshold
                if not preference.is_enabled:
                    # If this channel is disabled, try in-app as fallback
                    fallback_pref = self.get_user_preference_for_channel(user_id, NotificationChannel.IN_APP)
                    if not fallback_pref or not fallback_pref.is_enabled:
                        return False  # No channels enabled
                    channel = NotificationChannel.IN_APP
                elif priority.value < preference.priority_threshold.value:
                    # Priority too low for this channel, skip
                    return False
            
            # Create notification record
            notification = NotificationModel(
                user_id=user_id,
                title=title,
                message=message,
                type=notification_type,
                link=link,
                priority=priority,
                channel=channel
            )
            
            if template_id:
                notification.template_id = template_id
            
            self.db.add(notification)
            self.db.commit()
            
            # Send notification based on channel
            success = True
            if channel == NotificationChannel.EMAIL and user.email_notifications_enabled:
                success = self._send_email_notification(user, title, message, link)
            elif channel == NotificationChannel.SMS and user.sms_notifications_enabled:
                success = self._send_sms_notification(user, message)
            elif channel == NotificationChannel.PUSH:
                success = self._send_push_notification(user_id, title, message, link)
            
            return success
        except SQLAlchemyError:
            self.db.rollback()
            return False
    
    def _send_email_notification(self, user: User, title: str, message: str, link: str = None) -> bool:
        """
        Send email notification to user
        """
        try:
            # Use email service to send notification
            subject = title
            html_content = f"<h3>{title}</h3><p>{message}</p>"
            if link:
                html_content += f'<p><a href="{link}">View Details</a></p>'
            
            return send_email([user.email], subject, html_content)
        except Exception:
            return False
    
    def _send_sms_notification(self, user: User, message: str) -> bool:
        """
        Send SMS notification to user
        """
        try:
            if not user.phone:
                return False
            
            # Use SMS service to send notification
            return send_sms([user.phone], message)
        except Exception:
            return False
    
    def _send_push_notification(self, user_id: int, title: str, message: str, link: str = None) -> bool:
        """
        Send push notification to user's registered devices
        """
        try:
            tokens = self.get_user_push_tokens(user_id)
            if not tokens:
                return False
            
            # This would integrate with a push notification service like Firebase
            # For now, we'll simulate sending to registered tokens
            success_count = 0
            for token in tokens:
                # In a real implementation, this would send to a push notification service
                # e.g., Firebase Cloud Messaging, Apple Push Notification Service, etc.
                print(f"Would send push notification to token: {token.token[:10]}... for user {user_id}")
                success_count += 1
            
            return success_count > 0
        except Exception:
            return False
    
    def send_notification_from_template(
        self, 
        user_id: int, 
        template_id: int, 
        context: Dict[str, str] = None,
        link: str = None
    ) -> bool:
        """
        Send a notification using a predefined template
        """
        try:
            template = self.get_notification_template(template_id)
            if not template or not template.is_active:
                return False
            
            # Get user
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            
            # Replace placeholders in template with context values
            title = template.subject
            message = template.body
            
            if context:
                for key, value in context.items():
                    placeholder = f"{{{key}}}"
                    title = title.replace(placeholder, str(value))
                    message = message.replace(placeholder, str(value))
            
            # Send notification with template's priority and channel
            return self.send_notification(
                user_id=user_id,
                title=title,
                message=message,
                template_id=template_id,
                priority=template.priority,
                channel_override=template.channel,
                link=link
            )
        except Exception:
            return False


# Global notification service instance
notification_service = None

def get_notification_service(db: Session) -> NotificationService:
    """
    Get notification service instance
    """
    global notification_service
    if notification_service is None:
        notification_service = NotificationService(db)
    else:
        notification_service.db = db  # Update session
    return notification_service