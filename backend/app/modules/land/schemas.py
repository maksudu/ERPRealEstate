from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal

# Area conversion constants for Bangladesh
KATHA_TO_SQFT = Decimal("720.00")
DECIMAL_TO_SQFT = Decimal("435.60")
BIGHA_TO_KATHA = Decimal("20.00")
ACRE_TO_DECIMAL = Decimal("100.00")


def convert_area_to_all_units(
    katha: Optional[float] = None,
    decimal: Optional[float] = None,
    sqft: Optional[float] = None,
    bigha: Optional[float] = None
) -> Dict[str, float]:
    """
    Standard Bangladesh Land Conversion Engine:
    - 1 Katha = 720 Sq Ft
    - 1 Decimal = 435.60 Sq Ft
    - 1 Bigha = 20 Katha = 14,400 Sq Ft
    - 1 Acre = 100 Decimal = 43,560 Sq Ft
    """
    calculated_sqft = Decimal("0")
    if sqft and sqft > 0:
        calculated_sqft = Decimal(str(sqft))
    elif katha and katha > 0:
        calculated_sqft = Decimal(str(katha)) * KATHA_TO_SQFT
    elif decimal and decimal > 0:
        calculated_sqft = Decimal(str(decimal)) * DECIMAL_TO_SQFT
    elif bigha and bigha > 0:
        calculated_sqft = Decimal(str(bigha)) * BIGHA_TO_KATHA * KATHA_TO_SQFT

    calc_katha = calculated_sqft / KATHA_TO_SQFT if calculated_sqft else Decimal("0")
    calc_decimal = calculated_sqft / DECIMAL_TO_SQFT if calculated_sqft else Decimal("0")
    calc_bigha = calc_katha / BIGHA_TO_KATHA if calc_katha else Decimal("0")
    calc_acre = calc_decimal / ACRE_TO_DECIMAL if calc_decimal else Decimal("0")

    return {
        "sqft": round(float(calculated_sqft), 2),
        "katha": round(float(calc_katha), 4),
        "decimal": round(float(calc_decimal), 4),
        "bigha": round(float(calc_bigha), 4),
        "acre": round(float(calc_acre), 4)
    }


# -------------------------------------------------------------
# 1. Landowner Schemas
# -------------------------------------------------------------
class LandownerBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    owner_type: str = "INDIVIDUAL" # INDIVIDUAL, COMPANY, HEIR_INHERITANCE
    full_name_en: str
    full_name_bn: Optional[str] = None
    nid_number: Optional[str] = None
    tin_number: Optional[str] = None
    phone_number: Optional[str] = None
    ownership_share_ratio: float = 1.0000
    bank_details: Optional[Dict[str, Any]] = None

class LandownerCreate(LandownerBase):
    pass

class LandownerResponse(LandownerBase):
    id: int
    land_bank_id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# 2. Land Khatian Schemas (CS, SA, RS, BS, Mutation)
# -------------------------------------------------------------
class LandKhatianBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    khatian_type: str # CS, SA, RS, BS, MUTATION
    khatian_number: str
    recorded_tenant_name: str
    case_or_jote_no: Optional[str] = None
    remarks: Optional[str] = None

class LandKhatianCreate(LandKhatianBase):
    land_bank_id: int

class LandKhatianResponse(LandKhatianBase):
    id: int
    land_bank_id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# 3. Land Dag / Plot Schemas
# -------------------------------------------------------------
class LandDagBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dag_number: str
    khatian_id: Optional[int] = None
    land_class: str = "NAL" # NAL, BHITI, CHALA, DOBA, COMMERCIAL, RESIDENTIAL
    area_decimal: float = 0.0
    area_katha: float = 0.0
    area_bigha: float = 0.0
    area_sqft: float = 0.0
    possession_status: str = "FULL_POSSESSION"
    remarks: Optional[str] = None

class LandDagCreate(BaseModel):
    land_bank_id: int
    khatian_id: Optional[int] = None
    dag_number: str
    land_class: str = "NAL"
    input_unit: str = "DECIMAL" # KATHA, DECIMAL, BIGHA, SQFT
    input_value: float
    possession_status: Optional[str] = "FULL_POSSESSION"
    remarks: Optional[str] = None

