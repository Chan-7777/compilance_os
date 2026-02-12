"""
Alert Generator — Python port of src/utils/alert-generator.ts

Generates alerts from regulatory changes, CBAM deadlines, and FTA status.
"""

from datetime import datetime, timezone
import math

from supabase import Client


def _severity_for_days(days: int) -> str:
    if days < 90:
        return "critical"
    return "warning"


async def generate_alerts(
    product: str,
    countries: list[str],
    supabase: Client,
) -> list[dict]:
    """Generate regulatory alerts for product-country combinations."""
    alerts: list[dict] = []
    alert_id = 1

    for country_code in countries:
        # Fetch country
        country_row = (
            supabase.table("countries")
            .select("*")
            .eq("code", country_code)
            .single()
            .execute()
        )
        country_data = country_row.data
        if not country_data:
            continue

        country_name = country_data["name"]
        flag = country_data["flag"]

        # ── REGULATORY CHANGES (from scraped data) ──
        changes = (
            supabase.table("regulatory_changes")
            .select("*")
            .eq("country_code", country_code)
            .order("scraped_at", desc=True)
            .limit(10)
            .execute()
        )
        for change in changes.data or []:
            alerts.append({
                "id": alert_id,
                "type": "regulation_change",
                "severity": change.get("severity", "info"),
                "country": country_code,
                "countryName": country_name,
                "flag": flag,
                "date": change["date"],
                "message": change["change_description"],
            })
            alert_id += 1

        # ── CBAM DEADLINES ──
        cbam = country_data.get("cbam_config", {})
        if cbam.get("active"):
            for key_date in cbam.get("keyDates", []):
                try:
                    deadline = datetime.strptime(key_date["date"], "%Y-%m-%d").replace(
                        tzinfo=timezone.utc
                    )
                    now = datetime.now(timezone.utc)
                    days_until = math.ceil((deadline - now).total_seconds() / 86400)

                    if days_until > 0:
                        severity = _severity_for_days(days_until)
                        alerts.append({
                            "id": alert_id,
                            "type": "deadline",
                            "severity": severity,
                            "country": country_code,
                            "countryName": country_name,
                            "flag": flag,
                            "date": key_date["date"],
                            "message": f"CBAM: {key_date['event']} — {days_until} days remaining",
                        })
                        alert_id += 1
                except (ValueError, KeyError):
                    continue

        # ── FTA STATUS ──
        fta_row = (
            supabase.table("fta_agreements")
            .select("*")
            .eq("country_code", country_code)
            .maybe_single()
            .execute()
        )
        fta = fta_row.data
        if fta and fta.get("status") == "Under Negotiation":
            alerts.append({
                "id": alert_id,
                "type": "fta_update",
                "severity": "info",
                "country": country_code,
                "countryName": country_name,
                "flag": flag,
                "date": str(datetime.now(timezone.utc).date()),
                "message": f"{fta['name']}: {fta.get('round', 'Ongoing')} — monitor for preferential tariff opportunities",
            })
            alert_id += 1

    # ── INDIAN DOMESTIC REGULATIONS (DGFT) ──
    india_changes = (
        supabase.table("regulatory_changes")
        .select("*")
        .eq("country_code", "IN")
        .order("scraped_at", desc=True)
        .limit(10)
        .execute()
    )
    for change in india_changes.data or []:
        alerts.append({
            "id": alert_id,
            "type": "regulation_change",
            "severity": change.get("severity", "info"),
            "country": "IN",
            "countryName": "India (DGFT)",
            "flag": "\U0001f1ee\U0001f1f3",
            "date": change["date"],
            "message": change["change_description"],
        })
        alert_id += 1

    return alerts
