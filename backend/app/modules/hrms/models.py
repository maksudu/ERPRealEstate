from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.auth.models import Organization, User
from app.modules.projects.models import Project, Tower


class Department(Base):
    """
    Corporate & Site Operational Departments.
    """
    __tablename__ = "hr_departments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    department_code = Column(String(32), unique=True, nullable=False, index=True) # e.g. HR, FIN, ENG, SALES, ARCH, SITE_OPS
    name_en = Column(String(128), nullable=False)
    name_bn = Column(String(128), nullable=True)
    head_of_dept_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization")
    head_of_dept = relationship("User")
    designations = relationship("Designation", back_populates="department")
    employees = relationship("Employee", back_populates="department")


class Designation(Base):
    """
    Standard Designation & Grade Structure.
    """
    __tablename__ = "hr_designations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    department_id = Column(BigInteger, ForeignKey("hr_departments.id", ondelete="CASCADE"), nullable=False, index=True)
    designation_code = Column(String(32), nullable=False, index=True) # e.g. PM, SE, QS, ACCT, SO, MD
    title_en = Column(String(128), nullable=False)
    title_bn = Column(String(128), nullable=True)
    grade_level = Column(String(32), nullable=False, default="GRADE_4") # GRADE_1 (CXO) to GRADE_7 (Support)
    min_salary = Column(Numeric(12, 2), nullable=False, default=15000.00)
    max_salary = Column(Numeric(12, 2), nullable=False, default=300000.00)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    department = relationship("Department", back_populates="designations")
    employees = relationship("Employee", back_populates="designation")


class Employee(Base):
    """
    Dual Workforce Master Registry:
    1. Corporate Head-Office Staff (Management, Sales, Accounts, Legal, Architecture)
    2. Site Operations & Engineering Staff (Project Managers, Civil Engineers, Site Supervisors, Foremen)
    """
    __tablename__ = "hr_employees"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True, index=True) # linked ERP login
    
    employee_code = Column(String(32), unique=True, nullable=False, index=True) # e.g. EMP-1001
    first_name = Column(String(64), nullable=False)
    last_name = Column(String(64), nullable=False)
    official_email = Column(String(128), unique=True, nullable=True, index=True)
    phone = Column(String(32), nullable=False, index=True)
    personal_phone = Column(String(32), nullable=True)
    gender = Column(String(16), nullable=False, default="MALE") # MALE, FEMALE, OTHER
    date_of_birth = Column(Date, nullable=True)
    nid_number = Column(String(32), nullable=True, index=True) # Bangladesh NID
    tin_number = Column(String(32), nullable=True) # Bangladesh E-TIN for TDS
    blood_group = Column(String(8), nullable=True)
    
    emergency_contact_name = Column(String(128), nullable=True)
    emergency_contact_phone = Column(String(32), nullable=True)
    
    joining_date = Column(Date, nullable=False, default=func.current_date())
    confirmation_date = Column(Date, nullable=True)
    probation_months = Column(Integer, nullable=False, default=6)
    
    # Employment Type: PERMANENT, PROBATION, CONTRACTUAL, INTERN, DAILY_WAGE
    employment_type = Column(String(32), nullable=False, default="PROBATION")
    # Workforce Category: CORPORATE, SITE_ENGINEERING, SITE_SUPERVISION
    workforce_category = Column(String(32), nullable=False, default="CORPORATE")
    # Status: ACTIVE, RESIGNED, TERMINATED, ON_LEAVE
    status = Column(String(32), nullable=False, default="ACTIVE", index=True)
    
    department_id = Column(BigInteger, ForeignKey("hr_departments.id", ondelete="RESTRICT"), nullable=False, index=True)
    designation_id = Column(BigInteger, ForeignKey("hr_designations.id", ondelete="RESTRICT"), nullable=False, index=True)
    reporting_to_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="SET NULL"), nullable=True)
    assigned_project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True) # Site assignment
    
    # Banking Info for Salary Disbursal
    bank_account_no = Column(String(64), nullable=True)
    bank_name = Column(String(128), nullable=True)
    bank_branch = Column(String(128), nullable=True)
    routing_no = Column(String(32), nullable=True)
    
    # Bangladesh Labour Act Compliant Salary Breakdown
    basic_salary = Column(Numeric(12, 2), nullable=False, default=0.00)
    house_rent_allowance = Column(Numeric(12, 2), nullable=False, default=0.00) # Typically 50% of basic
    medical_allowance = Column(Numeric(12, 2), nullable=False, default=0.00)    # Typically 10% of basic
    conveyance_allowance = Column(Numeric(12, 2), nullable=False, default=0.00)
    site_hazard_allowance = Column(Numeric(12, 2), nullable=False, default=0.00) # For site construction engineers
    mobile_allowance = Column(Numeric(12, 2), nullable=False, default=0.00)
    
    is_pf_eligible = Column(Boolean, nullable=False, default=True) # 8.33% PF
    is_tax_eligible = Column(Boolean, nullable=False, default=True) # Income Tax TDS
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    department = relationship("Department", back_populates="employees")
    designation = relationship("Designation", back_populates="employees")
    assigned_project = relationship("Project")
    reporting_to = relationship("Employee", remote_side=[id])
    user = relationship("User")


