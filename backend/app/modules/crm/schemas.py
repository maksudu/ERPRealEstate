from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

# -------------------------------------------------------------
# Nominee Schemas
# -------------------------------------------------------------
class NomineeBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    nominee_name: str
    relationship: str = Field(alias="relation_type", default="SPOUSE")
    nid_number: Optional[str] = None
    share_percentage: float = 100.00
    photo_url: Optional[str] = None

class NomineeCreate(NomineeBase):
    pass

class NomineeResponse(NomineeBase):
    id: int
    customer_id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Customer KYC Schemas
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
    email: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    is_nrb: bool = False
    passport_number: Optional[str] = None
    profile_photo_url: Optional[str] = None
    nid_scan_front_url: Optional[str] = None
    nid_scan_back_url: Optional[str] = None

class CustomerCreate(BaseModel):
    full_name_en: str
    full_name_bn: Optional[str] = None
    father_husband_name: Optional[str] = None
    mother_name: Optional[str] = None
    nid_number: Optional[str] = None
    tin_number: Optional[str] = None
    primary_phone: str
    email: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    is_nrb: bool = False
    passport_number: Optional[str] = None
    profile_photo_url: Optional[str] = None
    nominees: Optional[List[NomineeCreate]] = []

class CustomerResponse(CustomerBase):
    id: int
    nominees: List[NomineeResponse] = []
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Lead & Activity Schemas
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


class LeadBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lead_source_id: str = "FACEBOOK_ADS"
    campaign_name: Optional[str] = None
    lead_name: str
    primary_phone: str
    email: Optional[str] = None
    interested_project_id: Optional[int] = None
    budget_range_min: Optional[float] = None
    budget_range_max: Optional[float] = None
    assigned_sales_rep_id: Optional[int] = None
    lead_stage: str = "NEW"
    lead_score: int = 50
    notes: Optional[str] = None

class LeadCreate(BaseModel):
    lead_source_id: Optional[str] = "FACEBOOK_ADS"
    campaign_name: Optional[str] = None
    lead_name: str
    primary_phone: str
    email: Optional[str] = None
    interested_project_id: Optional[int] = None
    budget_range_min: Optional[float] = None
    budget_range_max: Optional[float] = None
    assigned_sales_rep_id: Optional[int] = None
    lead_stage: Optional[str] = "NEW"
    notes: Optional[str] = None

class LeadStageUpdate(BaseModel):
    lead_stage: str # NEW, CONTACTED, VISITED, NEGOTIATION, BOOKED, DROPPED
    notes: Optional[str] = None

class LeadResponse(LeadBase):
    id: int
    activities: List[LeadActivityResponse] = []
    assigned_sales_rep_name: Optional[str] = None
    interested_project_name: Optional[str] = None
    created_at: Optional[datetime] = None


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
    # Direct test format supported as well
    lead_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    campaign_name: Optional[str] = None
    interested_project_code: Optional[str] = None


class WebsiteInquiryPayload(BaseModel):
    """
    Website Contact Form & Landing Page Ingestion Payload.
    Captures inbound prospective buyer inquiries with UTM campaign attribution.
    """
    full_name: str
    phone_number: str
    email: Optional[str] = None
    project_code: Optional[str] = None
    interested_project_id: Optional[int] = None
    budget_range_min: Optional[float] = 10000000.00
    budget_range_max: Optional[float] = 25000000.00
    preferred_unit_type: Optional[str] = None # 3BHK, 4BHK, DUPLEX, PENTHOUSE
    message: Optional[str] = None
    utm_source: Optional[str] = "WEBSITE_CONTACT_FORM"
    utm_campaign: Optional[str] = None


class LeadScoreBreakdown(BaseModel):
    lead_id: int
    lead_name: str
    total_score: int # 0 to 100
    budget_fit_score: int # max 25
    contact_completeness_score: int # max 25
    source_quality_score: int # max 25
    engagement_progression_score: int # max 25
    lead_stage: str
    health_grade: str # A_HOT, B_WARM, C_COLD
    recommended_action: str

