"""
Scraper Scheduler — APScheduler integration for automated data refresh.

Uses BackgroundScheduler (thread-based) so sync Playwright runs safely
without blocking the FastAPI async event loop.
"""

import logging
import asyncio

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED

logger = logging.getLogger("scrapers.scheduler")

scheduler = BackgroundScheduler()


def _run_async(coro):
    """Run an async coroutine from a sync scheduler job."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _job_listener(event):
    if event.exception:
        logger.error(f"Scraper job {event.job_id} failed: {event.exception}")
    else:
        logger.info(f"Scraper job {event.job_id} completed successfully")


def setup_scheduler():
    """Configure and start the scheduler. Called from FastAPI lifespan."""
    from app.scrapers.trade_connect import scrape_trade_connect_sync
    from app.scrapers.dgft_scraper import scrape_dgft_notifications
    from app.scrapers.eu_cbam import scrape_eu_cbam_updates

    # Trade Connect — weekly on Sunday at 2 AM UTC (heavy Playwright scraping)
    scheduler.add_job(
        scrape_trade_connect_sync,
        trigger=CronTrigger(day_of_week="sun", hour=2),
        id="trade_connect_weekly",
        name="Trade Connect FTA Scraper",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # DGFT notifications — daily at 0:30 UTC (6:00 AM IST)
    scheduler.add_job(
        lambda: _run_async(scrape_dgft_notifications()),
        trigger=CronTrigger(hour=0, minute=30),
        id="dgft_daily",
        name="DGFT Notification Scraper",
        replace_existing=True,
    )

    # EU CBAM updates — daily at 1:00 UTC
    scheduler.add_job(
        lambda: _run_async(scrape_eu_cbam_updates()),
        trigger=CronTrigger(hour=1),
        id="eu_cbam_daily",
        name="EU CBAM Registry Scraper",
        replace_existing=True,
    )

    scheduler.add_listener(_job_listener, EVENT_JOB_ERROR | EVENT_JOB_EXECUTED)
    scheduler.start()
    logger.info("Scraper scheduler started with %d jobs", len(scheduler.get_jobs()))


def shutdown_scheduler():
    """Gracefully shut down. Called from FastAPI lifespan."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scraper scheduler shut down")


def get_scheduler_status() -> list[dict]:
    """Return status of all scheduled jobs."""
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": str(job.next_run_time) if job.next_run_time else None,
            "trigger": str(job.trigger),
        })
    return jobs
