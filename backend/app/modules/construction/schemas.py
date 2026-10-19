from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import date, datetime

# -------------------------------------------------------------
# Contractor & Subcontractor Schemas
# -------------------------------------------------------------
class SubcontractorBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    contractor_code: str
    company_name: str
    legal_business_name: Optional[str] = None
    trade_specialization: str
    trade_category: str = "CIVIL_STRUCTURE"
    contractor_type: str = "SUBCONTRACTOR"
    parent_contractor_id: Optional[int] = None
    parent_contractor_name: Optional[str] = None

    contact_person: str
    primary_phone: str
    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    office_address: Optional[str] = None
    city: Optional[str] = "Dhaka"
    authorized_rep_name: Optional[str] = None
    authorized_rep_designation: Optional[str] = None
    authorized_rep_phone: Optional[str] = None
    authorized_rep_nid: Optional[str] = None

    tin_number: Optional[str] = None
    bin_number: Optional[str] = None
    trade_license_number: Optional[str] = None
    trade_license_expiry: Optional[date] = None
    tax_circle: Optional[str] = None

    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_routing_number: Optional[str] = None
    payment_terms_days: int = 30

    iso_certification: Optional[str] = None
    license_grade: Optional[str] = "GRADE_A"
    enlistment_category: Optional[str] = "CATEGORY_1"
    insurance_policy_number: Optional[str] = None
    insurance_expiry_date: Optional[date] = None
    insurance_coverage_amount: float = 0.00

    safety_compliant: bool = True
    safety_officer_name: Optional[str] = None
    safety_incident_count: int = 0

    performance_rating: float = 4.50
    past_projects_count: int = 0
    experience_years: int = 5

    manpower_capacity: int = 50
    equipment_inventory: Optional[str] = None
    site_supervisor_name: Optional[str] = None
    site_supervisor_phone: Optional[str] = None
    scope_boundaries: Optional[str] = None
    duplicate_billing_protection: bool = True

    contract_start_date: Optional[date] = None
    contract_expiry_date: Optional[date] = None
    onboarding_status: str = "APPROVED"
    completion_status: str = "ACTIVE"
    has_active_disputes: bool = False
    remarks: Optional[str] = None
    is_active: bool = True


class SubcontractorCreate(BaseModel):
    company_name: str
    legal_business_name: Optional[str] = None
    trade_specialization: str
    trade_category: str = "CIVIL_STRUCTURE"
    contractor_type: str = "SUBCONTRACTOR"
    parent_contractor_id: Optional[int] = None

    contact_person: str
    primary_phone: str
    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    office_address: Optional[str] = None
    city: Optional[str] = "Dhaka"
    authorized_rep_name: Optional[str] = None
    authorized_rep_designation: Optional[str] = None
    authorized_rep_phone: Optional[str] = None
    authorized_rep_nid: Optional[str] = None

    tin_number: Optional[str] = None
    bin_number: Optional[str] = None
    trade_license_number: Optional[str] = None
    trade_license_expiry: Optional[date] = None
    tax_circle: Optional[str] = None

    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_routing_number: Optional[str] = None
    payment_terms_days: int = 30

    iso_certification: Optional[str] = None
    license_grade: Optional[str] = "GRADE_A"
    enlistment_category: Optional[str] = "CATEGORY_1"
    insurance_policy_number: Optional[str] = None
    insurance_expiry_date: Optional[date] = None
    insurance_coverage_amount: float = 0.00

    safety_compliant: bool = True
    safety_officer_name: Optional[str] = None
    safety_incident_count: int = 0

    performance_rating: float = 4.50
    past_projects_count: int = 0
    experience_years: int = 5

    manpower_capacity: int = 50
    equipment_inventory: Optional[str] = None
    site_supervisor_name: Optional[str] = None
    site_supervisor_phone: Optional[str] = None
    scope_boundaries: Optional[str] = None
    duplicate_billing_protection: bool = True

    contract_start_date: Optional[date] = None
    contract_expiry_date: Optional[date] = None
    onboarding_status: str = "APPROVED"
    completion_status: str = "ACTIVE"
    has_active_disputes: bool = False
    remarks: Optional[str] = None
    is_active: bool = True


class SubcontractorUpdate(BaseModel):
    company_name: Optional[str] = None
    legal_business_name: Optional[str] = None
    trade_specialization: Optional[str] = None
    trade_category: Optional[str] = None
    contractor_type: Optional[str] = None
    parent_contractor_id: Optional[int] = None

    contact_person: Optional[str] = None
    primary_phone: Optional[str] = None
    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    office_address: Optional[str] = None
    city: Optional[str] = None
    authorized_rep_name: Optional[str] = None
    authorized_rep_designation: Optional[str] = None
    authorized_rep_phone: Optional[str] = None
    authorized_rep_nid: Optional[str] = None

    tin_number: Optional[str] = None
    bin_number: Optional[str] = None
    trade_license_number: Optional[str] = None
    trade_license_expiry: Optional[date] = None
    tax_circle: Optional[str] = None

    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_routing_number: Optional[str] = None
    payment_terms_days: Optional[int] = None

    iso_certification: Optional[str] = None
    license_grade: Optional[str] = None
    enlistment_category: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    insurance_expiry_date: Optional[date] = None
    insurance_coverage_amount: Optional[float] = None

    safety_compliant: Optional[bool] = None
    safety_officer_name: Optional[str] = None
    safety_incident_count: Optional[int] = None

    performance_rating: Optional[float] = None
    past_projects_count: Optional[int] = None
    experience_years: Optional[int] = None

    manpower_capacity: Optional[int] = None
    equipment_inventory: Optional[str] = None
    site_supervisor_name: Optional[str] = None
    site_supervisor_phone: Optional[str] = None
    scope_boundaries: Optional[str] = None
    duplicate_billing_protection: Optional[bool] = None

    contract_start_date: Optional[date] = None
    contract_expiry_date: Optional[date] = None
    onboarding_status: Optional[str] = None
    completion_status: Optional[str] = None
    has_active_disputes: Optional[bool] = None
    remarks: Optional[str] = None
    is_active: Optional[bool] = None


class ContractorRateBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    contractor_id: int
    project_id: Optional[int] = None
    work_order_id: Optional[int] = None
    item_code: str
    trade_item_name: str
    specification: Optional[str] = None
    unit_of_measure: str = "SFT"
    approved_unit_rate: float = 0.00
    scope_boundary_definition: Optional[str] = None
    effective_start_date: date
    effective_end_date: Optional[date] = None
    is_active: bool = True


class ContractorRateCreate(BaseModel):
    contractor_id: int
    project_id: Optional[int] = None
    work_order_id: Optional[int] = None
    item_code: Optional[str] = None
    trade_item_name: str
    specification: Optional[str] = None
    unit_of_measure: str = "SFT"
    approved_unit_rate: float
    scope_boundary_definition: Optional[str] = None
    effective_start_date: date
    effective_end_date: Optional[date] = None
    is_active: bool = True


class ContractorRateResponse(ContractorRateBase):
    id: int
    contractor_name: Optional[str] = None
    project_name: Optional[str] = None
    created_at: Optional[datetime] = None


class ContractorDisputeBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dispute_code: str
    contractor_id: int
    project_id: int
    work_order_id: Optional[int] = None
    dispute_category: str = "MEASUREMENT_DISCREPANCY"
    dispute_title: str
    description: str
    claimed_amount: float = 0.00
    approved_deduction_amount: float = 0.00
    retention_held_amount: float = 0.00
    status: str = "OPEN"
    resolution_notes: Optional[str] = None
    raised_by_user_id: int
    raised_date: date
    resolved_date: Optional[date] = None
    resolved_by_user_id: Optional[int] = None


class ContractorDisputeCreate(BaseModel):
    contractor_id: int
    project_id: int
    work_order_id: Optional[int] = None
    dispute_category: str = "MEASUREMENT_DISCREPANCY"
    dispute_title: str
    description: str
    claimed_amount: float = 0.00
    approved_deduction_amount: float = 0.00
    retention_held_amount: float = 0.00
    status: str = "OPEN"
    resolution_notes: Optional[str] = None
    raised_date: Optional[date] = None


class ContractorDisputeResolve(BaseModel):
    status: str # RESOLVED, DEDUCTED, REJECTED
    approved_deduction_amount: float = 0.00
    resolution_notes: str


class ContractorDisputeResponse(ContractorDisputeBase):
    id: int
    contractor_name: Optional[str] = None
    project_name: Optional[str] = None
    created_at: Optional[datetime] = None


class SubcontractorResponse(SubcontractorBase):
    id: int
    rates_count: int = 0
    disputes_count: int = 0
    active_work_orders_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SubcontractorListResponse(BaseModel):
    items: List[SubcontractorResponse]
    total: int
    limit: int
    offset: int


class ContractorMetricsResponse(BaseModel):
    total_contractors: int
    active_subcontractors: int
    approved_enlisted: int
    active_disputes_count: int
    total_disputed_amount: float
    avg_performance_rating: float


# -------------------------------------------------------------
# Daily Progress Report (DPR) & Site Progress Schemas
# -------------------------------------------------------------
class DPRReportBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    tower_id: Optional[int] = None
    report_date: date
    weather_condition_id: str = "SUNNY" # SUNNY, OVERCAST, RAIN_LIGHT, RAIN_HEAVY, STORMY, HUMID_HOT
    site_engineer_id: Optional[int] = None

    report_number: Optional[str] = None
    client_offline_uuid: Optional[str] = None
    sync_status: str = "SYNCED" # SYNCED, OFFLINE_DRAFT, CONFLICT_DETECTED, CONFLICT_RESOLVED
    conflict_detected: bool = False
    conflict_notes: Optional[str] = None
    version_number: int = 1
    revision_history: Optional[Any] = None

    # Geo-location & Photo Timestamps
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gps_accuracy_meters: Optional[float] = None
    location_address: Optional[str] = None
    location_verified: bool = False
    photo_timestamp: Optional[datetime] = None

    # Progress & Scope
    structural_activity_summary: str
    activities_planned: Optional[str] = None
    activities_completed: Optional[str] = None
    wbs_node_id: Optional[int] = None
    floor_unit_location: Optional[str] = None
    boq_quantities_completed: Optional[Any] = None # [{"boq_item_id": 1, "item_code": "...", "unit": "...", "completed_quantity": 25.5}]

    # Equipment Tracking & Downtime
    machinery_deployed: Optional[str] = None
    equipment_records: Optional[Any] = None # [{"equipment_name": "...", "qty": 1, "hours_operated": 7.0, "downtime_hours": 0.5, "downtime_reason": "..."}]
    total_equipment_downtime_hours: float = 0.00

    # Materials Summary & Wastage
    concrete_casting_cft: float = 0.00
    steel_rod_consumed_mt: float = 0.000
    cement_consumed_bags: int = 0
    materials_summary: Optional[Any] = None # [{"material_name": "...", "received_qty": 200, "issued_qty": 150, "consumed_qty": 140, "wastage_qty": 10}]
    material_wastage_notes: Optional[str] = None

    # Quality & Inspection
    inspection_requests: Optional[str] = None
    quality_observations: Optional[str] = None
    inspection_status: str = "PENDING" # PENDING, APPROVED_ON_SITE, CONDITIONAL_APPROVAL, REJECTED, NCR_ISSUED
    safety_incident_logged: bool = False
    safety_incident_notes: Optional[str] = None

    # Constraints & Delays
    site_constraints: Optional[str] = None
    delay_hours: float = 0.00
    delay_root_cause: Optional[str] = None
    recovery_plan: Optional[str] = None

    # Headcount & Workforce
    total_workers_onsite: int = 0

    # Multi-tier Review & Signatures
    status: str = "SUBMITTED"
    engineer_comments: Optional[str] = None
    supervisor_approval_status: str = "PENDING_REVIEW" # PENDING_REVIEW, VERIFIED_BY_ENGINEER, APPROVED_BY_PM, REJECTED_NEEDS_REVISION
    supervisor_comments: Optional[str] = None
    approved_by_supervisor_id: Optional[int] = None
    approval_date: Optional[datetime] = None
    supervisor_signature: Optional[str] = None
    site_photos: Optional[Any] = None


