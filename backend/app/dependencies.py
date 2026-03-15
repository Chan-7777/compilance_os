from functools import lru_cache

from fastapi import Depends, Header, HTTPException, status
from supabase import create_client, Client

from app.config import settings


@lru_cache()
def get_supabase_admin() -> Client:
    """Supabase client with service-role key (full access, bypasses RLS)."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


def get_supabase_client() -> Client:
    """Supabase client with anon key (respects RLS)."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)


async def get_current_user(
    authorization: str = Header(None),
    supabase: Client = Depends(get_supabase_admin),
) -> dict:
    """Verify JWT from Authorization header and return user data."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )

    token = authorization.removeprefix("Bearer ").strip()
    try:
        user_response = supabase.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # Fetch the user profile with company_id
    profile = (
        supabase.table("user_profiles")
        .select("*, companies(*)")
        .eq("id", user.id)
        .single()
        .execute()
    )

    if not profile.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )

    return {
        "user_id": user.id,
        "email": user.email,
        "company_id": profile.data["company_id"],
        "company": profile.data.get("companies"),
        "role": profile.data["role"],
    }


async def verify_api_key(
    x_api_key: str = Header(None),
    supabase: Client = Depends(get_supabase_admin),
) -> dict:
    """Verify API key for third-party integrations."""
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header",
        )

    import bcrypt

    # Look up non-revoked keys
    keys = (
        supabase.table("api_keys")
        .select("*, companies(*)")
        .is_("revoked_at", "null")
        .execute()
    )

    for key_row in keys.data or []:
            if bcrypt.checkpw(x_api_key.encode(), key_row["key_hash"].encode()):
                from app.middleware.rate_limiter import check_rate_limit
                
                # Check rate limit before proceeding
                if not check_rate_limit(key_row["company_id"], daily_limit=key_row["rate_limit"]):
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Rate limit exceeded. Try again tomorrow.",
                    )

                # Update last_used_at
                supabase.table("api_keys").update(
                    {"last_used_at": "now()"}
                ).eq("id", key_row["id"]).execute()

                return {
                    "company_id": key_row["company_id"],
                    "company": key_row.get("companies"),
                    "permissions": key_row["permissions"],
                    "rate_limit": key_row["rate_limit"],
                }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API key",
    )
