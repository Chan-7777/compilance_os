from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class ShipmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    product: str
    country: str
    date: date
    notes: Optional[str] = None


class ShipmentUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    risk_score: Optional[int] = None
    notes: Optional[str] = None


class ShipmentResponse(BaseModel):
    id: str
    company_id: str
    name: str
    product: str
    country: str
    date: str
    status: str
    risk_score: Optional[int] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str
