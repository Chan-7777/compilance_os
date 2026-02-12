"""
Admin API Router — Scraper management and monitoring.
"""

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from supabase import Client

from app.dependencies import get_supabase_admin, get_current_user
from app.scrapers.scheduler import get_scheduler_status

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


@router.get("/scraper-status")
async def scraper_status(user: dict = Depends(get_current_user)):
    """Get status of all scheduled scraper jobs."""
    return {"jobs": get_scheduler_status()}


@router.get("/scraper-runs")
async def scraper_runs(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
    limit: int = 20,
):
    """Get recent scraper run history."""
    result = (
        supabase.table("scraper_runs")
        .select("*")
        .order("started_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"runs": result.data or []}


@router.post("/scraper-trigger/{scraper_name}")
async def trigger_scraper(
    scraper_name: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Manually trigger a scraper run (runs in background)."""
    from app.scrapers.trade_connect import scrape_trade_connect
    from app.scrapers.dgft_scraper import scrape_dgft_notifications
    from app.scrapers.eu_cbam import scrape_eu_cbam_updates

    scrapers = {
        "trade_connect": scrape_trade_connect,
        "dgft": scrape_dgft_notifications,
        "eu_cbam": scrape_eu_cbam_updates,
    }

    if scraper_name not in scrapers:
        raise HTTPException(status_code=404, detail=f"Unknown scraper: {scraper_name}")

    background_tasks.add_task(scrapers[scraper_name])
    return {"status": "triggered", "scraper": scraper_name}
