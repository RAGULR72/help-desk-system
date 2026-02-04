from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import sys
import os

# Ensure root directory is in sys.path for models, schemas, and auth imports
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

import models as root_models
from admin_system import models as admin_models
import schemas as root_schemas
from admin_system import schemas as admin_schemas
import auth
from database import get_db
import shutil
import uuid
from fastapi import File, UploadFile
from ticket_system.models import Ticket
import email_service
import logging
from audit_logger import AuditLogger

router = APIRouter(prefix="/api/admin", tags=["admin"])

def get_current_admin(current_user: root_models.User = Depends(auth.get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    # Step 14: 2FA Mandatory for Admins
    if not current_user.is_2fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Two-factor authentication (2FA) is mandatory for administrator access. Please enable it in your security settings."
        )
    return current_user

def get_current_admin_or_manager(current_user: root_models.User = Depends(auth.get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    # Step 14: 2FA Mandatory for Staff
    if not current_user.is_2fa_enabled:
         raise HTTPException(
             status_code=status.HTTP_403_FORBIDDEN,
             detail="Two-factor authentication (2FA) is mandatory for staff access. Please enable it in your security settings."
         )
    return current_user

@router.get("/users/pending", response_model=List[root_schemas.UserResponse])
def get_pending_users(
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_admin)
):
    """Get all users waiting for approval"""
    return db.query(root_models.User).filter(root_models.User.is_approved == False).all()

@router.get("/users", response_model=List[root_schemas.UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_admin_or_manager)
):
    """Get all registered users"""
    return db.query(root_models.User).all()

@router.get("/users/{user_id}", response_model=root_schemas.UserResponse)
def get_user_details(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_admin_or_manager)
):
    """Get details for a specific user"""
    user = db.query(root_models.User).filter(root_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
@router.post("/users", response_model=root_schemas.UserResponse)
def create_user_admin(
    user_data: root_schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_admin)
):
    """Create a new user directly (Admin only)"""
    # Check if user already exists
    db_user = db.query(root_models.User).filter(root_models.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = db.query(root_models.User).filter(root_models.User.username == user_data.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user
    hashed_password = auth.get_password_hash(user_data.password)
    db_user = root_models.User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        phone=user_data.phone,
        company=user_data.company,
        location=user_data.location,
        hashed_password=hashed_password,
        is_approved=True, # Admin created users are auto-approved
        role=user_data.role,
        tech_level=user_data.tech_level,
        specialization=user_data.specialization,
        is_vip=user_data.is_vip,
        must_change_password=user_data.must_change_password,
        manager=user_data.manager,
        department=getattr(user_data, 'department', None),
        job_title=getattr(user_data, 'job_title', None),
        is_2fa_enabled=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Audit Log
    AuditLogger.log_admin_action(db, current_user.id, db_user.id, "user_created", f"Created user {db_user.username} with role {db_user.role}")
    
    return db_user

@router.put("/users/{user_id}/approve")
def approve_user(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_admin)
):
    """Approve a user and assign a role"""
    user = db.query(root_models.User).filter(root_models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if role not in ["user", "admin", "manager", "technician"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role"
        )
        
    user.is_approved = True
    user.role = role
    
    # Audit Log
    AuditLogger.log_admin_action(db, current_user.id, user.id, "user_approved", f"Approved user {user.username} as {role}")
    
    db.commit()
    return {"message": "User approved successfully"}

@router.put("/users/{user_id}")
def update_user_details(
    user_id: int,
    user_update: root_schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_admin)
):
    """Update user details (Admin only)"""
    user = db.query(root_models.User).filter(root_models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields if provided
    if user_update.status is not None:
        user.status = user_update.status
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.username is not None:
        # Check uniqueness
        existing_user = db.query(root_models.User).filter(root_models.User.username == user_update.username, root_models.User.id != user_id).first()
        if existing_user:
             raise HTTPException(status_code=400, detail="Username already taken")
        user.username = user_update.username
    if user_update.email is not None:
         # Check uniqueness
        existing_email = db.query(root_models.User).filter(root_models.User.email == user_update.email, root_models.User.id != user_id).first()
        if existing_email:
             raise HTTPException(status_code=400, detail="Email already registered")
        user.email = user_update.email
    if user_update.phone is not None:
        user.phone = user_update.phone
    if user_update.role is not None:
        user.role = user_update.role
    if user_update.is_approved is not None:
        user.is_approved = user_update.is_approved
    if user_update.is_2fa_enabled is not None:
        user.is_2fa_enabled = user_update.is_2fa_enabled
    if user_update.tech_level is not None:
        user.tech_level = user_update.tech_level
    if user_update.specialization is not None:
        user.specialization = user_update.specialization
    if user_update.is_vip is not None:
        user.is_vip = user_update.is_vip
    if user_update.location is not None:
        user.location = user_update.location
    if user_update.department is not None:
        user.department = user_update.department
    if user_update.job_title is not None:
        user.job_title = user_update.job_title
    if user_update.manager is not None:
        user.manager = user_update.manager
    if user_update.about_me is not None:
        user.about_me = user_update.about_me
    if user_update.is_2fa_setup is not None:
        user.is_2fa_setup = user_update.is_2fa_setup
    if user_update.has_security_keys is not None:
        user.has_security_keys = user_update.has_security_keys
    if user_update.has_backup_codes is not None:
        user.has_backup_codes = user_update.has_backup_codes
    if user_update.permissions is not None:
        import json
        # Ensure it's stored as JSON string
        user.permissions = json.dumps(user_update.permissions)
        
    # Audit Log
    AuditLogger.log_admin_action(db, current_user.id, user.id, "user_updated", f"Updated details for user {user.username}")
    
    db.commit()
    return {"message": "User updated successfully"}

@router.put("/users/{user_id}/password")
def reset_user_password(
    user_id: int,
    password_data: root_schemas.PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_admin_or_manager)
):
    """Reset user password (Admin/Manager only)"""
    user = db.query(root_models.User).filter(root_models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Manager restriction: Can only reset non-admin users
    if current_user.role == "manager" and user.role == "admin":
        raise HTTPException(status_code=403, detail="Managers cannot reset Admin passwords")

    new_password = password_data.new_password
    logging.info(f"DEBUG PW Reset: Resetting password for {user.username}. Length: {len(new_password)}")
    
    # Hash the new password
    hashed_pw = auth.get_password_hash(new_password)
    user.hashed_password = hashed_pw
    user.must_change_password = True # Force password change on next login
    
    from datetime import datetime
    user.password_last_changed = datetime.utcnow()
    
    # Audit Log
    AuditLogger.log_admin_action(db, current_user.id, user.id, "password_reset", f"Manually reset password for {user.username}")
    
    db.commit()
    logging.info(f"DEBUG PW Reset: Success for {user.username}. New hash starts with: {hashed_pw[:10]}")
    return {"message": "Password reset successfully"}

@router.post("/users/{user_id}/reset-link")
def send_user_reset_link(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_admin_or_manager)
):
    """Send a password reset link to the user (Admin/Manager only)"""
    user = db.query(root_models.User).filter(root_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.email:
        raise HTTPException(status_code=400, detail="User does not have an email address configured")
    
    # Generate a temporary reset link (in a real app, this would be a signed token)
    # For now, we point to the login page or a dedicated reset page if it exists
    reset_link = f"http://localhost:5173/login?reset_user={user.username}"
    
    success = email_service.send_password_reset_email(
        to_email=user.email,
        username=user.username,
        reset_link=reset_link
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send reset email. Check SMTP configuration.")
        
    return {"message": "Reset link sent successfully to " + user.email}

@router.post("/users/{user_id}/avatar")
async def upload_user_avatar_admin(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_admin_or_manager)
):
    """Upload avatar for a specific user (Admin/Manager only)"""
    user = db.query(root_models.User).filter(root_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Create directory if not exists
    os.makedirs("static/avatars", exist_ok=True)
    
    # Security: Extension Whitelist
    ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file extension: {file_extension}")

    # Generate unique filename
    filename = f"{user_id}_{uuid.uuid4()}{file_extension}"
    file_path = f"static/avatars/{filename}"
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update user profile
    avatar_url = f"/static/avatars/{filename}"
    user.avatar_url = avatar_url
    db.commit()
    db.refresh(user)
    
    return {"avatar_url": avatar_url}

@router.get("/users/{user_id}/activity")
def get_user_activity_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_admin_or_manager)
):
    """Get activity history for a specific user"""
    # 1. Recent Activity logs
    recent_activity = db.query(admin_models.UserActivity).filter(
        admin_models.UserActivity.user_id == user_id
    ).order_by(admin_models.UserActivity.timestamp.desc()).limit(20).all()

    # 2. Login History
    login_history = db.query(admin_models.LoginLog).filter(
        admin_models.LoginLog.user_id == user_id
    ).order_by(admin_models.LoginLog.login_time.desc()).limit(10).all()

    # 3. Ticket Stats (Overall)
    tickets_created = db.query(Ticket).filter(Ticket.user_id == user_id).count()
    tickets_resolved = db.query(Ticket).filter(
        Ticket.user_id == user_id,
        Ticket.status.in_(['resolved', 'closed'])
    ).count()
    active_tickets = db.query(Ticket).filter(
        Ticket.user_id == user_id,
        Ticket.status.in_(['open', 'in_progress'])
    ).count()

    # 4. Monthly Stats & Comparison
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_end = this_month_start - timedelta(seconds=1)
    last_month_start = last_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    this_month_created = db.query(Ticket).filter(
        Ticket.user_id == user_id,
        Ticket.created_at >= this_month_start
    ).count()

    last_month_created = db.query(Ticket).filter(
        Ticket.user_id == user_id,
        Ticket.created_at >= last_month_start,
        Ticket.created_at <= last_month_end
    ).count()

    this_month_resolved = db.query(Ticket).filter(
        Ticket.user_id == user_id,
        Ticket.status.in_(['resolved', 'closed']),
        Ticket.updated_at >= this_month_start
    ).count()

    last_month_resolved = db.query(Ticket).filter(
        Ticket.user_id == user_id,
        Ticket.status.in_(['resolved', 'closed']),
        Ticket.updated_at >= last_month_start,
        Ticket.updated_at <= last_month_end
    ).count()

    return {
        "recent_activity": recent_activity,
        "login_history": login_history,
        "stats": {
            "created": tickets_created,
            "resolved": tickets_resolved,
            "active": active_tickets,
            "avg_response": "2.5h",
            "this_month": {
                "created": this_month_created,
                "resolved": this_month_resolved
            },
            "last_month": {
                "created": last_month_created,
                "resolved": last_month_resolved
            }
        }
    }

@router.get("/users/{user_id}/sessions")
def get_user_sessions_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_admin)
):
    """Get active sessions for a specific user"""
    return db.query(admin_models.LoginLog).filter(
        admin_models.LoginLog.user_id == user_id,
        admin_models.LoginLog.is_active == True
    ).order_by(admin_models.LoginLog.login_time.desc()).all()