class SiteLabourContractor(Base):
    """
    Subcontractor & Labour Vendor registry for civil, masonry, rod binding, and shuttering trades.
    """
    __tablename__ = "hr_site_labour_contractors"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    company_name = Column(String(191), nullable=False)
    trade_license = Column(String(64), nullable=True)
    contact_person = Column(String(128), nullable=False)
    phone = Column(String(32), nullable=False, index=True)
    email = Column(String(128), nullable=True)
    tax_nid = Column(String(32), nullable=True)
    trade_specialization = Column(String(64), nullable=False, default="CIVIL_CONSTRUCTION") # CIVIL, ROD_BINDING, CARPENTRY, PLUMBING, TILES
    daily_rate_default = Column(Numeric(10, 2), nullable=False, default=800.00)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())


class LabourMusterRoll(Base):
    """
    Daily Site Labour Muster Roll (দৈনিক লেবার মাস্টার রোল)
    Used by Site Engineers and Foremen to record daily labor headcounts, piece-rates,
    overtime hours, and direct allocation to Tower & Cost Center.
    """
    __tablename__ = "hr_labour_muster_roll"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True, index=True)
    contractor_id = Column(BigInteger, ForeignKey("hr_site_labour_contractors.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    muster_date = Column(Date, nullable=False, index=True, default=func.current_date())
    shift = Column(String(16), nullable=False, default="DAY") # DAY, NIGHT
    
    # Skill type: MASON, ROD_BINDER, CARPENTER, HELPER, PLUMBER, ELECTRICIAN, TILES_WORKER
    skill_type = Column(String(32), nullable=False, index=True)
    headcount = Column(Integer, nullable=False, default=1)
    standard_hours = Column(Numeric(6, 2), nullable=False, default=8.00)
    overtime_hours = Column(Numeric(6, 2), nullable=False, default=0.00)
    hourly_rate = Column(Numeric(10, 2), nullable=False, default=100.00) # e.g. 100 BDT/hr = 800 BDT/day
    overtime_rate = Column(Numeric(10, 2), nullable=False, default=150.00) # 1.5x to 2x
    
    # Calculated: (headcount * standard_hours * hourly_rate) + (headcount * overtime_hours * overtime_rate)
    total_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    
    site_engineer_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    approval_status = Column(String(32), nullable=False, default="DRAFT", index=True) # DRAFT, VERIFIED, APPROVED, REJECTED
    approved_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    project = relationship("Project")
    tower = relationship("Tower")
    contractor = relationship("SiteLabourContractor")
    site_engineer = relationship("User", foreign_keys=[site_engineer_id])


class Attendance(Base):
    """
    Employee Daily Attendance Records (Biometric + GPS Geofenced Mobile Punch)
    """
    __tablename__ = "hr_attendance"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="CASCADE"), nullable=False, index=True)
    
    punch_date = Column(Date, nullable=False, index=True, default=func.current_date())
    clock_in = Column(TIMESTAMP, nullable=True)
    clock_out = Column(TIMESTAMP, nullable=True)
    late_minutes = Column(Integer, nullable=False, default=0)
    early_leaving_minutes = Column(Integer, nullable=False, default=0)
    
    # Status: PRESENT, ABSENT, LEAVE, LATE, HOLIDAY, HALF_DAY
    status = Column(String(32), nullable=False, default="PRESENT", index=True)
    # Source: BIOMETRIC_DEVICE, GPS_MOBILE, MANUAL_OVERRIDE
    source = Column(String(32), nullable=False, default="MANUAL_OVERRIDE")
    geofence_lat = Column(Numeric(10, 7), nullable=True)
    geofence_lng = Column(Numeric(10, 7), nullable=True)
    remarks = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    employee = relationship("Employee")


