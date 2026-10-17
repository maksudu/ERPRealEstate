from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# -------------------------------------------------------------
# 1. Authority Clearance & Condition Checklist Schemas
# -------------------------------------------------------------
class ClearanceConditionBase(BaseModel):
    condition_code: str = Field(..., max_length=32)
    condition_title: str = Field(..., max_length=255)
    condition_category: str = Field(default="STATUTORY_MANDATE", max_length=64)
    mandatory_level: str = Field(default="CRITICAL", max_length=32) # CRITICAL, MANDATORY, ADVISORY
    compliance_status: str = Field(default="PENDING", max_length=32) # PENDING, IN_PROGRESS, COMPLIED, WAIVED
    compliance_date: Optional[date] = None
    verified_by_officer: Optional[str] = Field(None, max_length=128)
    evidence_doc_url: Optional[str] = Field(None, max_length=255)
    remarks: Optional[str] = None


class ClearanceConditionCreate(ClearanceConditionBase):
    clearance_id: int


class ClearanceConditionUpdate(BaseModel):
    compliance_status: Optional[str] = None
    compliance_date: Optional[date] = None
    verified_by_officer: Optional[str] = None
    evidence_doc_url: Optional[str] = None
    remarks: Optional[str] = None


class ClearanceConditionResponse(ClearanceConditionBase):
    id: int
    clearance_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AuthorityClearanceBase(BaseModel):
    project_id: int
    clearance_type_id: str
    authority_name: str = Field(default="RAJUK", max_length=64)
    reference_no: Optional[str] = Field(None, max_length=64)
    application_memo_no: Optional[str] = Field(None, max_length=128)
    approved_memo_no: Optional[str] = Field(None, max_length=128)
    approval_date: Optional[date] = None
    expiry_date: Optional[date] = None
    validity_months: int = 12
    renewal_reminder_days: int = 30
    renewal_fee_bdt: Decimal = Decimal("0.00")
    sanctioned_floors: Optional[str] = Field(None, max_length=64)
    sanctioned_height_m: Optional[Decimal] = None
    contact_officer_name: Optional[str] = Field(None, max_length=128)
    contact_officer_phone: Optional[str] = Field(None, max_length=64)
    status: str = Field(default="NOT_APPLIED", max_length=32)
    document_url: Optional[str] = Field(None, max_length=255)
    remarks: Optional[str] = Field(None, max_length=255)


class AuthorityClearanceCreate(AuthorityClearanceBase):
    pass


class AuthorityClearanceUpdate(BaseModel):
    authority_name: Optional[str] = None
    reference_no: Optional[str] = None
    application_memo_no: Optional[str] = None
    approved_memo_no: Optional[str] = None
    approval_date: Optional[date] = None
    expiry_date: Optional[date] = None
    validity_months: Optional[int] = None
    renewal_reminder_days: Optional[int] = None
    renewal_fee_bdt: Optional[Decimal] = None
    sanctioned_floors: Optional[str] = None
    sanctioned_height_m: Optional[Decimal] = None
    contact_officer_name: Optional[str] = None
    contact_officer_phone: Optional[str] = None
    status: Optional[str] = None
    document_url: Optional[str] = None
    remarks: Optional[str] = None


