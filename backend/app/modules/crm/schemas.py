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


# =====================================================================
# Spec 4.6: Customer Requirements & Budget Tracking Schemas
# =====================================================================

class CustomerRequirementBase(BaseModel):
    customer_id: int
    title: str
    preferred_project_id: Optional[int] = None
    preferred_location: Optional[str] = None
    property_type: Optional[str] = "APARTMENT"
    budget_min_bdt: Optional[float] = None
    budget_max_bdt: Optional[float] = None
    area_min_sqft: Optional[float] = None
    area_max_sqft: Optional[float] = None
    bedrooms: Optional[int] = 3
    bathrooms: Optional[int] = 3
    preferred_floor: Optional[str] = "MID_FLOOR"
    preferred_facing: Optional[str] = "SOUTH_FACING"
    parking_required: bool = True
    parking_count: int = 1
    purchase_timeline: Optional[str] = "WITHIN_6_MONTHS"
    payment_preference: Optional[str] = "INSTALLMENTS"
    amenities_required: Optional[str] = None
    special_notes: Optional[str] = None
    assigned_sales_rep_id: Optional[int] = None
    status: Optional[str] = "ACTIVE"


class CustomerRequirementCreate(CustomerRequirementBase):
    pass


class CustomerRequirementUpdate(BaseModel):
    title: Optional[str] = None
    preferred_project_id: Optional[int] = None
    preferred_location: Optional[str] = None
    property_type: Optional[str] = None
    budget_min_bdt: Optional[float] = None
    budget_max_bdt: Optional[float] = None
    area_min_sqft: Optional[float] = None
    area_max_sqft: Optional[float] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    preferred_floor: Optional[str] = None
    preferred_facing: Optional[str] = None
    parking_required: Optional[bool] = None
    parking_count: Optional[int] = None
    purchase_timeline: Optional[str] = None
    payment_preference: Optional[str] = None
    amenities_required: Optional[str] = None
    special_notes: Optional[str] = None
    assigned_sales_rep_id: Optional[int] = None
    status: Optional[str] = None
    change_reason: Optional[str] = None


class CustomerRequirementResponse(CustomerRequirementBase):
    id: int
    requirement_code: str
    customer_name: Optional[str] = None
    customer_code: Optional[str] = None
    customer_phone: Optional[str] = None
    project_name: Optional[str] = None
    sales_rep_name: Optional[str] = None
    matched_units_count: int = 0
    last_matched_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CustomerRequirementPaginatedResponse(BaseModel):
    items: List[CustomerRequirementResponse]
    total: int
    limit: int
    offset: int


class RequirementAuditLogResponse(BaseModel):
    id: int
    requirement_id: int
    change_summary: str
    changed_by_name: Optional[str] = None
    old_values_json: Optional[str] = None
    new_values_json: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InventoryMatchUnit(BaseModel):
    unit_id: int
    unit_number: str
    project_id: int
    project_name: str
    location: Optional[str] = None
    tower_name: Optional[str] = None
    floor_number: int
    facing_id: str
    unit_type_id: str
    bed_count: int
    bath_count: int
    gross_saleable_area_sqft: float
    total_unit_price: float
    status_id: str
    match_score_percentage: float
    match_breakdown: dict
    is_already_recommended: bool = False
    recommendation_id: Optional[int] = None
    recommendation_status: Optional[str] = None


class InventoryRecommendationCreate(BaseModel):
    unit_id: int
    match_score_percentage: Optional[float] = 85.0
    match_details_json: Optional[str] = None


class InventoryRecommendationStatusUpdate(BaseModel):
    status: str  # SHORTLISTED, SITE_VISITED, ACCEPTED, REJECTED
    rejection_reason: Optional[str] = None
    rejection_notes: Optional[str] = None


class InventoryRecommendationResponse(BaseModel):
    id: int
    requirement_id: int
    unit_id: int
    unit_number: str
    project_name: str
    floor_number: int
    facing_id: str
    bed_count: int
    bath_count: int
    gross_saleable_area_sqft: float
    total_unit_price: float
    match_score_percentage: float
    status: str
    rejection_reason: Optional[str] = None
    rejection_notes: Optional[str] = None
    recommended_by_name: Optional[str] = None
    recommended_at: Optional[datetime] = None
    feedback_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InventoryAlertResponse(BaseModel):
    id: int
    requirement_id: int
    requirement_code: str
    customer_name: str
    unit_id: int
    unit_number: str
    project_name: str
    alert_title: str
    alert_message: str
    is_read: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =====================================================================