@router.delete("/users/{user_id}/sessions/{session_id}")
def revoke_user_session_admin(
    user_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_admin)
):
    """Revoke a specific session for a user"""
    session = db.query(admin_models.LoginLog).filter(
        admin_models.LoginLog.id == session_id,
        admin_models.LoginLog.user_id == user_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.is_active = False
    db.commit()
    return {"message": "Session revoked"}

@router.get("/settings", response_model=List[admin_schemas.SystemSettingsResponse])
def get_system_settings(
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_admin)
):
    """Get all system settings"""
    # Seed default auto-assignment toggles if missing
    settings_to_seed = [
        ("auto_assignment_enabled", "true", "Global toggle for automatic ticket assignment"),
        ("ai_dispatcher_enabled", "true", "Enable or disable AI smart dispatcher (v1.5 Flash)")
    ]
    
    for key, val, desc in settings_to_seed:
        exists = db.query(admin_models.SystemSettings).filter(admin_models.SystemSettings.key == key).first()
        if not exists:
            db.add(admin_models.SystemSettings(key=key, value=val, description=desc))
    
    db.commit()
    
    return db.query(admin_models.SystemSettings).all()

@router.put("/settings/{key}", response_model=admin_schemas.SystemSettingsResponse)
def update_system_setting(
    key: str,
    update: admin_schemas.SystemSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_admin)
):
    """Update a system setting"""
    setting = db.query(admin_models.SystemSettings).filter(admin_models.SystemSettings.key == key).first()
    if not setting:
        # If it doesn't exist, create it 
        setting = admin_models.SystemSettings(key=key, value=update.value)
        db.add(setting)
    else:
        setting.value = update.value
    
    # Audit Log
    AuditLogger.log_admin_action(db, current_user.id, None, "system_setting_updated", f"Updated setting '{key}' to '{update.value}'")
    
    db.commit()
    db.refresh(setting)
    return setting
