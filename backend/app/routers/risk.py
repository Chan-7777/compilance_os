from fastapi import APIRouter, Depends
from supabase import Client

from app.dependencies import get_supabase_admin, get_current_user
from app.models.risk import (
    RiskScoreRequest,
    RiskScoreResponse,
    BatchRiskScoreRequest,
    BatchRiskScoreResponse,
)
from app.services.risk_engine import calculate_risk_score

router = APIRouter(prefix="/api/v1", tags=["Risk"])


@router.post("/risk-score", response_model=RiskScoreResponse)
async def get_risk_score(
    request: RiskScoreRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Calculate compliance risk score for a product-country combination."""
    return await calculate_risk_score(
        product=request.product,
        country=request.country,
        company_size=request.company_size,
        supabase=supabase,
    )


@router.post("/risk-score/batch", response_model=BatchRiskScoreResponse)
async def get_batch_risk_score(
    request: BatchRiskScoreRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Calculate risk scores for multiple countries at once."""
    results = []
    for country in request.countries:
        score = await calculate_risk_score(
            product=request.product,
            country=country,
            company_size=request.company_size,
            supabase=supabase,
        )
        results.append({"country": country, **score.model_dump()})
    results.sort(key=lambda r: r["score"], reverse=True)
    return BatchRiskScoreResponse(results=results)
