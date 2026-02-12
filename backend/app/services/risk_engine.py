"""
Risk Scoring Engine — Python port of src/utils/risk-scoring.ts

Exact same algorithm and weights. Reads from Supabase instead of static data.
"""

from supabase import Client

from app.models.risk import RiskFactor, RiskScoreResponse


def _get_risk_level(score: int) -> str:
    if score >= 60:
        return "high"
    if score >= 30:
        return "medium"
    return "low"


async def calculate_risk_score(
    product: str,
    country: str,
    company_size: str,
    supabase: Client,
) -> RiskScoreResponse:
    """Calculate compliance risk score for a product-country-company combination."""

    # Fetch country data from DB
    country_row = (
        supabase.table("countries").select("*").eq("code", country).single().execute()
    )
    country_data = country_row.data
    if not country_data:
        return RiskScoreResponse(
            score=50, level="medium", factors=[], recommendations=[]
        )

    # Fetch certifications for this product+country
    cert_row = (
        supabase.table("certifications")
        .select("cert_list")
        .eq("country_code", country)
        .eq("product_category", product)
        .maybe_single()
        .execute()
    )
    certs = (cert_row.data or {}).get("cert_list", [])

    # If no product-specific certs, try 'general'
    if not certs:
        general_cert = (
            supabase.table("certifications")
            .select("cert_list")
            .eq("country_code", country)
            .eq("product_category", "general")
            .maybe_single()
            .execute()
        )
        certs = (general_cert.data or {}).get("cert_list", [])

    # Fetch FTA data
    fta_row = (
        supabase.table("fta_agreements")
        .select("*")
        .eq("country_code", country)
        .maybe_single()
        .execute()
    )
    fta = fta_row.data

    cbam = country_data.get("cbam_config", {})
    esg = country_data.get("esg_config", {})
    packaging = country_data.get("packaging", [])
    sanctions = country_data.get("sanctions", [])

    score = 0
    factors: list[RiskFactor] = []
    recommendations: list[str] = []

    # ── CBAM RISK ──
    if cbam.get("active"):
        covered_sectors = cbam.get("coveredSectors", [])
        is_covered = product in covered_sectors or product in ("chemicals", "steel")

        if is_covered:
            score += 30
            factors.append(RiskFactor(
                category="CBAM",
                severity="high",
                detail=f"Product falls under {country} CBAM scope. {cbam.get('phase', '')}",
            ))
            recommendations.append("Implement carbon emissions tracking at facility level")
            recommendations.append("Register with authorized CBAM declarant in destination country")
            recommendations.append("Obtain verified emissions data from accredited verifier")
        else:
            score += 5
            factors.append(RiskFactor(
                category="CBAM",
                severity="low",
                detail="Product not currently in CBAM scope but monitor expansion",
            ))

    # ── ESG COMPLIANCE RISK ──
    if esg.get("scope3Required"):
        score += 15
        factors.append(RiskFactor(
            category="ESG",
            severity="high",
            detail="Scope 3 emissions reporting required for supply chain",
        ))
        recommendations.append("Map complete supply chain for Scope 3 emissions")

    if esg.get("csrd") or esg.get("secClimate"):
        score += 10
        factors.append(RiskFactor(
            category="ESG Disclosure",
            severity="medium",
            detail="Buyer may require ESG data for their own compliance reporting",
        ))
        recommendations.append("Prepare ESG data package for buyer's compliance needs")

    # ── CERTIFICATION COMPLEXITY ──
    cert_count = len(certs)
    if cert_count > 5:
        score += 15
        factors.append(RiskFactor(
            category="Certifications",
            severity="high",
            detail=f"{cert_count} certifications required — high compliance burden",
        ))
    elif cert_count > 2:
        score += 8
        factors.append(RiskFactor(
            category="Certifications",
            severity="medium",
            detail=f"{cert_count} certifications required",
        ))
    else:
        score += 3
        factors.append(RiskFactor(
            category="Certifications",
            severity="low",
            detail=f"{cert_count} certifications required",
        ))

    # ── SANCTIONS RISK ──
    if sanctions:
        score += 10
        factors.append(RiskFactor(
            category="Sanctions",
            severity="medium",
            detail="Sanctions screening required for this destination",
        ))
        recommendations.append("Screen all parties against sanctions lists before shipment")

    # ── PACKAGING & LABELING ──
    if len(packaging) > 2:
        score += 8
        factors.append(RiskFactor(
            category="Packaging",
            severity="medium",
            detail="Complex packaging regulations in effect",
        ))

    # ── FTA UTILIZATION ──
    if fta:
        if fta.get("preferential_tariff"):
            score -= 5
            factors.append(RiskFactor(
                category="Trade Agreement",
                severity="positive",
                detail=f"{fta['name']} is active. Preferential tariffs available with proper Certificate of Origin.",
            ))
            recommendations.append(
                "Ensure Certificate of Origin is correctly filed for preferential tariff"
            )
        elif fta.get("status") == "Under Negotiation":
            score += 5
            factors.append(RiskFactor(
                category="Trade Agreement",
                severity="info",
                detail=f"{fta['name']}: {fta['status']}. {fta.get('notes', '')}",
            ))

    # ── COMPANY SIZE (MSME) MODIFIER ──
    if company_size in ("micro", "small"):
        score += 10
        factors.append(RiskFactor(
            category="MSME Capacity",
            severity="medium",
            detail="Smaller firms face higher relative compliance burden",
        ))
        recommendations.append(
            "Consider MSME export facilitation schemes and subsidized certification programs"
        )

    # ── SPECIAL REGULATIONS ──
    if country == "EU" and product in ("food", "textiles"):
        score += 10
        factors.append(RiskFactor(
            category="EUDR",
            severity="medium",
            detail="EU Deforestation Regulation may apply — due diligence on sourcing required",
        ))
        recommendations.append("Map supply chain for deforestation-free sourcing compliance")

    if country == "US":
        score += 5
        factors.append(RiskFactor(
            category="UFLPA",
            severity="medium",
            detail="Uyghur Forced Labor Prevention Act — supply chain due diligence required",
        ))
        recommendations.append("Document supply chain to demonstrate no forced labor involvement")

    # ── NORMALIZE ──
    score = max(0, min(100, score))
    level = _get_risk_level(score)

    return RiskScoreResponse(
        score=score,
        level=level,
        factors=factors,
        recommendations=recommendations,
    )