# Spec 4.7: Call, Meeting and Site-Visit Scheduling Schemas
# =====================================================================

class LeadActivityBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    lead_id: Optional[int] = None
    customer_id: Optional[int] = None
    project_id: Optional[int] = None
    unit_id: Optional[int] = None
    sales_rep_id: Optional[int] = None

    activity_type: str = "FOLLOW_UP_CALL"
    title: Optional[str] = None
    activity_summary: str
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    duration_minutes: int = 30
    meeting_location: Optional[str] = None
    agenda: Optional[str] = None

    status: str = "PLANNED"  # PLANNED, COMPLETED, RESCHEDULED, CANCELLED, NO_SHOW
    attendance_status: Optional[str] = "PENDING"
    completed_at: Optional[datetime] = None
    outcome: Optional[str] = None
    shortlisted_units_json: Optional[str] = None
    next_action: Optional[str] = None
    next_follow_up_date: Optional[date] = None
    reminder_minutes_before: Optional[int] = 30
    is_reminder_sent: bool = False
    escalation_level: int = 0


class LeadActivityCreate(LeadActivityBase):
    pass


class LeadActivityUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    lead_id: Optional[int] = None
    customer_id: Optional[int] = None
    project_id: Optional[int] = None
    unit_id: Optional[int] = None
    sales_rep_id: Optional[int] = None

    activity_type: Optional[str] = None
    title: Optional[str] = None
    activity_summary: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    meeting_location: Optional[str] = None
    agenda: Optional[str] = None

    status: Optional[str] = None
    attendance_status: Optional[str] = None
    completed_at: Optional[datetime] = None
    outcome: Optional[str] = None
    shortlisted_units_json: Optional[str] = None
    next_action: Optional[str] = None
    next_follow_up_date: Optional[date] = None
    reminder_minutes_before: Optional[int] = None
    is_reminder_sent: Optional[bool] = None
    escalation_level: Optional[int] = None


class LeadActivityStatusUpdate(BaseModel):
    status: str  # PLANNED, COMPLETED, RESCHEDULED, CANCELLED, NO_SHOW
    attendance_status: Optional[str] = None  # ATTENDED, NO_SHOW, CANCELLED
    outcome: Optional[str] = None
    shortlisted_units_json: Optional[str] = None
    next_action: Optional[str] = None
    next_follow_up_date: Optional[date] = None


class LeadActivityResponse(LeadActivityBase):
    id: int
    activity_code: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Joined helper strings
    lead_name: Optional[str] = None
    customer_name: Optional[str] = None
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    sales_rep_name: Optional[str] = None


class ActivityPaginatedResponse(BaseModel):
    items: List[LeadActivityResponse]
    total: int
    page: int
    limit: int


# =====================================================================
# Spec 4.8: Follow-up Tasks and Reminders Schemas
# =====================================================================

class FollowUpTaskBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    lead_id: Optional[int] = None
    customer_id: Optional[int] = None
    activity_id: Optional[int] = None

    title: str
    description: Optional[str] = None
    task_category: str = "GENERAL_FOLLOW_UP"
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, URGENT
    due_date: datetime
    assigned_to_id: Optional[int] = None
    status: str = "PENDING"  # PENDING, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED

    reminder_channel: Optional[str] = "IN_APP"
    is_automated: bool = False
    consent_checked: bool = True


class FollowUpTaskCreate(FollowUpTaskBase):
    pass


class FollowUpTaskUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    lead_id: Optional[int] = None
    customer_id: Optional[int] = None
    activity_id: Optional[int] = None

    title: Optional[str] = None
    description: Optional[str] = None
    task_category: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    assigned_to_id: Optional[int] = None
    status: Optional[str] = None
    reminder_channel: Optional[str] = None
    consent_checked: Optional[bool] = None


