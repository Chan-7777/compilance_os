"""
Scraper Base — shared utilities for all scrapers.
"""

import logging
import time
import functools
from datetime import datetime, timezone

from supabase import create_client, Client

from app.config import settings

logger = logging.getLogger("scrapers.base")


def get_supabase_client() -> Client:
    """Create a service-role Supabase client for scraper use (outside FastAPI DI)."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


def upsert_tariff_rate(supabase: Client, rate: dict) -> None:
    """Insert or update a tariff rate record."""
    rate["scraped_at"] = datetime.now(timezone.utc).isoformat()
    supabase.table("hs_tariff_rates").upsert(
        rate, on_conflict="hs_code,country_code,agreement"
    ).execute()


def upsert_regulatory_change(supabase: Client, change: dict) -> None:
    """Insert a regulatory change record (dedup by description + country)."""
    change["scraped_at"] = datetime.now(timezone.utc).isoformat()
    # Check for existing identical record
    existing = (
        supabase.table("regulatory_changes")
        .select("id")
        .eq("country_code", change["country_code"])
        .eq("change_description", change["change_description"])
        .limit(1)
        .execute()
    )
    if not existing.data:
        supabase.table("regulatory_changes").insert(change).execute()


def log_scraper_run(
    supabase: Client,
    scraper_name: str,
    status: str,
    records: int,
    error: str | None,
) -> str | None:
    """Log a scraper run to the scraper_runs table. Returns the run ID."""
    try:
        data = {
            "scraper_name": scraper_name,
            "status": status,
            "records_processed": records,
            "error_message": error,
        }
        if status in ("success", "failed", "partial"):
            data["completed_at"] = datetime.now(timezone.utc).isoformat()
        result = supabase.table("scraper_runs").insert(data).execute()
        return result.data[0]["id"] if result.data else None
    except Exception as e:
        logger.error(f"Failed to log scraper run: {e}")
        return None


def retry(max_retries: int = 3, delay: float = 2.0):
    """Decorator for retrying a function on failure with exponential backoff."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    wait = delay * (2 ** attempt)
                    logger.warning(
                        f"{func.__name__} attempt {attempt + 1}/{max_retries} failed: {e}. "
                        f"Retrying in {wait}s..."
                    )
                    time.sleep(wait)
            raise last_error
        return wrapper
    return decorator


def map_hs_to_category(hs_code: str) -> str:
    """Map a 4-digit HS code to a product category based on chapter."""
    try:
        chapter = int(hs_code[:2])
    except (ValueError, IndexError):
        return "general"

    if 1 <= chapter <= 24:
        return "food"
    elif 28 <= chapter <= 38:
        return "chemicals"
    elif chapter == 30:
        return "pharma"
    elif 50 <= chapter <= 63:
        return "textiles"
    elif chapter in (72, 73):
        return "steel"
    elif chapter == 71:
        return "jewelry"
    elif chapter in (84, 85):
        return "electronics"
    elif chapter == 87:
        return "automotive"
    return "general"
