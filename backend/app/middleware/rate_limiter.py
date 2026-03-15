"""
Redis-backed rate limiter for API key-based requests.
Tracks usage per company_id in a rolling 24-hour window.
Falls back to in-memory tracking if Redis is not configured.
"""

import time
import logging
from typing import Dict, Tuple

import redis
from app.config import settings

logger = logging.getLogger("complianceos.rate_limiter")

WINDOW_SECONDS = 86400  # 24 hours

# Initialize Redis client if URL is provided
redis_client = None
if settings.redis_url:
    try:
        redis_client = redis.from_url(settings.redis_url)
        # Test connection
        redis_client.ping()
        logger.info("Successfully connected to Redis for rate limiting")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}. Falling back to in-memory rate limiting.")
        redis_client = None

# Fallback in-memory store: company_id -> (request_count, window_start_timestamp)
_rate_store: Dict[str, Tuple[int, float]] = {}


def check_rate_limit(company_id: str, daily_limit: int = 1000) -> bool:
    """
    Check if a company is within its rate limit.
    Returns True if the request is allowed, False if rate-limited.
    """
    key = f"rate_limit:{company_id}"
    now = time.time()

    if redis_client:
        try:
            # Atomic increment using Redis
            
            # Use a pipeline to ensure atomicity
            pipe = redis_client.pipeline()
            # If key doesn't exist, this returns 1
            pipe.incr(key)
            # Only set expiry if it's a new key (TTL is -1 means no expiry)
            pipe.ttl(key)
            results = pipe.execute()
            
            count = results[0]
            ttl = results[1]
            
            if ttl == -1:
                # Key was just created or TTL was lost, set it
                redis_client.expire(key, WINDOW_SECONDS)
                
            if count > daily_limit:
                return False
                
            return True
        except Exception as e:
            logger.error(f"Redis error during rate limit check: {e}")
            # Fall back to in-memory on redis errors
            pass

    # In-memory fallback logic
    if company_id in _rate_store:
        count, window_start = _rate_store[company_id]
        if now - window_start >= WINDOW_SECONDS:
            _rate_store[company_id] = (1, now)
            return True
        if count >= daily_limit:
            return False
        _rate_store[company_id] = (count + 1, window_start)
        return True
    else:
        _rate_store[company_id] = (1, now)
        return True


def get_usage(company_id: str) -> dict:
    """Get current rate limit usage for a company."""
    key = f"rate_limit:{company_id}"
    now = time.time()
    
    if redis_client:
        try:
            count = redis_client.get(key)
            ttl = redis_client.ttl(key)
            
            count_val = int(count) if count else 0
            
            if not count_val:
                return {"requests_used": 0, "window_reset_at": None}
                
            # If ttl is -1 or -2, it has no expiry or doesn't exist
            if ttl <= 0:
                ttl = 0
                reset_at = now
            else:
                reset_at = now + ttl
                
            return {
                "requests_used": count_val,
                "window_reset_at": reset_at,
                "seconds_until_reset": ttl,
            }
        except Exception as e:
            logger.error(f"Redis error during usage check: {e}")

    # In-memory fallback
    if company_id not in _rate_store:
        return {"requests_used": 0, "window_reset_at": None}

    count, window_start = _rate_store[company_id]
    if now - window_start >= WINDOW_SECONDS:
        return {"requests_used": 0, "window_reset_at": None}

    reset_at = window_start + WINDOW_SECONDS
    return {
        "requests_used": count,
        "window_reset_at": reset_at,
        "seconds_until_reset": int(reset_at - now),
    }


def reset_rate_limit(company_id: str) -> None:
    """Reset rate limit for a company (admin use)."""
    key = f"rate_limit:{company_id}"
    if redis_client:
        try:
            redis_client.delete(key)
            return
        except Exception as e:
            logger.error(f"Redis error during rate limit reset: {e}")
    
    _rate_store.pop(company_id, None)
