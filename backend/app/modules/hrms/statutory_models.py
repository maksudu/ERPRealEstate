"""
HRMS Statutory, Tax & Labour Compliance Models
Bangladesh Labour Act 2006, Bangladesh Labour Rules 2015, and Income Tax Act 2023.
"""
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Numeric, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class HrmTaxConfiguration(Base):
    __tablename__ = "hrm_tax_configurations"

    id = Column(Integer, primary_key=True, index=True)
    assessment_year = Column(String(50), nullable=False, index=True) # e.g. 2025-2026, 2026-2027
    slab_name = Column(String(150), nullable=False) # e.g. "First 350,000 (General Exemption)"
    min_amount = Column(Numeric(15, 2), nullable=False, default=0.00)
    max_amount = Column(Numeric(15, 2), nullable=False, default=0.00)
    tax_rate_percent = Column(Numeric(5, 2), nullable=False, default=0.00) # 0%, 5%, 10%, 15%, 20%, 25%
    gender_group = Column(String(50), nullable=False, default="ALL") # ALL, MALE, FEMALE_SENIOR, PHYSICALLY_CHALLENGED, FREEDOM_FIGHTER
    special_exemption_limit = Column(Numeric(15, 2), nullable=False, default=350000.00)
    min_tax_amount = Column(Numeric(10, 2), nullable=False, default=5000.00) # City Corp min tax
    is_active = Column(Boolean, nullable=False, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class HrmTaxDeduction(Base):
    __tablename__ = "hrm_tax_deductions"

    id = Column(Integer, primary_key=True, index=True)
    deduction_ref = Column(String(50), unique=True, index=True, nullable=False) # e.g. TDS-2026-10-001
    employee_id = Column(Integer, nullable=True, index=True)
    employee_name = Column(String(150), nullable=False, index=True)
    department = Column(String(100), nullable=False, index=True)
    fiscal_year = Column(String(50), nullable=False, default="2026-2027")
    tax_month = Column(String(50), nullable=False) # e.g. October 2026
    gross_salary = Column(Numeric(15, 2), nullable=False, default=0.00)
    taxable_salary = Column(Numeric(15, 2), nullable=False, default=0.00)
    tds_amount = Column(Numeric(15, 2), nullable=False, default=0.00)
    challan_number = Column(String(100), nullable=True) # Treasury challan code
    challan_date = Column(Date, nullable=True)
    bank_name = Column(String(150), nullable=False, default="Sonali Bank PLC")
    bank_branch = Column(String(100), nullable=False, default="Customs & Treasury Branch, Dhaka")
    status = Column(String(50), nullable=False, default="DEPOSITED") # PENDING, DEPOSITED, RECONCILED
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class HrmTaxCertificate(Base):
    __tablename__ = "hrm_tax_certificates"

    id = Column(Integer, primary_key=True, index=True)
    certificate_number = Column(String(50), unique=True, index=True, nullable=False) # e.g. CERT-108-2026-081
    employee_id = Column(Integer, nullable=True, index=True)
    employee_name = Column(String(150), nullable=False, index=True)
    etin = Column(String(50), nullable=False, index=True) # 12-digit e-TIN
    tax_circle = Column(String(100), nullable=False, default="Circle 12, Salary")
    tax_zone = Column(String(100), nullable=False, default="Tax Zone 06, Dhaka")
    assessment_year = Column(String(50), nullable=False, default="2026-2027")
    gross_earnings = Column(Numeric(15, 2), nullable=False, default=0.00)
    total_tax_deducted = Column(Numeric(15, 2), nullable=False, default=0.00)
    issue_date = Column(Date, nullable=False, default=date.today)
    authorized_signatory = Column(String(150), nullable=False, default="Chief Financial Officer")
    status = Column(String(50), nullable=False, default="ISSUED") # DRAFT, ISSUED, SUBMITTED
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class HrmStatutoryRegister(Base):
    __tablename__ = "hrm_statutory_registers"

    id = Column(Integer, primary_key=True, index=True)
    register_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. BLA-REG-008
    register_type = Column(String(50), nullable=False, index=True) # FORM_8_WORKER, FORM_9_LEAVE, FORM_11_OVERTIME, FORM_15_FINE, FORM_35_MATERNITY, FORM_36_ACCIDENT
    register_name = Column(String(200), nullable=False)
    department_or_site = Column(String(150), nullable=False, index=True)
    calendar_year = Column(String(20), nullable=False, default="2026")
    total_entries = Column(Integer, nullable=False, default=0)
    verified_by = Column(String(150), nullable=False, default="Head of HR & Admin")
    verification_date = Column(Date, nullable=True)
    status = Column(String(50), nullable=False, default="CURRENT") # CURRENT, ARCHIVED, AUDITED
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class HrmEmploymentContract(Base):
    __tablename__ = "hrm_employment_contracts"

    id = Column(Integer, primary_key=True, index=True)
    contract_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. CNT-2026-042
    employee_id = Column(Integer, nullable=True, index=True)
    employee_name = Column(String(150), nullable=False, index=True)
    designation = Column(String(150), nullable=False)
    department = Column(String(150), nullable=False, index=True)
    contract_type = Column(String(50), nullable=False, default="PERMANENT") # PERMANENT, PROBATION, CONTRACTUAL, PROJECT_BASED, CONSULTANT
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    probation_months = Column(Integer, nullable=False, default=6)
    notice_period_days = Column(Integer, nullable=False, default=60)
    base_salary = Column(Numeric(15, 2), nullable=False, default=0.00)
    status = Column(String(50), nullable=False, default="ACTIVE") # ACTIVE, EXPIRED, TERMINATED, RENEWED
    terms_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class HrmPolicyAcknowledgment(Base):
    __tablename__ = "hrm_policy_acknowledgments"

    id = Column(Integer, primary_key=True, index=True)
    policy_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. POL-HR-001
    policy_title = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False, default="CONDUCT") # CONDUCT, SAFETY_OHS, ANTI_HARASSMENT, PRIVACY, WHISTLEBLOWER
    mandatory_for = Column(String(100), nullable=False, default="ALL") # ALL, SITE_ENGINEERS, MANAGEMENT, OFFICE_STAFF
    version = Column(String(20), nullable=False, default="2.1")
    effective_date = Column(Date, nullable=False, default=date.today)
    required_signoffs = Column(Integer, nullable=False, default=150)
    acknowledged_count = Column(Integer, nullable=False, default=142)
    status = Column(String(50), nullable=False, default="ACTIVE") # ACTIVE, UNDER_REVISION, RETIRED
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class HrmStatutoryAuditDoc(Base):
    __tablename__ = "hrm_statutory_audit_docs"

    id = Column(Integer, primary_key=True, index=True)
    audit_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. AUD-DIFE-2026-01
    regulatory_authority = Column(String(100), nullable=False, index=True) # DIFE, NBR, RJSC, FIRE_SERVICE, RAJUK, CITY_CORP
    document_type = Column(String(100), nullable=False) # Factory Inspection, Trade License, Fire Clearance, Environmental Clearance
    title = Column(String(200), nullable=False)
    reference_number = Column(String(100), nullable=False)
    issue_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=True)
    responsible_officer = Column(String(150), nullable=False, default="Chief Compliance Officer")
    compliance_rating = Column(String(50), nullable=False, default="GRADE_A") # GRADE_A, GRADE_B, CONDITIONAL, NON_COMPLIANT
    status = Column(String(50), nullable=False, default="VALID") # VALID, RENEWAL_DUE, EXPIRED, UNDER_INSPECTION
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