class FollowUpTaskComplete(BaseModel):
    completion_outcome: str
    completion_notes: Optional[str] = None
    create_next_task: Optional[bool] = False
    next_task_title: Optional[str] = None
    next_task_category: Optional[str] = None
    next_task_due_date: Optional[datetime] = None


class FollowUpTaskResponse(FollowUpTaskBase):
    id: int
    task_code: str
    completion_outcome: Optional[str] = None
    completion_notes: Optional[str] = None
    completed_at: Optional[datetime] = None
    completed_by_id: Optional[int] = None
    escalated_to_manager_id: Optional[int] = None
    escalated_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Joined helper strings
    lead_name: Optional[str] = None
    customer_name: Optional[str] = None
    contact_phone: Optional[str] = None
    assigned_to_name: Optional[str] = None
    is_overdue: bool = False


class TaskPaginatedResponse(BaseModel):
    items: List[FollowUpTaskResponse]
    total: int
    page: int
    limit: int


class DailyTodoSummaryResponse(BaseModel):
    total_due_today: int
    total_overdue: int
    total_completed_today: int
    high_priority_count: int
    tasks: List[FollowUpTaskResponse]


# =====================================================================
# Spec 4.9: Customer Communication History Schemas
# =====================================================================

class CommunicationHistoryBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    channel: str = "PHONE_CALL"
    direction: str = "OUTBOUND"  # INBOUND, OUTBOUND, INTERNAL
    lead_id: Optional[int] = None
    customer_id: Optional[int] = None
    subject: str
    message_body: str
    delivery_status: Optional[str] = "DELIVERED"
    is_sensitive: bool = False
    is_automated: bool = False
    resulting_action: Optional[str] = None
    metadata_json: Optional[str] = None


class CommunicationHistoryCreate(CommunicationHistoryBase):
    pass


class CommunicationHistoryResponse(CommunicationHistoryBase):
    id: int
    communication_code: str
    user_id: Optional[int] = None
    sent_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    # Joined helper strings
    user_name: Optional[str] = None
    lead_name: Optional[str] = None
    customer_name: Optional[str] = None
    contact_phone: Optional[str] = None


class CommunicationPaginatedResponse(BaseModel):
    items: List[CommunicationHistoryResponse]
    total: int
    page: int
    limit: int


# =====================================================================
# Spec 4.10: Broker and Referral Management Schemas
# =====================================================================

class BrokerBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    broker_name: str
    broker_type: str = "COMPANY"
    contact_person: Optional[str] = None
    primary_phone: str
    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    office_address: Optional[str] = None
    service_area: Optional[str] = None
    preferred_projects_json: Optional[str] = None

    referral_code: Optional[str] = None
    referral_link: Optional[str] = None

    license_number: Optional[str] = None
    tin_number: Optional[str] = None
    bin_vat_number: Optional[str] = None
    agreement_number: Optional[str] = None
    agreement_signed_date: Optional[date] = None
    agreement_valid_from: Optional[date] = None
    agreement_valid_to: Optional[date] = None

    commission_type: str = "PERCENTAGE"
    commission_rate: float = 1.50
    eligibility_conditions: Optional[str] = None
    required_milestone: str = "DOWN_PAYMENT_CLEARED"

    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    routing_number: Optional[str] = None
    mobile_wallet_number: Optional[str] = None

    trade_license_url: Optional[str] = None
    tin_cert_url: Optional[str] = None
    agreement_doc_url: Optional[str] = None
    status: str = "PROSPECTIVE"


class BrokerCreate(BrokerBase):
    pass


class BrokerUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    broker_name: Optional[str] = None
    broker_type: Optional[str] = None
    contact_person: Optional[str] = None
    primary_phone: Optional[str] = None
    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    office_address: Optional[str] = None
    service_area: Optional[str] = None
    preferred_projects_json: Optional[str] = None

    referral_code: Optional[str] = None
    referral_link: Optional[str] = None

    license_number: Optional[str] = None
    tin_number: Optional[str] = None
    bin_vat_number: Optional[str] = None
    agreement_number: Optional[str] = None
    agreement_signed_date: Optional[date] = None
    agreement_valid_from: Optional[date] = None
    agreement_valid_to: Optional[date] = None

    commission_type: Optional[str] = None
    commission_rate: Optional[float] = None
    eligibility_conditions: Optional[str] = None
    required_milestone: Optional[str] = None

    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    routing_number: Optional[str] = None
    mobile_wallet_number: Optional[str] = None

    trade_license_url: Optional[str] = None
    tin_cert_url: Optional[str] = None
    agreement_doc_url: Optional[str] = None
    status: Optional[str] = None


