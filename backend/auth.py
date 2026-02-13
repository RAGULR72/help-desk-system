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
MIN_PASSWORD_LENGTH = int(os.getenv("MIN_PASSWORD_LENGTH", "12"))
REQUIRE_UPPERCASE = os.getenv("REQUIRE_UPPERCASE", "true").lower() == "true"
REQUIRE_LOWERCASE = os.getenv("REQUIRE_LOWERCASE", "true").lower() == "true"
REQUIRE_DIGIT = os.getenv("REQUIRE_DIGIT", "true").lower() == "true"
REQUIRE_SPECIAL = os.getenv("REQUIRE_SPECIAL", "true").lower() == "true"

# Password Hashing Configuration
# Argon2id is the current gold standard for password hashing
# We keep bcrypt as a fallback for legacy hashes
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"], 
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
    argon2__parallelism=4
)

# Pepper adds an extra layer of security. It is NOT stored in the database.
# If the DB is leaked, passwords still cannot be cracked without the PASS_PEPPER secret.
PASS_PEPPER = os.getenv("PASS_PEPPER", SECRET_KEY)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password against security policy"""
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters long"
    
    # Extended limit for Argon2 (unlike BCrypt's 72 byte limit)
    if len(password) > 256:
        return False, "Password is too long (max 256 characters)"
    
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

def verify_password(plain_password: str, hashed_password: str) -> tuple[bool, bool, Optional[str]]:
    """
    Verify a password and check if it needs re-hashing (due to algorithm upgrade or salt/rounds change).
    Returns: (is_verified, needs_update, new_hash)
    """
    try:
        # 1. Try with Pepper (New standard)
        peppered = f"{plain_password}{PASS_PEPPER}"
        verified, new_hash = pwd_context.verify_and_update(peppered, hashed_password)
        if verified:
            return True, new_hash is not None, new_hash
            
        # 2. Fallback for legacy hashes (No pepper)
        # This handles users who registered before Pepper or Argon2 were introduced.
        verified_legacy, new_hash_legacy = pwd_context.verify_and_update(plain_password, hashed_password)
        if verified_legacy:
            # Upgrade them to Argon2 + Pepper immediately
            return True, True, get_password_hash(plain_password)
            
        return False, False, None
    except Exception as e:
        print(f"Auth Error: {e}")
        return False, False, None

def get_password_hash(password: str) -> str:
    """Hash a password using Argon2id with Pepper"""
    peppered = f"{password}{PASS_PEPPER}"
    return pwd_context.hash(peppered)

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
    """Create a short-lived token for 2FA stage (Increased to 10 mins for better reliability)"""
    expire = datetime.utcnow() + timedelta(minutes=10)
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
        payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM], options={"leeway": 60})
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

from fastapi import Depends, HTTPException, status, Request

def get_current_user(request: Request, db: Session = Depends(get_db)):
    """Get the current authenticated user from Secure Cookie (preferred) or JWT Header"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Priority 1: Secure Cookie (Step 5: Cookies Only)
    token = request.cookies.get("access_token")
    
    # Priority 2: Authorization Header (Legacy support)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token or is_token_blacklisted(token):
        raise credentials_exception
    
    try:
        # Use leeway to handle small clock differences between servers
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"leeway": 60})
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if username is None or token_type != "access":
            # If cookie was invalid, try header before giving up
            if not request.headers.get("Authorization"):
                raise credentials_exception
            token = request.headers.get("Authorization").split(" ")[1]
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"leeway": 60})
            username = payload.get("sub")
            if not username: raise credentials_exception
            
        token_data = schemas.TokenData(username=username)
    except JWTError:
        # Fallback to header if cookie failed
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ")[1]
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"leeway": 60})
                username = payload.get("sub")
                if username:
                    return db.query(models.User).filter(models.User.username == username).first()
            except:
                pass
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

def check_permission(user: models.User, module: str, action: str) -> bool:
    """
    Check if a user has a specific granular permission.
    Admins always have permission.
    Managers often have default authority.
    """
    if user.role == "admin":
        return True
    
    # 1. Default Role-based fallback
    if user.role == "manager":
        # Managers can do most things by default unless explicitly restricted
        # For now, we allow all ticket actions for managers
        if module == "Tickets":
            return True
        if module == "Users" and action in ["view", "edit"]:
            return True
            
    # 2. Check explicit permissions field
    if not user.permissions:
        return False

    import json
    try:
        # User permissions can be a JSON string or a list/dict
        perms = json.loads(user.permissions) if isinstance(user.permissions, str) else user.permissions
        
        # Format 1: List of objects [{"module": "Tickets", "edit": True, "delete": True}]
        if isinstance(perms, list):
            for p in perms:
                if p.get("module") == module:
                    return p.get(action) is True
        
        # Format 2: Dict {"ticket_edit": True, "ticket_delete": True}
        if isinstance(perms, dict):
            # Try to match key pattern: module_action (e.g. ticket_delete)
            # Module names are usually capitalized in frontend (Tickets, Users, etc.)
            mod_prefix = module.lower()
            if mod_prefix.endswith('s'): mod_prefix = mod_prefix[:-1] # Tickets -> ticket
            
            key = f"{mod_prefix}_{action.lower()}"
            if perms.get(key) is True:
                return True
                
            # Direct match
            if perms.get(f"{module.lower()}_{action.lower()}") is True:
                return True
    except:
        pass

    return False

def require_2fa(current_user: models.User = Depends(get_current_user)):
    """Enforce 2FA for highly sensitive operations (e.g. Admin Panel)"""
    if not current_user.is_2fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Two-factor authentication (2FA) is mandatory for this operation. Please enable it in your profile settings."
        )
    return current_user

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
            
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"leeway": 60})
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None