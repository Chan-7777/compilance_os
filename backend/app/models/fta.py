from typing import Optional

from pydantic import BaseModel, Field


class FTASavingsRequest(BaseModel):
    hs_code: Optional[str] = Field(None, description="Specific HS code (e.g., 7208)")
    product: Optional[str] = Field(None, description="Product category (e.g., steel)")
    country: str = Field(..., description="Destination country code")
    shipment_value: float = Field(..., gt=0, description="Shipment value in INR")


class FTASavingsResponse(BaseModel):
    country: str
    agreement: Optional[str]
    mfn_rate: float
    preferential_rate: float
    mfn_duty: float
    preferential_duty: float
    savings: float
    rule_of_origin: Optional[str] = None
    disclaimer: str = (
        "Rates are indicative. Actual preferential tariffs depend on HS code "
        "and Rules of Origin compliance."
    )


class HSLookupResponse(BaseModel):
    hs_code: str
    description: Optional[str]
    product_category: Optional[str]
    rates: list[dict]  # rates per country
