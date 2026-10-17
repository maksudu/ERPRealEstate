from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# --------------------------------------------------------------------------
# Digital Snag List Schemas
# --------------------------------------------------------------------------
class SnagItemBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    inspection_id: Optional[int] = None
    unit_id: int
    category: str # Civil, Paint, Plumbing, Electrical, Joinery, Waterproofing, Tiles
    location: str # Master Bed, Kitchen, Balcony, Living Room, Common Bath
    defect_description: str
    photo_attachment_url: Optional[str] = None
    severity: str = "MEDIUM" # CRITICAL, HIGH, MEDIUM, LOW
    contractor_name: Optional[str] = None
    target_fix_date: Optional[date] = None
    status: str = "OPEN" # OPEN, ASSIGNED, IN_PROGRESS, FIXED, VERIFIED_CLOSED
    fix_date: Optional[date] = None
    verified_by_engineer_id: Optional[int] = None
    verification_notes: Optional[str] = None
    customer_accepted: bool = False


class SnagItemCreate(BaseModel):
    inspection_id: Optional[int] = None
    unit_id: int
    category: str
    location: str
    defect_description: str
    photo_attachment_url: Optional[str] = None
    severity: str = "MEDIUM"
    contractor_name: Optional[str] = None
    target_fix_date: Optional[date] = None


class SnagItemUpdate(BaseModel):
    status: str
    fix_date: Optional[date] = None
    contractor_name: Optional[str] = None
    verified_by_engineer_id: Optional[int] = None
    verification_notes: Optional[str] = None
    customer_accepted: Optional[bool] = None


class SnagItemResponse(SnagItemBase):
    id: int
    snag_code: str
    unit_number: Optional[str] = None
    project_name: Optional[str] = None
    verified_by_engineer_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Handover & Possession Inspection Schemas
# --------------------------------------------------------------------------
class HandoverInspectionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_id: int
    unit_id: int
    site_engineer_id: int
    inspection_date: date
    all_financial_dues_cleared: bool = False
    possession_letter_number: Optional[str] = None
    key_handover_certificate_number: Optional[str] = None
    key_sets_count: int = 3
    possession_handover_date: Optional[date] = None
    joint_customer_signoff: bool = False
    customer_signoff_date: Optional[date] = None
    warranty_start_date: Optional[date] = None
    warranty_end_date: Optional[date] = None
    status: str = "INSPECTION_PENDING"
    notes: Optional[str] = None


class HandoverInspectionCreate(BaseModel):
    booking_id: int
    unit_id: int
    site_engineer_id: int
    inspection_date: Optional[date] = None
    all_financial_dues_cleared: bool = False
    key_sets_count: int = 3
    notes: Optional[str] = None


class HandoverExecution(BaseModel):
    possession_handover_date: date
    key_sets_count: int = 3
    joint_customer_signoff: bool = True
    notes: Optional[str] = None


class HandoverInspectionResponse(HandoverInspectionBase):
    id: int
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    site_engineer_name: Optional[str] = None
    open_snags_count: int = 0
    resolved_snags_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# DLP Snagging Warranty Tickets Schemas
# --------------------------------------------------------------------------
class DLPTicketBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    unit_id: int
    ticket_category: str
    defect_severity: str = "MEDIUM" # CRITICAL, HIGH, MEDIUM, LOW
    issue_description: str
    reported_date: date
    rectification_deadline: date
    sla_hours: int = 72
    sla_breach_status: str = "WITHIN_SLA"
    warranty_valid_until: Optional[date] = None
    is_under_warranty: bool = True
    assigned_technician: Optional[str] = None
    resolution_cost_bdt: float = 0.00
    borne_by: str = "DEVELOPER_WARRANTY"
    status: str = "OPEN"
    rectified_date: Optional[date] = None
    rectification_notes: Optional[str] = None


class DLPTicketCreate(BaseModel):
    unit_id: int
    ticket_category: str
    defect_severity: str = "MEDIUM"
    issue_description: str
    rectification_deadline: Optional[date] = None
    reported_date: Optional[date] = None
    assigned_technician: Optional[str] = None
    sla_hours: Optional[int] = None
    borne_by: str = "DEVELOPER_WARRANTY"


class DLPTicketUpdate(BaseModel):
    status: str
    rectification_notes: Optional[str] = None
    rectified_date: Optional[date] = None
    resolution_cost_bdt: Optional[float] = None
    sla_breach_status: Optional[str] = None


class DLPTicketResponse(DLPTicketBase):
    id: int
    ticket_code: Optional[str] = None
    unit_number: Optional[str] = None
    project_name: Optional[str] = None
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Flat Owners Association Schemas
# --------------------------------------------------------------------------
class OwnersAssociationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    association_name: str
    handover_date: date
    sinking_fund_transferred_bdt: float
    monthly_service_charge_per_flat: float
    president_name: Optional[str] = None
    secretary_name: Optional[str] = None
    contact_phone: Optional[str] = None
    status: str = "FORMED"


class OwnersAssociationCreate(OwnersAssociationBase):
    pass


