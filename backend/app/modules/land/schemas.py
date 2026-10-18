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

    landowner_code: Optional[str] = None
    land_bank_id: Optional[int] = None
    owner_type: str = "INDIVIDUAL"  # INDIVIDUAL, JOINT_OWNER, COMPANY, POA_HOLDER
    full_name_en: str
    full_name_bn: Optional[str] = None
    father_mother_spouse_name: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None

    nid_number: Optional[str] = None
    passport_number: Optional[str] = None
    company_reg_number: Optional[str] = None
    tin_number: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

    ownership_share_ratio: float = 1.0000
    ownership_nature: str = "INHERITED"  # INHERITED, PURCHASED, GIFT_HEBA, COURT_DECREE

    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_routing_no: Optional[str] = None
    bank_account_holder: Optional[str] = None
    bank_details: Optional[Dict[str, Any]] = None

    nominee_details: Optional[List[Dict[str, Any]]] = None
    poa_details: Optional[Dict[str, Any]] = None
    supporting_documents: Optional[List[Dict[str, Any]]] = None
    negotiation_notes: Optional[List[Dict[str, Any]]] = None
    status: str = "ACTIVE"  # PROSPECT, UNDER_VERIFICATION, ACTIVE, BLOCKED, ARCHIVED


class LandownerCreate(LandownerBase):
    pass


class LandownerUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    owner_type: Optional[str] = None
    full_name_en: Optional[str] = None
    full_name_bn: Optional[str] = None
    father_mother_spouse_name: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    nid_number: Optional[str] = None
    passport_number: Optional[str] = None
    company_reg_number: Optional[str] = None
    tin_number: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    ownership_share_ratio: Optional[float] = None
    ownership_nature: Optional[str] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_routing_no: Optional[str] = None
    bank_account_holder: Optional[str] = None
    bank_details: Optional[Dict[str, Any]] = None
    nominee_details: Optional[List[Dict[str, Any]]] = None
    poa_details: Optional[Dict[str, Any]] = None
    supporting_documents: Optional[List[Dict[str, Any]]] = None
    negotiation_notes: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = None
    land_bank_id: Optional[int] = None


