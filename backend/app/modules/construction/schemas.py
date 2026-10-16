from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import date, datetime

# -------------------------------------------------------------
# Subcontractor Schemas
# -------------------------------------------------------------
class SubcontractorBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    contractor_code: str
    company_name: str
    trade_specialization: str
    contact_person: str
    primary_phone: str
    tin_number: Optional[str] = None
    bin_number: Optional[str] = None
    is_active: bool = True

class SubcontractorCreate(BaseModel):
    company_name: str
    trade_specialization: str
    contact_person: str
    primary_phone: str
    tin_number: Optional[str] = None
    bin_number: Optional[str] = None

class SubcontractorResponse(SubcontractorBase):
    id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Labor Muster Schemas
# -------------------------------------------------------------
class LaborMusterBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dpr_id: int
    contractor_id: Optional[int] = None
    trade_category: str
    worker_count: int = 1
    daily_wage_rate: float = 800.00
    total_wage: float

class LaborMusterCreate(BaseModel):
    dpr_id: int
    contractor_id: Optional[int] = None
    trade_category: str
    worker_count: int = 1
    daily_wage_rate: Optional[float] = 800.00

class LaborMusterResponse(LaborMusterBase):
    id: int
    contractor_name: Optional[str] = None
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# DPR Report Schemas
# -------------------------------------------------------------
class DPRReportBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    tower_id: Optional[int] = None
    report_date: date
    weather_condition_id: str = "SUNNY"
    site_engineer_id: Optional[int] = None
    structural_activity_summary: str
    concrete_casting_cft: float = 0.00
    steel_rod_consumed_mt: float = 0.000
    cement_consumed_bags: int = 0
    total_workers_onsite: int = 0
    status: str = "SUBMITTED"

class DPRReportCreate(BaseModel):
    project_id: int
    tower_id: Optional[int] = None
    report_date: Optional[date] = None
    weather_condition_id: Optional[str] = "SUNNY"
    structural_activity_summary: str
    concrete_casting_cft: Optional[float] = 0.00
    steel_rod_consumed_mt: Optional[float] = 0.000
    cement_consumed_bags: Optional[int] = 0
    total_workers_onsite: Optional[int] = 0
    labor_entries: Optional[List[LaborMusterCreate]] = []

class DPRReportResponse(DPRReportBase):
    id: int
    project_name: Optional[str] = None
    tower_name: Optional[str] = None
    site_engineer_name: Optional[str] = None
    labor_entries: List[LaborMusterResponse] = []
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Work Order Schemas
# -------------------------------------------------------------
class WorkOrderBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    contractor_id: int
    work_order_no: str
    contract_type: str
    total_contract_value: float
    retention_money_percent: float = 5.00
    defect_liability_months: int = 12
    status: str = "ACTIVE"
    scope_of_work: Optional[str] = None

class WorkOrderCreate(BaseModel):
    project_id: int
    contractor_id: int
    contract_type: str
    total_contract_value: float
    retention_money_percent: Optional[float] = 5.00
    defect_liability_months: Optional[int] = 12
    scope_of_work: Optional[str] = None

class WorkOrderResponse(WorkOrderBase):
    id: int
    project_name: Optional[str] = None
    contractor_name: Optional[str] = None
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# RA Bill Schemas
# -------------------------------------------------------------
class RABillBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    work_order_id: int
    ra_bill_number: str
    bill_date: date
    gross_work_certified_amount: float
    retention_money_deducted: float = 0.00
    advance_recovery_deducted: float = 0.00
    tds_withheld_amount: float = 0.00
    vds_withheld_amount: float = 0.00
    net_payable_amount: float
    status: str = "DRAFT"
    accounts_journal_voucher_ref: Optional[str] = None
    remarks: Optional[str] = None

class RABillCreate(BaseModel):
    work_order_id: int
    ra_bill_number: str
    bill_date: Optional[date] = None
    gross_work_certified_amount: float
    advance_recovery_deducted: Optional[float] = 0.00
    tds_percentage: Optional[float] = 5.00 # Standard Sec 52 TDS
    vds_percentage: Optional[float] = 5.00 # Standard VDS
    remarks: Optional[str] = None

class RABillApprovalRequest(BaseModel):
    action: str # 'APPROVE', 'REJECT'
    approval_notes: Optional[str] = None

