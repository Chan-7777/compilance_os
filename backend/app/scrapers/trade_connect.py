"""
Trade Connect Scraper — Extracts FTA tariff data from trade.gov.in

Ported from scripts/scrape_trade_connect.py with:
- Supabase integration (direct upsert)
- 200+ HS codes across 3 FTA countries
- Single browser instance for efficiency
- Retry logic and error handling
"""

import logging
import time
import asyncio
from datetime import datetime

from playwright.sync_api import sync_playwright

from app.scrapers.config import (
    HS_CODES_BY_CATEGORY,
    FTA_COUNTRIES,
    SCRAPE_DELAY_SECONDS,
    MAX_RETRIES,
    REQUEST_TIMEOUT,
)
from app.scrapers.base import (
    get_supabase_client,
    upsert_tariff_rate,
    log_scraper_run,
    map_hs_to_category,
)

logger = logging.getLogger("scrapers.trade_connect")

ROO_KEYWORDS = ["CTH", "CTSH", "CC ", "Wholly", "Value Addition", "RVC", "Product Specific"]


def _clean_roo_text(raw_text: str) -> str | None:
    """Extract Rule of Origin from raw tab-separated text."""
    if not raw_text or raw_text in ("-", "N/A"):
        return None
    parts = [p.strip() for p in raw_text.split("\t") if p.strip() and p.strip() != "-"]
    for part in parts:
        for keyword in ROO_KEYWORDS:
            if keyword in part:
                try:
                    float(part)
                    continue
                except ValueError:
                    if "Agreement" not in part and "CEPA" not in part:
                        return part
    return raw_text[:200] if raw_text else None


def _parse_rate(value: str) -> float:
    """Parse a rate string like '5%' or '3.5' into a float."""
    if not value or value in ("-", "N/A"):
        return 0.0
    try:
        return float(str(value).replace("%", "").strip())
    except ValueError:
        return 0.0


# JavaScript extraction code — same DOM selectors as the original scraper
EXTRACT_JS = """() => {
    const data = { description: null, mfn: null, cepa: null, roo: null };
    const allFtaTables = document.querySelectorAll('#ftaimpexptable');
    if (allFtaTables.length > 0) {
        const descRow = allFtaTables[0].querySelector('tbody tr');
        if (descRow) {
            const cells = descRow.querySelectorAll('td');
            if (cells.length > 1) data.description = cells[1].innerText.trim();
        }
    }
    if (allFtaTables.length > 1) {
        const mfnRow = allFtaTables[1].querySelector('tbody tr');
        if (mfnRow) {
            const cells = mfnRow.querySelectorAll('td');
            if (cells.length > 0) data.mfn = cells[0].innerText.trim();
        }
    }
    const cepaTable = document.querySelector('#importToIndiaSearchTable');
    if (cepaTable) {
        const cepaRow = cepaTable.querySelector('tbody tr');
        if (cepaRow) {
            const cells = cepaRow.querySelectorAll('td');
            if (cells.length > 2) data.cepa = cells[2].innerText.trim();
            if (cells.length > 4) data.roo = cells[4].innerText.trim();
        }
    }
    return data;
}"""

ROO_EXPAND_JS = """() => {
    const cepaTable = document.querySelector('#importToIndiaSearchTable');
    if (!cepaTable) return null;
    const rows = cepaTable.querySelectorAll('tbody tr');
    for (const row of rows) {
        const text = row.innerText.trim();
        if (text.includes('CTH') || text.includes('CTSH') || text.includes('CC') ||
            text.includes('Wholly') || text.includes('Value Addition') ||
            text.includes('RVC') || text.includes('Product Specific')) {
            const parts = text.split('\\t').map(p => p.trim()).filter(p => p && p !== '-');
            for (const part of parts) {
                if (part.includes('CTH') || part.includes('CTSH') || part.includes('CC') ||
                    part.includes('Wholly') || part.includes('RVC')) {
                    return part;
                }
            }
            return text;
        }
    }
    if (rows.length > 1) return rows[1].innerText.trim();
    return null;
}"""


