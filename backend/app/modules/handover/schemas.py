from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime


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
    possession_handover_date: Optional[date] = None
    status: str = "INSPECTION_PENDING"
    notes: Optional[str] = None


class HandoverInspectionCreate(BaseModel):
    booking_id: int
    unit_id: int
    site_engineer_id: int
    inspection_date: Optional[date] = None
    all_financial_dues_cleared: bool = False
    notes: Optional[str] = None


class HandoverExecution(BaseModel):
    possession_handover_date: date
    notes: Optional[str] = None


class HandoverInspectionResponse(HandoverInspectionBase):
    id: int
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    customer_name: Optional[str] = None
    site_engineer_name: Optional[str] = None
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# DLP Snagging Warranty Tickets Schemas
# --------------------------------------------------------------------------
class DLPTicketBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    unit_id: int
    ticket_category: str
    issue_description: str
    reported_date: date
    rectification_deadline: date
    status: str = "OPEN"
    rectified_date: Optional[date] = None
    rectification_notes: Optional[str] = None


class DLPTicketCreate(BaseModel):
    unit_id: int
    ticket_category: str
    issue_description: str
    rectification_deadline: date
    reported_date: Optional[date] = None


class DLPTicketUpdate(BaseModel):
    status: str
    rectification_notes: Optional[str] = None
    rectified_date: Optional[date] = None


class DLPTicketResponse(DLPTicketBase):
    id: int
    unit_number: Optional[str] = None
    project_name: Optional[str] = None
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# Flat Owners Association (কল্যাণ সমিতি) Schemas
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
# Rental Lease Agreement Schemas
# --------------------------------------------------------------------------
class LeaseAgreementBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    unit_id: int
    tenant_name: str
    tenant_nid: str
    tenant_phone: Optional[str] = None
    lease_start_date: date
    lease_expiry_date: date
    monthly_rent_bdt: float
    security_deposit_bdt: float
    rent_escalation_percent: float = 10.00
    status: str = "ACTIVE"


class LeaseAgreementCreate(LeaseAgreementBase):
    pass


class LeaseAgreementResponse(LeaseAgreementBase):
    id: int
    unit_number: Optional[str] = None
    project_name: Optional[str] = None
    created_at: Optional[datetime] = None