class BrokerResponse(BrokerBase):
    id: int
    broker_code: str
    total_leads_count: int = 0
    total_bookings_count: int = 0
    total_sales_value: float = 0.00
    total_commission_earned: float = 0.00
    total_commission_paid: float = 0.00
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class BrokerPaginatedResponse(BaseModel):
    items: List[BrokerResponse]
    total: int
    page: int
    limit: int


class BrokerStatsSummaryResponse(BaseModel):
    total_brokers: int
    active_brokers: int
    total_leads_referred: int
    total_bookings_referred: int
    total_sales_value: float
    total_commission_earned: float
    total_commission_paid: float
    pending_commission_payout: float


class CommissionClaimBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    broker_id: int
    lead_id: Optional[int] = None
    customer_id: Optional[int] = None
    booking_id: Optional[int] = None
    project_id: Optional[int] = None
    unit_id: Optional[int] = None

    referral_date: date
    source_evidence: Optional[str] = None
    unit_sale_value: float = 0.00
    commission_rate_percentage: float = 1.50
    calculated_commission_amount: float = 0.00
    tds_tax_deduction_amount: float = 0.00
    net_payable_amount: float = 0.00

    milestone_achieved: str = "BOOKING_CONFIRMED"
    claim_status: str = "DRAFT"
    notes: Optional[str] = None


class CommissionClaimCreate(CommissionClaimBase):
    pass


class CommissionClaimUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    broker_id: Optional[int] = None
    lead_id: Optional[int] = None
    customer_id: Optional[int] = None
    booking_id: Optional[int] = None
    project_id: Optional[int] = None
    unit_id: Optional[int] = None

    referral_date: Optional[date] = None
    source_evidence: Optional[str] = None
    unit_sale_value: Optional[float] = None
    commission_rate_percentage: Optional[float] = None
    calculated_commission_amount: Optional[float] = None
    tds_tax_deduction_amount: Optional[float] = None
    net_payable_amount: Optional[float] = None
    milestone_achieved: Optional[str] = None
    notes: Optional[str] = None


class CommissionClaimApproval(BaseModel):
    decision: str  # 'APPROVE_SALES', 'APPROVE_FINANCE', 'REJECT'
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None


class CommissionClaimDisburse(BaseModel):
    disbursement_reference: str  # Cheque No, BEFTN, bKash TrxID
    notes: Optional[str] = None


class CommissionClaimResponse(CommissionClaimBase):
    id: int
    claim_code: str
    is_milestone_verified: bool = False
    milestone_verified_at: Optional[datetime] = None
    milestone_verified_by_id: Optional[int] = None

    sales_approval_by_id: Optional[int] = None
    sales_approved_at: Optional[datetime] = None
    finance_approval_by_id: Optional[int] = None
    finance_approved_at: Optional[datetime] = None
    disbursement_reference: Optional[str] = None
    disbursed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Joined helper strings
    broker_name: Optional[str] = None
    broker_code: Optional[str] = None
    lead_name: Optional[str] = None
    customer_name: Optional[str] = None
    project_name: Optional[str] = None
    unit_number: Optional[str] = None


class CommissionClaimPaginatedResponse(BaseModel):
    items: List[CommissionClaimResponse]
    total: int
    page: int
    limit: int


# =====================================================================
# Spec 4.11: Sales Funnel and Lead Conversion Schemas
# =====================================================================

class FunnelStageBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    stage_code: str
    stage_name: str
    stage_order: int = 1
    description: Optional[str] = None
    entry_criteria: Optional[str] = None
    exit_criteria: Optional[str] = None
    target_dwell_days: int = 3
    color_code: str = "#3b82f6"
    is_active: bool = True


