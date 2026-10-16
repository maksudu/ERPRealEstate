from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from decimal import Decimal
from datetime import date, datetime


# Broker Schemas
class BrokerBase(BaseModel):
    broker_code: str
    agency_name: str
    contact_person: str
    phone_number: str
    nid_number: Optional[str] = None
    tin_number: Optional[str] = None
    commission_slab_percent: Decimal = Decimal("2.00")
    bank_details: Optional[str] = None
    status: str = "ACTIVE"


class BrokerCreate(BrokerBase):
    pass


class BrokerResponse(BrokerBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# Broker Commission Schemas
class BrokerCommissionCreate(BaseModel):
    broker_id: int
    booking_id: int
    total_unit_value: Decimal
    commission_percent: Decimal


class CommissionReleaseRequest(BaseModel):
    tranche_stage: str # 'DOWN_PAYMENT' (40%), 'GROUND_SLAB' (40%), 'REGISTRATION_DEED' (20%)
    notes: Optional[str] = None


class BrokerCommissionResponse(BaseModel):
    id: int
    broker_id: int
    booking_id: int
    total_unit_value: Decimal
    commission_percent: Decimal
    total_commission_amount: Decimal
    disbursed_amount: Decimal
    tds_withheld_amount: Decimal
    down_payment_disbursed: bool
    ground_slab_disbursed: bool
    registration_deed_disbursed: bool
    status: str
    disbursement_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# Court Case Schemas
class CourtCaseBase(BaseModel):
    project_id: Optional[int] = None
    case_type: str
    case_number: str
    concerned_court: str
    plaintiff: str
    defendant: str
    appointed_advocate: str
    next_hearing_date: Optional[date] = None
    status: str = "HEARING_ONGOING"
    case_summary: Optional[str] = None


class CourtCaseCreate(CourtCaseBase):
    pass


class CourtCaseResponse(CourtCaseBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# Machinery Asset Schemas
class MachineryAssetBase(BaseModel):
    asset_code: str
    asset_name: str
    category: str
    current_assigned_project_id: Optional[int] = None
    hourly_rate: Decimal = Decimal("1500.00")
    meter_reading_hours: Decimal = Decimal("0.00")
    status: str = "OPERATIONAL"


class MachineryAssetCreate(MachineryAssetBase):
    pass


class MachineryAssetResponse(MachineryAssetBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# Legacy Excel Import Schemas
class ImportBatchCreate(BaseModel):
    entity_type: str # 'Land', 'COA_Opening', 'Inventory', 'Installments'
    file_url: str
    total_records: int
    successful_records: int
    failed_records: int
    status: str = "COMPLETED"
    error_log: Optional[str] = None


class ImportBatchResponse(BaseModel):
    id: int
    entity_type: str
    file_url: str
    total_records: int
    successful_records: int
    failed_records: int
    status: str
    error_log: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
