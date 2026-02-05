import sys
import os
# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Dict
import models
import schemas
from database import get_db
import auth
import json

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

# --- REST Endpoints ---

@router.get("/", response_model=List[schemas.NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get notifications for the current user"""
    notifications = db.query(models.Notification)\
        .filter(models.Notification.user_id == current_user.id)\
        .order_by(desc(models.Notification.timestamp))\
        .limit(50)\
        .all()
    return notifications

@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Mark a notification as read"""
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    db.commit()
    return {"status": "success"}

@router.delete("/clear")
def clear_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Clear all notifications for the user"""
    db.query(models.Notification)\
        .filter(models.Notification.user_id == current_user.id)\
        .delete(synchronize_session=False)
    db.commit()
    return {"status": "success"}

# Internal use or testing
@router.post("/", response_model=schemas.NotificationResponse)
def create_notification(
    notification: schemas.NotificationResponse, # Using Response schema as input for simplicity in this context, ideally create a separate Create schema
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # This endpoint allows frontend to trigger test notifications, or other services to call it
    # Ideally should be protected or internal only
    new_notif = models.Notification(
        user_id=current_user.id,
        title=notification.title,
        message=notification.message,
        type=notification.type,
        link=notification.link,
        is_read=False,
        timestamp=notification.timestamp
    )
    db.add(new_notif)
    db.commit()
    db.refresh(new_notif)
    return new_notif


# --- WebSocket Manager (Simple Implementation) ---

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)

    async def send_personal_message(self, message: str, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    try:
        # Validate token
        payload = auth.verify_access_token(token)
        if not payload:
            print("WS Error: Invalid or expired token")
            await websocket.close(code=1008)
            return
            
        username = payload.get("sub")
        user = db.query(models.User).filter(models.User.username == username).first()
        
        if not user:
            print(f"WS Error: User not found for username '{username}'")
            await websocket.close(code=1008)
            return

        print(f"WS Connected: {username} (ID: {user.id})")
        await manager.connect(websocket, user.id)
        
        try:
            while True:
                # Keep alive / listen for messages
                data = await websocket.receive_text()
                # We can handle ping/pong here if needed
        except WebSocketDisconnect:
            print(f"WS Disconnect: {username}")
            manager.disconnect(websocket, user.id)
            
    except Exception as e:
        print(f"WS Critical Error: {e}")
        try:
            await websocket.close()
        except:
            pass
