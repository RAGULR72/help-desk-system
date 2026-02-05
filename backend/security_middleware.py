"""
Enhanced Security Middleware for Help Desk System
Provides rate limiting, IP blocking, and security headers
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List
import logging
import os
from dotenv import load_dotenv

load_dotenv()

# Security Configuration
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "300"))  # requests per window
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # seconds
LOGIN_RATE_LIMIT = int(os.getenv("LOGIN_RATE_LIMIT", "25"))  # login attempts per window
LOGIN_RATE_WINDOW = int(os.getenv("LOGIN_RATE_WINDOW", "60"))  # 1 minute
MAX_FAILED_ATTEMPTS = int(os.getenv("MAX_FAILED_ATTEMPTS", "5"))  # before IP block
IP_BLOCK_DURATION = int(os.getenv("IP_BLOCK_DURATION", "3600"))  # seconds (1 hour)
ADMIN_IP_RESTRICT = os.getenv("ADMIN_IP_RESTRICT", "false").lower() == "true"
ADMIN_WHITELIST = [ip.strip() for ip in os.getenv("ADMIN_WHITELIST", "127.0.0.1").split(",")]

logger = logging.getLogger(__name__)


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive security middleware providing:
    - Rate limiting per IP
    - Brute force protection
    - IP blocking
    - Security headers
    """
    
    def __init__(self, app):
        super().__init__(app)
        # Store request counts per IP
        self.request_counts: Dict[str, List[datetime]] = defaultdict(list)
        # Store failed login attempts per IP
        self.failed_attempts: Dict[str, List[datetime]] = defaultdict(list)
        # Blocked IPs with unblock time
        self.blocked_ips: Dict[str, datetime] = {}
        # Whitelisted IPs (bypass rate limiting)
        self.whitelist = self._load_whitelist()
        # Set global instance for route access
        set_security_middleware_instance(self)
        
    def _load_whitelist(self) -> List[str]:
        """Load IP whitelist from environment"""
        whitelist_str = os.getenv("WHITELIST_IPS", "127.0.0.1,localhost,::1")
        return [ip.strip() for ip in whitelist_str.split(",")]
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP, considering proxies"""
        # Check X-Forwarded-For header (for reverse proxies)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection IP
        return request.client.host
    
    def _is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is currently blocked"""
        if ip in self.blocked_ips:
            unblock_time = self.blocked_ips[ip]
            if datetime.utcnow() < unblock_time:
                return True
            else:
                # Unblock expired
                del self.blocked_ips[ip]
                if ip in self.failed_attempts:
                    del self.failed_attempts[ip]
                logger.info(f"IP {ip} automatically unblocked")
        return False
    
    def _block_ip(self, ip: str):
        """Block an IP address"""
        block_until = datetime.utcnow() + timedelta(seconds=IP_BLOCK_DURATION)
        self.blocked_ips[ip] = block_until
        logger.warning(f"IP {ip} blocked until {block_until} due to excessive failed attempts")
    
    def _check_rate_limit(self, ip: str, endpoint: str) -> bool:
        """
        Check if request should be rate limited
        Returns True if rate limit exceeded
        """
        if not RATE_LIMIT_ENABLED or ip in self.whitelist:
            return False
        
        now = datetime.utcnow()
        
        # Determine limits based on endpoint
        if "/api/auth/login" in endpoint or "/api/auth/2fa/verify" in endpoint:
            limit = LOGIN_RATE_LIMIT
            window = LOGIN_RATE_WINDOW
        else:
            limit = RATE_LIMIT_REQUESTS
            window = RATE_LIMIT_WINDOW
        
        # Clean old entries
        cutoff = now - timedelta(seconds=window)
        self.request_counts[ip] = [
            timestamp for timestamp in self.request_counts[ip]
            if timestamp > cutoff
        ]
        
        # Check if limit exceeded
        if len(self.request_counts[ip]) >= limit:
            return True
        
        # Record this request
        self.request_counts[ip].append(now)
        return False
    
    def record_failed_login(self, ip: str):
        """Record a failed login attempt"""
        now = datetime.utcnow()
        cutoff = now - timedelta(seconds=LOGIN_RATE_WINDOW)
        
        # Clean old entries
        self.failed_attempts[ip] = [
            timestamp for timestamp in self.failed_attempts[ip]
            if timestamp > cutoff
        ]
        
        # Record this attempt
        self.failed_attempts[ip].append(now)
        
        # Check if should block
        if len(self.failed_attempts[ip]) >= MAX_FAILED_ATTEMPTS:
            self._block_ip(ip)
    
    def _add_security_headers(self, response):
        """Add security headers to response"""
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # XSS Protection (legacy but still useful)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https: http: blob:; "
            "font-src 'self' data:; "
            "connect-src 'self' ws: wss:; "
            "frame-ancestors 'none';"
        )
        response.headers["Content-Security-Policy"] = csp
        
        # Strict Transport Security (HTTPS only - commented for dev)
        if os.getenv("ENABLE_HSTS", "false").lower() == "true":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions Policy (formerly Feature-Policy)
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        return response
    
    async def dispatch(self, request: Request, call_next):
        """Main middleware handler"""
        # Bypass for CORS preflight requests
        if request.method == "OPTIONS":
            return await call_next(request)
            
        client_ip = self._get_client_ip(request)
        endpoint = request.url.path
        
        # 1. Check if IP is blocked
        if self._is_ip_blocked(client_ip):
            logger.warning(f"Blocked IP {client_ip} attempted access to {endpoint}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": "Your IP has been temporarily blocked due to suspicious activity. Please try again later."
                }
            )
        
        # 2. Admin/Manager IP Restriction
        if ADMIN_IP_RESTRICT:
            is_admin_route = endpoint.startswith("/api/admin") or endpoint.startswith("/api/manager")
            if is_admin_route and client_ip not in ADMIN_WHITELIST:
                logger.warning(f"Unauthorized IP {client_ip} attempted to access admin route {endpoint}")
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "detail": "Access denied. Your IP address is not authorized to access administrative functions."
                    }
                )
        
        # CSRF Protection: Enforce custom header for state-changing methods
        # Browsers don't allow cross-origin requests to set custom headers without CORS preflight.
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            csrf_token = request.headers.get("X-CSRF-Token")
            requested_with = request.headers.get("X-Requested-With")
            
            # Allow login and public endpoints to pass without CSRF if needed, 
            # but usually even login should be protected.
            # We check if either of our expected security headers is present.
            if not csrf_token and not requested_with:
                logger.warning(f"CSRF attempted for IP {client_ip} on {endpoint}")
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "detail": "CSRF validation failed. Missing security headers (X-CSRF-Token or X-Requested-With)."
                    }
                )

        # Check rate limiting
        if self._check_rate_limit(client_ip, endpoint):
            logger.warning(f"Rate limit exceeded for IP {client_ip} on {endpoint}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests. Please slow down and try again later."
                },
                headers={
                    "Retry-After": str(RATE_LIMIT_WINDOW),
                    "X-RateLimit-Limit": str(RATE_LIMIT_REQUESTS),
                    "X-RateLimit-Reset": str(int((datetime.utcnow() + timedelta(seconds=RATE_LIMIT_WINDOW)).timestamp()))
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add security headers
        response = self._add_security_headers(response)
        
        # Add rate limit info headers
        if RATE_LIMIT_ENABLED and client_ip not in self.whitelist:
            response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT_REQUESTS)
            response.headers["X-RateLimit-Remaining"] = str(
                max(0, RATE_LIMIT_REQUESTS - len(self.request_counts.get(client_ip, [])))
            )
        
        return response


# Global instance for recording failed logins from routes
_security_middleware_instance = None

def set_security_middleware_instance(instance: SecurityMiddleware):
    """Set the global middleware instance"""
    global _security_middleware_instance
    _security_middleware_instance = instance

def record_failed_login_attempt(ip: str):
    """Record a failed login attempt from any route"""
    if _security_middleware_instance:
        _security_middleware_instance.record_failed_login(ip)
