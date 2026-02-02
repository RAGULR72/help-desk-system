from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Date, Float
from datetime import datetime, timedelta
from database import Base
import sqlalchemy.types as types
from encryption_utils import encrypt_data, decrypt_data

class EncryptedString(types.TypeDecorator):
    impl = types.String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None: return None
        return encrypt_data(str(value))

    def process_result_value(self, value, dialect):
        if value is None: return None
        return decrypt_data(value)

class EncryptedFloat(types.TypeDecorator):
    impl = types.String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None: return None
        return encrypt_data(str(value))

    def process_result_value(self, value, dialect):
        if value is None: return None
        decrypted = decrypt_data(value)
        try:
            return float(decrypted)
        except:
            return 0.0

def get_user_time(offset_str="UTC+5:30"):
    try:
        if not offset_str or not offset_str.startswith("UTC"):
            return datetime.utcnow() + timedelta(hours=5, minutes=30)
        
        sign = 1 if "+" in offset_str else -1
        # Extract the numbers after UTC+ or UTC-
        offset_val = offset_str.replace("UTC+", "").replace("UTC-", "")
        parts = offset_val.split(":")
        hours = int(parts[0])
        minutes = int(parts[1]) if len(parts) > 1 else 0
        
        return datetime.utcnow() + sign * timedelta(hours=hours, minutes=minutes)
    except Exception as e:
        return datetime.utcnow() + timedelta(hours=5, minutes=30)

def get_ist():
    return get_user_time("UTC+5:30")

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    location = Column(String, nullable=True)
    work_location = Column(String, nullable=True)
    address = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    team = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    department = Column(String, nullable=True)
    manager = Column(String, nullable=True)
    tech_level = Column(String, default="L1") # L1, L2, L3
    specialization = Column(String, nullable=True) # Firewall, Network, Hardware, etc.
    travel_budget = Column(Float, default=5000.0) # Monthly budget in ₹
    is_vip = Column(Boolean, default=False)
    permissions = Column(String, nullable=True) # Stored as JSON string
    status = Column(String, default="Active")
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    is_approved = Column(Boolean, default=False)
    is_2fa_enabled = Column(Boolean, default=False)
    must_change_password = Column(Boolean, default=False)
    password_last_changed = Column(DateTime, nullable=True)
    email_notifications_enabled = Column(Boolean, default=True)
    sms_notifications_enabled = Column(Boolean, default=False)
    notification_preference = Column(String, default="allow") # "allow" or "mute"
    language = Column(String, default="English (US)")
    timezone = Column(String, default="UTC+5:30")
    totp_secret = Column(String, nullable=True)
    is_2fa_setup = Column(Boolean, default=False) # For Authenticator App
    has_security_keys = Column(Boolean, default=False)
    has_backup_codes = Column(Boolean, default=False)
    about_me = Column(String, nullable=True)
    last_activity_at = Column(DateTime, default=get_ist)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    last_location_update = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=get_ist)

class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    title = Column(String)
    message = Column(String)
    type = Column(String) # ticket, login, leave, system
    timestamp = Column(DateTime, default=get_ist)
    is_read = Column(Boolean, default=False)
    link = Column(String, nullable=True)


class PasswordResetOTP(Base):
    __tablename__ = "password_reset_otps"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    otp_code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_ist)

class QRSession(Base):
    __tablename__ = "qr_sessions"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True) # Unique UUID for the QR
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Set when authorized
    status = Column(String, default="pending") # pending, authorized, expired, completed
    token = Column(String, nullable=True) # The JWT token once authorized
    log_id = Column(Integer, nullable=True) # Link to LoginLog
    ip_address = Column(String, nullable=True)
    device = Column(String, nullable=True)
    os = Column(String, nullable=True)
    browser = Column(String, nullable=True)
    created_at = Column(DateTime, default=get_ist)
    expires_at = Column(DateTime, nullable=False)



