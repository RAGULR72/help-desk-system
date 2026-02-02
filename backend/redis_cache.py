"""
Redis caching utilities for the help desk application
"""

import redis
import json
import os
from functools import wraps
from typing import Any, Optional
from dotenv import load_dotenv

load_dotenv()

class RedisCache:
    """Redis cache utility class"""
    
    def __init__(self):
        # Use Redis connection from environment or default to localhost
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = int(os.getenv("REDIS_PORT", 6379))
        redis_db = int(os.getenv("REDIS_DB", 0))
        redis_password = os.getenv("REDIS_PASSWORD", None)
        
        try:
            self.redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                db=redis_db,
                password=redis_password,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
            # Test connection
            self.redis_client.ping()
            print("✓ Connected to Redis successfully")
        except Exception as e:
            print(f"⚠️  Could not connect to Redis: {e}")
            print("⚠️  Continuing without Redis cache (features will work but with reduced performance)")
            self.redis_client = None
    
    def set(self, key: str, value: Any, expiry: int = 300) -> bool:
        """Set a value in cache with expiry (in seconds)"""
        if not self.redis_client:
            return False
        try:
            serialized_value = json.dumps(value, default=str)
            return self.redis_client.setex(key, expiry, serialized_value)
        except Exception:
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """Get a value from cache"""
        if not self.redis_client:
            return None
        try:
            value = self.redis_client.get(key)
            if value is None:
                return None
            return json.loads(value)
        except Exception:
            return None
    
    def delete(self, key: str) -> bool:
        """Delete a key from cache"""
        if not self.redis_client:
            return False
        try:
            return bool(self.redis_client.delete(key))
        except Exception:
            return False
    
    def flush_all(self) -> bool:
        """Flush all cache"""
        if not self.redis_client:
            return False
        try:
            self.redis_client.flushall()
            return True
        except Exception:
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not self.redis_client:
            return False
        try:
            return bool(self.redis_client.exists(key))
        except Exception:
            return False


# Global cache instance
cache = RedisCache()


def cached(expiry: int = 300):
    """
    Decorator to cache function results in Redis
    Usage: @cached(expiry=600) for 10-minute cache
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key_parts = [func.__name__]
            
            # Add positional arguments to cache key
            for arg in args:
                cache_key_parts.append(str(arg))
            
            # Add keyword arguments to cache key (sorted for consistency)
            for key, value in sorted(kwargs.items()):
                cache_key_parts.append(f"{key}:{value}")
            
            cache_key = ":".join(cache_key_parts)
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                print(f"[CACHE HIT] Retrieved result from cache for {func.__name__}")
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            
            # Store in cache only if Redis is available
            if cache.redis_client:
                cache.set(cache_key, result, expiry)
                print(f"[CACHE MISS] Cached result for {func.__name__} with key {cache_key}")
            
            return result
        return wrapper
    return decorator


# Example usage functions for common operations
def get_cached_user_stats(user_id: int):
    """Example function to demonstrate caching"""
    # This would normally query the database
    # For demo purposes, returning mock data
    from models import User
    from sqlalchemy.orm import Session
    from database import engine
    
    db = Session(bind=engine)
    user = db.query(User).filter(User.id == user_id).first()
    
    if user:
        stats = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": str(user.created_at),
            "ticket_count": 0  # Would query actual ticket count
        }
        db.close()
        return stats
    db.close()
    return None


def get_cached_ticket_stats():
    """Example function to cache overall ticket statistics"""
    # This would normally aggregate ticket data
    # For demo purposes, returning mock data
    from ticket_system.models import Ticket
    from sqlalchemy.orm import Session
    from database import engine
    
    db = Session(bind=engine)
    
    stats = {
        "total_tickets": db.query(Ticket).count(),
        "open_tickets": db.query(Ticket).filter(Ticket.status == "open").count(),
        "in_progress_tickets": db.query(Ticket).filter(Ticket.status == "in_progress").count(),
        "resolved_tickets": db.query(Ticket).filter(Ticket.status == "resolved").count(),
    }
    db.close()
    return stats


# Predefined cache keys for common data
USER_CACHE_PREFIX = "user:"
TICKET_CACHE_PREFIX = "ticket:"
NOTIFICATION_CACHE_PREFIX = "notification:"
STATS_CACHE_KEY = "app:stats"


if __name__ == "__main__":
    # Test the cache
    print("Testing Redis Cache...")
    
    # Test basic operations
    test_key = "test:hello"
    cache.set(test_key, "world", 60)
    result = cache.get(test_key)
    print(f"Cached value: {result}")
    
    # Test exists
    exists = cache.exists(test_key)
    print(f"Key exists: {exists}")
    
    # Clean up
    cache.delete(test_key)
    print("Test completed.")