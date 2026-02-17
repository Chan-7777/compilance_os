from typing import Optional

from pydantic import BaseModel


class HSValidationResult(BaseModel):
    valid: bool
    hs_code: str
    description: Optional[str] = None
    suggestions: list[str] = []


class FTAEligibilityResult(BaseModel):
    eligible: bool
    agreement: Optional[str] = None
    mfn_rate: Optional[float] = None
    preferential_rate: Optional[float] = None
    potential_savings: Optional[float] = None


class COORequirement(BaseModel):
    required: bool
    agreement_name: Optional[str] = None
    issuing_authority: Optional[str] = None
    document_type: Optional[str] = None


class RulesOfOriginResult(BaseModel):
    applicable: bool
    rule_text: Optional[str] = None


class ChecklistProgressResult(BaseModel):
    total_items: int
    completed_items: int
    critical_pending: int
    completion_percentage: float


class GateCheckResponse(BaseModel):
    shipment_id: str
    gate_status: str  # "approved" | "blocked" | "pending"
    hs_validation: HSValidationResult
    fta_eligibility: FTAEligibilityResult
    coo_requirement: COORequirement
    rules_of_origin: RulesOfOriginResult
    checklist_progress: ChecklistProgressResult
    blocking_reasons: list[str] = []


class HSValidateRequest(BaseModel):
    hs_code: str
    product: Optional[str] = None
