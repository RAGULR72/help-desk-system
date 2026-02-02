from sqlalchemy.orm import Session
import models
from datetime import datetime
from ws_manager import manager
import asyncio

def create_notification(db: Session, user_id: int, title: str, message: str, type: str, link: str = None):
    """
    Create a notification for a user and broadcast via WebSocket if connected.
    Types: ticket, login, leave, system
    """
    # Check if user has notifications enabled
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user and getattr(user, 'notification_preference', 'all') == "mute":
        return None

    notification = models.Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        link=link,
        timestamp=models.get_user_time(user.timezone if user else "UTC+5:30")
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    # Broadcast via WebSocket
    try:
        # Create the payload
        payload = {
            "type": "new_notification",
            "notification": {
                "id": notification.id,
                "title": notification.title,
                "message": notification.message,
                "type": notification.type,
                "link": notification.link,
                "time": "Just now",
                "read": False
            }
        }
        
        # Since this might be called from a sync thread, use threadsafe run
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(manager.send_personal_message(payload, user_id))
            else:
                asyncio.run(manager.send_personal_message(payload, user_id))
        except RuntimeError:
            # Fallback if no loop is found
            pass
            
    except Exception as e:
        print(f"WS Broadcast Error (Notif Service): {e}")

    return notification

def notify_admins(db: Session, title: str, message: str, type: str, link: str = None):
    """
    Send notification to all admin users
    """
    admins = db.query(models.User).filter(models.User.role == "admin").all()
    for admin in admins:
        create_notification(db, admin.id, title, message, type, link)