class LandDagResponse(LandDagBase):
    id: int
    land_bank_id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# 4. Legal Documents (Deed, Mutation, DCR, Khajna, PoA)
# -------------------------------------------------------------
class LandDeedDocumentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    doc_type: str # DEED_BAYA, MUTATION_PARCHA, DCR_RECEIPT, KHAJNA_TAX, POA_DEED
    doc_number: str
    issuing_office: str = "Sub-Registry Office"
    execution_date: date
    expiry_date: Optional[date] = None
    is_expired: bool = False
    file_url: Optional[str] = None
    verification_status: str = "VERIFIED"
    notes: Optional[str] = None

class LandDeedDocumentCreate(LandDeedDocumentBase):
    land_bank_id: int

class LandDeedDocumentResponse(LandDeedDocumentBase):
    id: int
    land_bank_id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# 5. Survey Record Schemas (Legacy & Continuous Chain)
# -------------------------------------------------------------
class SurveyRecordBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    survey_type_id: str # CS, SA, RS, BS, MUTATION
    khatian_number: str
    recorded_tenant_name: str
    dag_number: str
    recorded_area_decimal: float = 0.0
    recorded_area_katha: float = 0.0
    remarks: Optional[str] = None

class SurveyRecordCreate(SurveyRecordBase):
    pass

class SurveyRecordResponse(SurveyRecordBase):
    id: int
    land_bank_id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# 6. JV Unit Allocation Schemas
# -------------------------------------------------------------
class JVUnitAllocationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tower_name: str = "Tower 1"
    floor_number: int = 1
    unit_number: str = "1A"
    unit_identifier: str
    unit_type: str = "APARTMENT" # APARTMENT, COMMERCIAL, PARKING_BAY
    allocation_type: str # LANDOWNER_UNIT, DEVELOPER_UNIT
    is_locked_for_sales: bool = False
    gross_sft: float = 1500.00
    parking_slot_number: Optional[str] = None
    allocation_notes: Optional[str] = None

class JVUnitAllocationCreate(BaseModel):
    tower_name: Optional[str] = "Tower 1"
    floor_number: Optional[int] = 1
    unit_number: Optional[str] = "1A"
    unit_identifier: str
    unit_type: Optional[str] = "APARTMENT"
    allocation_type: str # LANDOWNER_UNIT, DEVELOPER_UNIT
    gross_sft: Optional[float] = 1500.00
    parking_slot_number: Optional[str] = None
    allocation_notes: Optional[str] = None

class JVUnitAllocationResponse(JVUnitAllocationBase):
    id: int
    jv_agreement_id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# 7. JV Milestone Payment Schemas (Signing Money & Advance)
# -------------------------------------------------------------
class LandJVMilestonePaymentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    milestone_name: str
    due_date: date
    amount_bdt: float
    payment_status: str = "PENDING" # PENDING, PAID, ADJUSTED_AGAINST_SHARE
    paid_date: Optional[date] = None
    voucher_ref: Optional[str] = None
    notes: Optional[str] = None

class LandJVMilestonePaymentCreate(LandJVMilestonePaymentBase):
    pass

class LandJVMilestonePaymentResponse(LandJVMilestonePaymentBase):
    id: int
    jv_agreement_id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# 8. JV Agreement Schemas
# -------------------------------------------------------------
class JVAgreementBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    agreement_deed_no: str
    landowner_share_percent: float # e.g. 50.00% or 40.00%
    developer_share_percent: float # e.g. 50.00% or 60.00%
    signing_money_total: float = 0.0
    signing_money_paid: float = 0.0
    tenure_months: int = 36
    poa_deed_number: Optional[str] = None
    poa_execution_date: Optional[date] = None
    poa_expiry_date: Optional[date] = None
    poa_verified: bool = True
    signing_date: Optional[datetime] = None
    handover_commitment_date: Optional[datetime] = None
    status: str = "ACTIVE"

