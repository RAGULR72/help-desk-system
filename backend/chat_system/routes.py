from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, File, UploadFile, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from auth import get_current_user, get_current_user_ws
from .models import ChatRoom, ChatMessage, ChatParticipant
from .manager import manager
from models import User
from pydantic import BaseModel
from datetime import datetime, timedelta
from .models import get_ist, ChatParticipant
import json
import shutil
import os
import uuid

router = APIRouter(prefix="/api/chat", tags=["Chat"])

def has_chat_permission(user, permission_key):
    if user.role in ["admin", "manager"]:
        return True
    if not user.permissions:
        return False
    try:
        perms = json.loads(user.permissions)
        return perms.get(permission_key, False)
    except:
        return False

class MessageCreate(BaseModel):
    room_id: int
    content: str
    message_type: str = "text"

class RoomCreate(BaseModel):
    participant_ids: List[int]
    name: Optional[str] = None
    description: Optional[str] = None
    room_type: str = "direct"
    is_restricted: bool = False # Admin-only setting

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

@router.get("/users")
async def get_chat_users(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get all users that the current user can chat with"""
    users = db.query(User).filter(User.id != current_user.id, User.is_approved == True).all()
    return [{
        "id": u.id,
        "full_name": u.full_name or u.username,
        "username": u.username,
        "role": u.role,
        "avatar_url": u.avatar_url
    } for u in users]

@router.get("/rooms")
async def get_rooms(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get all chat rooms for current user"""
    rooms = db.query(ChatRoom).join(ChatParticipant).filter(ChatParticipant.user_id == current_user.id).order_by(ChatRoom.last_message_at.desc()).all()
    
    result = []
    for room in rooms:
        # Get other participants
        others = db.query(ChatParticipant).filter(
            ChatParticipant.room_id == room.id, 
            ChatParticipant.user_id != current_user.id
        ).all()
        
        last_msg = db.query(ChatMessage).filter(
            ChatMessage.room_id == room.id
        ).order_by(ChatMessage.created_at.desc()).first()
        
        # For direct chats, use the other person's name and status
        room_name = room.name
        avatar = None
        is_online = False
        last_seen = None

        if room.room_type == "direct" and others:
            other_user = others[0].user
            room_name = other_user.full_name or other_user.username
            avatar = other_user.avatar_url
            
            # Online Logic
            is_online = other_user.id in manager.active_connections
            if not is_online and other_user.last_activity_at:
                if (get_ist() - other_user.last_activity_at).total_seconds() < 120:
                    is_online = True
            
            last_seen = str(other_user.last_activity_at) if other_user.last_activity_at else None
        elif room.room_type == "group":
            avatar = room.avatar_url
        
        result.append({
            "id": room.id,
            "name": room_name or "Unknown",
            "description": room.description,
            "room_type": room.room_type,
            "is_restricted": room.is_restricted,
            "last_message": last_msg.content if last_msg else None,
            "last_message_type": last_msg.message_type if last_msg else "text",
            "last_message_at": str(last_msg.created_at) if last_msg else str(room.created_at),
            "avatar": avatar,
            "is_online": is_online,
            "last_seen": last_seen,
            "other_participants": [{
                "id": p.user_id, 
                "name": p.user.full_name or p.user.username, 
                "avatar": p.user.avatar_url
            } for p in others]
        })
    return result

@router.post("/rooms")
async def create_room(data: RoomCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Create a new chat room or return existing direct room"""
    # Check if direct room already exists between these users
    if data.room_type == "direct" and len(data.participant_ids) == 1:
        other_id = data.participant_ids[0]
        
        # Find rooms where current user is participant
        my_rooms = db.query(ChatParticipant.room_id).filter(
            ChatParticipant.user_id == current_user.id
        ).subquery()
        
        # Find if other user shares any direct room with current user
        existing = db.query(ChatRoom).join(ChatParticipant).filter(
            ChatRoom.id.in_(my_rooms),
            ChatRoom.room_type == "direct",
            ChatParticipant.user_id == other_id
        ).first()
        
        if existing:
            return {"id": existing.id, "existing": True}

    # Create new room
    if data.room_type == "group":
        # PERMISSION CHECK: Admin, Manager, or user with explicit permission
        if not has_chat_permission(current_user, "can_create_group"):
            raise HTTPException(status_code=403, detail="You do not have permission to create groups")
            
    # Security Mode: Only Admin can enable Restricted Mode
    set_restricted = False
    if data.is_restricted:
        if current_user.role == 'admin':
            set_restricted = True
            
    new_room = ChatRoom(
        name=data.name, 
        description=data.description,
        room_type=data.room_type, 
        is_restricted=set_restricted, 
        creator_id=current_user.id
    )
    db.add(new_room)
    db.commit()
    db.refresh(new_room)

    # Add participants
    all_ids = list(set(data.participant_ids + [current_user.id]))
    for uid in all_ids:
        # The creator becomes the 'admin' of the room
        role = "admin" if uid == current_user.id else "member"
        participant = ChatParticipant(room_id=new_room.id, user_id=uid, role=role)
        db.add(participant)
    
    db.commit()
    return {"id": new_room.id, "existing": False}

@router.patch("/rooms/{room_id}")
async def update_room(room_id: int, data: RoomUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Update room details (Group Name)"""
    room = db.query(ChatRoom).get(room_id)
    if not room: raise HTTPException(404, "Room not found")
    
    # Check if group and permissions
    if room.room_type != 'group': raise HTTPException(400, "Only groups can be renamed")
    
    participant = db.query(ChatParticipant).filter(ChatParticipant.room_id == room_id, ChatParticipant.user_id == current_user.id).first()
    if not participant or participant.role != 'admin':
        # System Admin or Manager can always edit
        if current_user.role not in ['admin', 'manager']:
            raise HTTPException(status_code=403, detail="Only the group creator or a system admin/manager can edit group details")
             
    if data.name:
        room.name = data.name
    if data.description is not None:
        room.description = data.description
        
    db.commit()
    return {"message": "Updated"}

@router.post("/rooms/{room_id}/avatar")
async def upload_group_avatar(room_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Upload group avatar image"""
    room = db.query(ChatRoom).get(room_id)
    if not room or room.room_type != 'group':
        raise HTTPException(404, "Group not found")

    # Permission check
    participant = db.query(ChatParticipant).filter(ChatParticipant.room_id == room_id, ChatParticipant.user_id == current_user.id).first()
    if not participant or participant.role != 'admin':
        if current_user.role not in ['admin', 'manager']:
            raise HTTPException(status_code=403, detail="No permission to change group image")

    # Generate filename
    ext = os.path.splitext(file.filename)[1]
    filename = f"group_{room_id}_{uuid.uuid4()}{ext}"
    os.makedirs("static/chat_groups", exist_ok=True)
    file_path = f"static/chat_groups/{filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    room.avatar_url = f"/static/chat_groups/{filename}"
    db.commit()
    return {"avatar_url": room.avatar_url}

@router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get detailed user profile for chat list"""
    target = db.query(User).get(user_id)
    if not target: raise HTTPException(404, "User not found")
    
    is_online = target.id in manager.active_connections
    # If no WS, check if they were active in the last 2 minutes via API
    if not is_online and target.last_activity_at:
        if (get_ist() - target.last_activity_at).total_seconds() < 120:
            is_online = True
    
    last_seen = str(target.last_activity_at) if target.last_activity_at else None

    return {
        "id": target.id,
        "full_name": target.full_name or target.username,
        "username": target.username,
        "email": target.email,
        "avatar_url": target.avatar_url,
        "role": target.role,
        "team": target.team,
        "department": target.department,
        "job_title": target.job_title,
        "phone": target.phone,
        "status": target.status,
        "is_online": is_online,
        "last_seen": last_seen
    }

@router.get("/rooms/{room_id}/info")
async def get_room_info(room_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get detailed room info including participants status"""
    room = db.query(ChatRoom).get(room_id)
    if not room: raise HTTPException(404, "Room not found")
    
    participants = db.query(ChatParticipant).filter(ChatParticipant.room_id == room_id).all()
    
    p_details = []
    for p in participants:
        is_online = p.user_id in manager.active_connections
        if not is_online and p.user and p.user.last_activity_at:
            if (get_ist() - p.user.last_activity_at).total_seconds() < 120:
                is_online = True
                
        last_seen = str(p.user.last_activity_at) if p.user and p.user.last_activity_at else None
        
        if p.user:
            p_details.append({
                "user_id": p.user_id,
                "name": p.user.full_name or p.user.username,
                "avatar": p.user.avatar_url,
                "role": p.role, # admin or member
                "is_online": is_online,
                "last_seen": last_seen,
                "email": p.user.email,
                "phone": p.user.phone,
                "job_title": p.user.job_title,
                "department": p.user.department
            })
        
    return {
        "room": {
            "id": room.id,
            "name": room.name,
            "description": room.description,
            "avatar": room.avatar_url,
            "room_type": room.room_type,
            "is_restricted": room.is_restricted,
            "created_at": str(room.created_at),
            "creator_id": room.creator_id,
            "creator_name": (room.creator.full_name or room.creator.username) if room.creator else "Unknown"
        },
        "participants": p_details
    }

@router.post("/rooms/{room_id}/participants")
async def add_participant(room_id: int, user_id: int = Body(..., embed=True), db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Add a user to the group"""
    room = db.query(ChatRoom).get(room_id)
    if not room or room.room_type != 'group':
        raise HTTPException(400, "Invalid room")
        
    # Check permissions
    # Check permissions
    # 1. System Admin or Manager
    if current_user.role in ['admin', 'manager']:
        pass
    else:
        # 2. Room Admin (Creator)
        participant = db.query(ChatParticipant).filter(ChatParticipant.room_id == room_id, ChatParticipant.user_id == current_user.id).first()
        if not participant or participant.role != 'admin':
            raise HTTPException(403, "Only group admins can add members")
    
    exists = db.query(ChatParticipant).filter(ChatParticipant.room_id == room_id, ChatParticipant.user_id == user_id).first()
    if exists: return {"message": "Already added"}
    
    new_p = ChatParticipant(room_id=room_id, user_id=user_id, role="member")
    db.add(new_p)
    db.commit()
    return {"message": "Added"}

@router.delete("/rooms/{room_id}/participants/{user_id}")
async def remove_participant(room_id: int, user_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Remove a user from the group"""
    room = db.query(ChatRoom).get(room_id)
    if not room: raise HTTPException(404)
    
    requester = db.query(ChatParticipant).filter(ChatParticipant.room_id == room_id, ChatParticipant.user_id == current_user.id).first()
    if not requester: raise HTTPException(403)
    
    target = db.query(ChatParticipant).filter(ChatParticipant.room_id == room_id, ChatParticipant.user_id == user_id).first()
    if not target: raise HTTPException(404, "User not in group")

    if user_id != current_user.id:
        # Only room admin or system admin/manager can remove others
        if requester.role != 'admin' and current_user.role not in ['admin', 'manager']:
             raise HTTPException(403, "Only admins can remove members")
    
    db.delete(target)
    db.commit()
    return {"message": "Removed"}

@router.post("/upload")
async def upload_attachment(
    file: UploadFile = File(...), 
    current_user = Depends(get_current_user)
):
    """Upload chat attachment (image, video, audio)"""
    # Create directory if not exists
    os.makedirs("static/chat_uploads", exist_ok=True)
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = f"static/chat_uploads/{filename}"
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Return URL
    return {"url": f"/static/chat_uploads/{filename}", "filename": file.filename, "content_type": file.content_type}

@router.get("/rooms/{room_id}/messages")
async def get_messages(room_id: int, limit: int = 50, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get messages for a specific room"""
    # Verify user is participant
    participant = db.query(ChatParticipant).filter(
        ChatParticipant.room_id == room_id,
        ChatParticipant.user_id == current_user.id
    ).first()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant of this room")
    
    messages = db.query(ChatMessage).filter(
        ChatMessage.room_id == room_id
    ).order_by(ChatMessage.created_at.asc()).limit(limit).all()
    
    # Fetch all participants for read status calculation
    participants = db.query(ChatParticipant).filter(ChatParticipant.room_id == room_id).all()
    
    result = []
    for m in messages:
        # Skip if deleted for me
        if m.deleted_by:
            deleted_users = m.deleted_by.split(",")
            if str(current_user.id) in deleted_users:
                continue
                
        # Calculate Read Status
        read_count = 0
        read_by_all = True
        msg_time = m.created_at
        
        for p in participants:
            if p.user_id == m.sender_id: continue # Don't count sender
            if p.last_read_at and p.last_read_at >= msg_time:
                read_count += 1
            else:
                read_by_all = False
                
        # Status: sent, delivered (assumed), read
        status = "sent"
        if read_count > 0: status = "read" # Or double tick logic
        
        result.append({
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_name": (m.sender.full_name or m.sender.username) if m.sender else "Deleted User",
            "sender_avatar": m.sender.avatar_url if m.sender else None,
            "content": m.content,
            "message_type": m.message_type,
            "created_at": str(m.created_at),
            "is_deleted": m.is_deleted,
            "read_status": status,
            "read_count": read_count, 
            "total_participants": len(participants) - 1 # Exclude sender
        })
        
    return result

@router.post("/rooms/{room_id}/read")
async def mark_room_read(room_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Mark all messages in room as read"""
    participant = db.query(ChatParticipant).filter(
        ChatParticipant.room_id == room_id,
        ChatParticipant.user_id == current_user.id
    ).first()
    
    if participant:
        participant.last_read_at = get_ist()
        db.commit()
        
        # Notify others (sender needs to see blue ticks)
        # We broadcast to room so senders update their UI
        other_participants = db.query(ChatParticipant).filter(ChatParticipant.room_id == room_id).all()
        p_ids = [p.user_id for p in other_participants]
        
        await manager.broadcast_to_room({
            "type": "read_receipt",
            "room_id": room_id,
            "user_id": current_user.id,
            "read_at": str(participant.last_read_at)
        }, p_ids)
        
    return {"status": "success"}

@router.get("/unread-count")
async def get_total_unread_count(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get total unread messages across all rooms for the user"""
    # Find all rooms the user is in
    participants = db.query(ChatParticipant).filter(ChatParticipant.user_id == current_user.id).all()
    
    total_unread = 0
    for p in participants:
        # Count messages in this room created after last_read_at, excluding sender
        unread = db.query(ChatMessage).filter(
            ChatMessage.room_id == p.room_id,
            ChatMessage.created_at > p.last_read_at,
            ChatMessage.sender_id != current_user.id,
            ChatMessage.is_deleted == False
        ).count()
        total_unread += unread
        
    return {"total_unread": total_unread}

@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int, 
    delete_type: str = Query(..., regex="^(me|everyone)$"), 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """Delete message for me or everyone"""
    msg = db.query(ChatMessage).get(message_id)
    if not msg:
        raise HTTPException(404, "Message not found")
        
    if msg.sender_id != current_user.id:
        # Only admin can delete others' messages? For now sender only.
        if delete_type == "everyone" and current_user.role != 'admin':
             raise HTTPException(403, "You can only delete your own messages")
        if delete_type == "me":
             pass # Allowed to delete any message for self? Usually yes for chat history cleanup.
             # But here we assume only sender deletes? User request implies "Send panavanga delete panalam" (Sender can delete).
             pass

    if delete_type == "everyone":
        # Check 24h
        if get_ist() - msg.created_at > timedelta(hours=24) and current_user.role != 'admin':
             raise HTTPException(400, "Cannot delete for everyone after 24 hours")
        
        msg.is_deleted = True
        msg.content = "This message was deleted"
    
    else: # delete for me
        deleted_list = msg.deleted_by.split(",") if msg.deleted_by else []
        if str(current_user.id) not in deleted_list:
            deleted_list.append(str(current_user.id))
            msg.deleted_by = ",".join(deleted_list)
            
    db.commit()
    
    # Broadcast
    participants = db.query(ChatParticipant).filter(ChatParticipant.room_id == msg.room_id).all()
    p_ids = [p.user_id for p in participants]
    
    await manager.broadcast_to_room({
        "type": "message_deleted",
        "room_id": msg.room_id,
        "message_id": msg.id,
        "delete_type": delete_type, 
        "is_deleted": msg.is_deleted 
    }, p_ids)
    
    return {"status": "deleted"}

@router.get("/messages/{message_id}/info")
async def get_message_info(message_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get read receipts details"""
    msg = db.query(ChatMessage).get(message_id)
    if not msg: raise HTTPException(404)
    
    # Check permissions (Sender or Admin)
    # User said "antha chat... select panie... info option". Implies any participant.
    
    participants = db.query(ChatParticipant).filter(ChatParticipant.room_id == msg.room_id).all()
    
    read_list = []
    delivered_list = [] # We assume delivered if they exist? No real delivery status without ACK.
    
    msg_time = msg.created_at
    for p in participants:
         if p.user_id == msg.sender_id: continue
         
         status = "sent"
         read_at = None
         if p.last_read_at and p.last_read_at >= msg_time:
             status = "read"
             read_at = str(p.last_read_at) # Approximate read time (last active read)
             
         read_list.append({
             "user_id": p.user_id,
             "name": p.user.full_name or p.user.username,
             "avatar": p.user.avatar_url,
             "status": status,
             "read_at": read_at
         })
         
    return read_list

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """WebSocket endpoint for real-time messaging"""
    # Import SessionLocal inside to avoid circular dependency issues or ensure valid scope
    from database import SessionLocal
    db = SessionLocal()
    
    try:
        user = await get_current_user_ws(token, db)
        if not user:
            await websocket.close(code=1008)
            db.close()
            return
    except Exception as e:
        print(f"WS Auth Error: {e}")
        await websocket.close(code=1008)
        db.close()
        return

    await manager.connect(websocket, user.id)
    try:
        while True:
            # Receive data from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Action: send_message
            if message_data.get("action") == "send_message":
                room_id = message_data.get("room_id")
                content = message_data.get("content")
                message_type = message_data.get("message_type", "text")
                attachment_url = message_data.get("attachment_url")
                
                if not content or not room_id:
                    continue
                
                # Save to DB
                new_msg = ChatMessage(
                    room_id=room_id, 
                    sender_id=user.id, 
                    content=content,
                    message_type=message_type,
                    attachment_url=attachment_url
                )
                db.add(new_msg)
                db.commit()
                db.refresh(new_msg)
                
                # Get participants to broadcast
                participants = db.query(ChatParticipant).filter(ChatParticipant.room_id == room_id).all()
                p_ids = [p.user_id for p in participants]
                
                # Broadcast to all room participants
                broadcast_msg = {
                    "type": "new_message",
                    "room_id": room_id,
                    "message": {
                        "id": new_msg.id,
                        "sender_id": user.id,
                        "sender_name": user.full_name or user.username,
                        "sender_avatar": user.avatar_url,
                        "content": content,
                        "message_type": message_type,
                        "attachment_url": attachment_url,
                        "created_at": str(new_msg.created_at)
                    }
                }
                await manager.broadcast_to_room(broadcast_msg, p_ids)
            
            # Action: typing indicator
            elif message_data.get("action") == "typing":
                room_id = message_data.get("room_id")
                participants = db.query(ChatParticipant).filter(ChatParticipant.room_id == room_id).all()
                p_ids = [p.user_id for p in participants if p.user_id != user.id]
                await manager.broadcast_to_room({
                    "type": "typing",
                    "room_id": room_id,
                    "user_id": user.id,
                    "user_name": user.full_name or user.username
                }, p_ids)

    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)
    except Exception as e:
        print(f"WS Loop Error: {e}")
        manager.disconnect(websocket, user.id)
    finally:
        db.close()
