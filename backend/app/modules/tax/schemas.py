from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# --------------------------------------------------------------------------
# 1. Dynamic Tax Withholding Rules (Income Tax Act 2023 & VAT Act 2012)
# --------------------------------------------------------------------------
class TaxWithholdingRuleBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rule_code: str
    rule_type: str # "TDS", "VDS"
    tax_section: str
    category_name: str
    min_bill_amount: float = 0.00
    max_bill_amount: Optional[float] = None
    rate_with_tin: float
    rate_without_tin: float
    is_active: bool = True
    description: Optional[str] = None

class TaxWithholdingRuleCreate(TaxWithholdingRuleBase):
    pass

class TaxWithholdingRuleResponse(TaxWithholdingRuleBase):
    id: int
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# 2. Dynamic Section 53FF Tax Zone Rates (Rajuk / City Corp / Pourashava)
# --------------------------------------------------------------------------
class TaxZoneRateBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    zone_code: str
    zone_name: str
    city_authority: str # RAJUK, CDA, KDA, RDA, POURASHAVA, CANTONMENT
    rate_per_sqm_residential: float
    rate_per_sqm_commercial: float
    rate_per_sft_residential: float
    rate_per_sft_commercial: float
    is_active: bool = True
    description: Optional[str] = None

class TaxZoneRateCreate(TaxZoneRateBase):
    pass

class TaxZoneRateResponse(TaxZoneRateBase):
    id: int
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# 3. Dynamic TDS & VDS Calculator Request & Response
# --------------------------------------------------------------------------
class TDSVDSCalculationRequest(BaseModel):
    bill_type: str # "CONTRACTOR_CIVIL", "CONSULTANT_PROFESSIONAL", "SUPPLIER_GOODS", "COMMISSION_BROKER", "RENT_LEASE", "VDS_PROCUREMENT"
    category: Optional[str] = None # e.g. "SAND_STONE", "BRICKS", "TILES", "TRANSPORT", "CONSULTANCY"
    gross_amount: float = Field(..., gt=0, description="Gross bill amount in BDT")
    payee_has_tin: bool = True
    payee_submitted_return_proof: bool = True
    is_withholding_entity: bool = True # Real Estate developer is designated withholding entity

class TDSVDSCalculationResponse(BaseModel):
    bill_type: str
    category: Optional[str] = None
    gross_amount: float
    
    # TDS component (Income Tax Act 2023)
    applicable_tds_section: str
    tds_rate_percent: float
    tds_deduction_amount: float
    tds_slab_applied: str
    
    # VDS component (VAT Act 2012)
    applicable_vds_rule: str
    vds_rate_percent: float
    vds_deduction_amount: float
    
    # Net Payable
    total_tax_deducted: float
    net_payable_to_vendor: float
    
    # Statutory Compliance Notes
    statutory_notes: List[str]
    required_challan_code: str


# --------------------------------------------------------------------------
# 4. Section 53FF Advance Income Tax (AIT) Calculator
# --------------------------------------------------------------------------
class AITSection53FFRequest(BaseModel):
    deed_value_bdt: float = Field(..., gt=0)
    apartment_sqft: float = Field(..., gt=0)
    zone_code: str # GULSHAN_BANANI, DHANMONDI_UTTARA, PURBACHAL_OTHER, CHITTAGONG_METRO, OTHER_DISTRICT
    property_type: str = "RESIDENTIAL" # "RESIDENTIAL", "COMMERCIAL"
    is_basement_car_parking_included: bool = True
    car_parking_count: int = 1

class AITSection53FFResponse(BaseModel):
    deed_value_bdt: float
    apartment_sqft: float
    apartment_sqm: float
    zone_code: str
    zone_name: str
    city_authority: str
    property_type: str
    
    # Section 53FF AIT Breakdown
    ait_rate_per_sqm: float
    ait_rate_per_sft: float
    ait_amount_bdt: float
    
    # Other Statutory Sub-Registry Fees
    stamp_duty_rate_percent: float = 1.50
    stamp_duty_amount: float
    registration_fee_rate_percent: float = 1.00
    registration_fee_amount: float
    local_govt_tax_rate_percent: float = 2.00
    local_govt_tax_amount: float
    
    # VAT on Property Transfer (VAT Act 2012)
    vat_rate_percent: float
    vat_amount: float
    
    # Aggregate Execution Cost
    total_statutory_taxes: float
    total_effective_cost: float
    tax_percentage_of_deed_value: float
    
    required_treasury_heads: List[str]


# --------------------------------------------------------------------------
# 5. Mushak 6.3 Tax Invoice Schemas
# --------------------------------------------------------------------------
class Mushak63InvoiceCreate(BaseModel):
    booking_id: int
    taxable_amount: float
    customer_tin_nid: Optional[str] = None
    apartment_type: str = "RESIDENTIAL" # RESIDENTIAL, COMMERCIAL

class Mushak63InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int
    mushak_challan_number: str
    invoice_date: date
    developer_bin_number: str
    customer_tin_nid: str
    apartment_sqft: float
    taxable_amount: float
    vat_rate_percent: float
    vat_amount: float
    total_amount_collected: float
    pdf_url: Optional[str] = None
    status: str
    booking_reference_no: Optional[str] = None
    customer_name: Optional[str] = None
    project_name: Optional[str] = None
    unit_number: Optional[str] = None
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# 6. Mushak 6.5 Material & Subcontractor Transfer Challan Schemas
# --------------------------------------------------------------------------
class Mushak65ItemRow(BaseModel):
    item_name: str
    specification: Optional[str] = ""
    quantity: float
    unit: str # TON, BAG, CFT, NOS, SQFT
    unit_value: float
    total_value: float

class Mushak65ChallanCreate(BaseModel):
    origin_project_id: int
    destination_project_id: Optional[int] = None
    subcontractor_id: Optional[int] = None
    transport_vehicle_type: str = "TRUCK" # TRUCK, PICKUP, COVERED_VAN
    vehicle_number: str
    driver_name: str
    driver_phone: str
    purpose: str = "INTERNAL_TRANSFER" # INTERNAL_TRANSFER, SUBCONTRACTOR_FABRICATION, RETURN_EXCESS
    items: List[Mushak65ItemRow]
    remarks: Optional[str] = None

class Mushak65ChallanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    challan_number: str
    issue_date: date
    issue_time: str
    origin_project_id: int
    origin_project_name: Optional[str] = None
    destination_project_id: Optional[int] = None
    destination_project_name: Optional[str] = None
    subcontractor_id: Optional[int] = None
    subcontractor_name: Optional[str] = None
    transport_vehicle_type: str
    vehicle_number: str
    driver_name: str
    driver_phone: str
    items_json: str
    total_declared_value: float
    purpose: str
    status: str
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None


# --------------------------------------------------------------------------
# 7. Treasury Deposit & Deduction Schemas
# --------------------------------------------------------------------------
class TaxTreasuryChallanCreate(BaseModel):
    challan_no: str
    deposit_date: date
    bank_name: str = "Sonali Bank PLC"
    branch_name: str = "Local Office Branch, Dhaka"
    economic_code: str
    tax_type: str # VAT, TDS, AIT_53FF
    total_deposit_amount: float
    remarks: Optional[str] = None

class TaxTreasuryChallanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    challan_no: str
    deposit_date: date
    bank_name: str
    branch_name: str
    economic_code: str
    tax_type: str
    total_deposit_amount: float
    status: str
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None
