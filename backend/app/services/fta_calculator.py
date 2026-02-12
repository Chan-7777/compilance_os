"""
FTA Savings Calculator — Python port of FTASchemes.tsx savings logic.

Looks up tariff rates from hs_tariff_rates table (real scraped data).
Falls back to category-level averages if no HS-specific rate found.
"""

from supabase import Client

from app.models.fta import FTASavingsResponse, HSLookupResponse


async def calculate_fta_savings(
    country: str,
    shipment_value: float,
    supabase: Client,
    hs_code: str | None = None,
    product: str | None = None,
) -> FTASavingsResponse | None:
    """Calculate duty savings for a shipment using FTA preferential rates."""

    # Check if FTA is active for this country
    fta_row = (
        supabase.table("fta_agreements")
        .select("*")
        .eq("country_code", country)
        .eq("preferential_tariff", True)
        .maybe_single()
        .execute()
    )
    if not fta_row.data:
        return None

    fta = fta_row.data

    # Try HS-code-specific rate first
    rates = None
    if hs_code:
        rate_row = (
            supabase.table("hs_tariff_rates")
            .select("*")
            .eq("hs_code", hs_code)
            .eq("country_code", country)
            .maybe_single()
            .execute()
        )
        rates = rate_row.data

    # Fall back to category average
    if not rates and product:
        cat_rates = (
            supabase.table("hs_tariff_rates")
            .select("mfn_rate, preferential_rate")
            .eq("country_code", country)
            .eq("product_category", product)
            .execute()
        )
        if cat_rates.data:
            avg_mfn = sum(r["mfn_rate"] for r in cat_rates.data) / len(cat_rates.data)
            avg_pref = sum(r["preferential_rate"] for r in cat_rates.data) / len(cat_rates.data)
            rates = {
                "mfn_rate": round(avg_mfn, 2),
                "preferential_rate": round(avg_pref, 2),
                "rule_of_origin": None,
                "agreement": fta["name"],
            }

    if not rates:
        return None

    mfn_rate = float(rates["mfn_rate"])
    pref_rate = float(rates["preferential_rate"])
    mfn_duty = shipment_value * (mfn_rate / 100)
    pref_duty = shipment_value * (pref_rate / 100)
    savings = mfn_duty - pref_duty

    if savings <= 0:
        return None

    return FTASavingsResponse(
        country=country,
        agreement=rates.get("agreement") or fta["name"],
        mfn_rate=mfn_rate,
        preferential_rate=pref_rate,
        mfn_duty=round(mfn_duty, 2),
        preferential_duty=round(pref_duty, 2),
        savings=round(savings, 2),
        rule_of_origin=rates.get("rule_of_origin"),
    )


async def lookup_hs_code(
    hs_code: str,
    supabase: Client,
) -> HSLookupResponse | None:
    """Look up HS code details and tariff rates across all countries."""

    # Check reference table first
    hs_row = (
        supabase.table("hs_codes")
        .select("*")
        .eq("code", hs_code)
        .maybe_single()
        .execute()
    )

    # Get tariff rates across countries
    rates = (
        supabase.table("hs_tariff_rates")
        .select("country_code, mfn_rate, preferential_rate, agreement, rule_of_origin")
        .eq("hs_code", hs_code)
        .execute()
    )

    if not hs_row.data and not rates.data:
        return None

    return HSLookupResponse(
        hs_code=hs_code,
        description=(hs_row.data or {}).get("description"),
        product_category=(hs_row.data or {}).get("product_category"),
        rates=rates.data or [],
    )