class AuthorityClearanceResponse(AuthorityClearanceBase):
    id: int
    project_name: Optional[str] = None
    renewal_alert_status: str
    days_to_expiry: Optional[int] = None
    conditions_count: int = 0
    complied_conditions_count: int = 0
    conditions: List[ClearanceConditionResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ClearanceRenewalCalendarItem(BaseModel):
    id: int
    project_id: int
    project_name: str
    authority_name: str
    clearance_type_id: str
    reference_no: Optional[str]
    approved_memo_no: Optional[str]
    expiry_date: Optional[date]
    days_remaining: int
    alert_urgency: str # CRITICAL_EXPIRED, URGENT_15_DAYS, WARNING_30_DAYS, NORMAL_VALID
    renewal_fee_bdt: Decimal
    contact_officer_name: Optional[str]
    contact_officer_phone: Optional[str]


# -------------------------------------------------------------
# 2. Digital Safe Document Archive & Court Hearing Schemas
# -------------------------------------------------------------
class CourtCaseDocumentBase(BaseModel):
    document_code: str = Field(..., max_length=32)
    document_category: str = Field(..., max_length=64)
    document_title: str = Field(..., max_length=255)
    certified_copy_no: Optional[str] = Field(None, max_length=128)
    issue_or_filing_date: Optional[date] = None
    issuing_authority_or_court: Optional[str] = Field(None, max_length=128)
    file_url: str = Field(..., max_length=255)
    file_size_kb: int = 0
    digital_safe_hash: Optional[str] = Field(None, max_length=64)
    uploaded_by_name: Optional[str] = Field(None, max_length=128)
    is_confidential: bool = True
    summary_notes: Optional[str] = None


class CourtCaseDocumentCreate(CourtCaseDocumentBase):
    case_id: int


class CourtCaseDocumentResponse(CourtCaseDocumentBase):
    id: int
    case_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CourtCaseHearingBase(BaseModel):
    hearing_date: date
    presiding_judge: Optional[str] = Field(None, max_length=128)
    court_bench: Optional[str] = Field(None, max_length=128)
    summary_of_proceedings: str
    order_passed: Optional[str] = Field(None, max_length=128)
    next_hearing_date: Optional[date] = None
    attended_advocate: Optional[str] = Field(None, max_length=128)
    action_items: Optional[str] = None


class CourtCaseHearingCreate(CourtCaseHearingBase):
    case_id: int


class CourtCaseHearingResponse(CourtCaseHearingBase):
    id: int
    case_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# -------------------------------------------------------------
# 3. Court Cases & Land Dispute Schemas
# -------------------------------------------------------------
class CourtCaseBase(BaseModel):
    project_id: Optional[int] = None
    case_type: str = Field(..., max_length=64) # Title Suit, Injunction, Writ Petition, NI Act 138, Land Dispute
    case_number: str = Field(..., max_length=64)
    concerned_court: str = Field(..., max_length=128)
    legal_act_section: Optional[str] = Field(None, max_length=128)
    dispute_category: str = Field(default="LAND_TITLE_DISPUTE", max_length=64)
    
    land_mouza: Optional[str] = Field(None, max_length=128)
    cs_rs_bs_plot_no: Optional[str] = Field(None, max_length=128)
    disputed_area_decimals: Decimal = Decimal("0.0000")
    
    plaintiff: str = Field(..., max_length=128)
    defendant: str = Field(..., max_length=128)
    appointed_advocate: str = Field(..., max_length=128)
    advocate_chamber: Optional[str] = Field(None, max_length=128)
    advocate_contact_phone: Optional[str] = Field(None, max_length=64)
    advocate_email: Optional[str] = Field(None, max_length=128)
    
    is_interim_stay_active: bool = False
    stay_order_details: Optional[str] = None
    stay_order_granted_date: Optional[date] = None
    stay_order_valid_until: Optional[date] = None
    
    estimated_risk_level: str = Field(default="MEDIUM", max_length=32)
    financial_claim_bdt: Decimal = Decimal("0.00")
    next_hearing_date: Optional[date] = None
    status: str = Field(default="HEARING_ONGOING", max_length=32)
    decree_outcome: Optional[str] = Field(None, max_length=64)
    case_summary: Optional[str] = None


class CourtCaseCreate(CourtCaseBase):
    pass


class CourtCaseUpdate(BaseModel):
    project_id: Optional[int] = None
    case_type: Optional[str] = None
    concerned_court: Optional[str] = None
    legal_act_section: Optional[str] = None
    dispute_category: Optional[str] = None
    land_mouza: Optional[str] = None
    cs_rs_bs_plot_no: Optional[str] = None
    disputed_area_decimals: Optional[Decimal] = None
    plaintiff: Optional[str] = None
    defendant: Optional[str] = None
    appointed_advocate: Optional[str] = None
    advocate_chamber: Optional[str] = None
    advocate_contact_phone: Optional[str] = None
    advocate_email: Optional[str] = None
    is_interim_stay_active: Optional[bool] = None
    stay_order_details: Optional[str] = None
    stay_order_granted_date: Optional[date] = None
    stay_order_valid_until: Optional[date] = None
    estimated_risk_level: Optional[str] = None
    financial_claim_bdt: Optional[Decimal] = None
    next_hearing_date: Optional[date] = None
    status: Optional[str] = None
    decree_outcome: Optional[str] = None
    case_summary: Optional[str] = None


class CourtCaseResponse(CourtCaseBase):
    id: int
    project_name: Optional[str] = None
    documents_count: int = 0
    hearings_count: int = 0
    documents: List[CourtCaseDocumentResponse] = []
    hearings: List[CourtCaseHearingResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# -------------------------------------------------------------
# 4. Executive Summary Metrics
# -------------------------------------------------------------
class LegalComplianceMetrics(BaseModel):
    total_permits: int = 0
    approved_permits: int = 0
    expiring_soon_permits: int = 0
    expired_permits: int = 0
    total_conditions: int = 0
    complied_conditions: int = 0
    condition_compliance_percentage: float = 0.0
    active_court_cases: int = 0
    interim_stay_orders_active: int = 0
    total_disputed_area_decimals: float = 0.0
    total_financial_exposure_bdt: float = 0.0