class FunnelStageCreate(FunnelStageBase):
    pass


class FunnelStageUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    stage_name: Optional[str] = None
    stage_order: Optional[int] = None
    description: Optional[str] = None
    entry_criteria: Optional[str] = None
    exit_criteria: Optional[str] = None
    target_dwell_days: Optional[int] = None
    color_code: Optional[str] = None
    is_active: Optional[bool] = None


class FunnelStageResponse(FunnelStageBase):
    id: int
    is_system_stage: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class LeadStageTransitionCreate(BaseModel):
    to_stage: str
    transition_notes: Optional[str] = None


class LeadStageTransitionResponse(BaseModel):
    id: int
    lead_id: int
    from_stage: Optional[str] = None
    to_stage: str
    transition_date: Optional[datetime] = None
    dwell_time_hours: float = 0.0
    transition_notes: Optional[str] = None
    transitioned_by_id: Optional[int] = None
    transitioned_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class LeadDisqualifyRequest(BaseModel):
    lost_reason: str
    notes: Optional[str] = None


class LeadReopenRequest(BaseModel):
    reopen_notes: str
    target_stage: Optional[str] = "01_NEW_LEAD"


class OpportunityBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    title: str
    lead_id: Optional[int] = None
    customer_id: Optional[int] = None
    project_id: Optional[int] = None
    unit_id: Optional[int] = None
    stage: str = "QUALIFIED"
    estimated_deal_value: float = 0.00
    confidence_probability_pct: int = 50
    expected_close_date: Optional[date] = None
    actual_close_date: Optional[date] = None
    assigned_sales_rep_id: Optional[int] = None
    notes: Optional[str] = None


class OpportunityCreate(OpportunityBase):
    pass


class OpportunityUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    title: Optional[str] = None
    customer_id: Optional[int] = None
    project_id: Optional[int] = None
    unit_id: Optional[int] = None
    stage: Optional[str] = None
    estimated_deal_value: Optional[float] = None
    confidence_probability_pct: Optional[int] = None
    expected_close_date: Optional[date] = None
    actual_close_date: Optional[date] = None
    assigned_sales_rep_id: Optional[int] = None
    loss_reason: Optional[str] = None
    loss_notes: Optional[str] = None
    notes: Optional[str] = None


class OpportunityResponse(OpportunityBase):
    id: int
    opportunity_code: str
    loss_reason: Optional[str] = None
    loss_notes: Optional[str] = None
    is_reopened: bool = False
    reopened_at: Optional[datetime] = None
    reopened_by_id: Optional[int] = None
    reopen_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Joined helper strings
    lead_name: Optional[str] = None
    lead_phone: Optional[str] = None
    customer_name: Optional[str] = None
    customer_code: Optional[str] = None
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    sales_rep_name: Optional[str] = None


class OpportunityPaginatedResponse(BaseModel):
    items: List[OpportunityResponse]
    total: int
    page: int
    limit: int


class BookingHandoverBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    opportunity_id: Optional[int] = None
    lead_id: Optional[int] = None
    customer_id: Optional[int] = None
    project_id: Optional[int] = None
    unit_id: Optional[int] = None

    # Step 1: Customer Contact
    customer_verified: bool = False
    verified_phone: Optional[str] = None
    verified_email: Optional[str] = None

    # Step 2 & 3: Unit Selection & Availability
    unit_number: Optional[str] = None
    parking_slot: Optional[str] = None
    unit_size_sqft: Optional[float] = None
    unit_availability_verified: bool = False
    approved_base_rate: Optional[float] = None

    # Step 4: Pricing & Discount Request
    list_price: float = 0.00
    proposed_price: float = 0.00
    agreed_price: float = 0.00
    discount_amount_requested: float = 0.00
    discount_percentage: float = 0.00
    discount_approval_reference: Optional[str] = None
    discount_status: str = "APPROVED"

    # Step 5: Identification & KYC
    nid_passport_verified: bool = False
    tin_certificate_verified: bool = False
    nominee_verified: bool = False
    power_of_attorney_verified: bool = False
    kyc_notes: Optional[str] = None

    # Step 6 & 7: References & Status
    reservation_code: Optional[str] = None
    booking_reference_number: Optional[str] = None
    status: str = "PENDING_SALES_OPS"

    # Step 8: Attribution
    broker_id: Optional[int] = None
    broker_code: Optional[str] = None
    broker_commission_rate: Optional[float] = None
    campaign_id: Optional[int] = None
    utm_source: Optional[str] = None
    utm_campaign: Optional[str] = None

    # Step 9: Payment Terms
    booking_money_amount: float = 0.00
    payment_plan_preference: Optional[str] = "INSTALLMENTS"
    token_money_payment_mode: Optional[str] = "PAY_ORDER"
    token_transaction_ref: Optional[str] = None
    token_bank_name: Optional[str] = None
    token_received_date: Optional[date] = None
    payment_schedule_triggered: bool = False

    # Step 10: Special Conditions & Notes
    special_conditions: Optional[str] = None
    handover_notes: Optional[str] = None
    crm_history_snapshot: Optional[str] = None


