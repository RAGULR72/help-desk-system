from datetime import datetime, timedelta
from typing import Optional, Set
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
import os
import secrets
import re
from dotenv import load_dotenv

load_dotenv()

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production-09876543210")
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))  # 1 hour (reduced from 24)
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))  # 7 days

# Token blacklist (in production, use Redis or database)
token_blacklist: Set[str] = set()

# Password policy
MIN_PASSWORD_LENGTH = int(os.getenv("MIN_PASSWORD_LENGTH", "8"))
REQUIRE_UPPERCASE = os.getenv("REQUIRE_UPPERCASE", "true").lower() == "true"
REQUIRE_LOWERCASE = os.getenv("REQUIRE_LOWERCASE", "true").lower() == "true"
REQUIRE_DIGIT = os.getenv("REQUIRE_DIGIT", "true").lower() == "true"
REQUIRE_SPECIAL = os.getenv("REQUIRE_SPECIAL", "true").lower() == "true"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)  # Increased rounds for better security
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password against security policy"""
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters long"
    
    if len(password) > 72:  # BCrypt limit
        return False, "Password must be 72 characters or less"
    
    if REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if REQUIRE_DIGIT and not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    if REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    # Check for common weak passwords
    weak_passwords = ['password', '12345678', 'qwerty', 'abc123', 'password123']
    if password.lower() in weak_passwords:
        return False, "Password is too common. Please choose a stronger password"
    
    return True, "Password is strong"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        # BCrypt has a limit of 72 bytes. If the password is longer, it's invalid.
        if len(plain_password.encode('utf-8')) > 72:
            # print("DEBUG Auth: Plain password exceeds 72 bytes")
            return False
        result = pwd_context.verify(plain_password, hashed_password)
        if not result:
            pass
        return result
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Hash a password"""
    # Enforce limit for new passwords
    if len(password.encode('utf-8')) > 72:
        raise ValueError("Password must be 72 bytes or less")
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Add security claims
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),  # Issued at
        "jti": secrets.token_urlsafe(16),  # JWT ID for tracking
        "type": "access"
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_pre_auth_token(username: str):
    """Create a short-lived token for 2FA stage"""
    expire = datetime.utcnow() + timedelta(minutes=5)
    to_encode = {
        "sub": username,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "2fa_pre_auth"
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict):
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": secrets.token_urlsafe(16),
        "type": "refresh"
    })
    encoded_jwt = jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_refresh_token(token: str) -> Optional[dict]:
    """Verify and decode refresh token"""
    try:
        payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None

def blacklist_token(token: str):
    """Add token to blacklist"""
    token_blacklist.add(token)

def is_token_blacklisted(token: str) -> bool:
    """Check if token is blacklisted"""
    return token in token_blacklist

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get the current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Check if token is blacklisted
    if is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if username is None or token_type != "access":
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    
    # Check if user is active/approved
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not approved"
        )
    
    # Update activity timestamp (throttled to every 30s for performance)
    now = models.get_ist()
    if not user.last_activity_at or (now - user.last_activity_at).total_seconds() > 30:
        try:
            user.last_activity_at = now
            db.commit()
        except Exception as e:
            print(f"Error updating user activity: {e}")
            db.rollback()

    return user

def require_roles(allowed_roles: list[str]):
    """Dependency to check if the current user has one of the allowed roles"""
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role: {current_user.role}"
            )
        return current_user
    return role_checker

async def get_current_user_ws(token: str, db: Session):
    """WebSocket specific user retriever"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        user = db.query(models.User).filter(models.User.username == username).first()
        if user:
            user.last_activity_at = models.get_ist()
            db.commit()
        return user
    except Exception:
        return None

def verify_access_token(token: str) -> Optional[dict]:
    """Verify and decode access token"""
    try:
        # Check blacklist
        if is_token_blacklisted(token):
            return None
            
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None