class OwnersAssociationResponse(OwnersAssociationBase):
    id: int
    project_name: Optional[str] = None
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Commercial Rental Lease Agreement Schemas
# --------------------------------------------------------------------------
class LeaseAgreementBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    unit_id: int
    lease_reference_no: Optional[str] = None
    tenant_name: str
    tenant_company_name: Optional[str] = None
    trade_license_number: Optional[str] = None
    tin_bin_number: Optional[str] = None
    tenant_nid: str
    tenant_phone: Optional[str] = None
    tenant_email: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    
    commercial_space_type: str = "RETAIL_SHOP"
    floor_area_sqft: float = 500.00
    rent_per_sqft_bdt: float = 90.00
    monthly_rent_bdt: float
    cam_rate_per_sqft_bdt: float = 15.00
    
    fitout_grace_period_days: int = 30
    lease_start_date: date
    lease_expiry_date: date
    security_deposit_bdt: float
    security_deposit_status: str = "RECEIVED"
    rent_escalation_percent: float = 10.00
    escalation_frequency_months: int = 12
    status: str = "ACTIVE"
    remarks: Optional[str] = None


class LeaseAgreementCreate(BaseModel):
    unit_id: int
    tenant_name: str
    tenant_company_name: Optional[str] = None
    trade_license_number: Optional[str] = None
    tin_bin_number: Optional[str] = None
    tenant_nid: str
    tenant_phone: Optional[str] = None
    tenant_email: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    
    commercial_space_type: str = "RETAIL_SHOP"
    floor_area_sqft: float
    rent_per_sqft_bdt: float
    monthly_rent_bdt: Optional[float] = None # Auto-computed if empty
    cam_rate_per_sqft_bdt: float = 15.00
    
    fitout_grace_period_days: int = 30
    lease_start_date: date
    lease_expiry_date: date
    security_deposit_bdt: float
    security_deposit_status: str = "RECEIVED"
    rent_escalation_percent: float = 10.00
    escalation_frequency_months: int = 12
    remarks: Optional[str] = None


class LeaseAgreementResponse(LeaseAgreementBase):
    id: int
    unit_number: Optional[str] = None
    project_name: Optional[str] = None
    total_cam_billed_bdt: float = 0.00
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Monthly CAM (Common Area Maintenance) Service Charge Billing Schemas
# --------------------------------------------------------------------------
class CAMBillBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lease_id: int
    bill_month: str # e.g. "2026-10"
    billing_date: date
    due_date: date
    area_sqft: float
    cam_rate_per_sqft: float
    cam_amount: float
    sinking_fund_charge: float = 0.00
    generator_backup_charge: float = 0.00
    common_electricity_water: float = 0.00
    total_bill_amount: float
    paid_amount: float = 0.00
    payment_status: str = "UNPAID" # UNPAID, PARTIALLY_PAID, PAID, OVERDUE
    paid_date: Optional[date] = None
    remarks: Optional[str] = None


class CAMBillCreate(BaseModel):
    lease_id: int
    bill_month: str
    due_date: Optional[date] = None
    sinking_fund_charge: float = 0.00
    generator_backup_charge: float = 0.00
    common_electricity_water: float = 0.00
    remarks: Optional[str] = None


class CAMBillPayment(BaseModel):
    paid_amount: float
    paid_date: Optional[date] = None
    payment_mode: str = "BANK_TRANSFER"
    instrument_no: Optional[str] = None
    remarks: Optional[str] = None


class CAMBillResponse(CAMBillBase):
    id: int
    bill_number: str
    tenant_name: Optional[str] = None
    tenant_company_name: Optional[str] = None
    unit_number: Optional[str] = None
    project_name: Optional[str] = None
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Utility Sub-Meter Reading Schemas
# --------------------------------------------------------------------------
class UtilitySubMeterReadingBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lease_id: int
    meter_number: str
    meter_type: str # ELECTRICITY, WATER, GAS, HVAC_BTU
    reading_date: date
    previous_reading: float
    current_reading: float
    units_consumed: float
    tariff_rate_per_unit: float
    subtotal_amount: float
    vat_rate_percent: float = 5.00
    total_utility_amount: float
    billing_status: str = "UNBILLED" # UNBILLED, BILLED, PAID
    remarks: Optional[str] = None


class UtilitySubMeterReadingCreate(BaseModel):
    lease_id: int
    meter_number: str
    meter_type: str = "ELECTRICITY"
    reading_date: Optional[date] = None
    previous_reading: float
    current_reading: float
    tariff_rate_per_unit: float # e.g. 14.50
    vat_rate_percent: float = 5.00
    remarks: Optional[str] = None


class UtilitySubMeterReadingResponse(UtilitySubMeterReadingBase):
    id: int
    tenant_name: Optional[str] = None
    tenant_company_name: Optional[str] = None
    unit_number: Optional[str] = None
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Overall Handover & Facilities Subsystem Metrics
# --------------------------------------------------------------------------
class HandoverDashboardMetrics(BaseModel):
    total_inspections_count: int = 0
    possession_handed_over_count: int = 0
    inspection_pending_count: int = 0
    
    total_snags_reported: int = 0
    open_snags_count: int = 0
    fixed_snags_count: int = 0
    
    total_dlp_tickets_count: int = 0
    active_dlp_tickets_count: int = 0
    critical_dlp_count: int = 0
    
    active_commercial_leases_count: int = 0
    total_monthly_rent_receivable: float = 0.00
    total_cam_billed_amount: float = 0.00
    unpaid_cam_bills_count: int = 0
