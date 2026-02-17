"""
Pre-Shipment Compliance Gate — orchestrates all compliance checks before shipping.

Validates HS codes, checks FTA eligibility, determines CoO requirements,
checks Rules of Origin, and verifies checklist completion.
"""

from supabase import Client

from app.models.compliance_gate import (
    HSValidationResult,
    FTAEligibilityResult,
    COORequirement,
    RulesOfOriginResult,
    ChecklistProgressResult,
    GateCheckResponse,
)
from app.services.fta_calculator import calculate_fta_savings


# Maps product categories to their Certificate of Origin issuing authorities in India
ISSUING_AUTHORITIES = {
    "steel": "EEPC India (Engineering Export Promotion Council)",
    "chemicals": "CHEMEXCIL (Basic Chemicals, Cosmetics & Dyes Export Promotion Council)",
    "pharma": "Pharmexcil (Pharmaceuticals Export Promotion Council)",
    "food": "APEDA (Agricultural & Processed Food Products Export Development Authority)",
    "textiles": "TEXPROCIL (The Cotton Textiles Export Promotion Council)",
    "electronics": "ELCINA (Electronic Industries Association of India)",
    "automotive": "ACMA (Automotive Component Manufacturers Association)",
    "machinery": "EEPC India (Engineering Export Promotion Council)",
    "general": "FIEO (Federation of Indian Export Organisations)",
}


async def validate_hs_code(
    hs_code: str,
    supabase: Client,
    product: str | None = None,
) -> HSValidationResult:
    """Validate an HS code against the hs_codes reference table."""
    if not hs_code or len(hs_code) < 4:
        return HSValidationResult(
            valid=False,
            hs_code=hs_code or "",
            description=None,
            suggestions=["HS code must be at least 4 digits"],
        )

    # Look up exact match
    hs_row = (
        supabase.table("hs_codes")
        .select("code, description, product_category, export_policy")
        .eq("code", hs_code)
        .maybe_single()
        .execute()
    )

    if hs_row.data:
        return HSValidationResult(
            valid=True,
            hs_code=hs_code,
            description=hs_row.data.get("description"),
        )

    # Try prefix match for suggestions
    prefix = hs_code[:4]
    suggestions_result = (
        supabase.table("hs_codes")
        .select("code, description")
        .ilike("code", f"{prefix}%")
        .limit(5)
        .execute()
    )

    suggestions = [
        f"{r['code']} - {r['description']}" for r in (suggestions_result.data or [])
    ]

    return HSValidationResult(
        valid=False,
        hs_code=hs_code,
        description=None,
        suggestions=suggestions or [f"No HS codes found starting with {prefix}"],
    )


async def check_fta_eligibility(
    country: str,
    shipment_value: float,
    supabase: Client,
    hs_code: str | None = None,
    product: str | None = None,
) -> FTAEligibilityResult:
    """Check if FTA preferential tariff is available."""
    savings = await calculate_fta_savings(
        country=country,
        shipment_value=shipment_value,
        supabase=supabase,
        hs_code=hs_code,
        product=product,
    )

    if not savings:
        return FTAEligibilityResult(eligible=False)

    return FTAEligibilityResult(
        eligible=True,
        agreement=savings.agreement,
        mfn_rate=savings.mfn_rate,
        preferential_rate=savings.preferential_rate,
        potential_savings=savings.savings,
    )


async def determine_coo_requirement(
    country: str,
    product: str,
    supabase: Client,
) -> COORequirement:
    """Determine if a Certificate of Origin is required and who issues it."""
    fta_row = (
        supabase.table("fta_agreements")
        .select("name, preferential_tariff, status")
        .eq("country_code", country)
        .maybe_single()
        .execute()
    )

    if not fta_row.data or not fta_row.data.get("preferential_tariff"):
        return COORequirement(
            required=False,
            document_type="Non-preferential CoO (optional)",
            issuing_authority=ISSUING_AUTHORITIES.get(product, ISSUING_AUTHORITIES["general"]),
        )

    authority = ISSUING_AUTHORITIES.get(product, ISSUING_AUTHORITIES["general"])

    return COORequirement(
        required=True,
        agreement_name=fta_row.data["name"],
        issuing_authority=authority,
        document_type="Preferential Certificate of Origin",
    )


