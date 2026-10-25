"""
Pydantic Schemas for HRMS Statutory, Tax & Labour Compliance
"""
from typing import List, Optional, Any, Generic, TypeVar
from pydantic import BaseModel, Field
from datetime import date, datetime
from decimal import Decimal

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    limit: int
    offset: int


# ==========================================
# 1. Tax Configuration Schemas
# ==========================================
class TaxConfigBase(BaseModel):
    assessment_year: str
    slab_name: str
    min_amount: Decimal = Decimal("0.00")
    max_amount: Decimal = Decimal("0.00")
    tax_rate_percent: Decimal = Decimal("0.00")
    gender_group: str = "ALL"
    special_exemption_limit: Decimal = Decimal("350000.00")
    min_tax_amount: Decimal = Decimal("5000.00")
    is_active: bool = True
    notes: Optional[str] = None

class TaxConfigCreate(TaxConfigBase):
    pass

class TaxConfigUpdate(BaseModel):
    assessment_year: Optional[str] = None
    slab_name: Optional[str] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    tax_rate_percent: Optional[Decimal] = None
    gender_group: Optional[str] = None
    special_exemption_limit: Optional[Decimal] = None
    min_tax_amount: Optional[Decimal] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class TaxConfigResponse(TaxConfigBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==========================================
# 2. Tax Deduction (TDS) Schemas
# ==========================================
class TaxDeductionBase(BaseModel):
    deduction_ref: Optional[str] = None
    employee_id: Optional[int] = None
    employee_name: str
    department: str
    fiscal_year: str = "2026-2027"
    tax_month: str
    gross_salary: Decimal = Decimal("0.00")
    taxable_salary: Decimal = Decimal("0.00")
    tds_amount: Decimal = Decimal("0.00")
    challan_number: Optional[str] = None
    challan_date: Optional[date] = None
    bank_name: str = "Sonali Bank PLC"
    bank_branch: str = "Customs & Treasury Branch, Dhaka"
    status: str = "DEPOSITED"
    remarks: Optional[str] = None

class TaxDeductionCreate(TaxDeductionBase):
    pass

class TaxDeductionUpdate(BaseModel):
    employee_name: Optional[str] = None
    department: Optional[str] = None
    fiscal_year: Optional[str] = None
    tax_month: Optional[str] = None
    gross_salary: Optional[Decimal] = None
    taxable_salary: Optional[Decimal] = None
    tds_amount: Optional[Decimal] = None
    challan_number: Optional[str] = None
    challan_date: Optional[date] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[str] = None

class TaxDeductionResponse(TaxDeductionBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==========================================
# 3. Tax Certificate (Form 108) Schemas
# ==========================================
class TaxCertificateBase(BaseModel):
    certificate_number: Optional[str] = None
    employee_id: Optional[int] = None
    employee_name: str
    etin: str
    tax_circle: str = "Circle 12, Salary"
    tax_zone: str = "Tax Zone 06, Dhaka"
    assessment_year: str = "2026-2027"
    gross_earnings: Decimal = Decimal("0.00")
    total_tax_deducted: Decimal = Decimal("0.00")
    issue_date: date = Field(default_factory=date.today)
    authorized_signatory: str = "Chief Financial Officer"
    status: str = "ISSUED"
    remarks: Optional[str] = None

class TaxCertificateCreate(TaxCertificateBase):
    pass

class TaxCertificateUpdate(BaseModel):
    employee_name: Optional[str] = None
    etin: Optional[str] = None
    tax_circle: Optional[str] = None
    tax_zone: Optional[str] = None
    assessment_year: Optional[str] = None
    gross_earnings: Optional[Decimal] = None
    total_tax_deducted: Optional[Decimal] = None
    issue_date: Optional[date] = None
    authorized_signatory: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[str] = None

class TaxCertificateResponse(TaxCertificateBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==========================================
# 4. Statutory Register Schemas
# ==========================================
class StatutoryRegisterBase(BaseModel):
    register_code: Optional[str] = None
    register_type: str # FORM_8_WORKER, FORM_9_LEAVE, FORM_11_OVERTIME, FORM_15_FINE, FORM_35_MATERNITY, FORM_36_ACCIDENT
    register_name: str
    department_or_site: str
    calendar_year: str = "2026"
    total_entries: int = 0
    verified_by: str = "Head of HR & Admin"
    verification_date: Optional[date] = None
    status: str = "CURRENT"
    remarks: Optional[str] = None

class StatutoryRegisterCreate(StatutoryRegisterBase):
    pass

class StatutoryRegisterUpdate(BaseModel):
    register_type: Optional[str] = None
    register_name: Optional[str] = None
    department_or_site: Optional[str] = None
    calendar_year: Optional[str] = None
    total_entries: Optional[int] = None
    verified_by: Optional[str] = None
    verification_date: Optional[date] = None
    status: Optional[str] = None
    remarks: Optional[str] = None

class StatutoryRegisterResponse(StatutoryRegisterBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==========================================
# 5. Employment Contract Schemas
# ==========================================
class EmploymentContractBase(BaseModel):
    contract_code: Optional[str] = None
    employee_id: Optional[int] = None
    employee_name: str
    designation: str
    department: str
    contract_type: str = "PERMANENT"
    start_date: date
    end_date: Optional[date] = None
    probation_months: int = 6
    notice_period_days: int = 60
    base_salary: Decimal = Decimal("0.00")
    status: str = "ACTIVE"
    terms_summary: Optional[str] = None

class EmploymentContractCreate(EmploymentContractBase):
    pass

class EmploymentContractUpdate(BaseModel):
    employee_name: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    contract_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    probation_months: Optional[int] = None
    notice_period_days: Optional[int] = None
    base_salary: Optional[Decimal] = None
    status: Optional[str] = None
    terms_summary: Optional[str] = None

class EmploymentContractResponse(EmploymentContractBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==========================================
# 6. Policy Acknowledgment Schemas
# ==========================================
class PolicyAcknowledgmentBase(BaseModel):
    policy_code: Optional[str] = None
    policy_title: str
    category: str = "CONDUCT"
    mandatory_for: str = "ALL"
    version: str = "2.1"
    effective_date: date = Field(default_factory=date.today)
    required_signoffs: int = 150
    acknowledged_count: int = 142
    status: str = "ACTIVE"
    description: Optional[str] = None

class PolicyAcknowledgmentCreate(PolicyAcknowledgmentBase):
    pass

class PolicyAcknowledgmentUpdate(BaseModel):
    policy_title: Optional[str] = None
    category: Optional[str] = None
    mandatory_for: Optional[str] = None
    version: Optional[str] = None
    effective_date: Optional[date] = None
    required_signoffs: Optional[int] = None
    acknowledged_count: Optional[int] = None
    status: Optional[str] = None
    description: Optional[str] = None

class PolicyAcknowledgmentResponse(PolicyAcknowledgmentBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==========================================
# 7. Statutory Audit Document Schemas
# ==========================================
class StatutoryAuditDocBase(BaseModel):
    audit_code: Optional[str] = None
    regulatory_authority: str
    document_type: str
    title: str
    reference_number: str
    issue_date: date
    expiry_date: Optional[date] = None
    responsible_officer: str = "Chief Compliance Officer"
    compliance_rating: str = "GRADE_A"
    status: str = "VALID"
    notes: Optional[str] = None

class StatutoryAuditDocCreate(StatutoryAuditDocBase):
    pass

class StatutoryAuditDocUpdate(BaseModel):
    regulatory_authority: Optional[str] = None
    document_type: Optional[str] = None
    title: Optional[str] = None
    reference_number: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    responsible_officer: Optional[str] = None
    compliance_rating: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class StatutoryAuditDocResponse(StatutoryAuditDocBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==========================================
# Metadata for Dynamic Searchable Dropdowns
# ==========================================
class DropdownOption(BaseModel):
    value: str
    label: str

class StatutoryMetadataResponse(BaseModel):
    assessment_years: List[DropdownOption]
    gender_groups: List[DropdownOption]
    regulatory_authorities: List[DropdownOption]
    register_types: List[DropdownOption]
    contract_types: List[DropdownOption]
    policy_categories: List[DropdownOption]
    departments: List[DropdownOption]
    designations: List[DropdownOption]
    compliance_ratings: List[DropdownOption]
    statuses: List[DropdownOption]