class LandownerResponse(LandownerBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    linked_parcels_count: Optional[int] = 0


class LandownerDuplicateCheckRequest(BaseModel):
    nid_number: Optional[str] = None
    phone_number: Optional[str] = None
    tin_number: Optional[str] = None
    company_reg_number: Optional[str] = None
    exclude_id: Optional[int] = None


class LandownerDuplicateCheckResponse(BaseModel):
    has_duplicate: bool
    matched_by: Optional[str] = None
    matches: List[LandownerResponse] = []


class LandownerNegotiationNoteCreate(BaseModel):
    note: str
    interaction_type: str = "MEETING"  # MEETING, PHONE_CALL, SITE_VISIT, LEGAL_DISCUSSION
    interaction_date: Optional[date] = None
    conducted_by: Optional[str] = "Acquisitions Officer"


# -------------------------------------------------------------
# 2. Land Parcel Schemas
# -------------------------------------------------------------
class LandParcelBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    parcel_id: Optional[str] = None
    land_bank_id: Optional[int] = None
    project_id: Optional[int] = None
    project_name: str
    division: str = "Dhaka Division"
    district: str = "Dhaka"
    upazila_thana: str = "Gulshan"
    mouza_name: str
    jl_number: str
    khatian_number: str
    dag_number: str
    land_classification: str = "RESIDENTIAL"  # RESIDENTIAL, COMMERCIAL, AGRICULTURAL, OTHER

    total_area_decimal: float = 0.0
    total_area_katha: float = 0.0
    total_area_bigha: float = 0.0
    total_area_sqft: float = 0.0

    acquisition_status: str = "PROPOSED"  # PROPOSED, UNDER_REVIEW, APPROVED, ACQUIRED
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None

    boundary_north: Optional[str] = None
    boundary_south: Optional[str] = None
    boundary_east: Optional[str] = None
    boundary_west: Optional[str] = None
    road_access_width_ft: float = 40.0

    deed_number: Optional[str] = None
    deed_date: Optional[date] = None
    source_record_info: Optional[Dict[str, Any]] = None
    gis_polygon_data: Optional[Dict[str, Any]] = None
    remarks: Optional[str] = None


class LandParcelCreate(LandParcelBase):
    input_unit: Optional[str] = "DECIMAL"  # DECIMAL, KATHA, BIGHA, SQFT
    input_value: Optional[float] = None


class LandParcelUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_name: Optional[str] = None
    division: Optional[str] = None
    district: Optional[str] = None
    upazila_thana: Optional[str] = None
    mouza_name: Optional[str] = None
    jl_number: Optional[str] = None
    khatian_number: Optional[str] = None
    dag_number: Optional[str] = None
    land_classification: Optional[str] = None
    total_area_decimal: Optional[float] = None
    total_area_katha: Optional[float] = None
    total_area_bigha: Optional[float] = None
    total_area_sqft: Optional[float] = None
    acquisition_status: Optional[str] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    boundary_north: Optional[str] = None
    boundary_south: Optional[str] = None
    boundary_east: Optional[str] = None
    boundary_west: Optional[str] = None
    road_access_width_ft: Optional[float] = None
    deed_number: Optional[str] = None
    deed_date: Optional[date] = None
    source_record_info: Optional[Dict[str, Any]] = None
    gis_polygon_data: Optional[Dict[str, Any]] = None
    remarks: Optional[str] = None


class LandParcelResponse(LandParcelBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    linked_owners_count: Optional[int] = 0


# -------------------------------------------------------------
# 3. Landowner-Parcel Link & Joint Ownership Schemas (Module 2.6)
# -------------------------------------------------------------
class LandownerParcelLinkBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    landowner_id: int
    parcel_id: int
    ownership_share_percent: float = 100.0
    ownership_source: str = "PURCHASE"  # PURCHASE, INHERITANCE, PARTITION_DEED, GIFT_HEBA, COURT_DECREE, TRANSFER
    equivalent_area_decimal: float = 0.00
    equivalent_area_katha: float = 0.00
    equivalent_area_sqft: float = 0.00
    proposed_sale_price_bdt: float = 0.00
    development_share_percent: float = 0.00
    consent_status: str = "CONSENT_GRANTED"  # CONSENT_GRANTED, CONSENT_PENDING, DISPUTED, REFUSED, LEGAL_NOTICE
    has_poa: bool = False
    poa_holder_name: Optional[str] = None
    witness_details: Optional[Dict[str, Any]] = None
    dispute_remarks: Optional[str] = None
    is_share_verified: bool = True
    title_deed_no: Optional[str] = None
    status: str = "ACTIVE"


class LandownerParcelLinkCreate(BaseModel):
    landowner_id: int
    parcel_id: int
    ownership_share_percent: float = 100.0
    ownership_source: Optional[str] = "PURCHASE"
    proposed_sale_price_bdt: Optional[float] = 0.00
    development_share_percent: Optional[float] = 0.00
    consent_status: Optional[str] = "CONSENT_GRANTED"
    has_poa: Optional[bool] = False
    poa_holder_name: Optional[str] = None
    witness_details: Optional[Dict[str, Any]] = None
    dispute_remarks: Optional[str] = None
    title_deed_no: Optional[str] = None
    status: Optional[str] = "ACTIVE"


class LandownerParcelLinkUpdate(BaseModel):
    ownership_share_percent: Optional[float] = None
    ownership_source: Optional[str] = None
    proposed_sale_price_bdt: Optional[float] = None
    development_share_percent: Optional[float] = None
    consent_status: Optional[str] = None
    has_poa: Optional[bool] = None
    poa_holder_name: Optional[str] = None
    witness_details: Optional[Dict[str, Any]] = None
    dispute_remarks: Optional[str] = None
    is_share_verified: Optional[bool] = None
    title_deed_no: Optional[str] = None
    status: Optional[str] = None


class LandownerParcelLinkResponse(LandownerParcelLinkBase):
    id: int
    landowner: Optional[LandownerResponse] = None
    parcel: Optional[LandParcelResponse] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class JointOwnershipShareSummary(BaseModel):
    parcel_id: int
    project_name: str
    total_area_decimal: float
    total_area_katha: float
    total_area_sqft: float
    total_owners_count: int
    total_recorded_share_percent: float
    unallocated_share_percent: float
    is_fully_accounted_100: bool
    has_disputed_ownership: bool
    unresolved_owners_count: int
    co_owners: List[LandownerParcelLinkResponse] = []


# -------------------------------------------------------------
# 4. Land Khatian Schemas (CS, SA, RS, BS, Mutation)
# -------------------------------------------------------------
class LandKhatianBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    khatian_type: str  # CS, SA, RS, BS, MUTATION
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
# 5. Land Dag / Plot Schemas
# -------------------------------------------------------------
class LandDagBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dag_number: str
    khatian_id: Optional[int] = None
    land_class: str = "NAL"  # NAL, BHITI, CHALA, DOBA, COMMERCIAL, RESIDENTIAL
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
    input_unit: str = "DECIMAL"  # KATHA, DECIMAL, BIGHA, SQFT
    input_value: float
    possession_status: Optional[str] = "FULL_POSSESSION"
    remarks: Optional[str] = None


class LandDagResponse(LandDagBase):
    id: int
    land_bank_id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# 6. Legal Documents (Deed, Mutation, DCR, Khajna, PoA)
# -------------------------------------------------------------
class LandDeedDocumentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    land_bank_id: Optional[int] = None
    parcel_id: Optional[int] = None
    landowner_id: Optional[int] = None

    doc_type: str = "DEED_BAYA"  # DEED_BAYA, MUTATION_PARCHA, DCR_RECEIPT, KHAJNA_TAX, POA_DEED, SALE_DEED, etc.
    document_category: str = "SALE_DEED"  # SALE_DEED, CHAIN_BAYA_DEED, SURVEY_PARCHA, MUTATION_DCR, TAX_DAKHILA, etc.
    doc_number: str
    doc_title: Optional[str] = None
    reference_number: Optional[str] = None
    issuing_office: str = "Sub-Registry Office"
    execution_date: Optional[date] = None
    expiry_date: Optional[date] = None
    is_expired: bool = False

    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = "application/pdf"
    document_version: str = "v1.0"

    verification_status: str = "PENDING"  # PENDING, VERIFIED, REJECTED, EXPIRED, REQUIRES_CLARIFICATION
    verification_officer: Optional[str] = None
    verification_date: Optional[date] = None
    verification_remarks: Optional[str] = None
    is_independently_verified: bool = False

    ocr_extracted_data: Optional[Dict[str, Any]] = None
    ocr_status: str = "NOT_EXTRACTED"  # NOT_EXTRACTED, EXTRACTED, MANUALLY_CONFIRMED
    access_security_level: str = "STANDARD"  # STANDARD, RESTRICTED, CONFIDENTIAL_EXECUTIVE
    renewal_reminder_days: int = 30
    notes: Optional[str] = None


class LandDeedDocumentCreate(LandDeedDocumentBase):
    pass


class LandDeedDocumentUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    doc_type: Optional[str] = None
    document_category: Optional[str] = None
    doc_number: Optional[str] = None
    doc_title: Optional[str] = None
    reference_number: Optional[str] = None
    issuing_office: Optional[str] = None
    execution_date: Optional[date] = None
    expiry_date: Optional[date] = None
    is_expired: Optional[bool] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    document_version: Optional[str] = None
    verification_status: Optional[str] = None
    verification_officer: Optional[str] = None
    verification_date: Optional[date] = None
    verification_remarks: Optional[str] = None
    is_independently_verified: Optional[bool] = None
    ocr_extracted_data: Optional[Dict[str, Any]] = None
    ocr_status: Optional[str] = None
    access_security_level: Optional[str] = None
    renewal_reminder_days: Optional[int] = None
    notes: Optional[str] = None
    parcel_id: Optional[int] = None
    landowner_id: Optional[int] = None
    land_bank_id: Optional[int] = None


class LandDeedDocumentResponse(LandDeedDocumentBase):
    id: int
    parcel: Optional[LandParcelResponse] = None
    landowner: Optional[LandownerResponse] = None
    days_until_expiry: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DocumentVerifyRequest(BaseModel):
    verification_status: str  # VERIFIED, REJECTED, REQUIRES_CLARIFICATION
    verification_officer: str
    verification_remarks: Optional[str] = None
    is_independently_verified: bool = True


class DocumentChecklistItem(BaseModel):
    category_code: str
    category_title: str
    is_mandatory: bool
    is_present: bool
    is_verified: bool
    document_id: Optional[int] = None
    document_title: Optional[str] = None
    status: str


class DocumentChecklistResponse(BaseModel):
    parcel_id: int
    parcel_code: str
    project_name: str
    total_documents_count: int
    verified_documents_count: int
    is_approval_ready: bool
    missing_mandatory_categories: List[str] = []
    items: List[DocumentChecklistItem] = []


# -------------------------------------------------------------
# 6.1 Measurement Convention Schemas (2.4 Regional Config)
# -------------------------------------------------------------
class MeasurementConventionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    convention_code: str
    convention_name: str
    region_district: str
    katha_to_sqft: float = 720.0000
    decimal_to_sqft: float = 435.6000
    bigha_to_katha: float = 20.0000
    acre_to_decimal: float = 100.0000
    kani_to_sqft: Optional[float] = None
    gonda_to_sqft: Optional[float] = None
    is_default: bool = False
    notes: Optional[str] = None


class MeasurementConventionCreate(MeasurementConventionBase):
    pass


class MeasurementConventionUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    convention_name: Optional[str] = None
    region_district: Optional[str] = None
    katha_to_sqft: Optional[float] = None
    decimal_to_sqft: Optional[float] = None
    bigha_to_katha: Optional[float] = None
    acre_to_decimal: Optional[float] = None
    kani_to_sqft: Optional[float] = None
    gonda_to_sqft: Optional[float] = None
    is_default: Optional[bool] = None
    notes: Optional[str] = None


class MeasurementConventionResponse(MeasurementConventionBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RegionalConversionCalculationRequest(BaseModel):
    convention_id: Optional[int] = None
    convention_code: Optional[str] = "DHAKA_STANDARD"
    input_unit: str  # SQFT, DECIMAL, KATHA, BIGHA, ACRE, KANI, GONDA
    input_value: float
    original_registered_unit: Optional[str] = None
    original_registered_value: Optional[float] = None


class RegionalConversionCalculationResponse(BaseModel):
    convention_used: str
    region: str
    original_deed_record: Dict[str, Any]
    converted_units: Dict[str, float]
    conversion_factors: Dict[str, float]


# -------------------------------------------------------------
# 7. Survey Record Schemas (Legacy & Continuous Chain)
# -------------------------------------------------------------
class SurveyRecordBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    survey_type_id: str  # CS, SA, RS, BS, MUTATION
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
# 8. JV Unit Allocation Schemas
# -------------------------------------------------------------
class JVUnitAllocationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tower_name: str = "Tower 1"
    floor_number: int = 1
    unit_number: str = "1A"
    unit_identifier: str
    unit_type: str = "APARTMENT"
    allocation_type: str  # LANDOWNER_UNIT, DEVELOPER_UNIT
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
    allocation_type: str
    gross_sft: Optional[float] = 1500.00
    parking_slot_number: Optional[str] = None
    allocation_notes: Optional[str] = None


class JVUnitAllocationResponse(JVUnitAllocationBase):
    id: int
    jv_agreement_id: int
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# 9. JV Milestone Payment Schemas (Signing Money & Advance)
# -------------------------------------------------------------
class LandJVMilestonePaymentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    milestone_name: str
    due_date: date
    amount_bdt: float
    payment_status: str = "PENDING"
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
# 10. JV Agreement Schemas
# -------------------------------------------------------------
class JVAgreementBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    agreement_deed_no: str
    agreement_type: str = "JOINT_VENTURE_DEVELOPMENT"  # JOINT_VENTURE_DEVELOPMENT, OUTRIGHT_PURCHASE_AGREEMENT, POWER_OF_ATTORNEY_AGREEMENT, SUPPLEMENTARY_AMENDMENT, PARTITION_SETTLEMENT
    registration_deed_no: Optional[str] = None
    registration_office: Optional[str] = None
    registration_date: Optional[date] = None
    witness_count: int = 2

    landowner_share_percent: float
    developer_share_percent: float
    signing_money_total: float = 0.0
    signing_money_paid: float = 0.0
    tenure_months: int = 36

    allocated_flats_count: int = 0
    allocated_shops_count: int = 0
    allocated_car_parks_count: int = 0
    allocated_cash_bdt: float = 0.00

    obligations_developer: Optional[str] = None
    obligations_landowner: Optional[str] = None
    special_conditions: Optional[str] = None
    amendment_number: int = 0
    termination_conditions: Optional[str] = None
    missing_consents_flag: bool = False

    poa_deed_number: Optional[str] = None
    poa_execution_date: Optional[date] = None
    poa_expiry_date: Optional[date] = None
    poa_verified: bool = True
    signing_date: Optional[datetime] = None
    handover_commitment_date: Optional[datetime] = None
    status: str = "ACTIVE"
    parcel_id: Optional[int] = None


class JVAgreementCreate(BaseModel):
    land_bank_id: Optional[int] = None
    parcel_id: Optional[int] = None
    agreement_deed_no: str
    agreement_type: Optional[str] = "JOINT_VENTURE_DEVELOPMENT"
    registration_deed_no: Optional[str] = None
    registration_office: Optional[str] = None
    registration_date: Optional[date] = None
    witness_count: Optional[int] = 2

    landowner_share_percent: float = 0.00
    developer_share_percent: float = 0.00
    signing_money_total: float = 0.0
    signing_money_paid: Optional[float] = 0.0
    tenure_months: int = 0

    allocated_flats_count: Optional[int] = 0
    allocated_shops_count: Optional[int] = 0
    allocated_car_parks_count: Optional[int] = 0
    allocated_cash_bdt: Optional[float] = 0.00

    obligations_developer: Optional[str] = None
    obligations_landowner: Optional[str] = None
    special_conditions: Optional[str] = None
    amendment_number: Optional[int] = 0
    termination_conditions: Optional[str] = None
    missing_consents_flag: Optional[bool] = False

    poa_deed_number: Optional[str] = None
    poa_execution_date: Optional[date] = None
    poa_expiry_date: Optional[date] = None
    poa_verified: Optional[bool] = True
    unit_allocations: Optional[List[JVUnitAllocationCreate]] = []
    milestones: Optional[List[LandJVMilestonePaymentCreate]] = []


class JVAgreementUpdate(BaseModel):
    agreement_type: Optional[str] = None
    registration_deed_no: Optional[str] = None
    registration_office: Optional[str] = None
    registration_date: Optional[date] = None
    witness_count: Optional[int] = None
    landowner_share_percent: Optional[float] = None
    developer_share_percent: Optional[float] = None
    signing_money_total: Optional[float] = None
    signing_money_paid: Optional[float] = None
    tenure_months: Optional[int] = None
    allocated_flats_count: Optional[int] = None
    allocated_shops_count: Optional[int] = None
    allocated_car_parks_count: Optional[int] = None
    allocated_cash_bdt: Optional[float] = None
    obligations_developer: Optional[str] = None
    obligations_landowner: Optional[str] = None
    special_conditions: Optional[str] = None
    amendment_number: Optional[int] = None
    termination_conditions: Optional[str] = None
    missing_consents_flag: Optional[bool] = None
    poa_deed_number: Optional[str] = None
    poa_execution_date: Optional[date] = None
    poa_expiry_date: Optional[date] = None
    poa_verified: Optional[bool] = None
    status: Optional[str] = None


class JVAgreementResponse(JVAgreementBase):
    id: int
    land_bank_id: Optional[int] = None
    parcel_id: Optional[int] = None
    parcel: Optional[LandParcelResponse] = None
    unit_allocations: List[JVUnitAllocationResponse] = []
    milestones: List[LandJVMilestonePaymentResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# -------------------------------------------------------------
# 10.1 Legal Due Diligence & Encumbrance Tracking (Module 2.7)
# -------------------------------------------------------------
class DueDiligenceItemBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    check_category: str
    check_title: str
    responsible_officer: str
    verification_date: date
    risk_level: str = "LOW"  # LOW, MEDIUM, HIGH, CRITICAL
    decision: str = "PASSED"  # PASSED, CONDITIONAL, FAILED_BLOCKING, IN_PROGRESS
    evidence_documents: Optional[str] = None
    remarks: Optional[str] = None
    is_blocking: bool = False


class DueDiligenceItemCreate(DueDiligenceItemBase):
    pass


class DueDiligenceItemUpdate(BaseModel):
    check_title: Optional[str] = None
    responsible_officer: Optional[str] = None
    verification_date: Optional[date] = None
    risk_level: Optional[str] = None
    decision: Optional[str] = None
    evidence_documents: Optional[str] = None
    remarks: Optional[str] = None
    is_blocking: Optional[bool] = None


class DueDiligenceItemResponse(DueDiligenceItemBase):
    id: int
    due_diligence_id: int
    created_at: Optional[datetime] = None


class LegalDueDiligenceBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    diligence_code: str
    parcel_id: int
    lead_legal_counsel: str
    law_firm_name: Optional[str] = None
    overall_risk_level: str = "LOW"  # LOW, MEDIUM, HIGH, CRITICAL
    clearance_status: str = "UNDER_REVIEW"  # CLEARED, CONDITIONAL_CLEARANCE, BLOCKED, UNDER_REVIEW
    acquisition_blocked: bool = False
    exception_approved_by: Optional[str] = None
    exception_reason: Optional[str] = None
    summary_legal_opinion: Optional[str] = None
    title_search_period_years: int = 30
    sub_registry_office_searched: Optional[str] = None
    encumbrance_certificate_no: Optional[str] = None
    non_encumbrance_certificate_date: Optional[date] = None


class LegalDueDiligenceCreate(BaseModel):
    parcel_id: int
    lead_legal_counsel: str
    law_firm_name: Optional[str] = None
    overall_risk_level: Optional[str] = "LOW"
    clearance_status: Optional[str] = "UNDER_REVIEW"
    summary_legal_opinion: Optional[str] = None
    title_search_period_years: Optional[int] = 30
    sub_registry_office_searched: Optional[str] = None
    encumbrance_certificate_no: Optional[str] = None
    non_encumbrance_certificate_date: Optional[date] = None


class LegalDueDiligenceUpdate(BaseModel):
    lead_legal_counsel: Optional[str] = None
    law_firm_name: Optional[str] = None
    overall_risk_level: Optional[str] = None
    clearance_status: Optional[str] = None
    acquisition_blocked: Optional[bool] = None
    exception_approved_by: Optional[str] = None
    exception_reason: Optional[str] = None
    summary_legal_opinion: Optional[str] = None
    title_search_period_years: Optional[int] = None
    sub_registry_office_searched: Optional[str] = None
    encumbrance_certificate_no: Optional[str] = None
    non_encumbrance_certificate_date: Optional[date] = None


class LegalDueDiligenceResponse(LegalDueDiligenceBase):
    id: int
    parcel: Optional[LandParcelResponse] = None
    items: List[DueDiligenceItemResponse] = []
    blocking_items_count: int = 0
    passed_items_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DueDiligenceExceptionApprovalRequest(BaseModel):
    exception_approved_by: str
    exception_reason: str
    override_blocked_status: bool = True


# -------------------------------------------------------------
# 11. Automated JV Ratio Allocation Request & Matrix Response
# -------------------------------------------------------------
class JVAutoAllocationRequest(BaseModel):
    jv_agreement_id: int
    total_floors: int = 14
    units_per_floor: int = 4
    unit_gross_sft: float = 0.00
    allocation_strategy: str = "ALTERNATE_FLOORS"


class JVAutoAllocationResponse(BaseModel):
    jv_agreement_id: int
    total_units_generated: int
    landowner_units_count: int
    developer_units_count: int
    landowner_total_sft: float
    developer_total_sft: float
    allocated_units: List[JVUnitAllocationResponse]


# -------------------------------------------------------------
# 12. Land Bank (Proposal) Schemas
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
    opportunity_source: str = "BROKER"  # BROKER, LANDOWNER, AGENT, INTERNAL_TEAM
    source_contact_details: Optional[str] = None
    road_access_width_ft: float = 40.0
    surrounding_development: Optional[str] = None
    proposed_development_type: str = "RESIDENTIAL"
    far_potential: float = 4.50
    max_allowable_floors: int = 14
    ground_coverage_percent: float = 50.00
    estimated_builtup_sqft: float = 0.0
    indicative_cost_total: float = 0.0
    indicative_cost_per_katha: float = 0.0
    status: str = "DRAFT_PROPOSAL"
    workflow_stage: str = "IDENTIFIED"
    preliminary_valuation_notes: Optional[str] = None
    feasibility_report_summary: Optional[Dict[str, Any]] = None
    location_description: Optional[str] = None


class LandBankCreate(BaseModel):
    project_code: str
    proposal_title: str
    mouza_name: str
    jl_number: str
    upazila_thana: Optional[str] = "Gulshan"
    district: Optional[str] = "Dhaka"
    sub_registry_office: Optional[str] = "Gulshan Sub-Registry Office"
    input_unit: str = "KATHA"
    input_value: float
    deal_type: str = "JOINT_VENTURE"
    opportunity_source: Optional[str] = "BROKER"
    source_contact_details: Optional[str] = None
    road_access_width_ft: Optional[float] = 40.0
    surrounding_development: Optional[str] = None
    proposed_development_type: Optional[str] = "RESIDENTIAL"
    far_potential: Optional[float] = 4.50
    max_allowable_floors: Optional[int] = 14
    ground_coverage_percent: Optional[float] = 50.00
    indicative_cost_total: Optional[float] = 0.0
    status: Optional[str] = "DRAFT_PROPOSAL"
    workflow_stage: Optional[str] = "IDENTIFIED"
    location_description: Optional[str] = None
    preliminary_valuation_notes: Optional[str] = None
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
    opportunity_source: Optional[str] = None
    source_contact_details: Optional[str] = None
    road_access_width_ft: Optional[float] = None
    surrounding_development: Optional[str] = None
    proposed_development_type: Optional[str] = None
    far_potential: Optional[float] = None
    max_allowable_floors: Optional[int] = None
    ground_coverage_percent: Optional[float] = None
    indicative_cost_total: Optional[float] = None
    status: Optional[str] = None
    workflow_stage: Optional[str] = None
    preliminary_valuation_notes: Optional[str] = None
    location_description: Optional[str] = None


class LandBankResponse(LandBankBase):
    id: int
    landowners: List[LandownerResponse] = []
    parcels: List[LandParcelResponse] = []
    survey_records: List[SurveyRecordResponse] = []
    jv_agreements: List[JVAgreementResponse] = []
    khatians: List[LandKhatianResponse] = []
    dags: List[LandDagResponse] = []
    documents: List[LandDeedDocumentResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# -------------------------------------------------------------
# 13. Feasibility & Comparison Schemas
# -------------------------------------------------------------
class LandFeasibilityReportResponse(BaseModel):
    proposal_id: int
    project_code: str
    proposal_title: str
    location: str
    mouza_info: str
    plot_size_katha: float
    plot_size_decimal: float
    plot_size_sqft: float
    road_width_ft: float
    far: float
    allowable_floors: int
    ground_coverage_percent: float
    total_builtup_sqft: float
    ground_footprint_sqft: float
    indicative_acquisition_cost: float
    cost_per_katha: float
    estimated_construction_cost: float
    projected_revenue: float
    estimated_gross_profit: float
    gross_margin_percent: float
    workflow_stage: str
    recommendation: str
    key_risks: List[str] = []
    opportunities: List[str] = []


class LandProposalComparisonItem(BaseModel):
    id: int
    project_code: str
    proposal_title: str
    location: str
    mouza_name: str
    source: str
    area_katha: float
    road_width_ft: float
    proposed_type: str
    far_potential: float
    max_floors: int
    builtup_sqft: float
    total_cost: float
    cost_per_katha: float
    workflow_stage: str
    status: str


# -------------------------------------------------------------
# 14. Deed Chain Verification Response
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
    verification_status: str
    remarks: str


# ==============================================================================
# 15. Land Valuation and Acquisition Costing (Module 2.8)
# ==============================================================================
class LandValuationBase(BaseModel):
    parcel_id: int
    valuation_date: date
    valuation_source: str = "INTERNAL_ESTIMATE"
    assessor_name: str
    assessor_company: Optional[str] = None
    assessor_license_no: Optional[str] = None
    asking_price_total_bdt: float = 0.0
    market_valuation_total_bdt: float = 0.0
    govt_mouza_rate_per_decimal_bdt: float = 0.0
    govt_mouza_valuation_total_bdt: float = 0.0
    recommended_offer_price_bdt: float = 0.0
    notes_and_methodology: Optional[str] = None
    approval_status: str = "DRAFT"

class LandValuationCreate(BaseModel):
    parcel_id: int
    valuation_date: date
    valuation_source: Optional[str] = "INTERNAL_ESTIMATE"
    assessor_name: str
    assessor_company: Optional[str] = None
    assessor_license_no: Optional[str] = None
    asking_price_total_bdt: Optional[float] = 0.0
    market_valuation_total_bdt: Optional[float] = 0.0
    govt_mouza_rate_per_decimal_bdt: Optional[float] = 0.0
    govt_mouza_valuation_total_bdt: Optional[float] = 0.0
    recommended_offer_price_bdt: Optional[float] = 0.0
    notes_and_methodology: Optional[str] = None
    approval_status: Optional[str] = "DRAFT"

class LandValuationUpdate(BaseModel):
    valuation_date: Optional[date] = None
    valuation_source: Optional[str] = None
    assessor_name: Optional[str] = None
    assessor_company: Optional[str] = None
    assessor_license_no: Optional[str] = None
    asking_price_total_bdt: Optional[float] = None
    market_valuation_total_bdt: Optional[float] = None
    govt_mouza_rate_per_decimal_bdt: Optional[float] = None
    govt_mouza_valuation_total_bdt: Optional[float] = None
    recommended_offer_price_bdt: Optional[float] = None
    notes_and_methodology: Optional[str] = None
    approval_status: Optional[str] = None
    approved_by: Optional[str] = None
    approval_date: Optional[date] = None
    approval_remarks: Optional[str] = None

class LandValuationResponse(LandValuationBase):
    id: int
    valuation_code: str
    approved_by: Optional[str] = None
    approval_date: Optional[date] = None
    approval_remarks: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AcquisitionExpenseItemBase(BaseModel):
    expense_category: str
    item_description: str
    payee_name: Optional[str] = None
    estimated_amount_bdt: float = 0.0
    actual_amount_bdt: float = 0.0
    payment_status: str = "PLANNED"
    accounting_treatment: str = "CAPITALIZE_LAND"
    payment_date: Optional[date] = None
    receipt_voucher_ref: Optional[str] = None
    supporting_document_url: Optional[str] = None
    notes: Optional[str] = None

class AcquisitionExpenseItemCreate(AcquisitionExpenseItemBase):
    pass

class AcquisitionExpenseItemUpdate(BaseModel):
    expense_category: Optional[str] = None
    item_description: Optional[str] = None
    payee_name: Optional[str] = None
    estimated_amount_bdt: Optional[float] = None
    actual_amount_bdt: Optional[float] = None
    payment_status: Optional[str] = None
    accounting_treatment: Optional[str] = None
    payment_date: Optional[date] = None
    receipt_voucher_ref: Optional[str] = None
    supporting_document_url: Optional[str] = None
    notes: Optional[str] = None

class AcquisitionExpenseItemResponse(AcquisitionExpenseItemBase):
    id: int
    costing_id: int
    variance_amount_bdt: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AcquisitionCostingBase(BaseModel):
    parcel_id: int
    valuation_id: Optional[int] = None
    costing_date: date
    costing_status: str = "ESTIMATED"
    agreed_purchase_price_bdt: float = 0.0
    budget_allocated_bdt: float = 0.0
    remarks: Optional[str] = None

class AcquisitionCostingCreate(BaseModel):
    parcel_id: int
    valuation_id: Optional[int] = None
    costing_date: date
    costing_status: Optional[str] = "ESTIMATED"
    agreed_purchase_price_bdt: float = 0.0
    budget_allocated_bdt: float = 0.0
    remarks: Optional[str] = None
    expense_items: Optional[List[AcquisitionExpenseItemCreate]] = []

class AcquisitionCostingUpdate(BaseModel):
    valuation_id: Optional[int] = None
    costing_date: Optional[date] = None
    costing_status: Optional[str] = None
    agreed_purchase_price_bdt: Optional[float] = None
    budget_allocated_bdt: Optional[float] = None
    remarks: Optional[str] = None
    approval_stage: Optional[str] = None

class AcquisitionCostingResponse(BaseModel):
    id: int
    costing_code: str
    parcel_id: int
    valuation_id: Optional[int] = None
    costing_date: date
    costing_status: str
    agreed_purchase_price_bdt: float
    budget_allocated_bdt: float
    total_estimated_expenses_bdt: float
    total_actual_expenses_bdt: float
    total_estimated_cost_bdt: float
    total_actual_cost_bdt: float
    remaining_budget_bdt: float
    cost_variance_bdt: float
    cost_variance_percent: float
    cost_per_decimal_bdt: float
    cost_per_katha_bdt: float
    cost_per_sqft_bdt: float
    capitalized_land_cost_bdt: float
    capitalized_development_cost_bdt: float
    expensed_acquisition_cost_bdt: float
    approval_stage: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    approval_notes: Optional[str] = None
    remarks: Optional[str] = None
    expense_items: List[AcquisitionExpenseItemResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CostingApprovalRequest(BaseModel):
    approved_by: str
    approval_stage: str = "BOARD_APPROVED"
    approval_notes: Optional[str] = None

class ValuationApprovalRequest(BaseModel):
    approved_by: str
    approval_status: str = "APPROVED"
    approval_remarks: Optional[str] = None

class ValuationComparisonSummary(BaseModel):
    parcel_id: int
    parcel_name: str
    total_area_decimal: float
    total_area_katha: float
    total_area_sqft: float
    asking_price: float
    market_valuation: float
    govt_mouza_valuation: float
    negotiated_agreed_price: float
    variance_asking_vs_negotiated: float
    variance_market_vs_negotiated: float
    valuations_count: int
    valuations: List[LandValuationResponse] = []


# ==============================================================================
# 16. Landowner Negotiation & Agreement Management (Module 2.9)
# ==============================================================================

class NegotiationMeetingBase(BaseModel):
    meeting_date: date
    meeting_venue: Optional[str] = None
    developer_attendees: str
    landowner_attendees: str
    discussion_minutes: str
    follow_up_tasks: Optional[str] = None
    next_meeting_date: Optional[date] = None

class NegotiationMeetingCreate(NegotiationMeetingBase):
    pass

class NegotiationMeetingResponse(NegotiationMeetingBase):
    id: int
    negotiation_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NegotiationTermVersionBase(BaseModel):
    version_number: int
    offered_by_party: str = "DEVELOPER"
    proposed_price_bdt: float = 0.0
    proposed_advance_bdt: float = 0.0
    proposed_timeline_days: Optional[int] = None
    revision_summary: str
    created_by_officer: str

class NegotiationTermVersionCreate(BaseModel):
    offered_by_party: str = "DEVELOPER"
    proposed_price_bdt: float
    proposed_advance_bdt: Optional[float] = 0.0
    proposed_timeline_days: Optional[int] = None
    revision_summary: str
    created_by_officer: str

class NegotiationTermVersionResponse(NegotiationTermVersionBase):
    id: int
    negotiation_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LandNegotiationBase(BaseModel):
    parcel_id: int
    landowner_id: Optional[int] = None
    negotiation_title: str
    negotiation_stage: str = "INITIAL_OFFER"
    initial_asking_price_bdt: float = 0.0
    developer_target_price_bdt: float = 0.0
    current_offer_amount_bdt: float = 0.0
    current_counteroffer_amount_bdt: float = 0.0
    final_agreed_amount_bdt: float = 0.0
    consideration_type: str = "CASH_PURCHASE"
    proposed_advance_bdt: float = 0.0
    installment_terms_summary: Optional[str] = None
    non_cash_consideration_details: Optional[str] = None
    conditions_precedent: Optional[str] = None
    negotiation_start_date: date
    target_closing_deadline: date
    agreement_execution_date: Optional[date] = None
    agreement_expiry_date: Optional[date] = None
    agreement_status: str = "DRAFTING"
    is_delayed: bool = False
    delay_reason: Optional[str] = None

class LandNegotiationCreate(BaseModel):
    parcel_id: int
    landowner_id: Optional[int] = None
    negotiation_title: str
    negotiation_stage: Optional[str] = "INITIAL_OFFER"
    initial_asking_price_bdt: Optional[float] = 0.0
    developer_target_price_bdt: Optional[float] = 0.0
    current_offer_amount_bdt: Optional[float] = 0.0
    current_counteroffer_amount_bdt: Optional[float] = 0.0
    final_agreed_amount_bdt: Optional[float] = 0.0
    consideration_type: Optional[str] = "CASH_PURCHASE"
    proposed_advance_bdt: Optional[float] = 0.0
    installment_terms_summary: Optional[str] = None
    non_cash_consideration_details: Optional[str] = None
    conditions_precedent: Optional[str] = None
    negotiation_start_date: date
    target_closing_deadline: date
    agreement_execution_date: Optional[date] = None
    agreement_expiry_date: Optional[date] = None
    agreement_status: Optional[str] = "DRAFTING"

class LandNegotiationUpdate(BaseModel):
    negotiation_title: Optional[str] = None
    landowner_id: Optional[int] = None
    negotiation_stage: Optional[str] = None
    initial_asking_price_bdt: Optional[float] = None
    developer_target_price_bdt: Optional[float] = None
    current_offer_amount_bdt: Optional[float] = None
    current_counteroffer_amount_bdt: Optional[float] = None
    final_agreed_amount_bdt: Optional[float] = None
    consideration_type: Optional[str] = None
    proposed_advance_bdt: Optional[float] = None
    installment_terms_summary: Optional[str] = None
    non_cash_consideration_details: Optional[str] = None
    conditions_precedent: Optional[str] = None
    target_closing_deadline: Optional[date] = None
    agreement_execution_date: Optional[date] = None
    agreement_expiry_date: Optional[date] = None
    agreement_status: Optional[str] = None
    is_delayed: Optional[bool] = None
    delay_reason: Optional[str] = None

class LandNegotiationResponse(LandNegotiationBase):
    id: int
    negotiation_code: str
    terms_approved_by: Optional[str] = None
    terms_approved_at: Optional[datetime] = None
    approval_notes: Optional[str] = None
    current_version: int = 1
    meetings: List[NegotiationMeetingResponse] = []
    term_versions: List[NegotiationTermVersionResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NegotiationTermsApprovalRequest(BaseModel):
    approved_by: str
    final_agreed_amount_bdt: Optional[float] = None
    approval_notes: Optional[str] = None

class NegotiationOfferRevisionRequest(BaseModel):
    offered_by_party: str
    proposed_price_bdt: float
    proposed_advance_bdt: Optional[float] = 0.0
    proposed_timeline_days: Optional[int] = None
    revision_summary: str
    created_by_officer: str

class NegotiationAlertsResponse(BaseModel):
    total_delayed: int
    total_expiring: int
    delayed_negotiations: List[LandNegotiationResponse] = []
    expiring_agreements: List[LandNegotiationResponse] = []


# -------------------------------------------------------------
# 15. Land Payment Schedules & Outstanding Balances (2.10)
# -------------------------------------------------------------
class LandPaymentTransactionBase(BaseModel):
    transaction_date: date
    amount_bdt: float
    payment_method: str = "BANK_TRANSFER"
    bank_name: Optional[str] = None
    account_no: Optional[str] = None
    instrument_no: Optional[str] = None
    accounting_voucher_no: Optional[str] = None
    is_reversal: bool = False
    reversal_reason: Optional[str] = None
    reversed_transaction_id: Optional[int] = None
    posted_by: str
    notes: Optional[str] = None

class LandPaymentTransactionCreate(BaseModel):
    transaction_date: date
    amount_bdt: float
    payment_method: str = "BANK_TRANSFER"
    bank_name: Optional[str] = None
    account_no: Optional[str] = None
    instrument_no: Optional[str] = None
    accounting_voucher_no: Optional[str] = None
    posted_by: str
    notes: Optional[str] = None

class LandPaymentTransactionResponse(LandPaymentTransactionBase):
    id: int
    schedule_id: int
    transaction_code: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LandPaymentScheduleBase(BaseModel):
    parcel_id: int
    acquisition_costing_id: Optional[int] = None
    negotiation_id: Optional[int] = None
    jv_agreement_id: Optional[int] = None
    landowner_id: Optional[int] = None
    installment_number: int = 1
    installment_title: str
    payment_type: str = "ADVANCE_PAYMENT"
    due_date: date
    due_amount_bdt: float = 0.0
    paid_amount_bdt: float = 0.0
    outstanding_amount_bdt: float = 0.0
    payment_method: str = "BANK_TRANSFER"
    beneficiary_name: Optional[str] = None
    beneficiary_bank_name: Optional[str] = None
    beneficiary_bank_branch: Optional[str] = None
    beneficiary_account_no: Optional[str] = None
    beneficiary_routing_no: Optional[str] = None
    transaction_reference: Optional[str] = None
    approval_status: str = "DRAFT"
    accounting_voucher_no: Optional[str] = None
    gl_account_code: Optional[str] = "1120-LAND-ACQ-CAPEX"
    is_overdue: bool = False
    notes: Optional[str] = None

class LandPaymentScheduleCreate(BaseModel):
    parcel_id: int
    acquisition_costing_id: Optional[int] = None
    negotiation_id: Optional[int] = None
    jv_agreement_id: Optional[int] = None
    landowner_id: Optional[int] = None
    installment_number: Optional[int] = 1
    installment_title: str
    payment_type: Optional[str] = "ADVANCE_PAYMENT"
    due_date: date
    due_amount_bdt: float
    payment_method: Optional[str] = "BANK_TRANSFER"
    beneficiary_name: Optional[str] = None
    beneficiary_bank_name: Optional[str] = None
    beneficiary_bank_branch: Optional[str] = None
    beneficiary_account_no: Optional[str] = None
    beneficiary_routing_no: Optional[str] = None
    transaction_reference: Optional[str] = None
    accounting_voucher_no: Optional[str] = None
    gl_account_code: Optional[str] = "1120-LAND-ACQ-CAPEX"
    notes: Optional[str] = None

class LandPaymentScheduleUpdate(BaseModel):
    installment_title: Optional[str] = None
    payment_type: Optional[str] = None
    due_date: Optional[date] = None
    due_amount_bdt: Optional[float] = None
    payment_method: Optional[str] = None
    beneficiary_name: Optional[str] = None
    beneficiary_bank_name: Optional[str] = None
    beneficiary_bank_branch: Optional[str] = None
    beneficiary_account_no: Optional[str] = None
    beneficiary_routing_no: Optional[str] = None
    transaction_reference: Optional[str] = None
    approval_status: Optional[str] = None
    accounting_voucher_no: Optional[str] = None
    gl_account_code: Optional[str] = None
    is_overdue: Optional[bool] = None
    notes: Optional[str] = None

class LandPaymentScheduleResponse(LandPaymentScheduleBase):
    id: int
    schedule_code: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    approved_variation_amount: float = 0.0
    approval_notes: Optional[str] = None
    transactions: List[LandPaymentTransactionResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PaymentApprovalRequest(BaseModel):
    approved_by: str
    approval_status: str = "APPROVED_FOR_PAYMENT"  # APPROVED_FOR_PAYMENT or REJECTED
    approved_variation_amount: Optional[float] = 0.0
    approval_notes: Optional[str] = None

class PaymentDisbursementRequest(BaseModel):
    transaction_date: date
    amount_bdt: float
    payment_method: str = "BANK_TRANSFER"
    bank_name: Optional[str] = None
    account_no: Optional[str] = None
    instrument_no: Optional[str] = None
    accounting_voucher_no: str
    posted_by: str
    notes: Optional[str] = None

class PaymentReversalRequest(BaseModel):
    reversal_reason: str
    posted_by: str
    notes: Optional[str] = None

class PaymentScheduleAutoGenerateRequest(BaseModel):
    parcel_id: int
    landowner_id: Optional[int] = None
    negotiation_id: Optional[int] = None
    total_agreed_amount_bdt: float
    earnest_money_percent: Optional[float] = 10.0
    advance_bayna_percent: Optional[float] = 30.0
    interim_milestone_percent: Optional[float] = 30.0
    final_settlement_percent: Optional[float] = 30.0
    start_date: date
    days_interval_between_stages: Optional[int] = 30

class PaymentReconciliationSummary(BaseModel):
    total_contractual_due_bdt: float
    total_approved_bdt: float
    total_paid_bdt: float
    total_outstanding_bdt: float
    total_overdue_bdt: float
    overdue_count: int
    schedules_count: int
    paid_count: int
    pending_count: int



