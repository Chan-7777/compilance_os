"""
DGFT Notification Scraper — Monitors dgft.gov.in for trade notices.

Uses httpx + BeautifulSoup (no Playwright needed — DGFT serves server-rendered HTML).
Filters for export-relevant notifications and inserts into regulatory_changes table.
"""

import logging
import httpx
from bs4 import BeautifulSoup

from app.scrapers.config import DGFT_RELEVANCE_KEYWORDS
from app.scrapers.base import get_supabase_client, upsert_regulatory_change, log_scraper_run

logger = logging.getLogger("scrapers.dgft")

DGFT_URLS = {
    "trade_notice": "https://www.dgft.gov.in/CP/?opt=trade-notice",
    "public_notice": "https://www.dgft.gov.in/CP/?opt=public-notice",
    "notification": "https://www.dgft.gov.in/CP/?opt=notification",
}


def _determine_severity(text: str) -> str:
    """Assign severity based on content keywords."""
    text_lower = text.lower()
    critical_kw = ["immediate effect", "mandatory", "prohibited", "suspended", "deadline", "ban"]
    warning_kw = ["amendment", "revised", "change", "new requirement", "updated", "modification"]
    if any(k in text_lower for k in critical_kw):
        return "critical"
    if any(k in text_lower for k in warning_kw):
        return "warning"
    return "info"


def _is_export_relevant(text: str) -> bool:
    """Check if a notice is relevant to export compliance."""
    text_lower = text.lower()
    return any(kw.lower() in text_lower for kw in DGFT_RELEVANCE_KEYWORDS)


async def scrape_dgft_notifications() -> dict:
    """Scrape DGFT for recent trade notices and notifications."""
    sb = get_supabase_client()
    log_scraper_run(sb, "dgft", "running", 0, None)

    processed = 0
    errors = 0

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        for notice_type, url in DGFT_URLS.items():
            try:
                resp = await client.get(url, headers={
                    "User-Agent": "Mozilla/5.0 (ComplianceOS Scraper)"
                })
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "html.parser")

                # DGFT uses table-based layouts for notices
                rows = soup.select("table tbody tr")
                if not rows:
                    # Try alternative selectors
                    rows = soup.select(".table tr, .list-group-item, article")

                for row in rows[:20]:
                    cells = row.find_all("td")
                    if len(cells) < 2:
                        # Try as a single element
                        text = row.get_text(strip=True)
                        if text and _is_export_relevant(text):
                            change = {
                                "country_code": "IN",
                                "date": "",
                                "change_description": f"[DGFT {notice_type}] {text[:300]}",
                                "source_url": url,
                                "severity": _determine_severity(text),
                            }
                            upsert_regulatory_change(sb, change)
                            processed += 1
                        continue

                    date_text = cells[0].get_text(strip=True)
                    subject = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                    link_tag = row.find("a")
                    source_url = None
                    if link_tag and link_tag.get("href"):
                        href = link_tag["href"]
                        source_url = href if href.startswith("http") else f"https://www.dgft.gov.in{href}"

                    if not _is_export_relevant(subject):
                        continue

                    change = {
                        "country_code": "IN",
                        "date": date_text,
                        "change_description": f"[DGFT {notice_type}] {subject[:300]}",
                        "source_url": source_url,
                        "severity": _determine_severity(subject),
                    }
                    upsert_regulatory_change(sb, change)
                    processed += 1

            except Exception as e:
                logger.error(f"DGFT {notice_type} scrape failed: {e}")
                errors += 1

    status = "success" if errors == 0 else "partial"
    log_scraper_run(sb, "dgft", status, processed, f"{errors} errors" if errors else None)
    logger.info(f"DGFT scrape complete: {processed} notices processed, {errors} errors")

    return {"processed": processed, "errors": errors}