class DPRReportCreate(DPRReportBase):
    labor_entries: Optional[List[Dict[str, Any]]] = []


class DPRReportUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tower_id: Optional[int] = None
    report_date: Optional[date] = None
    weather_condition_id: Optional[str] = None
    structural_activity_summary: Optional[str] = None
    activities_planned: Optional[str] = None
    activities_completed: Optional[str] = None
    wbs_node_id: Optional[int] = None
    floor_unit_location: Optional[str] = None
    boq_quantities_completed: Optional[Any] = None

    machinery_deployed: Optional[str] = None
    equipment_records: Optional[Any] = None
    total_equipment_downtime_hours: Optional[float] = None

    concrete_casting_cft: Optional[float] = None
    steel_rod_consumed_mt: Optional[float] = None
    cement_consumed_bags: Optional[int] = None
    materials_summary: Optional[Any] = None
    material_wastage_notes: Optional[str] = None

    inspection_requests: Optional[str] = None
    quality_observations: Optional[str] = None
    inspection_status: Optional[str] = None
    safety_incident_logged: Optional[bool] = None
    safety_incident_notes: Optional[str] = None

    site_constraints: Optional[str] = None
    delay_hours: Optional[float] = None
    delay_root_cause: Optional[str] = None
    recovery_plan: Optional[str] = None

    total_workers_onsite: Optional[int] = None
    status: Optional[str] = None
    engineer_comments: Optional[str] = None
    supervisor_approval_status: Optional[str] = None
    supervisor_comments: Optional[str] = None
    site_photos: Optional[Any] = None
    labor_entries: Optional[List[Dict[str, Any]]] = None


class DPRReportOfflineSyncBatch(BaseModel):
    reports: List[DPRReportCreate]


class DPRReportApprovalAction(BaseModel):
    action: str # VERIFY_ENGINEER, APPROVE_PM, REJECT_REVISE
    supervisor_name: str
    supervisor_role: str
    comments: Optional[str] = None
    signature_data: Optional[str] = None


class DPRReportResponse(DPRReportBase):
    id: int
    project_name: Optional[str] = None
    tower_name: Optional[str] = None
    wbs_node_name: Optional[str] = None
    site_engineer_name: Optional[str] = None
    supervisor_name: Optional[str] = None
    labor_entries: List[Any] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DPRReportListResponse(BaseModel):
    items: List[DPRReportResponse]
    total: int
    limit: int
    offset: int


class DPRMetricsResponse(BaseModel):
    total_reports: int = 0
    total_workers_logged: int = 0
    total_concrete_cft: float = 0.0
    total_rebar_mt: float = 0.0
    total_equipment_downtime_hours: float = 0.0
    total_delay_hours: float = 0.0
    pending_approvals: int = 0
    offline_sync_pending: int = 0
    safety_incidents: int = 0


class WeeklyMonthlyProgressReport(BaseModel):
    period_type: str # WEEKLY or MONTHLY
    project_id: int
    project_name: str
    start_date: date
    end_date: date
    total_dprs_logged: int
    average_daily_headcount: float
    cumulative_concrete_cft: float
    cumulative_rebar_mt: float
    total_downtime_hours: float
    total_delay_hours: float
    planned_progress_percentage: float
    actual_progress_percentage: float
    variance_percentage: float
    critical_delays: List[Dict[str, Any]] = []
    contractor_productivity: List[Dict[str, Any]] = []
    material_consumption_summary: List[Dict[str, Any]] = []
    pending_inspections_count: int = 0
    unresolved_ncr_count: int = 0
    forecast_completion_date: Optional[date] = None


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
# -------------------------------------------------------------
# WBS Node Schemas
# -------------------------------------------------------------
# -------------------------------------------------------------
# WBS Node & Activity Scheduling Schemas
# -------------------------------------------------------------
class WBSNodeBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    tower_id: Optional[int] = None
    parent_id: Optional[int] = None
    node_code: str
    node_name: str
    wbs_tier: str = "ACTIVITY" # PHASE, SUB_PHASE, WORK_PACKAGE, ACTIVITY, TASK, MILESTONE
    phase_category: str = "SITE_PREPARATION" # SITE_PREPARATION, FOUNDATION_STRUCTURE, MASONRY_FINISHING, MEP_WORKS, EXTERNAL_WORKS
    activity_type: Optional[str] = None
    
    planned_start_date: date
    planned_end_date: date
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    duration_days: int = 1

    unit_of_measure: Optional[str] = "SFT"
    planned_quantity: float = 0.0000
    verified_completed_quantity: float = 0.0000
    approved_total_quantity: float = 0.0000
    progress_measurement_method: str = "QUANTITY_DRIVEN" # QUANTITY_DRIVEN, MILESTONE_PERCENTAGE, EFFORT_HOURS, EARNED_VALUE

    progress_percentage: float = 0.00
    weightage_percentage: float = 10.00
    earned_value: float = 0.00
    planned_value: float = 0.00
    status: str = "NOT_STARTED" # NOT_STARTED, IN_PROGRESS, COMPLETED, DELAYED, CRITICAL_PATH, ON_HOLD

    baseline_start_date: Optional[date] = None
    baseline_end_date: Optional[date] = None
    baseline_duration_days: Optional[int] = None
    schedule_revision_no: int = 0
    is_critical_path: bool = False
    is_milestone: bool = False

    predecessor_node_id: Optional[int] = None
    dependency_type: str = "FS" # FS, SS, FF, SF
    lag_days: int = 0

    contractor_id: Optional[int] = None
    responsible_engineer: Optional[str] = None
    responsible_team: Optional[str] = None

    delay_days: int = 0
    delay_reason: Optional[str] = None
    corrective_action: Optional[str] = None
    weather_constraints: Optional[str] = None
    site_constraints: Optional[str] = None
    forecasted_end_date: Optional[date] = None
    variance_days: int = 0

    remarks: Optional[str] = None

class WBSNodeCreate(BaseModel):
    project_id: int
    tower_id: Optional[int] = None
    parent_id: Optional[int] = None
    node_code: str
    node_name: str
    wbs_tier: Optional[str] = "ACTIVITY"
    phase_category: Optional[str] = "SITE_PREPARATION"
    activity_type: Optional[str] = None
    
    planned_start_date: date
    planned_end_date: date
    duration_days: Optional[int] = 1

    unit_of_measure: Optional[str] = "SFT"
    planned_quantity: Optional[float] = 0.0
    verified_completed_quantity: Optional[float] = 0.0
    approved_total_quantity: Optional[float] = 0.0
    progress_measurement_method: Optional[str] = "QUANTITY_DRIVEN"

    progress_percentage: Optional[float] = 0.0
    weightage_percentage: Optional[float] = 10.00
    status: Optional[str] = "NOT_STARTED"

    baseline_start_date: Optional[date] = None
    baseline_end_date: Optional[date] = None
    baseline_duration_days: Optional[int] = None
    is_critical_path: Optional[bool] = False
    is_milestone: Optional[bool] = False

    predecessor_node_id: Optional[int] = None
    dependency_type: Optional[str] = "FS"
    lag_days: Optional[int] = 0

    contractor_id: Optional[int] = None
    responsible_engineer: Optional[str] = None
    responsible_team: Optional[str] = None

    remarks: Optional[str] = None

class WBSNodeUpdate(BaseModel):
    tower_id: Optional[int] = None
    parent_id: Optional[int] = None
    node_code: Optional[str] = None
    node_name: Optional[str] = None
    wbs_tier: Optional[str] = None
    phase_category: Optional[str] = None
    activity_type: Optional[str] = None
    
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    duration_days: Optional[int] = None

    unit_of_measure: Optional[str] = None
    planned_quantity: Optional[float] = None
    verified_completed_quantity: Optional[float] = None
    approved_total_quantity: Optional[float] = None
    progress_measurement_method: Optional[str] = None

    progress_percentage: Optional[float] = None
    weightage_percentage: Optional[float] = None
    status: Optional[str] = None

    baseline_start_date: Optional[date] = None
    baseline_end_date: Optional[date] = None
    baseline_duration_days: Optional[int] = None
    schedule_revision_no: Optional[int] = None
    is_critical_path: Optional[bool] = None
    is_milestone: Optional[bool] = None

    predecessor_node_id: Optional[int] = None
    dependency_type: Optional[str] = None
    lag_days: Optional[int] = None

    contractor_id: Optional[int] = None
    responsible_engineer: Optional[str] = None
    responsible_team: Optional[str] = None

    delay_days: Optional[int] = None
    delay_reason: Optional[str] = None
    corrective_action: Optional[str] = None
    weather_constraints: Optional[str] = None
    site_constraints: Optional[str] = None
    forecasted_end_date: Optional[date] = None
    variance_days: Optional[int] = None

    remarks: Optional[str] = None

class WBSNodeUpdateProgress(BaseModel):
    verified_completed_quantity: Optional[float] = None
    approved_total_quantity: Optional[float] = None
    progress_percentage: Optional[float] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    status: Optional[str] = None
    delay_days: Optional[int] = None
    delay_reason: Optional[str] = None
    corrective_action: Optional[str] = None
    weather_constraints: Optional[str] = None
    site_constraints: Optional[str] = None
    forecasted_end_date: Optional[date] = None
    remarks: Optional[str] = None

