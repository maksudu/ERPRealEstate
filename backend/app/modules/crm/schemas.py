from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
import re


# -------------------------------------------------------------
# Nominee Schemas (Spec 4.5)
# -------------------------------------------------------------
class NomineeBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    nominee_name: str
    relationship: str = Field(alias="relation_type", default="SPOUSE")
    nid_number: Optional[str] = None
    share_percentage: float = 100.00
    photo_url: Optional[str] = None
    # 4.5 enrichment
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    nid_front_url: Optional[str] = None
    nid_back_url: Optional[str] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    verification_status: Optional[str] = "PENDING"
    notes: Optional[str] = None


class NomineeCreate(NomineeBase):
    pass


class NomineeUpdate(BaseModel):
    nominee_name: Optional[str] = None
    relationship: Optional[str] = Field(default=None, alias="relation_type")
    nid_number: Optional[str] = None
    share_percentage: Optional[float] = None
    photo_url: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    nid_front_url: Optional[str] = None
    nid_back_url: Optional[str] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    verification_status: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class NomineeResponse(NomineeBase):
    id: int
    customer_id: int
    verified_by_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    previous_share_percentage: Optional[float] = None
    share_changed_at: Optional[datetime] = None
    share_changed_by_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# -------------------------------------------------------------
# Customer Schemas (Spec 4.5)
# -------------------------------------------------------------
class CustomerBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    customer_code: str
    full_name_en: str
    full_name_bn: Optional[str] = None
    father_husband_name: Optional[str] = None
    mother_name: Optional[str] = None
    nid_number: Optional[str] = None
    tin_number: Optional[str] = None
    primary_phone: str
    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    is_nrb: bool = False
    passport_number: Optional[str] = None
    # 4.5 enrichment
    customer_type: Optional[str] = "INDIVIDUAL"
    preferred_language: Optional[str] = "BANGLA"
    preferred_contact_method: Optional[str] = "PHONE"
    relationship_manager_id: Optional[int] = None
    is_consent_given: bool = True
    is_opted_out: bool = False
    opt_out_at: Optional[datetime] = None
    opt_out_reason: Optional[str] = None
    profile_photo_url: Optional[str] = None
    nid_scan_front_url: Optional[str] = None
    nid_scan_back_url: Optional[str] = None
    merged_into_id: Optional[int] = None
    merged_at: Optional[datetime] = None


class CustomerCreate(BaseModel):
    full_name_en: str
    full_name_bn: Optional[str] = None
    father_husband_name: Optional[str] = None
    mother_name: Optional[str] = None
    nid_number: Optional[str] = None
    tin_number: Optional[str] = None
    primary_phone: str
    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    is_nrb: bool = False
    passport_number: Optional[str] = None
    customer_type: Optional[str] = "INDIVIDUAL"
    preferred_language: Optional[str] = "BANGLA"
    preferred_contact_method: Optional[str] = "PHONE"
    relationship_manager_id: Optional[int] = None
    is_consent_given: bool = True
    profile_photo_url: Optional[str] = None
    nid_scan_front_url: Optional[str] = None
    nid_scan_back_url: Optional[str] = None
    nominees: Optional[List[NomineeCreate]] = []

    @field_validator("primary_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-\(\)]", "", v or "")
        if not re.match(r"^\+?[0-9]{10,15}$", cleaned):
            raise ValueError("Invalid mobile number format. Expected 10-15 digits, optional leading +.")
        return cleaned

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v.strip()):
                raise ValueError("Invalid email address format.")
            return v.strip().lower()
        return v


