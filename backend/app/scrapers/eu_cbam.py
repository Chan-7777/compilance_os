"""
EU CBAM Registry Scraper — Monitors EU Commission and EUR-Lex for CBAM updates.

Uses httpx + BeautifulSoup for the EU Commission page and feedparser for EUR-Lex RSS.
"""

import logging
import httpx
from bs4 import BeautifulSoup

from app.scrapers.config import CBAM_KEYWORDS
from app.scrapers.base import get_supabase_client, upsert_regulatory_change, log_scraper_run

logger = logging.getLogger("scrapers.eu_cbam")

EU_CBAM_PAGE = "https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en"
UK_CBAM_PAGE = "https://www.gov.uk/government/collections/carbon-border-adjustment-mechanism"


def _is_cbam_relevant(text: str) -> bool:
    """Check if text is CBAM-related."""
    text_lower = text.lower()
    return any(kw.lower() in text_lower for kw in CBAM_KEYWORDS)


async def _scrape_eu_cbam_page(client: httpx.AsyncClient) -> list[dict]:
    """Scrape EU Commission CBAM page for announcements."""
    results = []
    try:
        resp = await client.get(EU_CBAM_PAGE)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Look for news/update items — EU pages use various card/article structures
        selectors = [
            ".ecl-content-block",
            ".ecl-card",
            "article",
            ".field--name-body p",
            ".node--type-news",
        ]
        articles = []
        for selector in selectors:
            articles.extend(soup.select(selector))
            if articles:
                break

        for article in articles[:10]:
            title = article.get_text(strip=True)[:300]
            if not title or len(title) < 20:
                continue
            link = article.find("a")
            href = None
            if link and link.get("href"):
                h = link["href"]
                href = h if h.startswith("http") else f"https://taxation-customs.ec.europa.eu{h}"

            results.append({
                "country_code": "EU",
                "date": "",
                "change_description": f"[EU CBAM] {title}",
                "source_url": href,
                "severity": "warning",
            })
    except Exception as e:
        logger.error(f"EU CBAM page scrape failed: {e}")

    return results


async def _scrape_uk_cbam_page(client: httpx.AsyncClient) -> list[dict]:
    """Scrape UK Gov CBAM page for updates."""
    results = []
    try:
        resp = await client.get(UK_CBAM_PAGE)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        items = soup.select(".gem-c-document-list__item, .publication-row")
        for item in items[:10]:
            title_el = item.find("a")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            href = title_el.get("href", "")
            if not href.startswith("http"):
                href = f"https://www.gov.uk{href}"

            if _is_cbam_relevant(title):
                results.append({
                    "country_code": "UK",
                    "date": "",
                    "change_description": f"[UK CBAM] {title}",
                    "source_url": href,
                    "severity": "warning",
                })
    except Exception as e:
        logger.error(f"UK CBAM page scrape failed: {e}")

    return results


async def scrape_eu_cbam_updates() -> dict:
    """Main entry point — scrape all CBAM sources."""
    sb = get_supabase_client()
    log_scraper_run(sb, "eu_cbam", "running", 0, None)

    processed = 0
    errors = 0

    try:
        async with httpx.AsyncClient(
            timeout=30,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (ComplianceOS Scraper)"},
        ) as client:
            for scraper_fn in [_scrape_eu_cbam_page, _scrape_uk_cbam_page]:
                try:
                    results = await scraper_fn(client)
                    for r in results:
                        upsert_regulatory_change(sb, r)
                        processed += 1
                except Exception as e:
                    logger.error(f"CBAM scraper function failed: {e}")
                    errors += 1
    except Exception as e:
        logger.error(f"EU CBAM scrape failed: {e}")
        log_scraper_run(sb, "eu_cbam", "failed", processed, str(e))
        return {"processed": processed, "errors": errors + 1}

    status = "success" if errors == 0 else "partial"
    log_scraper_run(sb, "eu_cbam", status, processed, None)
    logger.info(f"EU CBAM scrape complete: {processed} updates, {errors} errors")

    return {"processed": processed, "errors": errors}
