from pydantic import BaseModel, Field


class ChecklistRequest(BaseModel):
    product: str = Field(..., description="Product category ID")
    country: str = Field(..., description="Country code")


class ChecklistItem(BaseModel):
    id: int
    category: str
    item: str
    priority: str  # critical, high, medium, low
    phase: str  # one-time, pre-production, pre-shipment, per-shipment, annual, quarterly


class ChecklistResponse(BaseModel):
    items: list[ChecklistItem]
    total: int
    critical_count: int
    disclaimer: str = (
        "ComplianceOS provides informational guidance only. "
        "Verify all requirements with licensed customs brokers."
    )