def _extract_single(page, hs_code: str, country_code: str) -> dict | None:
    """Extract tariff data for a single HS code from an open browser page."""
    url = f"https://www.trade.gov.in/pages/free-trade-agreements/exp-{hs_code}-{country_code}"

    for attempt in range(MAX_RETRIES):
        try:
            page.goto(url, timeout=REQUEST_TIMEOUT)
            page.wait_for_selector(".viewItcDtls", timeout=20000)
            page.click(".viewItcDtls", timeout=5000)
            page.wait_for_timeout(3000)
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(3000)

            extracted = page.evaluate(EXTRACT_JS)

            roo = None
            if extracted.get("roo") and extracted["roo"] not in ("-", "N/A"):
                roo = _clean_roo_text(extracted["roo"])

            # Try expanding ROO accordion if not found
            if not roo:
                try:
                    chevron = page.locator("#importToIndiaSearchTable tbody tr td:first-child")
                    if chevron.count() > 0:
                        chevron.first.click()
                        page.wait_for_timeout(2000)
                        roo_text = page.evaluate(ROO_EXPAND_JS)
                        if roo_text:
                            roo = _clean_roo_text(roo_text)
                except Exception:
                    pass

            mfn = _parse_rate(extracted.get("mfn", "0"))
            pref = _parse_rate(extracted.get("cepa", "0"))

            if mfn == 0 and pref == 0 and not extracted.get("description"):
                logger.warning(f"HS {hs_code}/{country_code}: No data found")
                return None

            return {
                "hs_code": hs_code,
                "hs_description": extracted.get("description") or "",
                "mfn_rate": mfn,
                "preferential_rate": pref,
                "rule_of_origin": roo,
            }

        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                logger.warning(f"HS {hs_code}/{country_code} attempt {attempt + 1} failed: {e}")
                time.sleep(2)
            else:
                logger.error(f"HS {hs_code}/{country_code} failed after {MAX_RETRIES} attempts: {e}")
                return None

    return None


def scrape_trade_connect_sync(
    countries: list[str] | None = None,
    categories: list[str] | None = None,
) -> dict:
    """
    Sync entry point. Scrapes trade.gov.in for configured HS codes and countries.
    Uses a single browser instance for efficiency.
    """
    sb = get_supabase_client()
    log_scraper_run(sb, "trade_connect", "running", 0, None)

    # Build target lists
    target_countries = []
    for c in FTA_COUNTRIES:
        if countries is None or c["trade_connect_code"] in countries:
            target_countries.append(c)

    target_codes = []
    if categories:
        for cat in categories:
            target_codes.extend(HS_CODES_BY_CATEGORY.get(cat, []))
    else:
        for codes in HS_CODES_BY_CATEGORY.values():
            target_codes.extend(codes)

    # Remove duplicates while preserving order
    seen = set()
    unique_codes = []
    for code in target_codes:
        if code not in seen:
            seen.add(code)
            unique_codes.append(code)
    target_codes = unique_codes

    total = len(target_codes) * len(target_countries)
    logger.info(f"Starting Trade Connect scrape: {len(target_codes)} HS codes x {len(target_countries)} countries = {total} lookups")

    processed = 0
    errors = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            for country_info in target_countries:
                cc = country_info["trade_connect_code"]
                logger.info(f"Scraping {country_info['code']} ({cc})...")

                for i, hs_code in enumerate(target_codes):
                    try:
                        result = _extract_single(page, hs_code, cc)
                        if result:
                            result["country_code"] = country_info["code"]
                            result["agreement"] = country_info["agreement"]
                            result["product_category"] = map_hs_to_category(hs_code)
                            result["source"] = "trade.gov.in"
                            upsert_tariff_rate(sb, result)
                            processed += 1
                            logger.info(
                                f"  [{i+1}/{len(target_codes)}] HS {hs_code}: "
                                f"MFN {result['mfn_rate']}% / Pref {result['preferential_rate']}%"
                            )
                        else:
                            errors += 1
                    except Exception as e:
                        logger.error(f"  HS {hs_code}/{cc}: {e}")
                        errors += 1

                    time.sleep(SCRAPE_DELAY_SECONDS)
        finally:
            browser.close()

    status = "success" if errors == 0 else "partial"
    log_scraper_run(sb, "trade_connect", status, processed, f"{errors} errors" if errors else None)
    logger.info(f"Trade Connect scrape complete: {processed} processed, {errors} errors")

    return {"processed": processed, "errors": errors, "total": total}


async def scrape_trade_connect(
    countries: list[str] | None = None,
    categories: list[str] | None = None,
) -> dict:
    """Async wrapper — runs sync Playwright in a thread."""
    return await asyncio.to_thread(scrape_trade_connect_sync, countries, categories)
