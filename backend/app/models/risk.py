from pydantic import BaseModel, Field


class RiskScoreRequest(BaseModel):
    product: str = Field(..., description="Product category ID: steel, food, textiles, etc.")
    country: str = Field(..., description="Country code: EU, US, UK, UAE, Japan, Australia")
    company_size: str = Field("small", description="micro, small, medium, large")


class RiskFactor(BaseModel):
    category: str
    severity: str  # high, medium, low, positive, info
    detail: str


class RiskScoreResponse(BaseModel):
    score: int = Field(..., ge=0, le=100)
    level: str  # high, medium, low
    factors: list[RiskFactor]
    recommendations: list[str]
    disclaimer: str = (
        "ComplianceOS provides informational guidance only. "
        "This does not constitute legal or regulatory advice."
    )


class BatchRiskScoreRequest(BaseModel):
    product: str = Field(..., description="Product category ID")
    countries: list[str] = Field(..., description="List of country codes")
    company_size: str = Field("small", description="micro, small, medium, large")


class BatchRiskScoreResponse(BaseModel):
    results: list[dict]
    disclaimer: str = (
        "ComplianceOS provides informational guidance only. "
        "This does not constitute legal or regulatory advice."
    )
