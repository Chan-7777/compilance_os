from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.dependencies import get_supabase_admin, get_current_user
from app.models.shipment import ShipmentCreate, ShipmentUpdate, ShipmentResponse

router = APIRouter(prefix="/api/v1", tags=["Shipments"])


@router.get("/shipments", response_model=list[ShipmentResponse])
async def list_shipments(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """List all shipments for the current user's company."""
    result = (
        supabase.table("shipments")
        .select("*")
        .eq("company_id", user["company_id"])
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.post("/shipments", response_model=ShipmentResponse, status_code=201)
async def create_shipment(
    shipment: ShipmentCreate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Create a new shipment."""
    data = {
        "company_id": user["company_id"],
        "name": shipment.name,
        "product": shipment.product,
        "country": shipment.country,
        "date": str(shipment.date),
        "notes": shipment.notes,
        "hs_code": shipment.hs_code,
        "shipment_value": shipment.shipment_value,
    }
    result = supabase.table("shipments").insert(data).execute()

    # Audit log
    supabase.table("audit_log").insert({
        "company_id": user["company_id"],
        "user_id": user["user_id"],
        "action": "shipment.created",
        "entity_type": "shipment",
        "entity_id": result.data[0]["id"],
        "details": {"name": shipment.name, "country": shipment.country},
    }).execute()

    return result.data[0]


@router.patch("/shipments/{shipment_id}", response_model=ShipmentResponse)
async def update_shipment(
    shipment_id: str,
    update: ShipmentUpdate,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Update a shipment (status, risk score, notes)."""
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

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        supabase.table("shipments")
        .update(update_data)
        .eq("id", shipment_id)
        .execute()
    )

    # Audit log
    supabase.table("audit_log").insert({
        "company_id": user["company_id"],
        "user_id": user["user_id"],
        "action": "shipment.updated",
        "entity_type": "shipment",
        "entity_id": shipment_id,
        "details": update_data,
    }).execute()

    return result.data[0]


@router.delete("/shipments/{shipment_id}", status_code=204)
async def delete_shipment(
    shipment_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Delete a shipment."""
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

    supabase.table("shipments").delete().eq("id", shipment_id).execute()

    # Audit log
    supabase.table("audit_log").insert({
        "company_id": user["company_id"],
        "user_id": user["user_id"],
        "action": "shipment.deleted",
        "entity_type": "shipment",
        "entity_id": shipment_id,
    }).execute()
