from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from supabase import Client

from app.dependencies import get_supabase_admin, get_current_user
from app.models.compliance_gate import GateCheckResponse, HSValidateRequest, HSValidationResult
from app.services.compliance_gate import run_gate_check, validate_hs_code
from app.services.coo_generator import generate_coo_pdf

router = APIRouter(prefix="/api/v1", tags=["Compliance Gate"])


@router.post("/shipments/{shipment_id}/gate-check", response_model=GateCheckResponse)
async def run_compliance_gate(
    shipment_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Run all pre-shipment compliance checks for a shipment."""
    # Verify ownership
    existing = (
        supabase.table("shipments")
        .select("id")
        .eq("id", shipment_id)
        .eq("company_id", user["company_id"])
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Shipment not found")

    result = await run_gate_check(shipment_id, user["company_id"], supabase)

    # Audit log
    supabase.table("audit_log").insert({
        "company_id": user["company_id"],
        "user_id": user["user_id"],
        "action": "gate_check.run",
        "entity_type": "shipment",
        "entity_id": shipment_id,
        "details": {"gate_status": result.gate_status},
    }).execute()

    return result


@router.get("/shipments/{shipment_id}/gate-check", response_model=GateCheckResponse)
async def get_gate_status(
    shipment_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get cached gate check result for a shipment."""
    gate_row = (
        supabase.table("compliance_gates")
        .select("*")
        .eq("shipment_id", shipment_id)
        .eq("company_id", user["company_id"])
        .maybe_single()
        .execute()
    )

    if not gate_row.data:
        raise HTTPException(status_code=404, detail="No gate check found. Run a gate check first.")

    data = gate_row.data
    return GateCheckResponse(
        shipment_id=data["shipment_id"],
        gate_status=data["gate_status"],
        hs_validation=data["hs_validation"],
        fta_eligibility=data["fta_eligibility"],
        coo_requirement=data["coo_requirement"],
        rules_of_origin=data["rules_of_origin"],
        checklist_progress=data["checklist_progress"],
        blocking_reasons=data["blocking_reasons"],
    )


@router.get("/shipments/{shipment_id}/coo-pdf")
async def download_coo_pdf(
    shipment_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Download Certificate of Origin PDF for a shipment."""
    # Get shipment
    shipment_row = (
        supabase.table("shipments")
        .select("*")
        .eq("id", shipment_id)
        .eq("company_id", user["company_id"])
        .maybe_single()
        .execute()
    )
    if not shipment_row.data:
        raise HTTPException(status_code=404, detail="Shipment not found")

    shipment = shipment_row.data

    # Get gate check for FTA info
    gate_row = (
        supabase.table("compliance_gates")
        .select("fta_eligibility, coo_requirement, rules_of_origin")
        .eq("shipment_id", shipment_id)
        .maybe_single()
        .execute()
    )

    fta_agreement = None
    origin_criteria = None
    if gate_row.data:
        fta_data = gate_row.data.get("fta_eligibility", {})
        roo_data = gate_row.data.get("rules_of_origin", {})
        fta_agreement = fta_data.get("agreement")
        origin_criteria = roo_data.get("rule_text")

    # Get company name
    company_name = user.get("company", {}).get("name", "Indian Exporter") if user.get("company") else "Indian Exporter"

    pdf_buffer = generate_coo_pdf(
        exporter_name=company_name,
        product=shipment["product"],
        hs_code=shipment.get("hs_code"),
        destination_country=shipment["country"],
        fta_agreement=fta_agreement,
        shipment_value=shipment.get("shipment_value"),
        origin_criteria=origin_criteria,
        shipment_name=shipment["name"],
    )

    filename = f"CoO_{shipment['name'].replace(' ', '_')}_{shipment['country']}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/hs-validate", response_model=HSValidationResult)
async def validate_hs(
    request: HSValidateRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Validate an HS code and return suggestions if invalid."""
    return await validate_hs_code(request.hs_code, supabase, request.product)
