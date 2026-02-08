from pydantic import BaseModel, EmailStr, validator
from datetime import datetime, date
from typing import Optional, List, Any
import json

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    team: Optional[str] = None
    role: Optional[str] = "user"
    manager: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    is_approved: Optional[bool] = False
    is_2fa_enabled: Optional[bool] = True
    is_2fa_setup: Optional[bool] = False
    email_notifications_enabled: Optional[bool] = True
    sms_notifications_enabled: Optional[bool] = False
    notification_preference: Optional[str] = "allow"
    language: Optional[str] = "English (US)"
    timezone: Optional[str] = "UTC+5:30"
    tech_level: Optional[str] = "L1"
    specialization: Optional[str] = None
    is_vip: Optional[bool] = False
    travel_budget: Optional[float] = 5000.0
    must_change_password: Optional[bool] = False
    about_me: Optional[str] = None
    is_2fa_setup: Optional[bool] = False
    has_security_keys: Optional[bool] = False
    has_backup_codes: Optional[bool] = False
    work_location: Optional[str] = None
    address: Optional[str] = None


class UserCreate(UserBase):
    password: str
    captcha_token: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str
    captcha_token: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_approved: Optional[bool] = None
    is_2fa_enabled: Optional[bool] = None
    company: Optional[str] = None
    location: Optional[str] = None
    team: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    manager: Optional[str] = None
    status: Optional[str] = None
    permissions: Optional[Any] = None # Support Dict or List
    avatar_url: Optional[str] = None
    work_location: Optional[str] = None
    address: Optional[str] = None
    email_notifications_enabled: Optional[bool] = None
    sms_notifications_enabled: Optional[bool] = None
    is_2fa_enabled: Optional[bool] = None
    notification_preference: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    tech_level: Optional[str] = None
    specialization: Optional[str] = None
    is_vip: Optional[bool] = None
    travel_budget: Optional[float] = None
    about_me: Optional[str] = None
    is_2fa_setup: Optional[bool] = None
    has_security_keys: Optional[bool] = None
    has_backup_codes: Optional[bool] = None


class PasswordUpdate(BaseModel):
    new_password: str

class Verify2FARequest(BaseModel):
    token: str
    code: str

class EmailOTPRequest(BaseModel):
    token: str

class Setup2FAInitiate(BaseModel):
    token: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    avatar_url: Optional[str] = None
    permissions: Optional[Any] = None
    password_last_changed: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    is_online: Optional[bool] = False
    
    @validator('permissions', pre=True)
    def parse_permissions(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return []
        return v
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    require_password_change: bool = False

class ChangePassword(BaseModel):
    old_password: str
    new_password: str

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginLogBase(BaseModel):
    id: int
    ip_address: Optional[str] = None
    device: Optional[str] = None
    os: Optional[str] = None
    browser: Optional[str] = None
    location: Optional[str] = None
    is_active: bool = True
    login_time: datetime

    class Config:
        from_attributes = True

class UserActivityResponse(BaseModel):
    id: int
    activity_type: str
    description: str
    timestamp: datetime
    icon: Optional[str] = None
    link: Optional[str] = None

    class Config:
        from_attributes = True

class ProfileActivityResponse(BaseModel):
    recent_activity: List[UserActivityResponse]
    stats: dict
    login_history: List[LoginLogBase]

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str # ticket, login, leave, system
    timestamp: datetime
    is_read: bool
    link: Optional[str] = None

    class Config:
        from_attributes = True

class LeaveRequestCreate(BaseModel):
    leave_type: str
    start_date: datetime
    end_date: datetime
    reason: str

class HolidayCreate(BaseModel):
    name: str
    date: date
    type: str = "Public Holiday"
    description: Optional[str] = None

class HolidayResponse(HolidayCreate):
    id: int

    class Config:
        from_attributes = True

class SystemSettingsUpdate(BaseModel):
    value: str

class SystemSettingsResponse(BaseModel):
    id: int
    key: str
    value: str
    description: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True

class ForgotPasswordRequest(BaseModel):
    login_identifier: str # Email or Username or Phone

class VerifyOTPRequest(BaseModel):
    login_identifier: str
    otp_code: str

class ResetPasswordRequest(BaseModel):
    login_identifier: str
    otp_code: str
    new_password: str

class TerminateSessionRequest(BaseModel):
    username: str
    password: str
    session_id: int

class TwoFactorVerify(BaseModel):
    username: str
    code: str
    # Password included for security to prevent replay if we don't use a temp token
    password: str 

class TwoFactorSetupResponse(BaseModel):
    secret: str
    qr_code_url: str

class TwoFactorConfirm(BaseModel):
    code: str

class TwoFactorConfirmUnauth(TwoFactorConfirm):
    username: str
    password: str