async def check_rules_of_origin(
    hs_code: str | None,
    country: str,
    supabase: Client,
) -> RulesOfOriginResult:
    """Check applicable Rules of Origin for HS code + country."""
    if not hs_code:
        return RulesOfOriginResult(applicable=False, rule_text=None)

    rate_row = (
        supabase.table("hs_tariff_rates")
        .select("rule_of_origin")
        .eq("hs_code", hs_code)
        .eq("country_code", country)
        .maybe_single()
        .execute()
    )

    if not rate_row.data or not rate_row.data.get("rule_of_origin"):
        return RulesOfOriginResult(applicable=False, rule_text=None)

    return RulesOfOriginResult(
        applicable=True,
        rule_text=rate_row.data["rule_of_origin"],
    )


async def check_checklist_completion(
    company_id: str,
    shipment_id: str,
    country: str,
    product: str,
    supabase: Client,
) -> ChecklistProgressResult:
    """Check how many checklist items are completed for this shipment."""
    from app.services.checklist_engine import generate_checklist

    # Get the full checklist
    checklist = await generate_checklist(product=product, country=country, supabase=supabase)

    # Get saved progress
    progress_row = (
        supabase.table("checklist_progress")
        .select("checked_items")
        .eq("company_id", company_id)
        .eq("shipment_id", shipment_id)
        .maybe_single()
        .execute()
    )

    checked = (progress_row.data or {}).get("checked_items", {}) if progress_row.data else {}

    total = checklist.total
    completed = sum(1 for item in checklist.items if checked.get(str(item.id), False))
    critical_pending = sum(
        1 for item in checklist.items
        if item.priority == "critical" and not checked.get(str(item.id), False)
    )

    return ChecklistProgressResult(
        total_items=total,
        completed_items=completed,
        critical_pending=critical_pending,
        completion_percentage=round((completed / total * 100) if total > 0 else 0, 1),
    )


async def run_gate_check(
    shipment_id: str,
    company_id: str,
    supabase: Client,
) -> GateCheckResponse:
    """Run all pre-shipment compliance checks and determine gate status."""

    # Fetch shipment
    shipment_row = (
        supabase.table("shipments")
        .select("*")
        .eq("id", shipment_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    shipment = shipment_row.data

    hs_code = shipment.get("hs_code")
    country = shipment["country"]
    product = shipment["product"]
    shipment_value = float(shipment.get("shipment_value") or 100000)

    # Run all checks
    hs_result = await validate_hs_code(hs_code, supabase, product)
    fta_result = await check_fta_eligibility(country, shipment_value, supabase, hs_code, product)
    coo_result = await determine_coo_requirement(country, product, supabase)
    roo_result = await check_rules_of_origin(hs_code, country, supabase)
    checklist_result = await check_checklist_completion(
        company_id, shipment_id, country, product, supabase
    )

    # Determine gate status
    blocking_reasons = []

    if hs_code and not hs_result.valid:
        blocking_reasons.append(f"Invalid HS code: {hs_code}")

    if not hs_code:
        blocking_reasons.append("HS code not provided")

    if checklist_result.critical_pending > 0:
        blocking_reasons.append(
            f"{checklist_result.critical_pending} critical checklist items pending"
        )

    gate_status = "blocked" if blocking_reasons else "approved"

    # Persist gate check result
    gate_data = {
        "shipment_id": shipment_id,
        "company_id": company_id,
        "hs_validation": hs_result.model_dump(),
        "fta_eligibility": fta_result.model_dump(),
        "coo_requirement": coo_result.model_dump(),
        "rules_of_origin": roo_result.model_dump(),
        "checklist_progress": checklist_result.model_dump(),
        "gate_status": gate_status,
        "blocking_reasons": blocking_reasons,
    }

    # Upsert (shipment_id is unique)
    supabase.table("compliance_gates").upsert(
        gate_data, on_conflict="shipment_id"
    ).execute()

    # Update shipment gate_status
    supabase.table("shipments").update(
        {"gate_status": gate_status}
    ).eq("id", shipment_id).execute()

    return GateCheckResponse(
        shipment_id=shipment_id,
        gate_status=gate_status,
        hs_validation=hs_result,
        fta_eligibility=fta_result,
        coo_requirement=coo_result,
        rules_of_origin=roo_result,
        checklist_progress=checklist_result,
        blocking_reasons=blocking_reasons,
    )