class LeaveApplication(Base):
    """
    Employee Leave Applications & Approval Workflow.
    """
    __tablename__ = "hr_leave_applications"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="CASCADE"), nullable=False, index=True)
    
    leave_type = Column(String(32), nullable=False, index=True) # CASUAL, SICK, EARNED, MATERNITY, UNPAID
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_days = Column(Integer, nullable=False, default=1)
    reason = Column(Text, nullable=False)
    document_url = Column(String(255), nullable=True)
    
    status = Column(String(32), nullable=False, default="PENDING", index=True) # PENDING, APPROVED, REJECTED
    approved_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    approval_remarks = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee")
    approved_by = relationship("User")


class PayrollRun(Base):
    """
    Monthly Corporate & Project Site Payroll Batches.
    """
    __tablename__ = "hr_payroll_runs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    month = Column(Integer, nullable=False) # 1 - 12
    year = Column(Integer, nullable=False)  # e.g. 2026
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True) # NULL for corporate
    
    total_gross = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_deductions = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_net = Column(Numeric(14, 2), nullable=False, default=0.00)
    disbursement_date = Column(Date, nullable=True)
    
    # Status: DRAFT, VERIFIED, APPROVED, DISBURSED
    status = Column(String(32), nullable=False, default="DRAFT", index=True)
    voucher_id = Column(BigInteger, ForeignKey("acc_vouchers.id", ondelete="SET NULL"), nullable=True) # Auto-integrated journal voucher
    created_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    approved_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    payslips = relationship("Payslip", back_populates="payroll_run", cascade="all, delete-orphan")


class Payslip(Base):
    """
    Individual Employee Monthly Payslip.
    Bilingual Bangladesh Labour Act Compliant breakdown.
    """
    __tablename__ = "hr_payslips"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    payroll_run_id = Column(BigInteger, ForeignKey("hr_payroll_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    basic_salary = Column(Numeric(12, 2), nullable=False, default=0.00)
    house_rent = Column(Numeric(12, 2), nullable=False, default=0.00)
    medical = Column(Numeric(12, 2), nullable=False, default=0.00)
    conveyance = Column(Numeric(12, 2), nullable=False, default=0.00)
    site_hazard_allowance = Column(Numeric(12, 2), nullable=False, default=0.00)
    mobile_allowance = Column(Numeric(12, 2), nullable=False, default=0.00)
    
    overtime_hours = Column(Numeric(6, 2), nullable=False, default=0.00)
    overtime_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    sales_commission = Column(Numeric(12, 2), nullable=False, default=0.00)
    festival_bonus = Column(Numeric(12, 2), nullable=False, default=0.00)
    
    gross_earnings = Column(Numeric(14, 2), nullable=False, default=0.00)
    
    # Deductions
    pf_deduction = Column(Numeric(12, 2), nullable=False, default=0.00)          # 8.33% Provident Fund
    tax_tds_deduction = Column(Numeric(12, 2), nullable=False, default=0.00)     # Bangladesh Income Tax TDS
    advance_salary_deduction = Column(Numeric(12, 2), nullable=False, default=0.00)
    loan_emi_deduction = Column(Numeric(12, 2), nullable=False, default=0.00)
    
    total_deductions = Column(Numeric(14, 2), nullable=False, default=0.00)
    net_payable = Column(Numeric(14, 2), nullable=False, default=0.00)
    
    payment_status = Column(String(32), nullable=False, default="PENDING") # PENDING, PAID

    created_at = Column(TIMESTAMP, server_default=func.now())

    payroll_run = relationship("PayrollRun", back_populates="payslips")
    employee = relationship("Employee")