class BookingHandoverCreate(BookingHandoverBase):
    pass


class BookingHandoverUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    agreed_price: Optional[float] = None
    booking_money_amount: Optional[float] = None
    payment_plan_preference: Optional[str] = None
    token_money_payment_mode: Optional[str] = None
    token_transaction_ref: Optional[str] = None
    token_bank_name: Optional[str] = None
    token_received_date: Optional[date] = None
    special_conditions: Optional[str] = None
    handover_notes: Optional[str] = None
    customer_verified: Optional[bool] = None
    unit_availability_verified: Optional[bool] = None
    nid_passport_verified: Optional[bool] = None
    tin_certificate_verified: Optional[bool] = None
    nominee_verified: Optional[bool] = None
    power_of_attorney_verified: Optional[bool] = None
    kyc_notes: Optional[str] = None
    discount_status: Optional[str] = None


class BookingHandoverVerificationUpdate(BaseModel):
    customer_verified: bool
    verified_phone: Optional[str] = None
    verified_email: Optional[str] = None
    unit_availability_verified: bool
    nid_passport_verified: bool
    tin_certificate_verified: bool
    nominee_verified: bool
    power_of_attorney_verified: bool
    kyc_notes: Optional[str] = None
    discount_status: Optional[str] = "APPROVED"


class BookingHandoverReview(BaseModel):
    decision: str  # 'ACCEPT' or 'REJECT'
    rejection_reason: Optional[str] = None
    sales_booking_id: Optional[int] = None
    reservation_code: Optional[str] = None
    booking_reference_number: Optional[str] = None


class BookingHandoverResponse(BookingHandoverBase):
    id: int
    handover_code: str
    sales_rep_id: Optional[int] = None
    accepted_by_ops_id: Optional[int] = None
    accepted_at: Optional[datetime] = None
    sales_booking_id: Optional[int] = None
    rejection_reason: Optional[str] = None
    transferred_to_sales_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Joined helper strings
    opportunity_code: Optional[str] = None
    lead_name: Optional[str] = None
    customer_name: Optional[str] = None
    customer_code: Optional[str] = None
    project_name: Optional[str] = None
    sales_rep_name: Optional[str] = None
    accepted_by_ops_name: Optional[str] = None
    broker_name: Optional[str] = None
    campaign_name: Optional[str] = None


class BookingHandoverPaginatedResponse(BaseModel):
    items: List[BookingHandoverResponse]
    total: int
    page: int
    limit: int


class FunnelStageMetric(BaseModel):
    stage_code: str
    stage_name: str
    stage_order: int
    color_code: str
    lead_count: int
    conversion_rate_from_first: float
    stage_to_stage_rate: float
    avg_dwell_hours: float
    drop_off_count: int


class FunnelCohortBreakdown(BaseModel):
    dimension_key: str
    dimension_label: str
    total_leads: int
    qualified_leads: int
    site_visits_count: int
    bookings_count: int
    lead_to_booking_rate: float
    site_visit_conversion_rate: float


