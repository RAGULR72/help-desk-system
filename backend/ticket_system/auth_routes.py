from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from datetime import timedelta, datetime, timezone
from user_agents import parse
import requests
import sys
import os
# Ensure root directory is in sys.path for models import
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

import models as root_models
from admin_system import models as admin_models
import schemas as root_schemas
from . import schemas as ticket_schemas
import auth
from database import get_db
import email_service
import notification_service
import sms_service
import random
import uuid
import pyotp
import qrcode
import io
import base64
from security_middleware import record_failed_login_attempt
from audit_logger import AuditLogger



router = APIRouter(prefix="/api/auth", tags=["authentication"])

def get_ist(timezone="UTC+5:30"):
    """Returns current user time based on their timezone preference"""
    return root_models.get_user_time(timezone)

@router.get("/ping")
def ping():
    return {"message": "pong"}

@router.post("/register", response_model=root_schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: root_schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    db_user = db.query(root_models.User).filter(root_models.User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    db_user = db.query(root_models.User).filter(root_models.User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Validate password strength
    is_strong, message = auth.validate_password_strength(user.password)
    if not is_strong:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Create new user
    hashed_password = auth.get_password_hash(user.password)
    db_user = root_models.User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        phone=user.phone,
        company=user.company,
        hashed_password=hashed_password,
        # Auto-approve admin user for bootstrapping
        is_approved=(user.username == "admin"),
        role="admin" if user.username == "admin" else "user",
        is_2fa_enabled=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Send welcome email (non-blocking - won't fail registration if email fails)
    try:
        email_service.send_welcome_email(
            to_email=db_user.email,
            username=db_user.username,
            full_name=db_user.full_name
        )
    except Exception as e:
        print(f"Failed to send welcome email: {e}")
        
    # Notify Admins about new registration
    try:
        notification_service.notify_admins(
            db=db, 
            title="New User Registration", 
            message=f"New user {db_user.full_name} ({db_user.username}) has registered and requires approval.", 
            type="user", 
            link="/admin/users"
        )
    except Exception as e:
        print(f"Failed to notify admins: {e}")
    
    return db_user

@router.post("/login")
def login(user_credentials: root_schemas.UserLogin, request: Request, db: Session = Depends(get_db)):
    """Login and get access token"""
    try:
        # Support for email OR username login, case-insensitive
        login_identifier = user_credentials.username.lower()
        user = db.query(root_models.User).filter(
            or_(
                func.lower(root_models.User.username) == login_identifier,
                func.lower(root_models.User.email) == login_identifier
            )
        ).first()
        
        # Resolve IP and Browser Info
        client_ip = request.client.host
        user_agent_string = request.headers.get('user-agent', '')
        user_agent = parse(user_agent_string)
        device_type = "Mobile" if user_agent.is_mobile else "Tablet" if user_agent.is_tablet else "Desktop"
        os_name = user_agent.os.family
        browser_name = user_agent.browser.family

        print(f"DEBUG Login: Attempting login for {user_credentials.username}")
        if not user:
             print(f"DEBUG Login: User {user_credentials.username} not found")
        elif not auth.verify_password(user_credentials.password, user.hashed_password):
             print(f"DEBUG Login: Password verification failed for {user_credentials.username}")
             # Let's also check if hashing the entered password matches the stored one (manually)
             # Just to be extra sure about the auth module
             test_hash = auth.get_password_hash(user_credentials.password)
             print(f"DEBUG Login: Entered PW hash test: {test_hash[:10]}... Stored: {user.hashed_password[:10]}...")
             
        if not user or not auth.verify_password(user_credentials.password, user.hashed_password):
            # Log failed attempt
            try:
                # Record failed attempt for rate limiting/IP blocking
                record_failed_login_attempt(client_ip)
                
                fail_log = admin_models.LoginLog(
                    user_id=user.id if user else None,
                    username=user_credentials.username,
                    ip_address=client_ip,
                    device=device_type,
                    os=os_name,
                    browser=browser_name,
                    location="Unauthorized Attempt",
                    is_active=False
                )
                db.add(fail_log)
                if user:
                    activity = admin_models.UserActivity(
                        user_id=user.id,
                        activity_type="login_failed",
                        description=f"Failed login from {device_type} ({browser_name})",
                        icon="alert-circle"
                    )
                    db.add(activity)
                    
                    # Notify the user about the failed attempt
                    try:
                        notification_service.create_notification(
                            db=db,
                            user_id=user.id,
                            title="Security Alert: Failed Login",
                            message=f"An unauthorized login attempt was detected from {device_type} ({os_name}).",
                            type="login"
                        )
                    except Exception as ne:
                        print(f"Failed to create security notification: {ne}")
                
                db.commit()
            except Exception as e:
                print(f"Error logging failed login: {e}")
                db.rollback()
            
            raise HTTPException(status_code=401, detail="Incorrect username or password")
        
        if not user.is_approved:
            raise HTTPException(status_code=403, detail="Wait for admin approval")
        
        # 2FA Check
        if user.is_2fa_enabled:
            pre_auth_token = auth.create_pre_auth_token(user.username)
            if not user.is_2fa_setup:
                return {
                    "status": "2fa_setup_required",
                    "message": "2FA setup is required for this account.",
                    "username": user.username,
                    "pre_auth_token": pre_auth_token
                }
            return {
                "status": "2fa_required",
                "message": "Two-factor authentication code required.",
                "username": user.username,
                "pre_auth_token": pre_auth_token
            }

        # Create token
        access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        
        # Tracking Logic (Successful Login)
        try:
            ist_now = get_ist(user.timezone)
            
            # Session Limit Management: Max 2 active sessions (As per user request)
            active_sessions = db.query(admin_models.LoginLog).filter(
                admin_models.LoginLog.user_id == user.id,
                admin_models.LoginLog.is_active == True
            ).order_by(admin_models.LoginLog.login_time.asc()).all()
            
            # If we already have 2 or more, return 409 Conflict with session list
            if len(active_sessions) >= 2:
                session_list = []
                for s in active_sessions:
                    session_list.append({
                        "id": s.id,
                        "device": s.device,
                        "os": s.os,
                        "browser": s.browser,
                        "ip": s.ip_address,
                        "time": s.login_time.strftime("%Y-%m-%d %H:%M")
                    })
                raise HTTPException(
                    status_code=409, 
                    detail={
                        "message": "session_limit_exceeded",
                        "sessions": session_list
                    }
                )
            
            new_log = admin_models.LoginLog(
                user_id=user.id,
                username=user.username,
                ip_address=client_ip,
                device=device_type,
                os=os_name,
                browser=browser_name,
                location="Local Connection",
                is_active=True,
                login_time=ist_now
            )
            db.add(new_log)
            
            activity = admin_models.UserActivity(
                user_id=user.id,
                activity_type="login",
                description=f"Successfully logged in via {device_type} ({browser_name})",
                icon="log-in",
                timestamp=ist_now
            )
            db.add(activity)
            
            # Successful login notification
            try:
                notification_service.create_notification(
                    db=db,
                    user_id=user.id,
                    title="Login Successful",
                    message=f"You have logged in from {device_type} ({os_name}) at {ist_now.strftime('%H:%M')}.",
                    type="login"
                )
            except: pass
            
            db.commit()
        except Exception as e:
            print(f"Tracking error: {e}")
            db.rollback()
            new_log = None  # Ensure it's defined even if tracking fails

        return {
            "access_token": access_token, 
            "token_type": "bearer",
            "require_password_change": user.must_change_password,
            "session_id": new_log.id if new_log else None
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions", response_model=List[root_schemas.LoginLogBase])
def get_sessions(
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(auth.get_current_user)
):
    """Get all active sessions for current user"""
    sessions = db.query(admin_models.LoginLog).filter(
        admin_models.LoginLog.user_id == current_user.id,
        admin_models.LoginLog.is_active == True
    ).order_by(admin_models.LoginLog.login_time.desc()).all()
    return sessions

@router.post("/sessions/terminate-by-credentials")
def terminate_session_by_credentials(
    data: root_schemas.TerminateSessionRequest,
    db: Session = Depends(get_db)
):
    """Terminate a specific session using credentials when limit is hit"""
    login_identifier = data.username.lower()
    user = db.query(root_models.User).filter(
        or_(
            func.lower(root_models.User.username) == login_identifier,
            func.lower(root_models.User.email) == login_identifier
        )
    ).first()

    if not user or not auth.verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Authentication failed")

    session = db.query(admin_models.LoginLog).filter(
        admin_models.LoginLog.id == data.session_id,
        admin_models.LoginLog.user_id == user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.is_active = False
    db.commit()
    return {"message": "Session terminated successfully"}

@router.post("/change-password")
def change_password(
    password_data: root_schemas.ChangePassword,
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(auth.get_current_user)
):
    """Change user password (force change or voluntary)"""
    user = db.query(root_models.User).filter(root_models.User.id == current_user.id).first()
    
    # Verify old password
    if not auth.verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password"
        )
    
    # Validate new password strength
    is_strong, message = auth.validate_password_strength(password_data.new_password)
    if not is_strong:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
        
    # Save password hash
    ist_now = get_ist(current_user.timezone)
    current_user.hashed_password = auth.get_password_hash(password_data.new_password)
    current_user.must_change_password = False
    current_user.password_last_changed = ist_now
    
    # Log activity
    activity = admin_models.UserActivity(
        user_id=current_user.id,
        activity_type="password_changed",
        description="Password changed",
        icon="lock",
        timestamp=ist_now
    )
    db.add(activity)
    
    db.commit()
    db.refresh(current_user)
    
    return {"message": "Password updated successfully"}

from fastapi import File, UploadFile
import shutil
import os
import uuid

@router.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: root_models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Upload user avatar"""
    # Create directory if not exists
    os.makedirs("static/avatars", exist_ok=True)
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{current_user.id}_{uuid.uuid4()}{file_extension}"
    file_path = f"static/avatars/{filename}"
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update user profile
    # Normalize path for URL (forward slashes)
    avatar_url = f"/static/avatars/{filename}"
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)
    
    return {"avatar_url": avatar_url}

@router.put("/me", response_model=root_schemas.UserResponse)
def update_user_me(user_update: root_schemas.UserUpdate, current_user: root_models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Update current user profile"""
    user = db.query(root_models.User).filter(root_models.User.id == current_user.id).first()
    
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.email is not None:
        # Check if email is taken by another user
        existing = db.query(root_models.User).filter(root_models.User.email == user_update.email).filter(root_models.User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = user_update.email
    if user_update.phone is not None:
        user.phone = user_update.phone
    if user_update.company is not None:
        user.company = user_update.company
    if user_update.location is not None:
        user.location = user_update.location
    if user_update.role is not None:
        user.role = user_update.role
    if user_update.job_title is not None:
        user.job_title = user_update.job_title
    if user_update.department is not None:
        user.department = user_update.department
    if user_update.manager is not None:
        user.manager = user_update.manager
    if user_update.status is not None:
        user.status = user_update.status
    if user_update.permissions is not None:
        import json as py_json
        user.permissions = py_json.dumps(user_update.permissions)

    if user_update.work_location is not None:
        user.work_location = user_update.work_location
    if user_update.address is not None:
        user.address = user_update.address
    if user_update.email_notifications_enabled is not None:
        user.email_notifications_enabled = user_update.email_notifications_enabled
    if user_update.sms_notifications_enabled is not None:
        user.sms_notifications_enabled = user_update.sms_notifications_enabled
         
    if user_update.is_2fa_enabled is not None:
        # Don't allow disable if forced by admin, but allowing user toggle for now if they have setup
        if user_update.is_2fa_enabled == False:
             user.is_2fa_enabled = False

    if user_update.avatar_url is not None:
        user.avatar_url = user_update.avatar_url

    if user_update.team is not None:
        user.team = user_update.team

    if user_update.notification_preference is not None:
        user.notification_preference = user_update.notification_preference
        
    if user_update.language is not None:
        user.language = user_update.language
        
    if user_update.timezone is not None:
        user.timezone = user_update.timezone
    
    if user_update.email_notifications_enabled is not None:
        user.email_notifications_enabled = user_update.email_notifications_enabled
    if user_update.sms_notifications_enabled is not None:
        user.sms_notifications_enabled = user_update.sms_notifications_enabled
    if user_update.is_2fa_enabled is not None:
        user.is_2fa_enabled = user_update.is_2fa_enabled
    if user_update.notification_preference is not None:
        user.notification_preference = user_update.notification_preference
    
    db.commit()
    db.refresh(user)
    print(f"DEBUG: Updated user: {user.username}, Team: {user.team}")
    db.refresh(user)
    return user

@router.get("/me", response_model=root_schemas.UserResponse)
def read_users_me(current_user: root_models.User = Depends(auth.get_current_user)):
    """Get current user profile"""
    # Populate is_online status using manager and last_activity
    try:
        from chat_system.manager import manager
        current_user.is_online = current_user.id in manager.active_connections
        if not current_user.is_online and current_user.last_activity_at:
            if (root_models.get_ist() - current_user.last_activity_at).total_seconds() < 120:
                current_user.is_online = True
    except Exception as e:
        print(f"Error checking online status in /me: {e}")
        current_user.is_online = False
        
    return current_user

@router.get("/activity", response_model=list[root_schemas.LoginLogBase])
def get_activity_history(current_user: root_models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Get all login activity history (success and failure)"""
    logs = db.query(admin_models.LoginLog).filter(
        admin_models.LoginLog.user_id == current_user.id
    ).order_by(admin_models.LoginLog.login_time.desc()).limit(20).all()
    return logs

@router.delete("/sessions/{log_id}")
@router.delete("/activity/{log_id}")
def delete_activity_log(log_id: int, current_user: root_models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Revoke/Delete a session log (Logout from device)"""
    log = db.query(admin_models.LoginLog).filter(admin_models.LoginLog.id == log_id, admin_models.LoginLog.user_id == current_user.id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    
    # Deactivate the session
    log.is_active = False
    db.commit()
    return {"message": "Session revoked successfully"}

@router.get("/profile/activity", response_model=root_schemas.ProfileActivityResponse)
def get_user_profile_activity(
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(auth.get_current_user)
):
    """Combine activity, stats, and login history for profile view"""
    # 1. Recent Activity
    recent_activity = db.query(admin_models.UserActivity).filter(
        admin_models.UserActivity.user_id == current_user.id
    ).order_by(admin_models.UserActivity.timestamp.desc()).limit(20).all()

    # 2. Login History
    login_history = db.query(admin_models.LoginLog).filter(
        admin_models.LoginLog.user_id == current_user.id
    ).order_by(admin_models.LoginLog.login_time.desc()).limit(10).all()

    # 3. Ticket Stats
    print(f"DEBUG: Fetching ticket stats for user_id={current_user.id}, username={current_user.username}")
    
    # Use raw SQL to avoid circular import issues with Ticket model
    try:
        from sqlalchemy import text
        
        is_tech = current_user.role == 'technician'
        
        if is_tech:
            # Stats for technician: focused on assigned workload
            tickets_count = db.execute(
                text("SELECT COUNT(*) FROM tickets WHERE assigned_to = :user_id"),
                {"user_id": current_user.id}
            ).scalar() or 0
            
            tickets_resolved = db.execute(
                text("SELECT COUNT(*) FROM tickets WHERE assigned_to = :user_id AND status IN ('resolved', 'closed')"),
                {"user_id": current_user.id}
            ).scalar() or 0
            
            active_tickets = db.execute(
                text("SELECT COUNT(*) FROM tickets WHERE assigned_to = :user_id AND status IN ('open', 'in_progress')"),
                {"user_id": current_user.id}
            ).scalar() or 0
            
            logging.info(f"Tech ticket stats retrieved for {current_user.username}")
        else:
            # Stats for regular user: focused on their own requests
            tickets_count = db.execute(
                text("SELECT COUNT(*) FROM tickets WHERE user_id = :user_id"),
                {"user_id": current_user.id}
            ).scalar() or 0
            
            tickets_resolved = db.execute(
                text("SELECT COUNT(*) FROM tickets WHERE user_id = :user_id AND status IN ('resolved', 'closed')"),
                {"user_id": current_user.id}
            ).scalar() or 0
            
            active_tickets = db.execute(
                text("SELECT COUNT(*) FROM tickets WHERE user_id = :user_id AND status IN ('open', 'in_progress')"),
                {"user_id": current_user.id}
            ).scalar() or 0
            
            
        tickets_created = tickets_count # Reusing naming to match schema but data is role-specific
    except Exception as e:
        logging.error(f"Failed to query ticket stats: {e}")
        tickets_created = 0
        tickets_resolved = 0
        active_tickets = 0


    # Mock avg response time for now
    avg_response = "2.5h"

    return {
        "recent_activity": recent_activity,
        "login_history": login_history,
        "stats": {
            "created": tickets_created,
            "resolved": tickets_resolved,
            "active": active_tickets,
            "avg_response": avg_response
        }
    }

@router.get("/notifications", response_model=List[root_schemas.NotificationResponse])

def get_notifications(
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(auth.get_current_user)
):
    """Fetch notifications for currently logged in user"""
    # Only return if notifications are ALLOWED
    if current_user.notification_preference == "mute":
        return []
        
    return db.query(root_models.Notification).filter(
        root_models.Notification.user_id == current_user.id
    ).order_by(root_models.Notification.timestamp.desc()).limit(20).all()

@router.post("/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(auth.get_current_user)
):
    """Mark a notification as read"""
    notif = db.query(root_models.Notification).filter(
        root_models.Notification.id == notif_id,
        root_models.Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}

@router.post("/forgot-password")
def forgot_password_request(
    request: root_schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """Initiate password reset by sending OTP"""
    identifier = request.login_identifier.lower()
    
    # Find user by email, username, or phone
    user = db.query(root_models.User).filter(
        or_(
            func.lower(root_models.User.email) == identifier,
            func.lower(root_models.User.username) == identifier,
            root_models.User.phone == identifier
        )
    ).first()
    
    if not user:
        # For security, don't reveal if user exists by returning 200 anyway
        # but in a private UI it might be better to show error. 
        # User said "forgot password option work aagla so adha ready panu"
        raise HTTPException(status_code=404, detail="User not found with provided identifier")
    
    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=10) # 10 min expiry
    
    # Store OTP
    otp_entry = root_models.PasswordResetOTP(
        user_id=user.id,
        otp_code=otp_code,
        expires_at=expires_at
    )
    db.add(otp_entry)
    db.commit()
    
    # Send via SMS if phone exists
    sms_sent = False
    if user.phone:
        sms_sent = sms_service.send_otp(user.phone, otp_code)
    
    # Also send via email as fallback
    email_sent = False
    if user.email:
        email_sent = email_service.send_password_reset_otp_email(
            to_email=user.email,
            username=user.username,
            otp_code=otp_code
        )

    if not sms_sent and not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send verification code")
        
    return {"message": "Verification code sent successfully", "method": "phone" if sms_sent else "email"}

@router.post("/verify-otp")
def verify_otp(
    request: root_schemas.VerifyOTPRequest,
    db: Session = Depends(get_db)
):
    """Verify the provided OTP code"""
    identifier = request.login_identifier.lower()
    user = db.query(root_models.User).filter(
        or_(
            func.lower(root_models.User.email) == identifier,
            func.lower(root_models.User.username) == identifier,
            root_models.User.phone == identifier
        )
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    otp_entry = db.query(root_models.PasswordResetOTP).filter(
        root_models.PasswordResetOTP.user_id == user.id,
        root_models.PasswordResetOTP.otp_code == request.otp_code,
        root_models.PasswordResetOTP.is_used == False,
        root_models.PasswordResetOTP.expires_at > datetime.utcnow()
    ).first()
    
    if not otp_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
        
    return {"message": "OTP verified successfully", "valid": True}

@router.post("/reset-password")
def reset_password(
    request: root_schemas.ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Reset password using verified OTP"""
    identifier = request.login_identifier.lower()
    user = db.query(root_models.User).filter(
        or_(
            func.lower(root_models.User.email) == identifier,
            func.lower(root_models.User.username) == identifier,
            root_models.User.phone == identifier
        )
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    otp_entry = db.query(root_models.PasswordResetOTP).filter(
        root_models.PasswordResetOTP.user_id == user.id,
        root_models.PasswordResetOTP.otp_code == request.otp_code,
        root_models.PasswordResetOTP.is_used == False,
        root_models.PasswordResetOTP.expires_at > datetime.utcnow()
    ).order_by(root_models.PasswordResetOTP.created_at.desc()).first()
    
    if not otp_entry:
        raise HTTPException(status_code=400, detail="Verification session expired or invalid")
    
    # Validate new password strength
    is_strong, message = auth.validate_password_strength(request.new_password)
    if not is_strong:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Update password
    user.hashed_password = auth.get_password_hash(request.new_password)
    user.must_change_password = False # Reset this if they reset password
    
    # Mark OTP as used
    otp_entry.is_used = True
    
    # Log activity
    activity = admin_models.UserActivity(
        user_id=user.id,
        activity_type="password_reset",
        description="Password was reset via OTP verification",
        icon="key"
    )
    db.add(activity)
    
    db.commit()
    return {"message": "Password has been reset successfully. You can now login with your new password."}

@router.post("/qr/initiate")
def initiate_qr_session(request: Request, db: Session = Depends(get_db)):
    """Initialize a QR login session"""
    session_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    
    # Capture target device info
    user_agent_string = request.headers.get("user-agent", "")
    ua = parse(user_agent_string)
    
    device_type = "Mobile" if ua.is_mobile else "Tablet" if ua.is_tablet else "PC" if ua.is_pc else "Desktop"
    os_name = ua.os.family
    browser_name = ua.browser.family
    client_ip = request.client.host
    
    qr_session = root_models.QRSession(
        session_id=session_id,
        expires_at=expires_at,
        ip_address=client_ip,
        device=device_type,
        os=os_name,
        browser=browser_name
    )
    db.add(qr_session)
    db.commit()
    
    return {"session_id": session_id, "expires_in": 300}

@router.get("/qr/status/{session_id}")
def check_qr_status(session_id: str, db: Session = Depends(get_db)):
    """Check if QR session is authorized"""
    qr_session = db.query(root_models.QRSession).filter(
        root_models.QRSession.session_id == session_id
    ).first()
    
    if not qr_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if qr_session.expires_at < datetime.utcnow():
        qr_session.status = "expired"
        db.commit()
        return {"status": "expired"}
        
    if qr_session.status == "authorized":
        # Return the token and then mark as completed
        response = {
            "status": "authorized",
            "access_token": qr_session.token,
            "token_type": "bearer",
            "session_id": qr_session.log_id
        }
        qr_session.status = "completed"
        db.commit()
        return response
        
    return {"status": qr_session.status}

@router.post("/qr/authorize/{session_id}")
def authorize_qr_session(
    session_id: str, 
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(auth.get_current_user)
):
    """Authorize a QR session from a logged-in device"""
    qr_session = db.query(root_models.QRSession).filter(
        root_models.QRSession.session_id == session_id,
        root_models.QRSession.status == "pending"
    ).first()
    
    if not qr_session:
        raise HTTPException(status_code=404, detail="Invalid or expired session")
        
    if qr_session.expires_at < datetime.utcnow():
        qr_session.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Session expired")
        
    # Session Limit Management: Max 2 active sessions
    active_sessions = db.query(admin_models.LoginLog).filter(
        admin_models.LoginLog.user_id == current_user.id,
        admin_models.LoginLog.is_active == True
    ).all()
    
    if len(active_sessions) >= 2:
        session_list = []
        for s in active_sessions:
            session_list.append({
                "id": s.id,
                "device": s.device,
                "os": s.os,
                "browser": s.browser,
                "ip": s.ip_address,
                "time": s.login_time.strftime("%Y-%m-%d %H:%M")
            })
        raise HTTPException(
            status_code=409, 
            detail={
                "message": "session_limit_exceeded",
                "sessions": session_list
            }
        )
        
    # Generate token for the user who is authorizing
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": current_user.username}, expires_delta=access_token_expires
    )
    
    # Create LoginLog for the new session (the one displaying the QR)
    ist_now = get_ist(current_user.timezone)
    new_log = admin_models.LoginLog(
        user_id=current_user.id,
        username=current_user.username,
        ip_address=qr_session.ip_address,
        device=qr_session.device,
        os=qr_session.os,
        browser=qr_session.browser,
        location="QR Authentication",
        is_active=True,
        login_time=ist_now
    )
    db.add(new_log)
    db.flush()
    
    qr_session.status = "authorized"
    qr_session.user_id = current_user.id
    qr_session.token = access_token
    qr_session.log_id = new_log.id
    db.commit()
    
@router.post("/2fa/setup", response_model=root_schemas.TwoFactorSetupResponse)
def setup_2fa(
    data: root_schemas.UserLogin, # Accept credentials for initial forced setup
    db: Session = Depends(get_db)
):
    """Generate TOTP secret and QR code URI for 2FA setup"""
    user = db.query(root_models.User).filter(root_models.User.username == data.username).first()
    if not user or not auth.verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Authentication failed")

    if not user.totp_secret:
        user.totp_secret = pyotp.random_base32()
        db.commit()
    
    totp = pyotp.TOTP(user.totp_secret)
    qr_uri = totp.provisioning_uri(
        name=user.email,
        issuer_name="Proserve Help Desk"
    )
    
    return {
        "secret": user.totp_secret,
        "qr_code_url": qr_uri
    }

@router.post("/2fa/confirm")
def confirm_2fa(
    data: root_schemas.TwoFactorConfirmUnauth,
    db: Session = Depends(get_db)
):
    """Verify first TOTP code to finalize 2FA setup"""
    user = db.query(root_models.User).filter(root_models.User.username == data.username).first()
    if not user or not auth.verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Authentication failed")

    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA not initiated")
    
    totp = pyotp.TOTP(user.totp_secret)
    if totp.verify(data.code):
        user.is_2fa_enabled = True
        user.is_2fa_setup = True
        db.commit()
        return {"message": "2FA enabled successfully"}
    else:
        raise HTTPException(status_code=400, detail="Invalid verification code")

@router.get("/2fa/setup-authenticated", response_model=root_schemas.TwoFactorSetupResponse)
def setup_2fa_authenticated(
    current_user: root_models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Generate TOTP secret for authenticated user"""
    if not current_user.totp_secret:
        current_user.totp_secret = pyotp.random_base32()
        db.commit()
    
    totp = pyotp.TOTP(current_user.totp_secret)
    qr_uri = totp.provisioning_uri(
        name=current_user.email,
        issuer_name="Proserve Help Desk"
    )
    
    return {
        "secret": current_user.totp_secret,
        "qr_code_url": qr_uri
    }

@router.post("/2fa/confirm-authenticated")
def confirm_2fa_authenticated(
    data: root_schemas.TwoFactorConfirm,
    current_user: root_models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Confirm 2FA for authenticated user"""
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA not initiated")
    
    totp = pyotp.TOTP(current_user.totp_secret)
    if totp.verify(data.code):
        current_user.is_2fa_enabled = True
        current_user.is_2fa_setup = True
        db.commit()
        return {"message": "2FA enabled successfully"}
    else:
        raise HTTPException(status_code=400, detail="Invalid verification code")

@router.post("/2fa/disable")
def disable_2fa(
    current_user: root_models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Disable 2FA for the current user"""
    current_user.is_2fa_enabled = False
    current_user.is_2fa_setup = False
    current_user.totp_secret = None
    db.commit()
    return {"message": "2FA disabled successfully"}

@router.post("/2fa/verify")
def verify_2fa_login(
    data: root_schemas.TwoFactorVerify,
    db: Session = Depends(get_db)
):
    """Verify TOTP code during login process"""
    login_identifier = data.username.lower()
    user = db.query(root_models.User).filter(
        or_(
            func.lower(root_models.User.username) == login_identifier,
            func.lower(root_models.User.email) == login_identifier
        )
    ).first()

    if not user or not auth.verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Authentication failed")

    if not user.is_2fa_enabled or not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA not enabled for this user")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(data.code):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")

    # If verification succeeds, proceed with full login logic (tracking, token creation)
    # Since we need the request for tracking, we'll refactor login logic slightly 
    # but for now let's just return success for the frontend to handle.
    # Actually, the frontend should get the token here.
    
    # Generate Token
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "require_password_change": user.must_change_password
    }


@router.post("/logout")
def logout(
    request: Request,
    db: Session = Depends(get_db),
    current_user: root_models.User = Depends(auth.get_current_user),
    token: str = Depends(auth.oauth2_scheme)
):
    """Logout and blacklist current token"""
    # Blacklist the token
    auth.blacklist_token(token)
    
    # Mark session as inactive
    client_ip = request.client.host
    active_session = db.query(admin_models.LoginLog).filter(
        admin_models.LoginLog.user_id == current_user.id,
        admin_models.LoginLog.is_active == True,
        admin_models.LoginLog.ip_address == client_ip
    ).first()
    
    if active_session:
        active_session.is_active = False
    
    # Log audit event
    AuditLogger.log_logout(db, current_user.id, client_ip)
    
    db.commit()
    return {"message": "Successfully logged out"}


@router.post("/refresh")
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    payload = auth.verify_refresh_token(refresh_token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    username = payload.get("sub")
    user = db.query(root_models.User).filter(root_models.User.username == username).first()
    
    if not user or not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or not approved"
        )
    
    # Generate new access token
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }


@router.get("/security/policy")
def get_security_policy():
    """Get current password policy requirements"""
    return {
        "min_length": auth.MIN_PASSWORD_LENGTH,
        "require_uppercase": auth.REQUIRE_UPPERCASE,
        "require_lowercase": auth.REQUIRE_LOWERCASE,
        "require_digit": auth.REQUIRE_DIGIT,
        "require_special": auth.REQUIRE_SPECIAL
    }

@router.post("/2fa/setup/initiate")
def setup_2fa_initiate(req: root_schemas.Setup2FAInitiate, db: Session = Depends(get_db)):
    """Initiate 2FA setup by generating a secret and QR code"""
    try:
        payload = auth.jwt.decode(req.token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        if payload.get("type") != "2fa_pre_auth":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        username = payload.get("sub")
        user = db.query(root_models.User).filter(root_models.User.username == username).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if user.is_2fa_setup:
            raise HTTPException(status_code=400, detail="2FA already setup")
            
        # Generate secret
        secret = pyotp.random_base32()
        user.totp_secret = secret
        db.commit()
        
        # Create TOTP object for URI
        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(name=user.email, issuer_name="Proserve Help Desk")
        
        # Generate QR Code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        qr_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        return {
            "secret": secret,
            "qr_code": f"data:image/png;base64,{qr_base64}",
            "uri": uri
        }
    except auth.JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

@router.post("/2fa/setup/finalize")
def setup_2fa_finalize(req: root_schemas.Verify2FARequest, db: Session = Depends(get_db)):
    """Verify first 2FA code and finalize setup"""
    try:
        payload = auth.jwt.decode(req.token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        if payload.get("type") != "2fa_pre_auth":
            raise HTTPException(status_code=401, detail="Invalid token type")
            
        username = payload.get("sub")
        user = db.query(root_models.User).filter(root_models.User.username == username).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        totp = pyotp.TOTP(user.totp_secret)
        if totp.verify(req.code):
            user.is_2fa_setup = True
            db.commit()
            
            # Now issue full access token
            access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = auth.create_access_token(
                data={"sub": user.username}, expires_delta=access_token_expires
            )
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "message": "2FA setup complete"
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid verification code")
    except auth.JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

@router.post("/2fa/verify")
def verify_2fa(req: root_schemas.Verify2FARequest, db: Session = Depends(get_db)):
    """Verify 2FA code during login"""
    try:
        payload = auth.jwt.decode(req.token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        if payload.get("type") != "2fa_pre_auth":
            raise HTTPException(status_code=401, detail="Invalid token type")
            
        username = payload.get("sub")
        user = db.query(root_models.User).filter(root_models.User.username == username).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if not user.totp_secret:
            raise HTTPException(status_code=400, detail="2FA not setup")
            
        totp = pyotp.TOTP(user.totp_secret)
        if totp.verify(req.code):
            # Issue full tokens
            access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = auth.create_access_token(
                data={"sub": user.username}, expires_delta=access_token_expires
            )
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "message": "2FA verification successful"
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid verification code")
    except auth.JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")