"""
Public API endpoints — authenticated via API key (X-API-Key header).
For third-party freight forwarders and integrators.
Rate-limited per company (daily limit from api_keys table).
"""

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.dependencies import get_supabase_admin, verify_api_key
from app.models.risk import RiskScoreRequest, RiskScoreResponse
from app.models.checklist import ChecklistRequest, ChecklistResponse
from app.models.fta import FTASavingsRequest, FTASavingsResponse, HSLookupResponse
from app.services.risk_engine import calculate_risk_score
from app.services.checklist_engine import generate_checklist
from app.services.fta_calculator import calculate_fta_savings, lookup_hs_code
from app.middleware.rate_limiter import check_rate_limit

router = APIRouter(prefix="/api/v1/public", tags=["Public API"])


def _enforce_rate_limit(api_key: dict):
    """Check rate limit for the company and raise 429 if exceeded."""
    daily_limit = api_key.get("rate_limit", 1000)
    company_id = api_key["company_id"]
    if not check_rate_limit(company_id, daily_limit):
        raise HTTPException(
            status_code=429,
            detail="Daily rate limit exceeded. Try again tomorrow.",
        )


@router.post("/risk-score", response_model=RiskScoreResponse)
async def public_risk_score(
    request: RiskScoreRequest,
    api_key: dict = Depends(verify_api_key),
    supabase: Client = Depends(get_supabase_admin),
):
    """[API Key Auth] Calculate compliance risk score."""
    _enforce_rate_limit(api_key)
    return await calculate_risk_score(
        product=request.product,
        country=request.country,
        company_size=request.company_size,
        supabase=supabase,
    )


@router.post("/checklist", response_model=ChecklistResponse)
async def public_checklist(
    request: ChecklistRequest,
    api_key: dict = Depends(verify_api_key),
    supabase: Client = Depends(get_supabase_admin),
):
    """[API Key Auth] Generate compliance checklist."""
    _enforce_rate_limit(api_key)
    return await generate_checklist(
        product=request.product,
        country=request.country,
        supabase=supabase,
    )


@router.get("/hs-lookup/{hs_code}", response_model=HSLookupResponse)
async def public_hs_lookup(
    hs_code: str,
    api_key: dict = Depends(verify_api_key),
    supabase: Client = Depends(get_supabase_admin),
):
    """[API Key Auth] Look up HS code tariff rates."""
    _enforce_rate_limit(api_key)
    result = await lookup_hs_code(hs_code, supabase)
    if not result:
        raise HTTPException(status_code=404, detail=f"HS code {hs_code} not found")
    return result
