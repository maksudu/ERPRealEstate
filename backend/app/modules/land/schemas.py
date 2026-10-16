from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

# Area conversion constants for Bangladesh
KATHA_TO_SQFT = Decimal("720.00")
DECIMAL_TO_SQFT = Decimal("435.60")
BIGHA_TO_KATHA = Decimal("20.00")
ACRE_TO_DECIMAL = Decimal("100.00")

def convert_area_to_all_units(
    katha: Optional[float] = None,
    decimal: Optional[float] = None,
    sqft: Optional[float] = None
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


# Landowner Schemas
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


# Survey Record Schemas
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


# JV Unit Allocation Schemas
class JVUnitAllocationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    unit_identifier: str
    allocation_type: str # LANDOWNER_UNIT, DEVELOPER_UNIT
    is_locked_for_sales: bool = False
    allocation_notes: Optional[str] = None

class JVUnitAllocationCreate(BaseModel):
    unit_identifier: str
    allocation_type: str # If LANDOWNER_UNIT -> locked automatically
    allocation_notes: Optional[str] = None

class JVUnitAllocationResponse(JVUnitAllocationBase):
    id: int
    jv_agreement_id: int


# JV Agreement Schemas
class JVAgreementBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    agreement_deed_no: str
    landowner_share_percent: float
    developer_share_percent: float
    signing_money_total: float = 0.0
    tenure_months: int = 36
    signing_date: Optional[datetime] = None
    handover_commitment_date: Optional[datetime] = None
    status: str = "ACTIVE"

class JVAgreementCreate(BaseModel):
    land_bank_id: int
    agreement_deed_no: str
    landowner_share_percent: float
    developer_share_percent: float
    signing_money_total: float = 0.0
    tenure_months: int = 36
    unit_allocations: Optional[List[JVUnitAllocationCreate]] = []

class JVAgreementResponse(JVAgreementBase):
    id: int
    land_bank_id: int
    unit_allocations: List[JVUnitAllocationResponse] = []
    created_at: Optional[datetime] = None


# Land Bank (Proposal) Schemas
class LandBankBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_code: str
    proposal_title: str
    mouza_name: str
    jl_number: str
    total_area_katha: float = 0.0
    total_area_decimal: float = 0.0
    total_area_sqft: float = 0.0
    deal_type: str = "JOINT_VENTURE"
    status: str = "DRAFT_PROPOSAL"
    location_description: Optional[str] = None

class LandBankCreate(BaseModel):
    project_code: str
    proposal_title: str
    mouza_name: str
    jl_number: str
    input_unit: str = "KATHA" # KATHA, DECIMAL, SQFT
    input_value: float
    deal_type: str = "JOINT_VENTURE"
    status: Optional[str] = "DRAFT_PROPOSAL"
    location_description: Optional[str] = None
    landowners: Optional[List[LandownerCreate]] = []

class LandBankUpdate(BaseModel):
    proposal_title: Optional[str] = None
    mouza_name: Optional[str] = None
    jl_number: Optional[str] = None
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
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Deed Chain Verification Response
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
