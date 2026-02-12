from fastapi import APIRouter, Depends
from supabase import Client

from app.dependencies import get_supabase_admin, get_current_user
from app.models.checklist import ChecklistRequest, ChecklistResponse
from app.services.checklist_engine import generate_checklist

router = APIRouter(prefix="/api/v1", tags=["Checklist"])


@router.post("/checklist", response_model=ChecklistResponse)
async def get_checklist(
    request: ChecklistRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Generate compliance checklist for a product-country combination."""
    return await generate_checklist(
        product=request.product,
        country=request.country,
        supabase=supabase,
    )