class CustomerUpdate(BaseModel):
    full_name_en: Optional[str] = None
    full_name_bn: Optional[str] = None
    father_husband_name: Optional[str] = None
    mother_name: Optional[str] = None
    nid_number: Optional[str] = None
    tin_number: Optional[str] = None
    primary_phone: Optional[str] = None
    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    is_nrb: Optional[bool] = None
    passport_number: Optional[str] = None
    customer_type: Optional[str] = None
    preferred_language: Optional[str] = None
    preferred_contact_method: Optional[str] = None
    relationship_manager_id: Optional[int] = None
    is_consent_given: Optional[bool] = None
    is_opted_out: Optional[bool] = None
    opt_out_reason: Optional[str] = None
    profile_photo_url: Optional[str] = None
    nid_scan_front_url: Optional[str] = None
    nid_scan_back_url: Optional[str] = None

    @field_validator("primary_phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        cleaned = re.sub(r"[\s\-\(\)]", "", v or "")
        if not re.match(r"^\+?[0-9]{10,15}$", cleaned):
            raise ValueError("Invalid mobile number format. Expected 10-15 digits, optional leading +.")
        return cleaned

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v.strip()):
                raise ValueError("Invalid email address format.")
            return v.strip().lower()
        return v


class CustomerResponse(CustomerBase):
    id: int
    nominees: List[NomineeResponse] = []
    relationship_manager_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CustomerPaginatedOut(BaseModel):
    items: List[CustomerResponse]
    total: int
    limit: int
    offset: int


class CustomerDuplicateCheckRequest(BaseModel):
    primary_phone: Optional[str] = None
    email: Optional[str] = None
    nid_number: Optional[str] = None
    exclude_customer_id: Optional[int] = None


class CustomerDuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    matching_customer_ids: List[int] = []
    matching_customers: List[CustomerResponse] = []


class CustomerMergeRequest(BaseModel):
    """Merge source_customer_id (duplicate) into target_customer_id (survivor), preserving inquiry history."""
    source_customer_id: int
    target_customer_id: int
    merge_reason: Optional[str] = None


# -------------------------------------------------------------
# Customer Service Requests (Spec 4.5)
# -------------------------------------------------------------
class ServiceRequestBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    request_type: str = "SERVICE"  # SERVICE, COMPLAINT
    title: str
    description: Optional[str] = None
    status: str = "OPEN"
    priority: Optional[str] = "MEDIUM"
    assigned_to_id: Optional[int] = None
    resolution_notes: Optional[str] = None
    related_booking_id: Optional[int] = None
    related_unit_id: Optional[int] = None


class ServiceRequestCreate(ServiceRequestBase):
    pass


class ServiceRequestUpdate(BaseModel):
    request_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_id: Optional[int] = None
    resolution_notes: Optional[str] = None
    related_booking_id: Optional[int] = None
    related_unit_id: Optional[int] = None


class ServiceRequestResponse(ServiceRequestBase):
    id: int
    customer_id: int
    resolved_at: Optional[datetime] = None
    assigned_to_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ServiceRequestPaginatedOut(BaseModel):
    items: List[ServiceRequestResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Lead Activity Schemas
# -------------------------------------------------------------
class LeadActivityBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    activity_type: str = "PHONE_CALL"
    activity_summary: str
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    outcome: Optional[str] = None


class LeadActivityCreate(LeadActivityBase):
    lead_id: int
    sales_rep_id: Optional[int] = None


class LeadActivityResponse(LeadActivityBase):
    id: int
    lead_id: int
    sales_rep_id: Optional[int] = None
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Lead Schemas (Spec 4.2 & 4.4)
# -------------------------------------------------------------
class LeadBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lead_source_id: str = "MANUAL_ENTRY"
    campaign_name: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    referrer_broker_id: Optional[int] = None
    referral_customer_id: Optional[int] = None
    lead_name: str
    primary_phone: str
    email: Optional[str] = None
    preferred_contact_method: Optional[str] = "PHONE"
    is_consent_given: bool = True
    is_opted_out: bool = False
    interested_project_id: Optional[int] = None
    property_type: Optional[str] = None
    preferred_location: Optional[str] = None
    required_area_sqft: Optional[float] = None
    bedrooms: Optional[int] = None
    expected_purchase_date: Optional[date] = None
    budget_range_min: Optional[float] = None
    budget_range_max: Optional[float] = None
    assigned_sales_rep_id: Optional[int] = None
    priority: str = "MEDIUM"
    lead_stage: str = "NEW"
    lead_score: int = 50
    lost_reason: Optional[str] = None
    notes: Optional[str] = None
    # 4.4 Qualification
    health_grade: Optional[str] = None
    manual_score_override: Optional[int] = None
    qualification_reasons: Optional[str] = None
    financing_ready: Optional[bool] = None
    decision_maker_available: Optional[bool] = None

    @field_validator("primary_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-\(\)]", "", v or "")
        if not re.match(r"^\+?[0-9]{10,15}$", cleaned):
            raise ValueError("Invalid mobile number format. Expected 10-15 digits, optional leading +.")
        return cleaned

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v.strip()):
                raise ValueError("Invalid email address format.")
            return v.strip().lower()
        return v


class LeadCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lead_source_id: Optional[str] = "MANUAL_ENTRY"
    campaign_name: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    referrer_broker_id: Optional[int] = None
    referral_customer_id: Optional[int] = None
    lead_name: str
    primary_phone: str
    email: Optional[str] = None
    preferred_contact_method: Optional[str] = "PHONE"
    is_consent_given: bool = True
    interested_project_id: Optional[int] = None
    property_type: Optional[str] = None
    preferred_location: Optional[str] = None
    required_area_sqft: Optional[float] = None
    bedrooms: Optional[int] = None
    expected_purchase_date: Optional[date] = None
    budget_range_min: Optional[float] = None
    budget_range_max: Optional[float] = None
    assigned_sales_rep_id: Optional[int] = None
    priority: Optional[str] = "MEDIUM"
    lead_stage: Optional[str] = "NEW"
    notes: Optional[str] = None
    # 4.4
    financing_ready: Optional[bool] = None
    decision_maker_available: Optional[bool] = None

    @field_validator("primary_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-\(\)]", "", v or "")
        if not re.match(r"^\+?[0-9]{10,15}$", cleaned):
            raise ValueError("Invalid mobile number format. Expected 10-15 digits, optional leading +.")
        return cleaned

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v.strip()):
                raise ValueError("Invalid email address format.")
            return v.strip().lower()
        return v

    @model_validator(mode="after")
    def check_budget_range(self):
        if self.budget_range_min and self.budget_range_max:
            if self.budget_range_max < self.budget_range_min:
                raise ValueError("Budget max must be greater than or equal to budget min.")
        return self


class LeadUpdate(BaseModel):
    """Full edit for lead capture screens (Spec 4.2)."""
    model_config = ConfigDict(from_attributes=True)

    lead_source_id: Optional[str] = None
    campaign_name: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    referrer_broker_id: Optional[int] = None
    referral_customer_id: Optional[int] = None
    lead_name: Optional[str] = None
    primary_phone: Optional[str] = None
    email: Optional[str] = None
    preferred_contact_method: Optional[str] = None
    is_consent_given: Optional[bool] = None
    is_opted_out: Optional[bool] = None
    opt_out_reason: Optional[str] = None
    interested_project_id: Optional[int] = None
    property_type: Optional[str] = None
    preferred_location: Optional[str] = None
    required_area_sqft: Optional[float] = None
    bedrooms: Optional[int] = None
    expected_purchase_date: Optional[date] = None
    budget_range_min: Optional[float] = None
    budget_range_max: Optional[float] = None
    priority: Optional[str] = None
    lead_stage: Optional[str] = None
    lost_reason: Optional[str] = None
    notes: Optional[str] = None
    # 4.4
    financing_ready: Optional[bool] = None
    decision_maker_available: Optional[bool] = None
    manual_score_override: Optional[int] = None
    qualification_reasons: Optional[str] = None


class LeadStageUpdate(BaseModel):
    lead_stage: str
    notes: Optional[str] = None
    lost_reason: Optional[str] = None


