from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.dependencies import get_supabase_admin, get_current_user
from app.models.fta import FTASavingsRequest, FTASavingsResponse, HSLookupResponse
from app.services.fta_calculator import calculate_fta_savings, lookup_hs_code

router = APIRouter(prefix="/api/v1", tags=["FTA & Trade"])


@router.get("/countries")
async def list_countries(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """List all destination countries with flag and name."""
    result = supabase.table("countries").select("code, name, flag").execute()
    return {"countries": result.data or []}


@router.get("/fta-agreements")
async def list_fta_agreements(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """List all FTA agreements."""
    result = supabase.table("fta_agreements").select("*").execute()
    return {"agreements": result.data or []}


@router.get("/export-schemes")
async def list_export_schemes(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """List all Indian export schemes."""
    result = supabase.table("export_schemes").select("*").execute()
    return {"schemes": result.data or []}


class BatchFTASavingsRequest(BaseModel):
    countries: list[str]
    shipment_value: float
    hs_code: str | None = None
    product: str | None = None


@router.post("/fta-savings", response_model=FTASavingsResponse)
async def get_fta_savings(
    request: FTASavingsRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Calculate FTA duty savings for a shipment."""
    result = await calculate_fta_savings(
        country=request.country,
        shipment_value=request.shipment_value,
        supabase=supabase,
        hs_code=request.hs_code,
        product=request.product,
    )
    if not result:
        raise HTTPException(
            status_code=404,
            detail="No active FTA with preferential tariff found for this country/product",
        )
    return result


@router.post("/fta-savings/batch")
async def get_batch_fta_savings(
    request: BatchFTASavingsRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Calculate FTA savings for multiple countries."""
    results = []
    for country in request.countries:
        result = await calculate_fta_savings(
            country=country,
            shipment_value=request.shipment_value,
            supabase=supabase,
            hs_code=request.hs_code,
            product=request.product,
        )
        if result:
            results.append({"country": country, **result.model_dump()})
    return {"results": results}


@router.get("/hs-lookup/{hs_code}", response_model=HSLookupResponse)
async def get_hs_lookup(
    hs_code: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Look up HS code details and tariff rates."""
    result = await lookup_hs_code(hs_code, supabase)
    if not result:
        raise HTTPException(status_code=404, detail=f"HS code {hs_code} not found")
    return result
