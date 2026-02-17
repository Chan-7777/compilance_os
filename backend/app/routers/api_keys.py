import secrets

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.dependencies import get_supabase_admin, get_current_user

router = APIRouter(prefix="/api/v1", tags=["API Keys"])


class CreateAPIKeyRequest(BaseModel):
    name: str


class APIKeyCreatedResponse(BaseModel):
    id: str
    name: str
    key: str  # plaintext — shown only once
    created_at: str


class APIKeyInfo(BaseModel):
    id: str
    name: str
    permissions: list[str]
    rate_limit: int
    last_used_at: str | None
    created_at: str
    revoked_at: str | None


@router.get("/api-keys", response_model=list[APIKeyInfo])
async def list_api_keys(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """List all API keys for the current company (never returns key hash)."""
    result = (
        supabase.table("api_keys")
        .select("id, name, permissions, rate_limit, last_used_at, created_at, revoked_at")
        .eq("company_id", user["company_id"])
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.post("/api-keys", response_model=APIKeyCreatedResponse, status_code=201)
async def create_api_key(
    request: CreateAPIKeyRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Generate a new API key. The plaintext key is returned only once."""
    # Generate key
    raw_key = f"cos_live_{secrets.token_urlsafe(32)}"
    key_hash = bcrypt.hashpw(raw_key.encode(), bcrypt.gensalt()).decode()

    result = (
        supabase.table("api_keys")
        .insert({
            "company_id": user["company_id"],
            "name": request.name,
            "key_hash": key_hash,
        })
        .execute()
    )

    row = result.data[0]

    # Audit log
    supabase.table("audit_log").insert({
        "company_id": user["company_id"],
        "user_id": user["user_id"],
        "action": "api_key.created",
        "entity_type": "api_key",
        "entity_id": row["id"],
        "details": {"name": request.name},
    }).execute()

    return APIKeyCreatedResponse(
        id=row["id"],
        name=row["name"],
        key=raw_key,
        created_at=row["created_at"],
    )


@router.delete("/api-keys/{key_id}", status_code=204)
async def revoke_api_key(
    key_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Revoke an API key by setting revoked_at timestamp."""
    existing = (
        supabase.table("api_keys")
        .select("id")
        .eq("id", key_id)
        .eq("company_id", user["company_id"])
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="API key not found")

    supabase.table("api_keys").update(
        {"revoked_at": "now()"}
    ).eq("id", key_id).execute()

    # Audit log
    supabase.table("audit_log").insert({
        "company_id": user["company_id"],
        "user_id": user["user_id"],
        "action": "api_key.revoked",
        "entity_type": "api_key",
        "entity_id": key_id,
    }).execute()