class ConversionKpiResponse(BaseModel):
    cohort_period: str
    total_unique_leads: int
    eligible_unique_leads: int
    total_valid_bookings: int
    lead_to_booking_rate: float
    site_visits_completed: int
    bookings_from_site_visits: int
    site_visit_conversion_rate: float
    stages: List[FunnelStageMetric]
    by_source: List[FunnelCohortBreakdown]
    by_sales_rep: List[FunnelCohortBreakdown]
    by_project: List[FunnelCohortBreakdown]
    generated_at: datetime


# -------------------------------------------------------------
# Campaign & Marketing Management Schemas (Spec 4.13)
# -------------------------------------------------------------
class CampaignBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    name: str
    channel: str = "FACEBOOK"  # CRM_CAMPAIGN_CHANNEL
    project_id: Optional[int] = None
    target_audience: Optional[str] = None
    allocated_budget: float = 0.00
    actual_spend: float = 0.00
    target_leads: int = 0
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    tracking_url: Optional[str] = None
    landing_page_slug: Optional[str] = None
    campaign_lead_route_rep_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str = "ACTIVE"  # CRM_CAMPAIGN_STATUS
    notes: Optional[str] = None


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    name: Optional[str] = None
    channel: Optional[str] = None
    project_id: Optional[int] = None
    target_audience: Optional[str] = None
    allocated_budget: Optional[float] = None
    actual_spend: Optional[float] = None
    target_leads: Optional[int] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    tracking_url: Optional[str] = None
    landing_page_slug: Optional[str] = None
    campaign_lead_route_rep_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class CampaignResponse(CampaignBase):
    id: int
    campaign_code: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Calculated metrics
    project_name: Optional[str] = None
    lead_route_rep_name: Optional[str] = None
    leads_count: int = 0
    qualified_count: int = 0
    bookings_count: int = 0
    cpl: float = 0.00  # Cost per lead
    cpql: float = 0.00  # Cost per qualified lead
    conversion_rate: float = 0.00  # lead-to-booking rate %
    attributed_revenue: float = 0.00  # total value of booked deals


class CampaignPaginatedResponse(BaseModel):
    items: List[CampaignResponse]
    total: int
    page: int
    limit: int


class MarketingTouchpointBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    lead_id: int
    campaign_id: Optional[int] = None
    touchpoint_type: str = "FIRST_TOUCH"  # CRM_TOUCHPOINT_TYPE
    channel: str = "WEBSITE"
    interaction_summary: Optional[str] = None


class MarketingTouchpointCreate(MarketingTouchpointBase):
    pass


class MarketingTouchpointResponse(MarketingTouchpointBase):
    id: int
    recorded_at: Optional[datetime] = None
    lead_name: Optional[str] = None
    campaign_name: Optional[str] = None
    campaign_code: Optional[str] = None


class SuppressionEntryBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    phone: Optional[str] = None
    email: Optional[str] = None
    customer_name: Optional[str] = None
    suppression_reason: str = "DO_NOT_CALL"  # CRM_SUPPRESSION_REASON
    source_note: Optional[str] = None
    is_active: bool = True


class SuppressionEntryCreate(SuppressionEntryBase):
    pass


class SuppressionEntryResponse(SuppressionEntryBase):
    id: int
    consent_given_at: Optional[datetime] = None
    consent_revoked_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SuppressionPaginatedResponse(BaseModel):
    items: List[SuppressionEntryResponse]
    total: int
    page: int
    limit: int


class CampaignMarketingDashboardKpis(BaseModel):
    total_campaigns: int
    active_campaigns: int
    total_budget_allocated: float
    total_actual_spend: float
    total_leads_generated: int
    total_qualified_leads: int
    total_bookings_won: int
    overall_cpl: float
    overall_cpql: float
    overall_lead_to_booking_rate: float
    total_attributed_revenue: float
    top_channel_by_leads: str
    top_channel_by_revenue: str


class OfflineExhibitionLeadItem(BaseModel):
    lead_name: str
    primary_phone: str
    email: Optional[str] = None
    interested_project_id: Optional[int] = None
    budget_range_max: Optional[float] = None
    notes: Optional[str] = None


class OfflineExhibitionImportPayload(BaseModel):
    campaign_id: int
    channel: str = "EXHIBITION"
    leads: List[OfflineExhibitionLeadItem]


