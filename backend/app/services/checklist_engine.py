"""
Checklist Generator — Python port of src/utils/checklist-generator.ts

Same logic: base docs + FTA CoO + product certs + CBAM + ESG + packaging + labeling
+ customs + sanctions + Indian compliance.
"""

from supabase import Client

from app.models.checklist import ChecklistItem, ChecklistResponse


async def generate_checklist(
    product: str,
    country: str,
    supabase: Client,
) -> ChecklistResponse:
    """Generate compliance checklist for a product-country combination."""

    country_row = (
        supabase.table("countries").select("*").eq("code", country).single().execute()
    )
    country_data = country_row.data
    if not country_data:
        return ChecklistResponse(items=[], total=0, critical_count=0)

    # Fetch certifications
    cert_row = (
        supabase.table("certifications")
        .select("cert_list")
        .eq("country_code", country)
        .eq("product_category", product)
        .maybe_single()
        .execute()
    )
    certs = (cert_row.data or {}).get("cert_list", [])
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

    # Fetch FTA
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
    labeling = country_data.get("labeling", [])
    customs = country_data.get("customs", [])
    sanctions = country_data.get("sanctions", [])

    items: list[ChecklistItem] = []
    next_id = 1

    def add(category: str, item: str, priority: str, phase: str):
        nonlocal next_id
        items.append(ChecklistItem(
            id=next_id, category=category, item=item, priority=priority, phase=phase,
        ))
        next_id += 1

    # ── PRE-SHIPMENT DOCUMENTATION ──
    add("Documentation", "Commercial Invoice with all required fields", "critical", "pre-shipment")
    add("Documentation", "Packing List", "critical", "pre-shipment")
    add("Documentation", "Bill of Lading / Airway Bill", "critical", "pre-shipment")
    add("Documentation", "Shipping Bill (Indian Customs)", "critical", "pre-shipment")
    add("Documentation", "Letter of Credit / Payment Terms Documentation", "high", "pre-shipment")
    add("Documentation", "Insurance Certificate", "high", "pre-shipment")

    # ── CERTIFICATE OF ORIGIN ──
    if fta and fta.get("preferential_tariff"):
        add("Trade Agreement", f"Certificate of Origin (for {fta['name']} preferential tariff)", "critical", "pre-shipment")
        add("Trade Agreement", "Rules of Origin compliance documentation", "high", "pre-shipment")
    else:
        add("Documentation", "Non-preferential Certificate of Origin", "high", "pre-shipment")

    # ── PRODUCT-SPECIFIC CERTIFICATIONS ──
    for cert in certs:
        add("Certification", cert, "critical", "pre-production")

    # ── CBAM REQUIREMENTS ──
    if cbam.get("active"):
        covered = cbam.get("coveredSectors", [])
        if product in covered or product in ("chemicals", "steel"):
            add("CBAM", "Embedded emissions calculation (direct + indirect)", "critical", "pre-shipment")
            add("CBAM", "Carbon content declaration to importer", "critical", "pre-shipment")
            add("CBAM", "Verification by accredited verifier", "high", "quarterly")
            add("CBAM", "CBAM registry registration (via importer)", "high", "one-time")

    # ── ESG REQUIREMENTS ──
    if esg.get("scope3Required"):
        add("ESG", "Scope 1, 2, 3 emissions data prepared", "high", "annual")
    if esg.get("csrd"):
        add("ESG", "ESRS-aligned sustainability data for buyer", "medium", "annual")

    # ── PACKAGING, LABELING, CUSTOMS ──
    for pkg in packaging:
        add("Packaging", pkg, "medium", "pre-production")
    for lbl in labeling:
        add("Labeling", lbl, "high", "pre-production")
    for cust in customs:
        add("Customs", cust, "high", "pre-shipment")

    # ── SANCTIONS SCREENING ──
    for s in sanctions:
        add("Sanctions", s, "critical", "pre-shipment")

    # ── INDIAN EXPORT COMPLIANCE ──
    add("Indian Compliance", "IEC (Import Export Code) valid and active", "critical", "one-time")
    add("Indian Compliance", "AD Code registered with bank", "critical", "one-time")
    add("Indian Compliance", "GST & LUT for export without IGST payment", "critical", "annual")
    add("Indian Compliance", "FEMA compliance for foreign exchange receipt", "high", "per-shipment")
    add("Indian Compliance", "RBI reporting (EDPMS)", "high", "per-shipment")
    add("Indian Compliance", "E-way bill (if applicable)", "medium", "per-shipment")
    add("Indian Compliance", "Quality pre-shipment inspection (if mandated)", "high", "pre-shipment")

    critical_count = sum(1 for i in items if i.priority == "critical")

    return ChecklistResponse(
        items=items,
        total=len(items),
        critical_count=critical_count,
    )
