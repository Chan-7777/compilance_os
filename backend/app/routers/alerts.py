from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.dependencies import get_supabase_admin, get_current_user
from app.services.alert_engine import generate_alerts

router = APIRouter(prefix="/api/v1", tags=["Alerts"])


@router.get("/alerts")
async def get_alerts(
    countries: str = Query(..., description="Comma-separated country codes: EU,UAE,US"),
    product: str = Query("general", description="Product category"),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get regulatory alerts for selected countries and product."""
    country_list = [c.strip() for c in countries.split(",") if c.strip()]
    alerts = await generate_alerts(
        product=product,
        countries=country_list,
        supabase=supabase,
    )

    counts = {
        "critical": sum(1 for a in alerts if a["severity"] == "critical"),
        "warning": sum(1 for a in alerts if a["severity"] == "warning"),
        "info": sum(1 for a in alerts if a["severity"] == "info"),
    }

    return {
        "alerts": alerts,
        "counts": counts,
        "disclaimer": "ComplianceOS provides informational guidance only.",
    }