@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(get_current_admin)
):
    """Delete a user (Admin only)"""
    user = db.query(root_models.User).filter(root_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting self
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    # 1. Check for critical dependencies (Tickets)
    ticket_count = db.query(Ticket).filter((Ticket.user_id == user_id) | (Ticket.assigned_to == user_id)).count()
    if ticket_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete user. User '{user.username}' is linked to {ticket_count} tickets. Please deactivate the account in settings instead."
        )
    
    # 2. Travel Requests check removed (module deleted)
    pass
    try:
        from sqlalchemy import text
        # 3. Aggressive cleanup using nested transactions (SAVEPOINTs) for Postgres safety
        
        # Targets that should be DELETED
        delete_targets = [
            ("password_reset_otps", "user_id"),
            ("qr_sessions", "user_id"),
            ("login_logs", "user_id"),
            ("user_activity", "user_id"),
            ("chat_participants", "user_id"),
            ("chat_messages", "sender_id"),
            ("attendance", "user_id"),
            ("leave_requests", "user_id"),
            ("attendance_regularization", "user_id"),
            ("user_notification_preferences", "user_id"),
            ("mobile_push_tokens", "user_id"),
            ("notifications", "user_id"),
            ("asset_history", "performed_by_id"),
            ("user_groups", "user_id"),
            ("query_performance_logs", "user_id"),
            ("ticket_activity_logs", "user_id"),
            ("user_activity_logs", "user_id")
        ]
        
        # Security: Whitelist of allowed characters for raw SQL (alphanumeric + underscore)
        import re
        sql_safe_pattern = re.compile(r"^[a-zA-Z0-9_]+$")

        for table, col in delete_targets:
            # Multi-layer safety: Predefined list + Regex check
            if not sql_safe_pattern.match(table) or not sql_safe_pattern.match(col):
                continue
            
            try:
                # Use a nested transaction so one failure doesn't kill the whole session
                with db.begin_nested():
                    # bandit result B608: nosec added since identifiers are whitelisted
                    db.execute(text(f"DELETE FROM {table} WHERE {col} = :uid"), {"uid": user_id}) # nosec
            except Exception:
                pass # Table might not exist or other non-critical error

        # Targets that should be NULLIFIED (keep record but remove link)
        nullify_targets = [
            ("assets", "assigned_to_id"),
            ("tickets", "assigned_to"),
            ("leave_requests", "approved_by"),
            ("attendance_regularization", "approved_by"),
            ("ticket_repair_details", "visiting_tech_id"),
            ("chat_rooms", "creator_id")
        ]
        
        for table, col in nullify_targets:
            # Multi-layer safety: Predefined list + Regex check
            if not sql_safe_pattern.match(table) or not sql_safe_pattern.match(col):
                continue
                
            try:
                with db.begin_nested():
                    # bandit result B608: nosec added since identifiers are whitelisted
                    db.execute(text(f"UPDATE {table} SET {col} = NULL WHERE {col} = :uid"), {"uid": user_id}) # nosec
            except Exception:
                pass

        # 4. Handle remaining potential root_models relationships if any
        # 5. Final Delete of the user itself using raw SQL to bypass ORM relationship checks 
        # (This avoids errors if some related tables don't exist in the DB)
        db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": user_id}) # nosec
        
        # Audit Log
        AuditLogger.log_admin_action(db, current_user.id, user_id, "user_deleted", f"Deleted user ID {user_id} ({user.username})")
        
        db.commit()
        return {"message": "User deleted successfully"}
    except Exception as e:
        db.rollback()
        import traceback
        logging.error(f"Failed to delete user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to delete user. They might be linked to critical data. Error: {str(e)}"
        )
