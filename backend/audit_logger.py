"""
Audit Logging System for Security Events
Tracks and logs all security-related activities
"""
from sqlalchemy.orm import Session
from admin_system import models as admin_models
from models import get_ist
import logging
from typing import Optional

# Configure logging
logger = logging.getLogger(__name__)

class AuditLogger:
    """Centralized audit logging for security events"""
    
    @staticmethod
    def log_security_event(
        db: Session,
        user_id: Optional[int],
        event_type: str,
        description: str,
        ip_address: Optional[str] = None,
        severity: str = "info",
        metadata: Optional[dict] = None
    ):
        """
        Log a security event
        
        Args:
            db: Database session
            user_id: User ID (None for anonymous events)
            event_type: Type of event (login, logout, password_change, etc.)
            description: Human-readable description
            ip_address: Client IP address
            severity: Event severity (info, warning, critical)
            metadata: Additional contextual data
        """
        try:
            # Create activity log
            activity = admin_models.UserActivity(
                user_id=user_id,
                activity_type=event_type,
                description=description,
                icon=_get_icon_for_event(event_type),
                timestamp=get_ist()
            )
            db.add(activity)
            db.commit()
            
            # Also log to application logger
            log_message = f"[AUDIT] {event_type.upper()}: User ID {user_id}, IP {ip_address}, {description}"
            if severity == "critical":
                logger.critical(log_message)
            elif severity == "warning":
                logger.warning(log_message)
            else:
                logger.info(log_message)
                
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            db.rollback()
    
    @staticmethod
    def log_login_success(db: Session, user_id: int, ip_address: str, device: str, browser: str):
        """Log successful login"""
        AuditLogger.log_security_event(
            db=db,
            user_id=user_id,
            event_type="login_success",
            description=f"Successful login from {device} ({browser})",
            ip_address=ip_address,
            severity="info"
        )
    
    @staticmethod
    def log_login_failure(db: Session, username: str, ip_address: str, reason: str = "Invalid credentials"):
        """Log failed login attempt"""
        AuditLogger.log_security_event(
            db=db,
            user_id=None,
            event_type="login_failed",
            description=f"Failed login attempt for '{username}': {reason}",
            ip_address=ip_address,
            severity="warning"
        )
    
    @staticmethod
    def log_logout(db: Session, user_id: int, ip_address: str):
        """Log user logout"""
        AuditLogger.log_security_event(
            db=db,
            user_id=user_id,
            event_type="logout",
            description="User logged out",
            ip_address=ip_address,
            severity="info"
        )
    
    @staticmethod
    def log_password_change(db: Session, user_id: int, forced: bool = False):
        """Log password change"""
        description = "Password changed (forced)" if forced else "Password changed voluntarily"
        AuditLogger.log_security_event(
            db=db,
            user_id=user_id,
            event_type="password_changed",
            description=description,
            severity="warning"
        )
    
    @staticmethod
    def log_password_reset(db: Session, user_id: int, ip_address: str):
        """Log password reset"""
        AuditLogger.log_security_event(
            db=db,
            user_id=user_id,
            event_type="password_reset",
            description="Password reset via OTP verification",
            ip_address=ip_address,
            severity="warning"
        )
    
    @staticmethod
    def log_2fa_enabled(db: Session, user_id: int):
        """Log 2FA enablement"""
        AuditLogger.log_security_event(
            db=db,
            user_id=user_id,
            event_type="2fa_enabled",
            description="Two-factor authentication enabled",
            severity="info"
        )
    
    @staticmethod
    def log_2fa_disabled(db: Session, user_id: int):
        """Log 2FA disablement"""
        AuditLogger.log_security_event(
            db=db,
            user_id=user_id,
            event_type="2fa_disabled",
            description="Two-factor authentication disabled",
            severity="warning"
        )
    
    @staticmethod
    def log_permission_change(db: Session, user_id: int, changed_by: int, new_role: str):
        """Log permission/role changes"""
        AuditLogger.log_security_event(
            db=db,
            user_id=user_id,
            event_type="permission_changed",
            description=f"Role changed to '{new_role}' by admin (ID: {changed_by})",
            severity="warning"
        )
    
    @staticmethod
    def log_account_locked(db: Session, user_id: int, reason: str, ip_address: str):
        """Log account lock"""
        AuditLogger.log_security_event(
            db=db,
            user_id=user_id,
            event_type="account_locked",
            description=f"Account locked: {reason}",
            ip_address=ip_address,
            severity="critical"
        )
    
    @staticmethod
    def log_suspicious_activity(db: Session, user_id: Optional[int], description: str, ip_address: str):
        """Log suspicious activity"""
        AuditLogger.log_security_event(
            db=db,
            user_id=user_id,
            event_type="suspicious_activity",
            description=description,
            ip_address=ip_address,
            severity="critical"
        )
    
    @staticmethod
    def log_session_terminated(db: Session, user_id: int, session_id: int, reason: str = "User action"):
        """Log session termination"""
        AuditLogger.log_security_event(
            db=db,
            user_id=user_id,
            event_type="session_terminated",
            description=f"Session {session_id} terminated: {reason}",
            severity="info"
        )


def _get_icon_for_event(event_type: str) -> str:
    """Get appropriate icon for event type"""
    icon_map = {
        "login_success": "log-in",
        "login_failed": "alert-circle",
        "logout": "log-out",
        "password_changed": "lock",
        "password_reset": "key",
        "2fa_enabled": "shield",
        "2fa_disabled": "shield-off",
        "permission_changed": "user-check",
        "account_locked": "lock",
        "suspicious_activity": "alert-triangle",
        "session_terminated": "x-circle"
    }
    return icon_map.get(event_type, "info")