class LeadResponse(LeadBase):
    id: int
    lead_code: Optional[str] = None
    original_source_id: Optional[str] = None
    first_response_deadline: Optional[datetime] = None
    first_contacted_at: Optional[datetime] = None
    assignment_method: Optional[str] = None
    is_duplicate: bool = False
    duplicate_of_lead_id: Optional[int] = None
    last_scored_at: Optional[datetime] = None
    qualified_by_id: Optional[int] = None
    qualified_at: Optional[datetime] = None
    activities: List[LeadActivityResponse] = []
    assigned_sales_rep_name: Optional[str] = None
    interested_project_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class LeadPaginatedOut(BaseModel):
    items: List[LeadResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Lead Qualification Schemas (Spec 4.4)
# -------------------------------------------------------------
class LeadScoreBreakdown(BaseModel):
    lead_id: int
    lead_name: str
    total_score: int
    budget_fit_score: int
    contact_completeness_score: int
    source_quality_score: int
    engagement_progression_score: int
    timeline_fit_score: int = 0
    financing_score: int = 0
    lead_stage: str
    health_grade: str
    qualification_reasons: Optional[str] = None
    recommended_action: str
    financing_ready: Optional[bool] = None
    decision_maker_available: Optional[bool] = None
    manual_score_override: Optional[int] = None


class LeadQualificationUpdate(BaseModel):
    """Manual qualification update by authorized staff (Spec 4.4)."""
    health_grade: Optional[str] = None  # HOT, WARM, COLD, UNQUALIFIED, NURTURE
    manual_score_override: Optional[int] = Field(default=None, ge=0, le=100)
    qualification_reasons: Optional[str] = None
    financing_ready: Optional[bool] = None
    decision_maker_available: Optional[bool] = None


class LeadQualificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    total_score: int
    health_grade: str
    budget_fit_score: int
    contact_completeness_score: int
    source_quality_score: int
    engagement_progression_score: int
    timeline_fit_score: int
    financing_score: int
    qualification_reasons: Optional[str] = None
    recommended_action: Optional[str] = None
    engagement_flags: Optional[str] = None
    computed_by: str
    computed_by_id: Optional[int] = None
    computed_at: Optional[datetime] = None
    lead_name: Optional[str] = None
    lead_code: Optional[str] = None


class LeadQualificationPaginatedOut(BaseModel):
    items: List[LeadQualificationResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Lead Assignment Schemas (Spec 4.3)
# -------------------------------------------------------------
class LeadAssignmentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    assignment_method: str = "MANUAL"
    assignment_reason: Optional[str] = None
    response_sla_hours: Optional[int] = 24


class LeadAssignmentCreate(LeadAssignmentBase):
    lead_id: int
    assigned_to_id: int
    assigned_by_id: Optional[int] = None


class BulkAssignRequest(BaseModel):
    lead_ids: List[int] = Field(..., min_length=1)
    assignment_method: str = "MANUAL"
    assigned_to_id: Optional[int] = None
    assignment_reason: Optional[str] = None
    response_sla_hours: int = 24


class LeadAssignmentResponse(LeadAssignmentBase):
    id: int
    lead_id: int
    assigned_to_id: Optional[int] = None
    assigned_by_id: Optional[int] = None
    previous_rep_id: Optional[int] = None
    is_active: bool = True
    escalated_at: Optional[datetime] = None
    escalation_reason: Optional[str] = None
    assigned_at: Optional[datetime] = None
    released_at: Optional[datetime] = None
    assigned_to_name: Optional[str] = None
    assigned_by_name: Optional[str] = None
    lead_name: Optional[str] = None
    lead_code: Optional[str] = None


class LeadAssignmentPaginatedOut(BaseModel):
    items: List[LeadAssignmentResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Assignment Rules Schemas (Spec 4.3)
# -------------------------------------------------------------
class LeadAssignmentRuleBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rule_name: str
    method: str = "ROUND_ROBIN"
    priority_order: int = 0
    conditions: Optional[str] = None
    target_sales_rep_ids: Optional[str] = None
    sla_hours: int = 24
    escalate_to_manager_id: Optional[int] = None
    is_active: bool = True


class LeadAssignmentRuleCreate(LeadAssignmentRuleBase):
    pass


class LeadAssignmentRuleUpdate(BaseModel):
    rule_name: Optional[str] = None
    method: Optional[str] = None
    priority_order: Optional[int] = None
    conditions: Optional[str] = None
    target_sales_rep_ids: Optional[str] = None
    sla_hours: Optional[int] = None
    escalate_to_manager_id: Optional[int] = None
    is_active: Optional[bool] = None


class LeadAssignmentRuleResponse(LeadAssignmentRuleBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class LeadAssignmentRulePaginatedOut(BaseModel):
    items: List[LeadAssignmentRuleResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Lead Import Schemas (Spec 4.2)
# -------------------------------------------------------------
class LeadImportRow(BaseModel):
    lead_name: str
    primary_phone: str
    email: Optional[str] = None
    lead_source_id: Optional[str] = "MANUAL_ENTRY"
    campaign_name: Optional[str] = None
    property_type: Optional[str] = None
    preferred_location: Optional[str] = None
    budget_range_min: Optional[float] = None
    budget_range_max: Optional[float] = None
    bedrooms: Optional[int] = None
    preferred_contact_method: Optional[str] = "PHONE"
    notes: Optional[str] = None


class LeadImportRequest(BaseModel):
    filename: str = "bulk_import.json"
    source_channel: str = "MANUAL_ENTRY"
    rows: List[LeadImportRow] = Field(..., min_length=1)


class LeadImportResponse(BaseModel):
    id: int
    filename: str
    source_channel: Optional[str] = None
    total_rows: int
    success_count: int
    failed_count: int
    duplicate_count: int
    error_log: Optional[str] = None
    imported_at: Optional[datetime] = None


class LeadImportPaginatedOut(BaseModel):
    items: List[LeadImportResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Duplicate Check Schemas (Spec 4.2)
# -------------------------------------------------------------
class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    matching_lead_ids: List[int] = []
    matching_leads: List[LeadResponse] = []


# -------------------------------------------------------------
# Unassigned / Overdue Dashboard Helpers (Spec 4.1/4.3)
# -------------------------------------------------------------
class LeadAssignmentQueueStats(BaseModel):
    total_leads: int = 0
    unassigned_leads: int = 0
    overdue_first_response: int = 0
    assigned_today: int = 0
    reassigned_total: int = 0
    escalated_total: int = 0


# -------------------------------------------------------------
# Facebook Webhook Payload Schemas
# -------------------------------------------------------------
class FacebookLeadGenEntry(BaseModel):
    id: Optional[str] = None
    time: Optional[int] = None
    changes: Optional[List[Dict[str, Any]]] = None


class FacebookWebhookPayload(BaseModel):
    object: Optional[str] = "page"
    entry: Optional[List[Dict[str, Any]]] = None
    lead_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    campaign_name: Optional[str] = None
    interested_project_code: Optional[str] = None


class WebsiteInquiryPayload(BaseModel):
    full_name: str
    phone_number: str
    email: Optional[str] = None
    project_code: Optional[str] = None
    interested_project_id: Optional[int] = None
    budget_range_min: Optional[float] = 10000000.00
    budget_range_max: Optional[float] = 25000000.00
    preferred_unit_type: Optional[str] = None
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    preferred_location: Optional[str] = None
    message: Optional[str] = None
    utm_source: Optional[str] = "WEBSITE_CONTACT_FORM"
    utm_campaign: Optional[str] = None


# =============================================================
# 4.1 CRM Dashboard and Sales KPIs Schemas
# =============================================================

class CrmExecutiveKpis(BaseModel):
    total_leads: int = 1250
    total_leads_target: int = 1500
    total_leads_mom_growth: float = 12.4
    qualified_leads: int = 625
    qualified_leads_percentage: float = 50.0
    hot_leads_count: int = 240
    warm_leads_count: int = 385
    site_visits_total: int = 250
    site_visits_scheduled: int = 90
    site_visits_completed: int = 160
    site_visits_completion_rate: float = 64.0
    bookings_count: int = 50
    booking_conversion_rate: float = 4.0
    booking_total_value_bdt: float = 425000000.00
    first_response_avg_hours: float = 1.8
    contact_rate_percentage: float = 88.5
    unassigned_leads_count: int = 14
    overdue_followups_count: int = 9


class CrmLeadVelocity(BaseModel):
    today: int = 18
    this_week: int = 124
    this_month: int = 1250
    today_growth: float = 5.8
    this_week_growth: float = 11.2
    this_month_growth: float = 12.4


class CrmProjectDistribution(BaseModel):
    project_id: Optional[int] = None
    project_name: str
    lead_count: int = 0
    qualified_count: int = 0
    site_visits_count: int = 0
    bookings_count: int = 0
    conversion_rate: float = 0.0
    sales_target_units: int = 0
    sales_target_achievement_pct: float = 0.0


class CrmSourceDistribution(BaseModel):
    source_id: str
    source_name: str
    lead_count: int = 0
    percentage: float = 0.0
    conversion_count: int = 0
    conversion_rate: float = 0.0


class CrmCampaignPerformance(BaseModel):
    campaign_name: str
    utm_source: str
    utm_campaign: Optional[str] = None
    leads_count: int = 0
    qualified_count: int = 0
    bookings_count: int = 0
    conversion_rate: float = 0.0


class CrmSalesRepPerformance(BaseModel):
    sales_rep_id: Optional[int] = None
    sales_rep_name: str
    email: Optional[str] = None
    assigned_leads: int = 0
    contacted_count: int = 0
    contact_rate_pct: float = 0.0
    site_visits_completed: int = 0
    bookings_count: int = 0
    conversion_rate: float = 0.0
    avg_response_hours: float = 0.0


class CrmPipelineFunnelStage(BaseModel):
    stage_key: str
    stage_label: str
    count: int = 0
    drop_off_count: int = 0
    conversion_rate_from_first: float = 0.0
    stage_to_stage_rate: float = 0.0


class CrmLostReasonAnalysis(BaseModel):
    lost_reason: str
    count: int = 0
    percentage: float = 0.0
    lost_deal_value_bdt: float = 0.0


class CrmBrokerReferralPerformance(BaseModel):
    partner_type: str = "BROKER"  # BROKER, CUSTOMER_REFERRAL
    partner_name: str
    contact_phone: Optional[str] = None
    leads_referred: int = 0
    qualified_count: int = 0
    bookings_count: int = 0
    total_booked_value_bdt: float = 0.0
    commission_accrued_bdt: float = 0.0


class CrmLeadAgeingBracket(BaseModel):
    bracket_label: str
    count: int = 0
    percentage: float = 0.0
    inactive_count: int = 0


class CrmDashboardResponse(BaseModel):
    kpis: CrmExecutiveKpis
    velocity: CrmLeadVelocity
    pipeline_funnel: List[CrmPipelineFunnelStage]
    by_project: List[CrmProjectDistribution]
    by_source: List[CrmSourceDistribution]
    by_campaign: List[CrmCampaignPerformance]
    by_sales_rep: List[CrmSalesRepPerformance]
    lost_reasons: List[CrmLostReasonAnalysis]
    broker_referrals: List[CrmBrokerReferralPerformance]
    lead_ageing: List[CrmLeadAgeingBracket]
    generated_at: datetime


class CrmDrilldownLeadItem(BaseModel):
    id: int
    lead_code: Optional[str] = None
    lead_name: str
    primary_phone: str
    email: Optional[str] = None
    lead_source_id: str
    lead_stage: str
    health_grade: Optional[str] = None
    priority: str
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    assigned_sales_rep_id: Optional[int] = None
    sales_rep_name: Optional[str] = None
    lead_score: int = 50
    budget_range_max: Optional[float] = None
    first_contacted_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class CrmDrilldownResponse(BaseModel):
    widget_type: str
    filter_value: Optional[str] = None
    total: int
    limit: int
    offset: int
    items: List[CrmDrilldownLeadItem]