class WBSNodeResponse(WBSNodeBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    children: Optional[List['WBSNodeResponse']] = []
    predecessor_code: Optional[str] = None
    contractor_name: Optional[str] = None

class WBSNodeListResponse(BaseModel):
    items: List[WBSNodeResponse]
    total: int
    limit: int
    offset: int

class WBSMetricsResponse(BaseModel):
    project_id: int
    project_name: str
    total_activities: int
    completed_activities: int
    in_progress_activities: int
    delayed_activities: int
    critical_path_activities: int
    milestones_count: int
    overall_weighted_progress: float
    total_planned_value: float
    total_earned_value: float
    schedule_performance_index: float
    average_variance_days: int

class ProjectCalendarBase(BaseModel):
    project_id: int
    calendar_name: str = "Standard 6-Day Construction Calendar"
    working_days_per_week: int = 6
    weekly_off_days: Optional[List[str]] = ["FRIDAY"]
    working_hours_per_day: float = 8.0
    shifts: Optional[List[dict]] = []
    holidays: Optional[List[dict]] = []

class ProjectCalendarCreate(ProjectCalendarBase):
    pass

class ProjectCalendarResponse(ProjectCalendarBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ActivityDependencyBase(BaseModel):
    wbs_node_id: int
    predecessor_node_id: int
    dependency_type: str = "FS" # FS, SS, FF, SF
    lag_days: int = 0

class ActivityDependencyCreate(ActivityDependencyBase):
    pass

class ActivityDependencyResponse(ActivityDependencyBase):
    id: int
    created_at: Optional[datetime] = None
    predecessor_code: Optional[str] = None
    predecessor_name: Optional[str] = None



# -------------------------------------------------------------
# Variation Order Schemas (BOQ Hard Lock Release)
# -------------------------------------------------------------
class VariationOrderBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    boq_item_id: int
    vo_number: str
    additional_quantity: float
    revised_rate: Optional[float] = None
    additional_budget: float = 0.00
    reason: str
    approved_by_pm: Optional[str] = None
    status: str = "PENDING"
    approval_date: Optional[date] = None

class VariationOrderCreate(BaseModel):
    project_id: int
    boq_item_id: int
    additional_quantity: float
    revised_rate: Optional[float] = None
    reason: str

class VariationOrderApprove(BaseModel):
    approved_by_pm: str
    status: str = "APPROVED" # APPROVED, REJECTED
    approval_notes: Optional[str] = None

class VariationOrderResponse(VariationOrderBase):
    id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Joint Measurement Sheet (JMS) Schemas
# -------------------------------------------------------------
class JointMeasurementSheetBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    work_order_id: int
    wbs_node_id: Optional[int] = None
    jms_number: str
    measurement_date: date
    location_floor: str
    trade_item: str
    unit_of_measure: str = "SFT"
    measured_length: float = 0.00
    measured_breadth: float = 0.00
    measured_depth: float = 0.00
    measured_quantity: float
    unit_rate: float
    total_amount: float
    verified_by_site_engineer: str
    subcontractor_representative: str
    status: str = "VERIFIED_BY_ENGINEER"
    ra_bill_id: Optional[int] = None

class JointMeasurementSheetCreate(BaseModel):
    work_order_id: int
    wbs_node_id: Optional[int] = None
    jms_number: str
    measurement_date: Optional[date] = None
    location_floor: str
    trade_item: str
    unit_of_measure: Optional[str] = "SFT"
    measured_length: Optional[float] = 0.00
    measured_breadth: Optional[float] = 0.00
    measured_depth: Optional[float] = 0.00
    measured_quantity: float
    unit_rate: float
    verified_by_site_engineer: str
    subcontractor_representative: str

class JointMeasurementSheetResponse(JointMeasurementSheetBase):
    id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# BOQ Requisition & Hard Budget Lock Verification
# -------------------------------------------------------------
class BOQRequisitionCheckRequest(BaseModel):
    boq_item_id: int
    requested_quantity: float
    requisition_memo_no: Optional[str] = None

class BOQRequisitionCheckResponse(BaseModel):
    boq_item_id: int
    item_description: str
    estimated_quantity: float
    variation_order_quantity: float
    allowable_ceiling_105: float
    already_requisitioned_quantity: float
    remaining_allowable_quantity: float
    requested_quantity: float
    is_hard_locked: bool
    budget_lock_triggered: bool
    message: str





# -------------------------------------------------------------
# Work Order & Contract Management Schemas
# -------------------------------------------------------------
class WorkOrderItemBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    boq_item_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    item_code: str
    item_description: str
    specification: Optional[str] = None
    unit_of_measure: str = "SFT"
    boq_quantity: float = 0.0000
    contract_quantity: float = 0.0000
    approved_unit_rate: float = 0.00
    total_amount: float = 0.00
    executed_quantity: float = 0.0000
    remaining_quantity: float = 0.0000
    remarks: Optional[str] = None

class WorkOrderItemCreate(WorkOrderItemBase):
    pass

class WorkOrderItemResponse(WorkOrderItemBase):
    id: int
    work_order_id: int
    created_at: Optional[datetime] = None


class WorkOrderMilestoneBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    milestone_code: str
    milestone_title: str
    target_date: date
    actual_date: Optional[date] = None
    weightage_percent: float = 10.00
    milestone_amount: float = 0.00
    is_critical: bool = False
    status: str = "PENDING"
    verification_notes: Optional[str] = None

class WorkOrderMilestoneCreate(WorkOrderMilestoneBase):
    pass

class WorkOrderMilestoneResponse(WorkOrderMilestoneBase):
    id: int
    work_order_id: int
    created_at: Optional[datetime] = None


class WorkOrderBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    work_order_no: str
    contract_reference: Optional[str] = None
    project_id: int
    contractor_id: int
    tower_id: Optional[int] = None
    tower_name: Optional[str] = None
    wbs_node_id: Optional[int] = None
    wbs_package_name: Optional[str] = None

    contract_title: Optional[str] = None
    contract_type: str = "CIVIL_SUPERSTRUCTURE"
    contract_model: str = "ITEM_RATE"
    tender_reference: Optional[str] = None
    technical_specifications: Optional[str] = None
    scope_of_work: Optional[str] = None

    total_contract_value: float
    original_contract_value: float = 0.00
    approved_variations_value: float = 0.00
    revised_contract_value: float = 0.00
    committed_cost: float = 0.00
    certified_work_value: float = 0.00
    paid_amount: float = 0.00

    start_date: Optional[date] = None
    target_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None
    delay_days: int = 0

    advance_payment_amount: float = 0.00
    advance_payment_percent: float = 0.00
    advance_recovery_rule: Optional[str] = "RECOVER_ACROSS_RUNNING_BILLS"
    advance_recovered_amount: float = 0.00

    retention_money_percent: float = 5.00
    retention_money_held: float = 0.00
    retention_release_conditions: Optional[str] = None
    defect_liability_months: int = 12

    performance_security_type: Optional[str] = "BANK_GUARANTEE"
    performance_security_amount: float = 0.00
    performance_security_expiry: Optional[date] = None

    tds_section: Optional[str] = "SECTION_52"
    tds_rate: float = 5.00
    vds_rate: float = 7.50

    delegated_approval_limit: float = 50000000.00
    budget_headroom_alert_percent: float = 95.00
    budget_alert_triggered: bool = False

    approval_status: str = "APPROVED"
    approval_level: Optional[str] = "PROJECT_DIRECTOR"
    approved_by_user_id: Optional[int] = None
    approval_date: Optional[date] = None
    signed_contract_doc_url: Optional[str] = None
    document_attachments: Optional[str] = None
    version_number: int = 1
    amendment_notes: Optional[str] = None
    status: str = "ACTIVE"


class WorkOrderCreate(BaseModel):
    contract_reference: Optional[str] = None
    project_id: int
    contractor_id: int
    tower_id: Optional[int] = None
    tower_name: Optional[str] = None
    wbs_node_id: Optional[int] = None
    wbs_package_name: Optional[str] = None

    contract_title: Optional[str] = None
    contract_type: str = "CIVIL_SUPERSTRUCTURE"
    contract_model: str = "ITEM_RATE"
    tender_reference: Optional[str] = None
    technical_specifications: Optional[str] = None
    scope_of_work: Optional[str] = None

    total_contract_value: float
    original_contract_value: Optional[float] = None
    approved_variations_value: Optional[float] = 0.00
    revised_contract_value: Optional[float] = None
    committed_cost: Optional[float] = None

    start_date: Optional[date] = None
    target_completion_date: Optional[date] = None
    advance_payment_amount: Optional[float] = 0.00
    advance_payment_percent: Optional[float] = 0.00
    advance_recovery_rule: Optional[str] = "RECOVER_ACROSS_RUNNING_BILLS"

    retention_money_percent: Optional[float] = 5.00
    retention_release_conditions: Optional[str] = None
    defect_liability_months: Optional[int] = 12

    performance_security_type: Optional[str] = "BANK_GUARANTEE"
    performance_security_amount: Optional[float] = 0.00
    performance_security_expiry: Optional[date] = None

    tds_section: Optional[str] = "SECTION_52"
    tds_rate: Optional[float] = 5.00
    vds_rate: Optional[float] = 7.50

    delegated_approval_limit: Optional[float] = 50000000.00
    budget_headroom_alert_percent: Optional[float] = 95.00
    approval_level: Optional[str] = "PROJECT_DIRECTOR"
    signed_contract_doc_url: Optional[str] = None
    document_attachments: Optional[str] = None
    status: Optional[str] = "ACTIVE"

    items: Optional[List[WorkOrderItemCreate]] = []
    milestones: Optional[List[WorkOrderMilestoneCreate]] = []


class WorkOrderUpdate(BaseModel):
    contract_reference: Optional[str] = None
    contract_title: Optional[str] = None
    contract_type: Optional[str] = None
    contract_model: Optional[str] = None
    tender_reference: Optional[str] = None
    technical_specifications: Optional[str] = None
    scope_of_work: Optional[str] = None

    total_contract_value: Optional[float] = None
    approved_variations_value: Optional[float] = None
    revised_contract_value: Optional[float] = None
    committed_cost: Optional[float] = None

    start_date: Optional[date] = None
    target_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None
    delay_days: Optional[int] = None

    advance_payment_amount: Optional[float] = None
    advance_payment_percent: Optional[float] = None
    advance_recovery_rule: Optional[str] = None
    advance_recovered_amount: Optional[float] = None

    retention_money_percent: Optional[float] = None
    retention_money_held: Optional[float] = None
    retention_release_conditions: Optional[str] = None
    defect_liability_months: Optional[int] = None

    performance_security_type: Optional[str] = None
    performance_security_amount: Optional[float] = None
    performance_security_expiry: Optional[date] = None

    tds_section: Optional[str] = None
    tds_rate: Optional[float] = None
    vds_rate: Optional[float] = None

    delegated_approval_limit: Optional[float] = None
    budget_headroom_alert_percent: Optional[float] = None
    budget_alert_triggered: Optional[bool] = None

    approval_status: Optional[str] = None
    approval_level: Optional[str] = None
    signed_contract_doc_url: Optional[str] = None
    document_attachments: Optional[str] = None
    version_number: Optional[int] = None
    amendment_notes: Optional[str] = None
    status: Optional[str] = None


class WorkOrderResponse(WorkOrderBase):
    id: int
    project_name: Optional[str] = None
    contractor_name: Optional[str] = None
    contractor_code: Optional[str] = None
    items_count: int = 0
    milestones_count: int = 0
    ra_bills_count: int = 0
    items: List[WorkOrderItemResponse] = []
    milestones: List[WorkOrderMilestoneResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class WorkOrderListResponse(BaseModel):
    items: List[WorkOrderResponse]
    total: int
    limit: int
    offset: int


class WorkOrderMetricsResponse(BaseModel):
    total_work_orders: int
    active_contracts: int
    total_committed_value: float
    total_certified_work: float
    total_paid_amount: float
    total_retention_held: float
    budget_alerts_count: int


# -------------------------------------------------------------
# RA Bill Schemas (Statutory Deductions & Approval Chain)
# -------------------------------------------------------------
class RABillBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    work_order_id: int
    ra_bill_number: str
    bill_date: date
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None
    gross_work_certified_amount: float
    retention_percent: float = 5.00
    retention_money_deducted: float = 0.00
    advance_recovery_deducted: float = 0.00
    material_store_recovery_amount: float = 0.00
    tds_rate: float = 5.00
    tds_withheld_amount: float = 0.00
    vds_rate: float = 5.00
    vds_withheld_amount: float = 0.00
    net_payable_amount: float
    approval_signature_chain: Optional[List[dict]] = []
    status: str = "DRAFT"
    accounts_journal_voucher_ref: Optional[str] = None
    remarks: Optional[str] = None

class RABillCreate(BaseModel):
    work_order_id: int
    ra_bill_number: str
    bill_date: Optional[date] = None
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None
    gross_work_certified_amount: float
    retention_percent: Optional[float] = 5.00
    advance_recovery_deducted: Optional[float] = 0.00
    material_store_recovery_amount: Optional[float] = 0.00 # Store materials: diesel, steel, cement
    tds_rate: Optional[float] = 5.00 # Sec 52
    vds_rate: Optional[float] = 5.00 # VDS
    remarks: Optional[str] = None

class RABillApprovalRequest(BaseModel):
    role: str # 'SITE_ENGINEER', 'QUANTITY_SURVEYOR', 'PROJECT_DIRECTOR', 'ACCOUNTS'
    signatory_name: str
    action: str # 'VERIFY', 'APPROVE', 'REJECT'
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
    defect_title: Optional[str] = None
    description: Optional[str] = None
    location_details: Optional[str] = None
    photo_url: Optional[str] = None
    assigned_contractor_id: Optional[int] = None
    inspection_id: Optional[int] = None
    affects_safety_or_structural: bool = False
    escalation_level: str = "PROJECT_LEVEL"
    rectification_deadline: date
    status: str = "Open"
    corrective_action: Optional[str] = None
    preventive_action: Optional[str] = None
    capa_submitted_at: Optional[datetime] = None
    rectification_notes: Optional[str] = None
    rectification_photo_url: Optional[str] = None
    reinspected_by_user_id: Optional[int] = None
    reinspection_date: Optional[date] = None
    reinspection_verdict: Optional[str] = None
    closure_approval_remarks: Optional[str] = None
    closure_approved_by_user_id: Optional[int] = None
    closed_date: Optional[date] = None

class SafetyNCRCreate(BaseModel):
    project_id: int
    category: str # Structural Defect, Honeycombing, Cover Missing, Safety Violation
    severity: Optional[str] = "Medium"
    defect_title: Optional[str] = None
    description: Optional[str] = None
    location_details: Optional[str] = None
    photo_url: Optional[str] = None
    assigned_contractor_id: Optional[int] = None
    inspection_id: Optional[int] = None
    affects_safety_or_structural: Optional[bool] = False
    rectification_deadline: date

class SafetyNCRRectify(BaseModel):
    rectification_notes: str
    rectification_photo_url: Optional[str] = None
    corrective_action: Optional[str] = None
    preventive_action: Optional[str] = None

class SafetyNCRVerifyClose(BaseModel):
    verdict: str # 'VERIFIED_CLOSED', 'REOPEN'
    verification_notes: Optional[str] = None
    closure_remarks: Optional[str] = None

class SafetyNCRIssueEscalation(BaseModel):
    escalation_level: str = "ESCALATED_TO_DIRECTOR"
    escalation_notes: str

class SafetyNCRResponse(SafetyNCRBase):
    id: int
    project_name: Optional[str] = None
    contractor_name: Optional[str] = None
    reinspector_name: Optional[str] = None
    closure_approver_name: Optional[str] = None
    is_overdue: bool = False
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Site Material Requisition & Consumption Schemas
# -------------------------------------------------------------
class SiteMaterialRequisitionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    tower_id: Optional[int] = None
    tower_name: Optional[str] = None
    floor_number: Optional[str] = None
    work_package: str = "CIVIL_STRUCTURE"
    wbs_node_id: Optional[int] = None
    material_id: int
    boq_item_id: Optional[int] = None

    material_code: str
    material_name: str
    specification: Optional[str] = None
    grade: Optional[str] = None
    unit_of_measure: str = "BAG"

    requested_quantity: float
    approved_quantity: float = 0.0
    issued_quantity: float = 0.0
    returned_quantity: float = 0.0
    consumed_quantity: float = 0.0
    wastage_quantity: float = 0.0
    damage_quantity: float = 0.0
    allowed_wastage_percentage: float = 2.50
    actual_wastage_percentage: float = 0.0

    stock_balance_at_request: float = 0.0
    boq_allocated_quantity: float = 0.0
    boq_previous_consumed: float = 0.0
    boq_remaining_headroom: float = 0.0

    store_id: Optional[int] = None
    supplier_name: Optional[str] = None
    batch_lot_number: Optional[str] = None
    storage_location: Optional[str] = None

    requested_by_user_id: int
    requisition_date: date
    required_by_date: Optional[date] = None
    priority: str = "NORMAL"

    approved_by_user_id: Optional[int] = None
    approval_date: Optional[date] = None
    rejection_reason: Optional[str] = None
    purpose_remarks: Optional[str] = None

    purchase_requisition_id: Optional[int] = None
    min_number: Optional[str] = None
    received_date: Optional[date] = None
    received_by_user_id: Optional[int] = None
    status: str = "PENDING_APPROVAL"


class SiteMaterialRequisitionCreate(BaseModel):
    project_id: int
    tower_id: Optional[int] = None
    tower_name: Optional[str] = None
    floor_number: Optional[str] = None
    work_package: Optional[str] = "CIVIL_STRUCTURE"
    wbs_node_id: Optional[int] = None
    material_id: int
    boq_item_id: Optional[int] = None

    material_code: Optional[str] = None
    material_name: Optional[str] = None
    specification: Optional[str] = None
    grade: Optional[str] = None
    unit_of_measure: Optional[str] = "BAG"

    requested_quantity: float
    allowed_wastage_percentage: Optional[float] = 2.50
    store_id: Optional[int] = None
    supplier_name: Optional[str] = None
    batch_lot_number: Optional[str] = None
    storage_location: Optional[str] = None

    required_by_date: Optional[date] = None
    priority: Optional[str] = "NORMAL"
    purpose_remarks: Optional[str] = None


class SiteMaterialRequisitionUpdate(BaseModel):
    tower_id: Optional[int] = None
    tower_name: Optional[str] = None
    floor_number: Optional[str] = None
    work_package: Optional[str] = None
    wbs_node_id: Optional[int] = None
    boq_item_id: Optional[int] = None
    material_id: Optional[int] = None
    specification: Optional[str] = None
    grade: Optional[str] = None
    unit_of_measure: Optional[str] = None
    requested_quantity: Optional[float] = None
    allowed_wastage_percentage: Optional[float] = None
    store_id: Optional[int] = None
    supplier_name: Optional[str] = None
    batch_lot_number: Optional[str] = None
    storage_location: Optional[str] = None
    required_by_date: Optional[date] = None
    priority: Optional[str] = None
    purpose_remarks: Optional[str] = None


class SiteMaterialRequisitionApprove(BaseModel):
    action: str # 'APPROVE' or 'REJECT'
    approved_quantity: Optional[float] = None
    rejection_reason: Optional[str] = None
    create_purchase_requisition_for_shortage: bool = False


class SiteMaterialRequisitionIssue(BaseModel):
    issued_quantity: float
    store_id: Optional[int] = None
    batch_lot_number: Optional[str] = None
    unit_cost: Optional[float] = None
    contractor_id: Optional[int] = None
    notes: Optional[str] = None


class SiteMaterialRequisitionReceive(BaseModel):
    received_quantity: float
    received_date: Optional[date] = None
    remarks: Optional[str] = None


class SiteMaterialRequisitionResponse(SiteMaterialRequisitionBase):
    id: int
    requisition_number: str
    project_name: Optional[str] = None
    wbs_node_code: Optional[str] = None
    wbs_node_name: Optional[str] = None
    store_name: Optional[str] = None
    requested_by_name: Optional[str] = None
    approved_by_name: Optional[str] = None
    received_by_name: Optional[str] = None
    stock_shortage: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SiteMaterialRequisitionListResponse(BaseModel):
    items: List[SiteMaterialRequisitionResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Material Consumption Schemas
# -------------------------------------------------------------
class MaterialConsumptionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    requisition_id: int
    min_id: Optional[int] = None
    project_id: int
    wbs_node_id: Optional[int] = None
    material_id: int

    consumption_date: date
    quantity_consumed: float
    quantity_returned: float = 0.0
    quantity_wasted: float = 0.0
    quantity_damaged: float = 0.0
    unit_of_measure: str = "BAG"
    unit_cost: float = 0.0
    total_consumption_cost: float = 0.0
    variance_cost: float = 0.0

    batch_lot_number: Optional[str] = None
    work_location: Optional[str] = None
    subcontractor_id: Optional[int] = None
    recorded_by_user_id: Optional[int] = None
    verification_status: str = "VERIFIED"
    remarks: Optional[str] = None


class MaterialConsumptionCreate(BaseModel):
    requisition_id: int
    consumption_date: Optional[date] = None
    quantity_consumed: float
    quantity_wasted: Optional[float] = 0.0
    quantity_damaged: Optional[float] = 0.0
    quantity_returned: Optional[float] = 0.0
    batch_lot_number: Optional[str] = None
    work_location: Optional[str] = None
    subcontractor_id: Optional[int] = None
    remarks: Optional[str] = None


class MaterialConsumptionResponse(MaterialConsumptionBase):
    id: int
    project_name: Optional[str] = None
    material_name: Optional[str] = None
    material_code: Optional[str] = None
    wbs_node_code: Optional[str] = None
    wbs_node_name: Optional[str] = None
    contractor_name: Optional[str] = None
    recorded_by_name: Optional[str] = None
    created_at: Optional[datetime] = None


class MaterialConsumptionListResponse(BaseModel):
    items: List[MaterialConsumptionResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Material Return-to-Store (RTS) Schemas
# -------------------------------------------------------------
class MaterialReturnBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    requisition_id: int
    store_id: int
    project_id: int
    material_id: int
    return_date: date
    returned_quantity: float
    unit_of_measure: str = "BAG"
    condition_status: str = "GOOD"
    return_reason: Optional[str] = None
    returned_by_user_id: int
    accepted_by_storekeeper_id: Optional[int] = None
    status: str = "RECEIVED_IN_STORE"


class MaterialReturnCreate(BaseModel):
    requisition_id: int
    store_id: int
    returned_quantity: float
    return_date: Optional[date] = None
    condition_status: Optional[str] = "GOOD"
    return_reason: Optional[str] = None


class MaterialReturnResponse(MaterialReturnBase):
    id: int
    rts_number: str
    project_name: Optional[str] = None
    material_name: Optional[str] = None
    store_name: Optional[str] = None
    returned_by_name: Optional[str] = None
    accepted_by_name: Optional[str] = None
    created_at: Optional[datetime] = None


class MaterialReturnListResponse(BaseModel):
    items: List[MaterialReturnResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Executive Material Requisition & Consumption Metrics
# -------------------------------------------------------------
class MaterialRequisitionMetricsResponse(BaseModel):
    total_requisitions: int = 0
    pending_approvals: int = 0
    approved_in_progress: int = 0
    total_issued_count: int = 0
    total_consumed_records: int = 0
    total_return_records: int = 0
    total_consumption_value: float = 0.0
    total_wasted_value: float = 0.0
    total_returned_value: float = 0.0


# -------------------------------------------------------------
# Work Orders & Contract Management Schemas
# -------------------------------------------------------------
class WorkOrderItemBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    boq_item_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    item_code: str
    item_description: str
    specification: Optional[str] = None
    unit_of_measure: str = "SFT"
    boq_quantity: float = 0.0
    contract_quantity: float = 0.0
    approved_unit_rate: float = 0.0
    total_amount: float = 0.0
    executed_quantity: float = 0.0
    remaining_quantity: float = 0.0
    remarks: Optional[str] = None


class WorkOrderItemCreate(WorkOrderItemBase):
    pass


class WorkOrderItemResponse(WorkOrderItemBase):
    id: int
    work_order_id: int
    created_at: Optional[datetime] = None


class WorkOrderMilestoneBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    milestone_code: str
    milestone_title: str
    target_date: date
    actual_date: Optional[date] = None
    weightage_percent: float = 10.0
    milestone_amount: float = 0.0
    is_critical: bool = False
    status: str = "PENDING"
    verification_notes: Optional[str] = None


class WorkOrderMilestoneCreate(WorkOrderMilestoneBase):
    pass


class WorkOrderMilestoneResponse(WorkOrderMilestoneBase):
    id: int
    work_order_id: int
    created_at: Optional[datetime] = None


class WorkOrderBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    work_order_no: str
    contract_reference: Optional[str] = None
    project_id: int
    contractor_id: int
    tower_id: Optional[int] = None
    tower_name: Optional[str] = None
    wbs_node_id: Optional[int] = None
    wbs_package_name: Optional[str] = None

    contract_title: Optional[str] = None
    contract_type: str = "CIVIL_SUPERSTRUCTURE"
    contract_model: str = "ITEM_RATE"
    tender_reference: Optional[str] = None
    technical_specifications: Optional[str] = None
    scope_of_work: Optional[str] = None

    total_contract_value: float = 0.0
    original_contract_value: float = 0.0
    approved_variations_value: float = 0.0
    revised_contract_value: float = 0.0
    committed_cost: float = 0.0
    certified_work_value: float = 0.0
    paid_amount: float = 0.0

    start_date: Optional[date] = None
    target_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None
    delay_days: int = 0

    advance_payment_amount: float = 0.0
    advance_payment_percent: float = 0.0
    advance_recovery_rule: Optional[str] = "RECOVER_ACROSS_RUNNING_BILLS"
    advance_recovered_amount: float = 0.0

    retention_money_percent: float = 5.0
    retention_money_held: float = 0.0
    retention_release_conditions: Optional[str] = None
    defect_liability_months: int = 12

    performance_security_type: Optional[str] = "BANK_GUARANTEE"
    performance_security_amount: float = 0.0
    performance_security_expiry: Optional[date] = None

    tds_section: Optional[str] = "SECTION_52"
    tds_rate: float = 5.0
    vds_rate: float = 7.5

    delegated_approval_limit: float = 50000000.0
    budget_headroom_alert_percent: float = 95.0
    budget_alert_triggered: bool = False

    approval_status: str = "APPROVED"
    approval_level: Optional[str] = "PROJECT_DIRECTOR"
    approved_by_user_id: Optional[int] = None
    approval_date: Optional[date] = None
    signed_contract_doc_url: Optional[str] = None
    document_attachments: Optional[str] = None
    version_number: int = 1
    amendment_notes: Optional[str] = None
    status: str = "ACTIVE"


class WorkOrderCreate(WorkOrderBase):
    items: Optional[List[WorkOrderItemCreate]] = []
    milestones: Optional[List[WorkOrderMilestoneCreate]] = []


class WorkOrderUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    contract_reference: Optional[str] = None
    project_id: Optional[int] = None
    contractor_id: Optional[int] = None
    tower_id: Optional[int] = None
    tower_name: Optional[str] = None
    wbs_node_id: Optional[int] = None
    wbs_package_name: Optional[str] = None

    contract_title: Optional[str] = None
    contract_type: Optional[str] = None
    contract_model: Optional[str] = None
    tender_reference: Optional[str] = None
    technical_specifications: Optional[str] = None
    scope_of_work: Optional[str] = None

    total_contract_value: Optional[float] = None
    original_contract_value: Optional[float] = None
    approved_variations_value: Optional[float] = None
    revised_contract_value: Optional[float] = None
    committed_cost: Optional[float] = None
    certified_work_value: Optional[float] = None
    paid_amount: Optional[float] = None

    start_date: Optional[date] = None
    target_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None
    delay_days: Optional[int] = None

    advance_payment_amount: Optional[float] = None
    advance_payment_percent: Optional[float] = None
    advance_recovery_rule: Optional[str] = None
    advance_recovered_amount: Optional[float] = None

    retention_money_percent: Optional[float] = None
    retention_money_held: Optional[float] = None
    retention_release_conditions: Optional[str] = None
    defect_liability_months: Optional[int] = None

    performance_security_type: Optional[str] = None
    performance_security_amount: Optional[float] = None
    performance_security_expiry: Optional[date] = None

    tds_section: Optional[str] = None
    tds_rate: Optional[float] = None
    vds_rate: Optional[float] = None

    delegated_approval_limit: Optional[float] = None
    budget_headroom_alert_percent: Optional[float] = None
    budget_alert_triggered: Optional[bool] = None

    approval_status: Optional[str] = None
    approval_level: Optional[str] = None
    approved_by_user_id: Optional[int] = None
    approval_date: Optional[date] = None
    signed_contract_doc_url: Optional[str] = None
    document_attachments: Optional[str] = None
    version_number: Optional[int] = None
    amendment_notes: Optional[str] = None
    status: Optional[str] = None

    items: Optional[List[WorkOrderItemCreate]] = None
    milestones: Optional[List[WorkOrderMilestoneCreate]] = None


class WorkOrderResponse(WorkOrderBase):
    id: int
    project_name: Optional[str] = None
    contractor_name: Optional[str] = None
    contractor_trade: Optional[str] = None
    contractor_phone: Optional[str] = None
    approved_by_name: Optional[str] = None
    items: List[WorkOrderItemResponse] = []
    milestones: List[WorkOrderMilestoneResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class WorkOrderListResponse(BaseModel):
    items: List[WorkOrderResponse]
    total: int
    limit: int
    offset: int


class WorkOrderMetricsResponse(BaseModel):
    total_work_orders: int = 0
    active_contracts: int = 0
    total_original_value: float = 0.0
    total_revised_value: float = 0.0
    total_committed_cost: float = 0.0
    total_certified_value: float = 0.0
    total_paid_value: float = 0.0
    total_advance_disbursed: float = 0.0
    total_retention_held: float = 0.0
    total_delayed_contracts: int = 0
    budget_alert_count: int = 0


# -------------------------------------------------------------
# Contractor RA Bills & Payment Certification Schemas
# -------------------------------------------------------------
class RABillItemBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    work_order_item_id: Optional[int] = None
    boq_item_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    item_code: str
    item_description: str
    unit_of_measure: str = "SFT"
    contract_rate: float = 0.0
    contract_quantity: float = 0.0
    previous_quantity: float = 0.0
    current_measured_quantity: float = 0.0
    cumulative_quantity: float = 0.0
    previous_amount: float = 0.0
    current_amount: float = 0.0
    cumulative_amount: float = 0.0
    location_floor: Optional[str] = None
    measurement_sheet_ref: Optional[str] = None
    remarks: Optional[str] = None


class RABillItemCreate(RABillItemBase):
    pass


class RABillItemResponse(RABillItemBase):
    id: int
    ra_bill_id: int
    created_at: Optional[datetime] = None


class RABillBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    work_order_id: int
    project_id: Optional[int] = None
    contractor_id: Optional[int] = None

    ra_bill_number: str
    bill_date: date
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None

    previous_certified_amount: float = 0.0
    current_gross_bill_value: float = 0.0
    gross_work_certified_amount: float = 0.0
    cumulative_certified_amount: float = 0.0

    advance_recovery_deducted: float = 0.0
    retention_percent: float = 5.0
    retention_money_deducted: float = 0.0
    material_store_recovery_amount: float = 0.0
    penalty_deduction_amount: float = 0.0
    other_deductions_amount: float = 0.0
    other_deductions_description: Optional[str] = None

    tax_treatment_type: str = "STANDARD_TDS_52"
    tds_rate: float = 5.0
    tds_withheld_amount: float = 0.0
    vat_treatment_type: str = "STANDARD_VDS_7_5"
    vds_rate: float = 7.5
    vds_withheld_amount: float = 0.0

    net_payable_amount: float = 0.0
    previous_payments_amount: float = 0.0
    net_payable_balance: float = 0.0

    workflow_stage: str = "CONTRACTOR_SUBMISSION"
    current_stage_assignee_role: Optional[str] = "SITE_ENGINEER"
    revision_number: int = 1
    rejection_reason: Optional[str] = None
    review_comments: Optional[str] = None

    measurement_sheet_urls: Optional[str] = None
    site_photo_urls: Optional[str] = None

    is_on_hold: bool = False
    hold_reason: Optional[str] = None
    hold_by_user_id: Optional[int] = None
    dispute_id: Optional[int] = None

    retention_release_status: str = "HELD"
    retention_release_eligible_date: Optional[date] = None
    retention_release_amount: float = 0.0

    status: str = "DRAFT"
    payment_status: str = "UNPAID"
    paid_amount: float = 0.0
    payment_date: Optional[date] = None
    payment_method: Optional[str] = "BANK_TRANSFER"
    bank_payment_ref: Optional[str] = None
    cheque_reference: Optional[str] = None
    accounts_journal_voucher_ref: Optional[str] = None
    remarks: Optional[str] = None
    approval_signature_chain: Optional[Any] = None


class RABillCreate(RABillBase):
    items: Optional[List[RABillItemCreate]] = []


class RABillUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bill_date: Optional[date] = None
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None

    previous_certified_amount: Optional[float] = None
    current_gross_bill_value: Optional[float] = None
    gross_work_certified_amount: Optional[float] = None
    cumulative_certified_amount: Optional[float] = None

    advance_recovery_deducted: Optional[float] = None
    retention_percent: Optional[float] = None
    retention_money_deducted: Optional[float] = None
    material_store_recovery_amount: Optional[float] = None
    penalty_deduction_amount: Optional[float] = None
    other_deductions_amount: Optional[float] = None
    other_deductions_description: Optional[str] = None

    tax_treatment_type: Optional[str] = None
    tds_rate: Optional[float] = None
    tds_withheld_amount: Optional[float] = None
    vat_treatment_type: Optional[str] = None
    vds_rate: Optional[float] = None
    vds_withheld_amount: Optional[float] = None

    net_payable_amount: Optional[float] = None
    previous_payments_amount: Optional[float] = None
    net_payable_balance: Optional[float] = None

    workflow_stage: Optional[str] = None
    current_stage_assignee_role: Optional[str] = None
    revision_number: Optional[int] = None
    rejection_reason: Optional[str] = None
    review_comments: Optional[str] = None

    measurement_sheet_urls: Optional[str] = None
    site_photo_urls: Optional[str] = None

    is_on_hold: Optional[bool] = None
    hold_reason: Optional[str] = None
    hold_by_user_id: Optional[int] = None
    dispute_id: Optional[int] = None

    retention_release_status: Optional[str] = None
    retention_release_eligible_date: Optional[date] = None
    retention_release_amount: Optional[float] = None

    status: Optional[str] = None
    payment_status: Optional[str] = None
    paid_amount: Optional[float] = None
    payment_date: Optional[date] = None
    payment_method: Optional[str] = None
    bank_payment_ref: Optional[str] = None
    cheque_reference: Optional[str] = None
    accounts_journal_voucher_ref: Optional[str] = None
    remarks: Optional[str] = None
    approval_signature_chain: Optional[Any] = None

    items: Optional[List[RABillItemCreate]] = None


class RABillWorkflowAction(BaseModel):
    action: str # VERIFY_ON_SITE, REVIEW_QS, APPROVE_PM, REVIEW_ACCOUNTS, AUTHORIZE_PAYMENT, REVISE, REJECT, PUT_ON_HOLD, RELEASE_HOLD
    actor_name: str
    actor_role: str
    comments: Optional[str] = None
    payment_date: Optional[date] = None
    payment_method: Optional[str] = "BANK_TRANSFER"
    bank_payment_ref: Optional[str] = None
    cheque_reference: Optional[str] = None
    paid_amount: Optional[float] = None


class RABillApprovalRequest(BaseModel):
    action: str = "APPROVE"
    role: Optional[str] = "SITE_ENGINEER"
    signatory_name: str = "Engineer"
    approval_notes: Optional[str] = None


class RABillResponse(RABillBase):
    id: int
    project_name: Optional[str] = None
    contractor_name: Optional[str] = None
    work_order_no: Optional[str] = None
    contract_title: Optional[str] = None
    items: List[RABillItemResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RABillListResponse(BaseModel):
    items: List[RABillResponse]
    total: int
    limit: int
    offset: int


class RABillMetricsResponse(BaseModel):
    total_bills: int = 0
    total_gross_certified: float = 0.0
    total_net_payable: float = 0.0
    total_advance_recovered: float = 0.0
    total_retention_deducted: float = 0.0
    total_tds_withheld: float = 0.0
    total_vds_withheld: float = 0.0
    total_paid_amount: float = 0.0
    total_pending_approval: int = 0
    total_on_hold: int = 0


# -------------------------------------------------------------
# Workforce Management & Worker Registry Schemas
# -------------------------------------------------------------
class LaborWorkerBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    worker_code: str
    worker_name: str
    worker_type: str = "SUBCONTRACTOR_LABOR" # SUBCONTRACTOR_LABOR, DIRECT_HIRE_PAYROLL
    contractor_id: Optional[int] = None
    trade_category: str = "CIVIL_MASONRY"
    skill_level: str = "SKILLED"
    phone_number: Optional[str] = None
    nid_number: Optional[str] = None
    daily_wage_rate: float = 800.00
    hourly_overtime_rate: float = 120.00
    emergency_contact: Optional[str] = None
    assigned_project_id: Optional[int] = None
    assigned_wbs_node_id: Optional[int] = None
    is_active: bool = True
    biometric_id: Optional[str] = None
    photo_url: Optional[str] = None

class LaborWorkerCreate(BaseModel):
    worker_name: str
    worker_type: Optional[str] = "SUBCONTRACTOR_LABOR"
    contractor_id: Optional[int] = None
    trade_category: str = "CIVIL_MASONRY"
    skill_level: Optional[str] = "SKILLED"
    phone_number: Optional[str] = None
    nid_number: Optional[str] = None
    daily_wage_rate: Optional[float] = 800.00
    hourly_overtime_rate: Optional[float] = 120.00
    emergency_contact: Optional[str] = None
    assigned_project_id: Optional[int] = None
    assigned_wbs_node_id: Optional[int] = None
    photo_url: Optional[str] = None

class LaborWorkerUpdate(BaseModel):
    worker_name: Optional[str] = None
    worker_type: Optional[str] = None
    contractor_id: Optional[int] = None
    trade_category: Optional[str] = None
    skill_level: Optional[str] = None
    phone_number: Optional[str] = None
    nid_number: Optional[str] = None
    daily_wage_rate: Optional[float] = None
    hourly_overtime_rate: Optional[float] = None
    emergency_contact: Optional[str] = None
    assigned_project_id: Optional[int] = None
    assigned_wbs_node_id: Optional[int] = None
    is_active: Optional[bool] = None
    photo_url: Optional[str] = None

class LaborWorkerResponse(LaborWorkerBase):
    id: int
    contractor_name: Optional[str] = None
    project_name: Optional[str] = None
    wbs_node_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class LaborWorkerListResponse(BaseModel):
    items: List[LaborWorkerResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Daily Labor Attendance & Shift Logging Schemas
# -------------------------------------------------------------
class LaborAttendanceBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    attendance_date: date
    project_id: int
    tower_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    worker_id: Optional[int] = None
    contractor_id: Optional[int] = None
    worker_type: str = "SUBCONTRACTOR_LABOR"
    trade_category: str = "CIVIL_MASONRY"
    crew_gang_name: Optional[str] = None
    shift_type: str = "DAY_SHIFT"
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    hours_worked: float = 8.00
    overtime_hours: float = 0.00
    attendance_status: str = "PRESENT"
    daily_wage: float = 800.00
    overtime_pay: float = 0.00
    total_earned: float = 800.00
    capture_method: str = "SUPERVISOR_ENTRY"
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    gps_verified: bool = False
    photo_verified: bool = False
    photo_url: Optional[str] = None
    biometric_verified: bool = False
    supervisor_approval_status: str = "APPROVED_BY_SUPERVISOR"
    approved_by_user_id: Optional[int] = None
    supervisor_remarks: Optional[str] = None
    subcontractor_payment_id: Optional[int] = None
    is_billed_paid: bool = False

class LaborAttendanceCreate(BaseModel):
    attendance_date: date
    project_id: int
    tower_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    worker_id: Optional[int] = None
    contractor_id: Optional[int] = None
    worker_type: Optional[str] = "SUBCONTRACTOR_LABOR"
    trade_category: Optional[str] = "CIVIL_MASONRY"
    crew_gang_name: Optional[str] = None
    shift_type: Optional[str] = "DAY_SHIFT"
    hours_worked: Optional[float] = 8.00
    overtime_hours: Optional[float] = 0.00
    attendance_status: Optional[str] = "PRESENT"
    daily_wage: Optional[float] = 800.00
    capture_method: Optional[str] = "SUPERVISOR_ENTRY"
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    photo_url: Optional[str] = None
    biometric_verified: Optional[bool] = False
    supervisor_remarks: Optional[str] = None

class GangAttendanceBatchCreate(BaseModel):
    attendance_date: date
    project_id: int
    tower_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    contractor_id: Optional[int] = None
    worker_type: Optional[str] = "SUBCONTRACTOR_LABOR"
    crew_gang_name: str
    shift_type: Optional[str] = "DAY_SHIFT"
    trade_breakdown: List[Dict[str, Any]] # [{"trade_category": "CIVIL_MASONRY", "headcount": 8, "daily_wage": 850.00, "overtime_hours": 1.5}]
    supervisor_remarks: Optional[str] = None

class LaborAttendanceUpdate(BaseModel):
    hours_worked: Optional[float] = None
    overtime_hours: Optional[float] = None
    attendance_status: Optional[str] = None
    daily_wage: Optional[float] = None
    supervisor_approval_status: Optional[str] = None
    supervisor_remarks: Optional[str] = None

class AttendanceSupervisorApproval(BaseModel):
    action: str # "APPROVE", "REJECT"
    supervisor_name: str
    remarks: Optional[str] = None

class LaborAttendanceResponse(LaborAttendanceBase):
    id: int
    worker_name: Optional[str] = None
    worker_code: Optional[str] = None
    contractor_name: Optional[str] = None
    project_name: Optional[str] = None
    tower_name: Optional[str] = None
    wbs_node_name: Optional[str] = None
    supervisor_name: Optional[str] = None
    created_at: Optional[datetime] = None

class LaborAttendanceListResponse(BaseModel):
    items: List[LaborAttendanceResponse]
    total: int
    limit: int
    offset: int

class LaborAttendanceMetricsResponse(BaseModel):
    total_workers_on_site_today: int = 0
    total_present_count: int = 0
    total_absent_count: int = 0
    total_overtime_hours_today: float = 0.0
    total_daily_wage_bill_today: float = 0.0
    subcontractor_headcount: int = 0
    direct_hire_headcount: int = 0
    pending_approvals_count: int = 0


# -------------------------------------------------------------
# Subcontractor Payments & Certified Payment Vouchers
# -------------------------------------------------------------
class SubcontractorPaymentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    voucher_number: str
    project_id: int
    contractor_id: Optional[int] = None
    payment_category: str = "CONTRACTOR_INVOICE" # CONTRACTOR_INVOICE, DIRECT_PAYROLL
    payment_type: str = "ATTENDANCE_AND_MEASURED_WORK"
    billing_period_start: date
    billing_period_end: date
    total_mandays_verified: float = 0.00
    measured_work_certified_amount: float = 0.00
    attendance_wage_amount: float = 0.00
    gross_payable_amount: float = 0.00
    advance_recovery_amount: float = 0.00
    retention_deduction_amount: float = 0.00
    tds_tax_amount: float = 0.00
    vds_vat_amount: float = 0.00
    other_penalties_amount: float = 0.00
    net_certified_payable: float = 0.00
    paid_amount: float = 0.00
    status: str = "DRAFT"
    payment_method: Optional[str] = "BANK_TRANSFER"
    bank_reference: Optional[str] = None
    payment_date: Optional[date] = None
    certified_by_user_id: Optional[int] = None
    remarks: Optional[str] = None

class SubcontractorPaymentCreate(BaseModel):
    project_id: int
    contractor_id: Optional[int] = None
    payment_category: Optional[str] = "CONTRACTOR_INVOICE"
    payment_type: Optional[str] = "ATTENDANCE_AND_MEASURED_WORK"
    billing_period_start: date
    billing_period_end: date
    measured_work_certified_amount: Optional[float] = 0.00
    advance_recovery_amount: Optional[float] = 0.00
    retention_deduction_amount: Optional[float] = 0.00
    other_penalties_amount: Optional[float] = 0.00
    payment_method: Optional[str] = "BANK_TRANSFER"
    remarks: Optional[str] = None

class SubcontractorPaymentUpdate(BaseModel):
    measured_work_certified_amount: Optional[float] = None
    advance_recovery_amount: Optional[float] = None
    retention_deduction_amount: Optional[float] = None
    other_penalties_amount: Optional[float] = None
    status: Optional[str] = None
    payment_method: Optional[str] = None
    bank_reference: Optional[str] = None
    payment_date: Optional[date] = None
    remarks: Optional[str] = None

class PaymentCertificationAction(BaseModel):
    action: str # "VERIFY_QS", "APPROVE_PM", "POST_ACCOUNTS", "MARK_PAID", "REJECT"
    actor_name: str
    actor_role: str
    payment_date: Optional[date] = None
    bank_reference: Optional[str] = None
    remarks: Optional[str] = None

class SubcontractorPaymentResponse(SubcontractorPaymentBase):
    id: int
    project_name: Optional[str] = None
    contractor_name: Optional[str] = None
    certified_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class SubcontractorPaymentListResponse(BaseModel):
    items: List[SubcontractorPaymentResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# Quality Inspection, ITP & Defect Workflow Schemas
# -------------------------------------------------------------
class QualityInspectionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    inspection_number: str
    project_id: int
    tower_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    contractor_id: Optional[int] = None
    stage_category: str = "CONCRETE_CASTING"
    structural_location: str
    itp_reference_code: Optional[str] = None
    inspection_request_date: date
    scheduled_inspection_date: date
    checklist_items: Optional[List[Dict[str, Any]]] = []
    mandatory_checks_passed: bool = False
    evidence_photos: Optional[List[Dict[str, Any]]] = []
    material_test_cert_url: Optional[str] = None
    lab_test_report_id: Optional[int] = None
    verdict: str = "PENDING_INSPECTION"
    consultant_engineer_name: Optional[str] = None
    inspector_user_id: Optional[int] = None
    remarks: Optional[str] = None
    passed_date: Optional[datetime] = None

class QualityInspectionCreate(BaseModel):
    project_id: int
    tower_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    contractor_id: Optional[int] = None
    stage_category: str
    structural_location: str
    itp_reference_code: Optional[str] = None
    scheduled_inspection_date: date
    checklist_items: Optional[List[Dict[str, Any]]] = []
    evidence_photos: Optional[List[Dict[str, Any]]] = []
    material_test_cert_url: Optional[str] = None
    consultant_engineer_name: Optional[str] = None
    remarks: Optional[str] = None

class QualityInspectionUpdate(BaseModel):
    checklist_items: Optional[List[Dict[str, Any]]] = None
    evidence_photos: Optional[List[Dict[str, Any]]] = None
    material_test_cert_url: Optional[str] = None
    verdict: Optional[str] = None
    consultant_engineer_name: Optional[str] = None
    remarks: Optional[str] = None

class InspectionVerdictPayload(BaseModel):
    verdict: str # "PASSED", "CONDITIONAL_PASS", "REJECTED", "NCR_ISSUED"
    consultant_engineer_name: str
    inspector_notes: Optional[str] = None
    evidence_photos: Optional[List[Dict[str, Any]]] = None
    auto_create_ncr_if_failed: Optional[bool] = True

class QualityInspectionResponse(QualityInspectionBase):
    id: int
    project_name: Optional[str] = None
    tower_name: Optional[str] = None
    wbs_node_name: Optional[str] = None
    contractor_name: Optional[str] = None
    inspector_name: Optional[str] = None
    defects_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class QualityInspectionListResponse(BaseModel):
    items: List[QualityInspectionResponse]
    total: int
    limit: int
    offset: int

class QualityDefectMetricsResponse(BaseModel):
    total_inspections: int = 0
    passed_inspections: int = 0
    rejected_inspections: int = 0
    pending_inspections: int = 0
    total_open_defects: int = 0
    critical_defects_count: int = 0
    escalated_defects_count: int = 0
    rectified_pending_closure: int = 0


# -------------------------------------------------------------
# 17. Health & Safety (HSE) Incidents, Investigations & CAPA
# -------------------------------------------------------------
class SafetyIncidentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    incident_code: str
    incident_title: str
    project_id: int
    contractor_id: Optional[int] = None
    wbs_node_id: Optional[int] = None

    incident_date: date
    incident_time: Optional[str] = None
    exact_location: str
    incident_type: str = "NEAR_MISS" # NEAR_MISS, FIRST_AID, MEDICAL_TREATMENT, LOST_TIME_INJURY, PROPERTY_DAMAGE, ENVIRONMENTAL_SPILL
    severity_level: str = "MEDIUM" # LOW, MEDIUM, HIGH, CRITICAL

    injured_person_type: Optional[str] = "WORKER"
    injured_person_name: Optional[str] = None
    injured_worker_id: Optional[int] = None
    injury_nature: Optional[str] = None
    body_part_affected: Optional[str] = None
    days_lost_count: int = 0
    property_damage_estimated_cost: float = 0.00

    incident_description: str
    root_cause_analysis: Optional[str] = None
    immediate_action_taken: Optional[str] = None
    corrective_preventive_action: Optional[str] = None
    responsible_person_name: Optional[str] = None
    capa_due_date: Optional[date] = None

    investigation_status: str = "REPORTED" # REPORTED, UNDER_INVESTIGATION, CAPA_ASSIGNED, RESOLVED, CLOSED
    investigated_by_user_id: Optional[int] = None
    investigation_date: Optional[date] = None

    emergency_escalation_notified: bool = False
    escalated_to_management_at: Optional[datetime] = None
    is_confidential_medical: bool = False
    incident_photo_urls: Optional[List[str]] = None
    police_or_regulatory_report_filed: bool = False

class SafetyIncidentCreate(BaseModel):
    incident_code: str
    incident_title: str
    project_id: int
    contractor_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    incident_date: date
    incident_time: Optional[str] = None
    exact_location: str
    incident_type: str = "NEAR_MISS"
    severity_level: str = "MEDIUM"
    injured_person_type: Optional[str] = "WORKER"
    injured_person_name: Optional[str] = None
    injured_worker_id: Optional[int] = None
    injury_nature: Optional[str] = None
    body_part_affected: Optional[str] = None
    days_lost_count: int = 0
    property_damage_estimated_cost: float = 0.00
    incident_description: str
    immediate_action_taken: Optional[str] = None
    emergency_escalation_notified: bool = False
    is_confidential_medical: bool = False
    incident_photo_urls: Optional[List[str]] = None

class SafetyIncidentUpdate(BaseModel):
    incident_title: Optional[str] = None
    incident_type: Optional[str] = None
    severity_level: Optional[str] = None
    exact_location: Optional[str] = None
    incident_description: Optional[str] = None
    root_cause_analysis: Optional[str] = None
    immediate_action_taken: Optional[str] = None
    corrective_preventive_action: Optional[str] = None
    responsible_person_name: Optional[str] = None
    capa_due_date: Optional[date] = None
    investigation_status: Optional[str] = None
    days_lost_count: Optional[int] = None
    property_damage_estimated_cost: Optional[float] = None
    is_confidential_medical: Optional[bool] = None

class SafetyIncidentInvestigationPayload(BaseModel):
    root_cause_analysis: str
    corrective_preventive_action: str
    responsible_person_name: str
    capa_due_date: date
    investigated_by_name: str
    investigation_status: str = "RESOLVED"
    days_lost_count: int = 0

class SafetyIncidentResponse(SafetyIncidentBase):
    id: int
    project_name: Optional[str] = None
    contractor_name: Optional[str] = None
    injured_worker_code: Optional[str] = None
    investigator_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class SafetyIncidentListResponse(BaseModel):
    items: List[SafetyIncidentResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# 18. Site Safety Inductions & Training Sessions
# -------------------------------------------------------------
class SafetyTrainingBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    training_code: str
    project_id: int
    contractor_id: Optional[int] = None
    training_type: str = "SITE_INDUCTION" # SITE_INDUCTION, TOOLBOX_TALK, WORKING_AT_HEIGHT, FIRE_SAFETY, ELECTRICAL_SAFETY
    session_title: str
    trainer_name: str
    trainer_designation: Optional[str] = None
    training_date: date
    duration_minutes: int = 45
    location_room_zone: Optional[str] = None
    attendees_count: int = 0
    attendees_list: Optional[List[Dict[str, Any]]] = None
    topics_covered: Optional[str] = None
    feedback_summary: Optional[str] = None
    photo_url: Optional[str] = None

class SafetyTrainingCreate(SafetyTrainingBase):
    pass

class SafetyTrainingResponse(SafetyTrainingBase):
    id: int
    project_name: Optional[str] = None
    contractor_name: Optional[str] = None
    created_at: Optional[datetime] = None

class SafetyTrainingListResponse(BaseModel):
    items: List[SafetyTrainingResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# 19. Permits-To-Work (PTW) for Controlled High-Risk Activities
# -------------------------------------------------------------
class PermitToWorkBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    permit_number: str
    project_id: int
    contractor_id: Optional[int] = None
    permit_type: str = "HOT_WORK" # HOT_WORK, WORKING_AT_HEIGHT, CONFINED_SPACE, DEEP_EXCAVATION, ELECTRICAL_ISOLATION
    work_location: str
    scope_of_controlled_activity: str
    valid_from_time: datetime
    valid_to_time: datetime
    hazard_controls_in_place: Optional[Dict[str, Any]] = None
    requested_by_supervisor_name: str
    safety_officer_name: Optional[str] = None
    safety_officer_verified: bool = False
    project_manager_approved: bool = False
    approved_by_name: Optional[str] = None
    permit_status: str = "REQUESTED" # REQUESTED, APPROVED_ACTIVE, SUSPENDED, EXPIRED, CLOSED_SURRENDERED
    closure_inspection_notes: Optional[str] = None

class PermitToWorkCreate(BaseModel):
    permit_number: str
    project_id: int
    contractor_id: Optional[int] = None
    permit_type: str = "HOT_WORK"
    work_location: str
    scope_of_controlled_activity: str
    valid_from_time: datetime
    valid_to_time: datetime
    hazard_controls_in_place: Optional[Dict[str, Any]] = None
    requested_by_supervisor_name: str

class PermitToWorkApprovalPayload(BaseModel):
    permit_status: str = "APPROVED_ACTIVE" # APPROVED_ACTIVE, SUSPENDED, CLOSED_SURRENDERED
    safety_officer_name: str
    safety_officer_verified: bool = True
    project_manager_approved: bool = True
    approved_by_name: str
    closure_inspection_notes: Optional[str] = None

class PermitToWorkResponse(PermitToWorkBase):
    id: int
    project_name: Optional[str] = None
    contractor_name: Optional[str] = None
    request_timestamp: Optional[datetime] = None
    approval_timestamp: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

class PermitToWorkListResponse(BaseModel):
    items: List[PermitToWorkResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# 20. Project Handover & Closeout / Completion Management
# -------------------------------------------------------------
class ProjectCompletionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    completion_code: str
    project_id: int
    target_handover_date: date
    actual_completion_date: Optional[date] = None
    stage_status: str = "IN_RECONCILIATION" # IN_RECONCILIATION, MANAGEMENT_REVIEW, SUBSTANTIALLY_COMPLETED, FORMALLY_CLOSED
    wbs_activities_completion_pct: float = 100.00
    total_boq_reconciled_items_count: int = 0

    final_reconciled_cost_bdt: float = 0.00
    original_budget_cost_bdt: float = 0.00
    cost_variance_amount_bdt: float = 0.00

    outstanding_contractor_bills_amount: float = 0.00
    retention_money_locked_bdt: float = 0.00
    retention_release_authorized: bool = False

    materials_store_reconciliation_cleared: bool = False
    equipment_store_reconciliation_cleared: bool = False
    open_quality_defects_count: int = 0
    open_safety_incidents_count: int = 0

    as_built_drawings_submitted: bool = False
    as_built_drawings_ref_url: Optional[str] = None
    om_manuals_submitted: bool = False
    om_manuals_ref_url: Optional[str] = None
    warranties_collected_count: int = 0
    warranties_summary_url: Optional[str] = None

    mandatory_items_all_cleared: bool = False
    permitted_punchlist_exceptions: Optional[List[Dict[str, Any]]] = None
    taking_over_certificate_url: Optional[str] = None

    project_manager_signoff: bool = False
    pm_name: Optional[str] = None
    project_director_signoff: bool = False
    director_name: Optional[str] = None
    remarks: Optional[str] = None

class ProjectCompletionCreate(BaseModel):
    completion_code: str
    project_id: int
    target_handover_date: date
    stage_status: str = "IN_RECONCILIATION"
    wbs_activities_completion_pct: float = 100.00
    total_boq_reconciled_items_count: int = 0
    final_reconciled_cost_bdt: float = 0.00
    original_budget_cost_bdt: float = 0.00
    cost_variance_amount_bdt: float = 0.00
    outstanding_contractor_bills_amount: float = 0.00
    retention_money_locked_bdt: float = 0.00
    retention_release_authorized: bool = False
    materials_store_reconciliation_cleared: bool = False
    equipment_store_reconciliation_cleared: bool = False
    open_quality_defects_count: int = 0
    open_safety_incidents_count: int = 0
    as_built_drawings_submitted: bool = False
    om_manuals_submitted: bool = False
    warranties_collected_count: int = 0
    mandatory_items_all_cleared: bool = False
    remarks: Optional[str] = None

class ProjectCompletionUpdate(BaseModel):
    target_handover_date: Optional[date] = None
    actual_completion_date: Optional[date] = None
    stage_status: Optional[str] = None
    wbs_activities_completion_pct: Optional[float] = None
    total_boq_reconciled_items_count: Optional[int] = None
    final_reconciled_cost_bdt: Optional[float] = None
    cost_variance_amount_bdt: Optional[float] = None
    outstanding_contractor_bills_amount: Optional[float] = None
    retention_money_locked_bdt: Optional[float] = None
    retention_release_authorized: Optional[bool] = None
    materials_store_reconciliation_cleared: Optional[bool] = None
    equipment_store_reconciliation_cleared: Optional[bool] = None
    open_quality_defects_count: Optional[int] = None
    open_safety_incidents_count: Optional[int] = None
    as_built_drawings_submitted: Optional[bool] = None
    as_built_drawings_ref_url: Optional[str] = None
    om_manuals_submitted: Optional[bool] = None
    om_manuals_ref_url: Optional[str] = None
    warranties_collected_count: Optional[int] = None
    warranties_summary_url: Optional[str] = None
    mandatory_items_all_cleared: Optional[bool] = None
    permitted_punchlist_exceptions: Optional[List[Dict[str, Any]]] = None
    taking_over_certificate_url: Optional[str] = None
    remarks: Optional[str] = None

class ProjectCompletionSignoffPayload(BaseModel):
    signoff_role: str = "PROJECT_MANAGER" # PROJECT_MANAGER, PROJECT_DIRECTOR
    signer_name: str
    remarks: Optional[str] = None
    force_allow_minor_snags: bool = False

class ProjectCompletionResponse(ProjectCompletionBase):
    id: int
    project_name: Optional[str] = None
    pm_signoff_at: Optional[datetime] = None
    director_signoff_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ProjectCompletionListResponse(BaseModel):
    items: List[ProjectCompletionResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# 21. Punchlist Snag Items
# -------------------------------------------------------------
class PunchlistItemBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    completion_id: int
    project_id: int
    item_code: str
    category: str = "Architectural Finishing"
    location_floor_unit: str
    description: str
    photo_url: Optional[str] = None
    assigned_contractor_id: Optional[int] = None
    contractor_name: Optional[str] = None
    severity: str = "MINOR_COSMETIC" # MINOR_COSMETIC, OPERATIONAL, MANDATORY_CRITICAL
    target_rectification_date: date
    status: str = "OPEN" # OPEN, RECTIFIED_PENDING_INSPECTION, VERIFIED_CLOSED
    reinspected_by_name: Optional[str] = None

class PunchlistItemCreate(PunchlistItemBase):
    pass

class PunchlistItemUpdate(BaseModel):
    category: Optional[str] = None
    location_floor_unit: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    assigned_contractor_id: Optional[int] = None
    contractor_name: Optional[str] = None
    severity: Optional[str] = None
    target_rectification_date: Optional[date] = None
    status: Optional[str] = None
    reinspected_by_name: Optional[str] = None

class PunchlistItemResponse(PunchlistItemBase):
    id: int
    project_name: Optional[str] = None
    closed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

class PunchlistListResponse(BaseModel):
    items: List[PunchlistItemResponse]
    total: int
    limit: int
    offset: int


# -------------------------------------------------------------
# 22. Summary Metric Responses
# -------------------------------------------------------------
class HSESafetyMetricsResponse(BaseModel):
    total_incidents: int = 0
    near_miss_count: int = 0
    first_aid_count: int = 0
    medical_lti_count: int = 0
    total_days_lost: int = 0
    open_investigations: int = 0
    total_trainings_conducted: int = 0
    total_workers_inducted: int = 0
    active_ptw_count: int = 0
    critical_safety_escalations: int = 0

class ProjectCompletionMetricsResponse(BaseModel):
    total_projects_in_closeout: int = 0
    substantially_completed_count: int = 0
    formally_closed_count: int = 0
    total_reconciled_cost_bdt: float = 0.00
    total_cost_variance_bdt: float = 0.00
    total_retentions_held_bdt: float = 0.00
    total_open_snags: int = 0
    mandatory_critical_snags_open: int = 0


# -------------------------------------------------------------
# 23. Standard Construction Management Reports (14 Standard Reports)
# -------------------------------------------------------------
class ConstructionReportColumn(BaseModel):
    key: str
    label: str
    align: str = "left" # left, right, center
    format_type: str = "text" # text, number, currency, percent, date, badge

class ConstructionReportMeta(BaseModel):
    code: str
    name: str
    category: str # Schedule, Cost, Material, Commercial, Workforce, Quality & Safety
    description: str
    icon: str

class ConstructionReportSummaryKPIs(BaseModel):
    total_active_projects: int = 0
    overall_schedule_health_pct: float = 0.0
    total_committed_cost_bdt: float = 0.0
    total_actual_expenditure_bdt: float = 0.0
    total_retention_liability_bdt: float = 0.0
    open_defects_and_incidents: int = 0
    material_wastage_rate_pct: float = 0.0

class ConstructionReportResponse(BaseModel):
    report_type: str
    report_title: str
    generated_at: datetime
    total_items: int
    limit: int
    offset: int
    columns: List[ConstructionReportColumn]
    summary_aggregates: Dict[str, Any] = {}
    items: List[Dict[str, Any]] = []