class RABillResponse(RABillBase):
    id: int
    project_name: Optional[str] = None
    contractor_name: Optional[str] = None
    work_order_no: Optional[str] = None
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Construction Metrics
# -------------------------------------------------------------
class ConstructionMetrics(BaseModel):
    total_dpr_logged: int
    cumulative_concrete_cft: float
    cumulative_rebar_mt: float
    total_active_work_orders: int
    total_ra_bills_certified: int
    total_net_payable_certified: float


# -------------------------------------------------------------
# Concrete Cube Crushing Test Schemas
# -------------------------------------------------------------
class ConcreteCubeTestBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    tower_id: Optional[int] = None
    structural_element: str
    casting_date: date
    design_compressive_strength_psi: int = 4000
    concrete_grade: str = "M25"
    batching_plant_name: str = "Ready-Mix Batching Plant"
    slump_test_mm: int = 100
    day7_testing_date: Optional[date] = None
    day7_strength_psi: Optional[int] = None
    day14_testing_date: Optional[date] = None
    day14_strength_psi: Optional[int] = None
    day28_testing_date: Optional[date] = None
    day28_strength_psi: Optional[int] = None
    test_verdict: str = "PENDING"
    lab_test_report_url: Optional[str] = None
    remarks: Optional[str] = None

class ConcreteCubeTestCreate(BaseModel):
    project_id: int
    tower_id: Optional[int] = None
    structural_element: str
    casting_date: date
    design_compressive_strength_psi: Optional[int] = 4000
    concrete_grade: Optional[str] = "M25"
    batching_plant_name: Optional[str] = "Ready-Mix Batching Plant"
    slump_test_mm: Optional[int] = 100
    remarks: Optional[str] = None

class ConcreteCubeTestRecordUpdate(BaseModel):
    day7_strength_psi: Optional[int] = None
    day14_strength_psi: Optional[int] = None
    day28_strength_psi: Optional[int] = None
    lab_test_report_url: Optional[str] = None
    remarks: Optional[str] = None

class ConcreteCubeTestResponse(ConcreteCubeTestBase):
    id: int
    project_name: Optional[str] = None
    tower_name: Optional[str] = None
    day7_status: Optional[str] = None # DUE, COMPLETED, UPCOMING
    day14_status: Optional[str] = None
    day28_status: Optional[str] = None
    created_at: Optional[datetime] = None

class CubeTestNotificationAlert(BaseModel):
    test_id: int
    project_id: int
    project_name: str
    structural_element: str
    casting_date: date
    test_milestone: str # 'Day 7', 'Day 14', 'Day 28'
    scheduled_test_date: date
    days_remaining: int # 0 for today, negative for overdue, positive for upcoming
    alert_level: str # 'TODAY', 'OVERDUE', 'UPCOMING_48H'
    design_strength_psi: int


# -------------------------------------------------------------
# Safety NCR Schemas
# -------------------------------------------------------------
class SafetyNCRBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    ncr_number: str
    category: str
    severity: str = "Medium"
    description: Optional[str] = None
    location_details: Optional[str] = None
    photo_url: Optional[str] = None
    assigned_contractor_id: Optional[int] = None
    rectification_deadline: date
    status: str = "Open"
    rectification_notes: Optional[str] = None
    rectification_photo_url: Optional[str] = None
    closed_date: Optional[date] = None

class SafetyNCRCreate(BaseModel):
    project_id: int
    category: str # Structural Defect, Honeycombing, Cover Missing, Safety Violation
    severity: Optional[str] = "Medium"
    description: Optional[str] = None
    location_details: Optional[str] = None
    photo_url: Optional[str] = None
    assigned_contractor_id: Optional[int] = None
    rectification_deadline: date

class SafetyNCRRectify(BaseModel):
    rectification_notes: str
    rectification_photo_url: Optional[str] = None

class SafetyNCRVerifyClose(BaseModel):
    verdict: str # 'VERIFIED_CLOSED', 'REOPEN'
    verification_notes: Optional[str] = None

class SafetyNCRResponse(SafetyNCRBase):
    id: int
    project_name: Optional[str] = None
    contractor_name: Optional[str] = None
    is_overdue: bool = False
    created_at: Optional[datetime] = None

