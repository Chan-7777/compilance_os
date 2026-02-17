"""
In-memory rate limiter for API key-based requests.
Tracks usage per company_id in a rolling 24-hour window.
"""

import time
from typing import Dict, Tuple

# Store: company_id -> (request_count, window_start_timestamp)
_rate_store: Dict[str, Tuple[int, float]] = {}

WINDOW_SECONDS = 86400  # 24 hours


def check_rate_limit(company_id: str, daily_limit: int = 1000) -> bool:
    """
    Check if a company is within its rate limit.
    Returns True if the request is allowed, False if rate-limited.
    """
    now = time.time()
    key = company_id

    if key in _rate_store:
        count, window_start = _rate_store[key]

        # Reset window if 24 hours have passed
        if now - window_start >= WINDOW_SECONDS:
            _rate_store[key] = (1, now)
            return True

        if count >= daily_limit:
            return False

        _rate_store[key] = (count + 1, window_start)
        return True
    else:
        _rate_store[key] = (1, now)
        return True


def get_usage(company_id: str) -> dict:
    """Get current rate limit usage for a company."""
    now = time.time()
    if company_id not in _rate_store:
        return {"requests_used": 0, "window_reset_at": None}

    count, window_start = _rate_store[company_id]

    # If window has expired, reset
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
    _rate_store.pop(company_id, None)