class JVAgreementCreate(BaseModel):
    land_bank_id: int
    agreement_deed_no: str
    landowner_share_percent: float = 50.00
    developer_share_percent: float = 50.00
    signing_money_total: float = 0.0
    signing_money_paid: Optional[float] = 0.0
    tenure_months: int = 36
    poa_deed_number: Optional[str] = None
    poa_execution_date: Optional[date] = None
    poa_expiry_date: Optional[date] = None
    poa_verified: Optional[bool] = True
    unit_allocations: Optional[List[JVUnitAllocationCreate]] = []
    milestones: Optional[List[LandJVMilestonePaymentCreate]] = []

class JVAgreementResponse(JVAgreementBase):
    id: int
    land_bank_id: int
    unit_allocations: List[JVUnitAllocationResponse] = []
    milestones: List[LandJVMilestonePaymentResponse] = []
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# 9. Automated JV Ratio Allocation Request & Matrix Response
# -------------------------------------------------------------
class JVAutoAllocationRequest(BaseModel):
    jv_agreement_id: int
    total_floors: int = 14
    units_per_floor: int = 4
    unit_gross_sft: float = 1650.00
    allocation_strategy: str = "ALTERNATE_FLOORS" # "ALTERNATE_FLOORS", "ODD_EVEN_UNITS", "UPPER_LOWER_SPLIT"

class JVAutoAllocationResponse(BaseModel):
    jv_agreement_id: int
    total_units_generated: int
    landowner_units_count: int
    developer_units_count: int
    landowner_total_sft: float
    developer_total_sft: float
    allocated_units: List[JVUnitAllocationResponse]


# -------------------------------------------------------------
# 10. Land Bank (Proposal) Schemas
# -------------------------------------------------------------
class LandBankBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_code: str
    proposal_title: str
    mouza_name: str
    jl_number: str
    upazila_thana: str = "Gulshan"
    district: str = "Dhaka"
    sub_registry_office: str = "Gulshan Sub-Registry Office"
    total_area_katha: float = 0.0
    total_area_decimal: float = 0.0
    total_area_bigha: float = 0.0
    total_area_sqft: float = 0.0
    deal_type: str = "JOINT_VENTURE"
    status: str = "DRAFT_PROPOSAL"
    location_description: Optional[str] = None

class LandBankCreate(BaseModel):
    project_code: str
    proposal_title: str
    mouza_name: str
    jl_number: str
    upazila_thana: Optional[str] = "Gulshan"
    district: Optional[str] = "Dhaka"
    sub_registry_office: Optional[str] = "Gulshan Sub-Registry Office"
    input_unit: str = "KATHA" # KATHA, DECIMAL, BIGHA, SQFT
    input_value: float
    deal_type: str = "JOINT_VENTURE"
    status: Optional[str] = "DRAFT_PROPOSAL"
    location_description: Optional[str] = None
    landowners: Optional[List[LandownerCreate]] = []

class LandBankUpdate(BaseModel):
    proposal_title: Optional[str] = None
    mouza_name: Optional[str] = None
    jl_number: Optional[str] = None
    upazila_thana: Optional[str] = None
    district: Optional[str] = None
    sub_registry_office: Optional[str] = None
    input_unit: Optional[str] = None
    input_value: Optional[float] = None
    deal_type: Optional[str] = None
    status: Optional[str] = None
    location_description: Optional[str] = None

class LandBankResponse(LandBankBase):
    id: int
    landowners: List[LandownerResponse] = []
    survey_records: List[SurveyRecordResponse] = []
    jv_agreements: List[JVAgreementResponse] = []
    khatians: List[LandKhatianResponse] = []
    dags: List[LandDagResponse] = []
    documents: List[LandDeedDocumentResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# -------------------------------------------------------------
# 11. Deed Chain Verification Response
# -------------------------------------------------------------
class DeedChainVerificationResponse(BaseModel):
    land_bank_id: int
    project_code: str
    proposal_title: str
    mouza_name: str
    jl_number: str
    has_cs: bool
    has_sa: bool
    has_rs: bool
    has_bs: bool
    survey_sequence_verified: bool
    total_survey_area_decimal: float
    total_survey_area_katha: float
    total_land_bank_area_katha: float
    area_variance_percentage: float
    surveys: List[SurveyRecordResponse]
    landowners: List[LandownerResponse]
    verification_status: str # VERIFIED, PARTIAL, MISSING_HISTORIC_LINK
    remarks: str
