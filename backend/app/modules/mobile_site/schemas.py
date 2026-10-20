from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime, date
from decimal import Decimal


# DPR Schemas
class DprCreate(BaseModel):
    project_name: str
    dpr_date: date
    weather_condition: str = "Sunny (32°C)"
    labour_count: int = 45
    work_completed: str
    delays_challenges: Optional[str] = None
    site_engineer: str = "Engr. Sajjad Hossain"
    status: str = "SUBMITTED"


class DprUpdate(BaseModel):
    project_name: Optional[str] = None
    dpr_date: Optional[date] = None
    weather_condition: Optional[str] = None
    labour_count: Optional[int] = None
    work_completed: Optional[str] = None
    delays_challenges: Optional[str] = None
    site_engineer: Optional[str] = None
    status: Optional[str] = None


# Task Schemas
class TaskCreate(BaseModel):
    task_name: str
    milestone_name: str = "Sub-Structure Casting"
    project_name: str
    assigned_to: str = "Engr. Tariqul Islam"
    deadline: date
    progress_percentage: int = 0
    priority: str = "HIGH"
    status: str = "IN_PROGRESS"


class TaskUpdate(BaseModel):
    task_name: Optional[str] = None
    milestone_name: Optional[str] = None
    project_name: Optional[str] = None
    assigned_to: Optional[str] = None
    deadline: Optional[date] = None
    progress_percentage: Optional[int] = None
    priority: Optional[str] = None
    status: Optional[str] = None


# Material Requisition Schemas
class MaterialReqCreate(BaseModel):
    project_name: str
    material_name: str
    material_category: str = "CEMENT"
    quantity: Decimal
    unit: str = "Bags"
    urgency: str = "NORMAL"
    required_by_date: date
    requested_by: str = "Engr. Sajjad Hossain"
    status: str = "PENDING"


class MaterialReqUpdate(BaseModel):
    project_name: Optional[str] = None
    material_name: Optional[str] = None
    material_category: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    urgency: Optional[str] = None
    required_by_date: Optional[date] = None
    status: Optional[str] = None


# Material Transaction Schemas
class MaterialTxCreate(BaseModel):
    tx_type: str = "RECEIVED"
    project_name: str
    material_name: str
    quantity: Decimal
    unit: str = "Bags"
    vendor_or_receiver: Optional[str] = "Seven Rings Cement Ltd."
    challan_number: Optional[str] = None
    vehicle_number: Optional[str] = None
    recorded_by: str = "Storekeeper Faruk"
    remarks: Optional[str] = None


# Photo Documentation Schemas
class PhotoDocCreate(BaseModel):
    project_name: str
    floor_or_location: str
    photo_url: str
    gps_latitude: Decimal = Decimal("23.792500")
    gps_longitude: Decimal = Decimal("90.407800")
    captured_by: str = "Engr. Sajjad Hossain"
    notes: Optional[str] = None


# Quality Schemas
class QualityCreate(BaseModel):
    project_name: str
    inspection_item: str
    inspection_category: str = "REBAR_CHECK"
    result: str = "PASS"
    defect_notes: Optional[str] = None
    corrective_action: Optional[str] = None
    inspected_by: str = "QC Engineer Rahim"
    status: str = "APPROVED"


class QualityUpdate(BaseModel):
    result: Optional[str] = None
    defect_notes: Optional[str] = None
    corrective_action: Optional[str] = None
    status: Optional[str] = None


# Contractor Schemas
class ContractorCreate(BaseModel):
    project_name: str
    contractor_name: str
    trade_type: str = "Civil & Formwork"
    work_description: str
    measured_quantity: Decimal
    unit: str = "Sft"
    verified_bill_amount: Decimal
    verification_status: str = "VERIFIED"
    verified_by: str = "Project Manager"


class ContractorUpdate(BaseModel):
    measured_quantity: Optional[Decimal] = None
    verified_bill_amount: Optional[Decimal] = None
    verification_status: Optional[str] = None
    trade_type: Optional[str] = None
    work_description: Optional[str] = None


# Safety Schemas
class SafetyCreate(BaseModel):
    project_name: str
    incident_type: str = "PPE_VIOLATION"
    severity: str = "MEDIUM"
    description: str
    corrective_action: str
    inspector_name: str = "HSE Officer Alam"
    status: str = "RESOLVED"


class SafetyUpdate(BaseModel):
    incident_type: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    corrective_action: Optional[str] = None
    status: Optional[str] = None


# Offline Sync Schemas
class OfflineSyncCreate(BaseModel):
    payload_type: str
    device_id: str = "MOBILE-SM-G998B"
    synced_records_count: int = 1
    remarks: Optional[str] = "Manual batch sync from offline cache"
