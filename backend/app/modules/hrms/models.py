from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, Time, ForeignKey, TIMESTAMP, Text, JSON, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.auth.models import Organization, User
from app.modules.projects.models import Project, Tower


class Company(Base):
    """
    Company Master (3.1 Company registration & 3.2 Company configuration)
    """
    __tablename__ = "hr_companies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    company_code = Column(String(30), unique=True, nullable=False, index=True)
    company_name = Column(String(200), nullable=False)
    short_name = Column(String(100), nullable=False)
    company_type = Column(String(50), nullable=False, default="OPERATING_COMPANY") # PARENT, SUBSIDIARY, OPERATING_COMPANY, JOINT_VENTURE
    parent_company_id = Column(BigInteger, ForeignKey("hr_companies.id", ondelete="SET NULL"), nullable=True, index=True)
    country = Column(String(100), nullable=False, default="Bangladesh")
    currency = Column(String(3), nullable=False, default="BDT")
    time_zone = Column(String(60), nullable=False, default="Asia/Dhaka")
    logo = Column(String(500), nullable=True)
    status = Column(String(20), nullable=False, default="ACTIVE", index=True) # ACTIVE, INACTIVE

    # Configuration fields (3.2)
    default_language = Column(String(20), nullable=False, default="en") # en, bn
    financial_year_start_month = Column(Integer, nullable=False, default=7) # July (Bangladesh standard)
    date_format = Column(String(30), nullable=False, default="DD/MM/YYYY")
    number_format = Column(String(30), nullable=False, default="en-IN") # Lakh/Crore
    employee_code_prefix = Column(String(20), nullable=False, default="BRE-")
    approval_policies = Column(JSON, nullable=True)
    payroll_config = Column(JSON, nullable=True)
    report_access = Column(JSON, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    parent_company = relationship("Company", remote_side=[id], backref="subsidiaries")
    legal_entities = relationship("LegalEntity", back_populates="company", cascade="all, delete-orphan")
    branches = relationship("Branch", back_populates="company", cascade="all, delete-orphan")
    project_offices = relationship("ProjectOffice", back_populates="company", cascade="all, delete-orphan")
    employees = relationship("Employee", back_populates="company")


class LegalEntity(Base):
    """
    Legal Entity Management (4.1 Fields & 4.2 Functionality)
    """
    __tablename__ = "hr_legal_entities"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    company_id = Column(BigInteger, ForeignKey("hr_companies.id", ondelete="RESTRICT"), nullable=False, index=True)
    entity_code = Column(String(30), unique=True, nullable=False, index=True)
    registered_name = Column(String(200), nullable=False)
    registration_number = Column(String(100), nullable=True) # RJSC / Inc No
    registration_date = Column(Date, nullable=True)
    legal_form = Column(String(50), nullable=False, default="PVT_LTD") # PVT_LTD, PUBLIC_LTD, SOLE_PROPRIETORSHIP, PARTNERSHIP, JV
    registered_office_address = Column(Text, nullable=True)
    tin_number = Column(String(64), nullable=True) # 12-digit e-TIN
    bin_number = Column(String(64), nullable=True) # 13-digit BIN / e-BIN VAT
    trade_license_number = Column(String(100), nullable=True)
    trade_license_expiry = Column(Date, nullable=True)
    rjsc_registration_details = Column(String(255), nullable=True)
    authorized_signatory_name = Column(String(128), nullable=True)
    authorized_signatory_designation = Column(String(128), nullable=True)
    statutory_documents = Column(JSON, nullable=True) # list of documents
    effective_date = Column(Date, nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)
    status = Column(String(20), nullable=False, default="ACTIVE", index=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    company = relationship("Company", back_populates="legal_entities")
    branches = relationship("Branch", back_populates="legal_entity")
    project_offices = relationship("ProjectOffice", back_populates="legal_entity")


class Branch(Base):
    """
    Branch Management (5.1 Types & 5.2 Registration Fields)
    """
    __tablename__ = "hr_branches"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    company_id = Column(BigInteger, ForeignKey("hr_companies.id", ondelete="RESTRICT"), nullable=False, index=True)
    branch_code = Column(String(30), nullable=False, index=True)
    branch_name = Column(String(200), nullable=False)
    branch_type = Column(String(50), nullable=False, default="SALES_OFFICE") # HEAD_OFFICE, REGIONAL_OFFICE, SALES_OFFICE, ADMIN_OFFICE, ACCOUNTS_OFFICE, CUSTOMER_SERVICE, WAREHOUSE, OTHER
    legal_entity_id = Column(BigInteger, ForeignKey("hr_legal_entities.id", ondelete="SET NULL"), nullable=True, index=True)
    manager_employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="SET NULL"), nullable=True, index=True)
    phone = Column(String(30), nullable=True)
    email = Column(String(190), nullable=True)
    division = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    upazila_thana = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    is_head_office = Column(Boolean, nullable=False, default=False)
    opening_date = Column(Date, nullable=True)
    closing_date = Column(Date, nullable=True)
    default_cost_center = Column(String(64), nullable=True)
    status = Column(String(20), nullable=False, default="ACTIVE", index=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    company = relationship("Company", back_populates="branches")
    legal_entity = relationship("LegalEntity", back_populates="branches")
    manager = relationship("Employee", foreign_keys=[manager_employee_id])
    employees = relationship("Employee", foreign_keys="Employee.branch_id", back_populates="branch")


class ProjectOffice(Base):
    """
    Project Office Management (6.1 Registration & 6.2 Functionality)
    """
    __tablename__ = "hr_project_offices"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    office_code = Column(String(30), unique=True, nullable=False, index=True)
    office_name = Column(String(200), nullable=False)
    company_id = Column(BigInteger, ForeignKey("hr_companies.id", ondelete="RESTRICT"), nullable=False, index=True)
    legal_entity_id = Column(BigInteger, ForeignKey("hr_legal_entities.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    office_type = Column(String(50), nullable=False, default="CONSTRUCTION_SITE") # CONSTRUCTION_SITE, PROJECT_ADMIN, SALES_SITE_OFFICE, QA_TESTING_LAB
    site_in_charge_employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="SET NULL"), nullable=True, index=True)
    phone = Column(String(30), nullable=True)
    email = Column(String(190), nullable=True)
    division = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    upazila_thana = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    opening_date = Column(Date, nullable=True)
    expected_closing_date = Column(Date, nullable=True)
    operational_status = Column(String(32), nullable=False, default="ACTIVE_MOBILIZED", index=True) # PLANNING, ACTIVE_MOBILIZED, DEMOBILIZING, CLOSED
    default_cost_center = Column(String(64), nullable=True)
    supporting_documents = Column(JSON, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    company = relationship("Company", back_populates="project_offices")
    legal_entity = relationship("LegalEntity", back_populates="project_offices")
    project = relationship("Project")
    site_in_charge = relationship("Employee", foreign_keys=[site_in_charge_employee_id])
    employees = relationship("Employee", foreign_keys="Employee.project_office_id", back_populates="project_office")


class Department(Base):
    """
    Corporate & Site Operational Departments (Section 2, 3, 4, 5)
    """
    __tablename__ = "hr_departments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    company_id = Column(BigInteger, ForeignKey("hr_companies.id", ondelete="RESTRICT"), nullable=True, default=1, index=True)
    department_code = Column(String(32), nullable=False, index=True) # Unique within company
    name_en = Column(String(150), nullable=False)
    name_bn = Column(String(150), nullable=True)
    parent_department_id = Column(BigInteger, ForeignKey("hr_departments.id", ondelete="SET NULL"), nullable=True, index=True)
    head_of_dept_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="SET NULL"), nullable=True, index=True)
    branch_id = Column(BigInteger, ForeignKey("hr_branches.id", ondelete="SET NULL"), nullable=True, index=True)
    cost_center_id = Column(String(64), nullable=True)
    description = Column(Text, nullable=True)
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="ACTIVE", index=True)
    approval_policies = Column(JSON, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization")
    company = relationship("Company", backref="departments")
    parent_department = relationship("Department", remote_side=[id], backref="child_departments")
    department_head = relationship("Employee", foreign_keys=[head_of_dept_id])
    branch = relationship("Branch", backref="departments")
    designations = relationship("Designation", back_populates="department")
    employees = relationship("Employee", foreign_keys="Employee.department_id", back_populates="department")
    head_history = relationship("DepartmentHeadHistory", back_populates="department", cascade="all, delete-orphan")
    project_mappings = relationship("DepartmentProjectMapping", back_populates="department", cascade="all, delete-orphan")
    audit_logs = relationship("DepartmentAuditLog", back_populates="department", cascade="all, delete-orphan")


class DepartmentHeadHistory(Base):
    """
    Department Head Assignment History (Section 2.3 & 5.1)
    """
    __tablename__ = "hr_department_head_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    department_id = Column(BigInteger, ForeignKey("hr_departments.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="RESTRICT"), nullable=False, index=True)
    assignment_type = Column(String(30), nullable=False, default="PERMANENT") # PERMANENT, ACTING, INTERIM
    effective_from = Column(Date, nullable=False, default=func.current_date())
    effective_to = Column(Date, nullable=True)
    permissions_json = Column(JSON, nullable=True)
    is_current = Column(Boolean, nullable=False, default=True)
    remarks = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    department = relationship("Department", back_populates="head_history")
    employee = relationship("Employee")


class DepartmentProjectMapping(Base):
    """
    Project Department Mapping (Section 2.5)
    Assigns functional departments (e.g. Site Operations, QA/QC, Architecture) to active projects.
    """
    __tablename__ = "hr_department_project_mappings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    department_id = Column(BigInteger, ForeignKey("hr_departments.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    site_lead_employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="SET NULL"), nullable=True)
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="ACTIVE")

    created_at = Column(TIMESTAMP, server_default=func.now())

    department = relationship("Department", back_populates="project_mappings")
    project = relationship("Project")
    site_lead = relationship("Employee", foreign_keys=[site_lead_employee_id])


class DepartmentAuditLog(Base):
    """
    Department History & Audit Trail (Section 2.7)
    Tracks changes, transfers, status changes, parent structural changes, and approvals.
    """
    __tablename__ = "hr_department_audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    department_id = Column(BigInteger, ForeignKey("hr_departments.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type = Column(String(50), nullable=False) # CREATED, UPDATED, PARENT_CHANGED, HEAD_ASSIGNED, STATUS_CHANGED, PROJECT_MAPPED, COST_CENTER_UPDATED
    performed_by_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="SET NULL"), nullable=True)
    performed_by_name = Column(String(150), nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    remarks = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    department = relationship("Department", back_populates="audit_logs")
    performed_by = relationship("Employee", foreign_keys=[performed_by_id])


class SalaryGrade(Base):
    """
    Salary Grades & Scales Structure (Section 1 & 2)
    Standard compensation bands and statutory allowance packages.
    """
    __tablename__ = "hr_salary_grades"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    grade_code = Column(String(32), nullable=False, index=True) # e.g. GRADE-01 to GRADE-08
    grade_name = Column(String(100), nullable=False) # e.g. Executive Director, Senior Engineer, Executive
    employee_level = Column(String(50), nullable=False, default="EXECUTIVE", index=True) # C_SUITE, DIRECTOR, SR_MANAGEMENT, MID_MANAGEMENT, EXECUTIVE, OFFICER, SITE_ENGINEER, SUPPORT_STAFF
    min_salary = Column(Numeric(12, 2), nullable=False, default=20000.00)
    max_salary = Column(Numeric(12, 2), nullable=False, default=250000.00)
    default_house_rent_pct = Column(Numeric(5, 2), nullable=False, default=50.00)
    default_medical_allowance = Column(Numeric(10, 2), nullable=False, default=2500.00)
    default_conveyance = Column(Numeric(10, 2), nullable=False, default=3000.00)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    designations = relationship("Designation", back_populates="salary_grade")
    positions = relationship("Position", back_populates="salary_grade")


class Designation(Base):
    """
    Standard Designation & Job Titles Structure (Section 1 & 2)
    """
    __tablename__ = "hr_designations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    department_id = Column(BigInteger, ForeignKey("hr_departments.id", ondelete="CASCADE"), nullable=False, index=True)
    designation_code = Column(String(32), nullable=False, index=True) # e.g. PM, SE, QS, ACCT, SO, MD
    title_en = Column(String(128), nullable=False)
    title_bn = Column(String(128), nullable=True)
    salary_grade_id = Column(BigInteger, ForeignKey("hr_salary_grades.id", ondelete="SET NULL"), nullable=True, index=True)
    grade_level = Column(String(32), nullable=False, default="GRADE_4") # GRADE_1 (CXO) to GRADE_8 (Support)
    employee_level = Column(String(50), nullable=False, default="EXECUTIVE", index=True) # C_SUITE, DIRECTOR, SR_MANAGEMENT, etc.
    min_salary = Column(Numeric(12, 2), nullable=False, default=15000.00)
    max_salary = Column(Numeric(12, 2), nullable=False, default=300000.00)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    department = relationship("Department", back_populates="designations")
    salary_grade = relationship("SalaryGrade", back_populates="designations")
    employees = relationship("Employee", foreign_keys="Employee.designation_id", back_populates="designation")
    positions = relationship("Position", back_populates="designation")


class Position(Base):
    """
    Position Management & Approved/Vacant Manpower Structure (Section 4, 5, 6)
    Tracks sanctioned positions, reporting lines, project allocation, and vacancy status.
    """
    __tablename__ = "hr_positions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    position_code = Column(String(32), nullable=False, index=True) # e.g. POS-ENG-001, POS-ACCTS-002
    position_title = Column(String(150), nullable=False)
    department_id = Column(BigInteger, ForeignKey("hr_departments.id", ondelete="CASCADE"), nullable=False, index=True)
    designation_id = Column(BigInteger, ForeignKey("hr_designations.id", ondelete="CASCADE"), nullable=False, index=True)
    salary_grade_id = Column(BigInteger, ForeignKey("hr_salary_grades.id", ondelete="SET NULL"), nullable=True, index=True)
    reports_to_position_id = Column(BigInteger, ForeignKey("hr_positions.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_branch_id = Column(BigInteger, ForeignKey("hr_branches.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    position_type = Column(String(30), nullable=False, default="PERMANENT") # PERMANENT, CONTRACTUAL, PROJECT_SITE
    status = Column(String(30), nullable=False, default="VACANT", index=True) # APPROVED, FILLED, VACANT, ON_HOLD, FROZEN
    budgeted_salary = Column(Numeric(12, 2), nullable=False, default=0.00)
    target_hire_date = Column(Date, nullable=True)
    approved_date = Column(Date, nullable=True, default=func.current_date())
    occupied_employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="SET NULL"), nullable=True, index=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    department = relationship("Department")
    designation = relationship("Designation", back_populates="positions")
    salary_grade = relationship("SalaryGrade", back_populates="positions")
    reports_to_position = relationship("Position", remote_side=[id])
    assigned_branch = relationship("Branch")
    assigned_project = relationship("Project")
    occupied_employee = relationship("Employee", foreign_keys=[occupied_employee_id])


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
    marital_status = Column(String(20), nullable=True, default="SINGLE") # SINGLE, MARRIED, DIVORCED, WIDOWED
    
    emergency_contact_name = Column(String(128), nullable=True)
    emergency_contact_relation = Column(String(50), nullable=True) # SPOUSE, PARENT, SIBLING, OTHER
    emergency_contact_phone = Column(String(32), nullable=True)

    present_address = Column(Text, nullable=True)
    permanent_address = Column(Text, nullable=True)
    education = Column(JSON, nullable=True) # [{"degree": "...", "institution": "...", "year": "...", "result": "..."}]
    experience = Column(JSON, nullable=True) # [{"company": "...", "title": "...", "duration": "..."}]
    documents = Column(JSON, nullable=True) # [{"document_type": "...", "name": "...", "url": "...", "uploaded_at": "..."}]
    system_role = Column(String(50), nullable=True, default="EMPLOYEE") # HR_ADMIN, HR_EXECUTIVE, EMPLOYEE, MANAGER, AUDITOR
    
    joining_date = Column(Date, nullable=False, default=func.current_date())
    confirmation_date = Column(Date, nullable=True)
    probation_months = Column(Integer, nullable=False, default=6)
    
    # Employment Type: PERMANENT, PROBATION, CONTRACTUAL, INTERN, DAILY_WAGE
    employment_type = Column(String(32), nullable=False, default="PROBATION")
    # Workforce Category: CORPORATE, SITE_ENGINEERING, SITE_SUPERVISION
    workforce_category = Column(String(32), nullable=False, default="CORPORATE")
    # Status: ACTIVE, PROBATION, CONFIRMED, RESIGNED, TERMINATED, ON_LEAVE
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

    department = relationship("Department", foreign_keys=[department_id], back_populates="employees")
    designation = relationship("Designation", foreign_keys=[designation_id], back_populates="employees")
    assigned_project = relationship("Project")
    reporting_to = relationship("Employee", remote_side=[id])
    user = relationship("User")

    company_id = Column(BigInteger, ForeignKey("hr_companies.id", ondelete="SET NULL"), nullable=True, index=True)
    branch_id = Column(BigInteger, ForeignKey("hr_branches.id", ondelete="SET NULL"), nullable=True, index=True)
    project_office_id = Column(BigInteger, ForeignKey("hr_project_offices.id", ondelete="SET NULL"), nullable=True, index=True)

    company = relationship("Company", back_populates="employees")
    branch = relationship("Branch", foreign_keys=[branch_id], back_populates="employees")
    project_office = relationship("ProjectOffice", foreign_keys=[project_office_id], back_populates="employees")



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


class Shift(Base):
    """
    2.1 Shift Management: Shift timing, breaks, grace periods, day/night shifts.
    """
    __tablename__ = "hr_shifts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    shift_name = Column(String(100), nullable=False)
    shift_code = Column(String(50), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    break_start_time = Column(Time, nullable=True)
    break_end_time = Column(Time, nullable=True)
    break_duration_minutes = Column(Integer, nullable=False, default=60)
    grace_period_minutes = Column(Integer, nullable=False, default=15)
    half_day_minimum_minutes = Column(Integer, nullable=False, default=240)
    full_day_minimum_minutes = Column(Integer, nullable=False, default=480)
    is_night_shift = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class ShiftAssignment(Base):
    """
    2.2 Shift Assignment: Employee-wise, department-wise, and project-wise shift schedules.
    """
    __tablename__ = "hr_shift_assignments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    shift_id = Column(BigInteger, ForeignKey("hr_shifts.id", ondelete="CASCADE"), nullable=False, index=True)
    assignment_type = Column(String(32), nullable=False, default="EMPLOYEE") # EMPLOYEE, DEPARTMENT, PROJECT_SITE
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="CASCADE"), nullable=True, index=True)
    department_id = Column(BigInteger, ForeignKey("hr_departments.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    remarks = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    shift = relationship("Shift")
    employee = relationship("Employee")
    department = relationship("Department")
    project = relationship("Project")


class BiometricDevice(Base):
    """
    2.3 Biometric Integration: ZKTeco devices, IP terminals, and status monitoring.
    """
    __tablename__ = "hr_biometric_devices"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    device_name = Column(String(100), nullable=False)
    device_serial = Column(String(100), nullable=False)
    device_model = Column(String(100), nullable=False)
    ip_address = Column(String(45), nullable=False)
    port = Column(Integer, nullable=False, default=4370)
    location = Column(String(150), nullable=False)
    assigned_branch_id = Column(BigInteger, ForeignKey("hr_branches.id", ondelete="SET NULL"), nullable=True)
    assigned_project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(32), nullable=False, default="ONLINE") # ONLINE, OFFLINE, SYNCING
    last_sync_at = Column(TIMESTAMP, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    branch = relationship("Branch")
    project = relationship("Project")


class SiteGeofence(Base):
    """
    2.9 Site Attendance & Geofencing perimeter coordinates for construction projects.
    """
    __tablename__ = "hr_site_geofences"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    site_name = Column(String(150), nullable=False)
    latitude = Column(Numeric(10, 7), nullable=False)
    longitude = Column(Numeric(10, 7), nullable=False)
    radius_meters = Column(Integer, nullable=False, default=250)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")


class HolidayCalendar(Base):
    """
    2.8 Holiday Calendar: Statutory public holidays, religious festivals, and company off days.
    """
    __tablename__ = "hr_holiday_calendar"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    holiday_name = Column(String(150), nullable=False)
    holiday_type = Column(String(32), nullable=False, default="PUBLIC_HOLIDAY") # PUBLIC_HOLIDAY, RELIGIOUS_HOLIDAY, COMPANY_HOLIDAY, WEEKLY_OFF
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_days = Column(Integer, nullable=False, default=1)
    applicable_branch_id = Column(BigInteger, ForeignKey("hr_branches.id", ondelete="SET NULL"), nullable=True)
    applicable_project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True)
    is_recurring_yearly = Column(Boolean, nullable=False, default=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class AttendanceCorrection(Base):
    """
    2.7 Attendance Correction: Missing/anomaly punch adjustment requests, manager verification, HR approval.
    """
    __tablename__ = "hr_attendance_corrections"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="CASCADE"), nullable=False, index=True)
    attendance_id = Column(BigInteger, ForeignKey("hr_attendance.id", ondelete="SET NULL"), nullable=True)
    request_date = Column(Date, nullable=False)
    original_clock_in = Column(TIMESTAMP, nullable=True)
    original_clock_out = Column(TIMESTAMP, nullable=True)
    requested_clock_in = Column(TIMESTAMP, nullable=False)
    requested_clock_out = Column(TIMESTAMP, nullable=False)
    reason = Column(Text, nullable=False)
    manager_verifier_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="SET NULL"), nullable=True)
    manager_remarks = Column(Text, nullable=True)
    manager_verified_at = Column(TIMESTAMP, nullable=True)
    hr_approver_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="SET NULL"), nullable=True)
    hr_remarks = Column(Text, nullable=True)
    hr_approved_at = Column(TIMESTAMP, nullable=True)
    status = Column(String(32), nullable=False, default="PENDING_VERIFICATION") # PENDING_VERIFICATION, VERIFIED_BY_MANAGER, APPROVED, REJECTED
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee", foreign_keys=[employee_id])
    manager_verifier = relationship("Employee", foreign_keys=[manager_verifier_id])
    hr_approver = relationship("Employee", foreign_keys=[hr_approver_id])


class Attendance(Base):
    """
    2.4 & 2.5 Attendance Capture & Processing: Daily employee punches, shift adherence, late calculation, working hours.
    """
    __tablename__ = "hr_attendance"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="CASCADE"), nullable=False, index=True)
    shift_id = Column(BigInteger, ForeignKey("hr_shifts.id", ondelete="SET NULL"), nullable=True, index=True)
    
    punch_date = Column(Date, nullable=False, index=True, default=func.current_date())
    clock_in = Column(TIMESTAMP, nullable=True)
    clock_out = Column(TIMESTAMP, nullable=True)
    working_hours = Column(Numeric(5, 2), nullable=False, default=0.00)
    late_minutes = Column(Integer, nullable=False, default=0)
    early_leaving_minutes = Column(Integer, nullable=False, default=0)
    overtime_hours = Column(Numeric(5, 2), nullable=False, default=0.00)
    
    # Status: PRESENT, LATE, HALF_DAY, ABSENT, ON_LEAVE, HOLIDAY, WEEKLY_OFF
    status = Column(String(32), nullable=False, default="PRESENT", index=True)
    # Source: BIOMETRIC_DEVICE, GPS_MOBILE, WEB_PUNCH, MANUAL_OVERRIDE, CORRECTION
    source = Column(String(32), nullable=False, default="MANUAL_OVERRIDE")
    is_missing_punch = Column(Boolean, nullable=False, default=False)
    is_anomaly = Column(Boolean, nullable=False, default=False)
    geofence_lat = Column(Numeric(10, 7), nullable=True)
    geofence_lng = Column(Numeric(10, 7), nullable=True)
    geofence_site_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True)
    is_geofence_verified = Column(Boolean, nullable=False, default=True)
    remarks = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee")
    shift = relationship("Shift")
    geofence_site = relationship("Project")


class LeaveType(Base):
    """
    2.11 Leave Type Setup: Annual, Casual, Sick, Maternity, Paternity, Compensatory, Unpaid.
    """
    __tablename__ = "hr_leave_types"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    leave_type_code = Column(String(50), nullable=False, index=True)
    name_en = Column(String(100), nullable=False)
    name_bn = Column(String(150), nullable=True)
    is_paid = Column(Boolean, nullable=False, default=True)
    color_code = Column(String(30), nullable=False, default="#3b82f6")
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    policies = relationship("LeavePolicy", back_populates="leave_type", cascade="all, delete-orphan")


class LeavePolicy(Base):
    """
    2.12 Leave Policy: Entitlement, accrual frequency, carry-forward, expiry, encashment rules.
    """
    __tablename__ = "hr_leave_policies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    leave_type_id = Column(BigInteger, ForeignKey("hr_leave_types.id", ondelete="CASCADE"), nullable=False, index=True)
    policy_name = Column(String(150), nullable=False)
    annual_entitlement_days = Column(Numeric(5, 2), nullable=False, default=10.00)
    accrual_frequency = Column(String(32), nullable=False, default="YEARLY") # YEARLY, MONTHLY, PRO_RATA
    max_carry_forward_days = Column(Numeric(5, 2), nullable=False, default=0.00)
    carry_forward_expiry_months = Column(Integer, nullable=False, default=12)
    encashment_allowed = Column(Boolean, nullable=False, default=False)
    max_encashment_days = Column(Numeric(5, 2), nullable=False, default=0.00)
    min_service_days_required = Column(Integer, nullable=False, default=90)
    gender_applicability = Column(String(20), nullable=False, default="ALL") # ALL, MALE, FEMALE
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    leave_type = relationship("LeaveType", back_populates="policies")


class LeaveBalance(Base):
    """
    2.13 & 2.16 Opening Leave Balance & Available Balances (Accrued, Used, Pending, Available).
    """
    __tablename__ = "hr_leave_balances"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type_id = Column(BigInteger, ForeignKey("hr_leave_types.id", ondelete="CASCADE"), nullable=False, index=True)
    year = Column(Integer, nullable=False, default=2026, index=True)

    opening_balance = Column(Numeric(5, 2), nullable=False, default=0.00)
    carried_forward = Column(Numeric(5, 2), nullable=False, default=0.00)
    accrued_days = Column(Numeric(5, 2), nullable=False, default=0.00)
    used_days = Column(Numeric(5, 2), nullable=False, default=0.00)
    pending_days = Column(Numeric(5, 2), nullable=False, default=0.00)
    available_days = Column(Numeric(5, 2), nullable=False, default=0.00)
    encashed_days = Column(Numeric(5, 2), nullable=False, default=0.00)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee")
    leave_type = relationship("LeaveType")


class LeaveApplication(Base):
    """
    2.14 & 2.15 Leave Application & Multi-tier Approval Workflow.
    """
    __tablename__ = "hr_leave_applications"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type_id = Column(BigInteger, ForeignKey("hr_leave_types.id", ondelete="SET NULL"), nullable=True, index=True)
    leave_type = Column(String(32), nullable=False, index=True) # CASUAL, SICK, EARNED, MATERNITY, UNPAID
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_days = Column(Integer, nullable=False, default=1)
    reason = Column(Text, nullable=False)
    emergency_contact = Column(String(64), nullable=True)
    document_url = Column(String(255), nullable=True)
    is_paid = Column(Boolean, nullable=False, default=True)

    # Status: PENDING_MANAGER, PENDING_HR, APPROVED, REJECTED, CANCELLED
    status = Column(String(32), nullable=False, default="PENDING_MANAGER", index=True)
    
    # Manager Tier
    manager_approver_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    manager_remarks = Column(String(255), nullable=True)
    manager_action_at = Column(TIMESTAMP, nullable=True)

    # HR Tier
    hr_approver_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    hr_remarks = Column(String(255), nullable=True)
    hr_action_at = Column(TIMESTAMP, nullable=True)

    approved_by_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    approval_remarks = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee")
    leave_type_obj = relationship("LeaveType")
    manager_approver = relationship("User", foreign_keys=[manager_approver_id])
    hr_approver = relationship("User", foreign_keys=[hr_approver_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])


class OvertimeRequest(Base):
    """
    2.17, 2.18, 2.19 Overtime Request, Verification & Multi-tier Approval.
    """
    __tablename__ = "hr_overtime_requests"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    
    ot_date = Column(Date, nullable=False, index=True)
    ot_type = Column(String(32), nullable=False, default="NORMAL_OT") # NORMAL_OT, WEEKEND_OT, HOLIDAY_OT
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    requested_hours = Column(Numeric(5, 2), nullable=False, default=2.00)
    task_description = Column(Text, nullable=False)

    attendance_id = Column(BigInteger, ForeignKey("hr_attendance.id", ondelete="SET NULL"), nullable=True)
    
    # Verification Tier (Supervisor)
    verified_hours = Column(Numeric(5, 2), nullable=True)
    verifier_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    verifier_remarks = Column(String(255), nullable=True)
    verified_at = Column(TIMESTAMP, nullable=True)

    # Approval Tier (Project Manager / HR)
    approved_hours = Column(Numeric(5, 2), nullable=True)
    approver_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    approver_remarks = Column(String(255), nullable=True)
    approved_at = Column(TIMESTAMP, nullable=True)
    rate_multiplier = Column(Numeric(3, 2), nullable=False, default=1.50)
    calculated_amount = Column(Numeric(10, 2), nullable=False, default=0.00)

    # Status: SUBMITTED, VERIFIED, APPROVED, REJECTED, PAID_IN_PAYROLL
    is_payroll_processed = Column(Boolean, nullable=False, default=False)
    payroll_run_id = Column(BigInteger, ForeignKey("hr_payroll_runs.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(32), nullable=False, default="SUBMITTED", index=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee")
    project = relationship("Project")
    attendance = relationship("Attendance")
    verifier = relationship("User", foreign_keys=[verifier_id])
    approver = relationship("User", foreign_keys=[approver_id])


class PayrollInput(Base):
    """
    2.20 Payroll Integration: Processed Leave & Overtime feeding directly into payroll batches.
    """
    __tablename__ = "hr_payroll_inputs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="CASCADE"), nullable=False, index=True)
    month = Column(Integer, nullable=False) # 1 - 12
    year = Column(Integer, nullable=False)  # 2026
    payroll_run_id = Column(BigInteger, ForeignKey("hr_payroll_runs.id", ondelete="SET NULL"), nullable=True)

    approved_overtime_hours = Column(Numeric(6, 2), nullable=False, default=0.00)
    overtime_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    unpaid_leave_days = Column(Numeric(5, 2), nullable=False, default=0.00)
    deduction_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    source_reference = Column(String(100), nullable=True)
    is_locked = Column(Boolean, nullable=False, default=False)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee")


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


# =====================================================================
# --- Sections 3.1 - 3.20 Salary Structure & Payroll Engine Models ---
# =====================================================================

class SalaryComponent(Base):
    """
    3.1 Salary Components: Basic, house rent, medical, conveyance, site hazard, etc.
    """
    __tablename__ = "hr_salary_components"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    component_code = Column(String(50), nullable=False)
    name_en = Column(String(150), nullable=False)
    name_bn = Column(String(150), nullable=True)
    component_type = Column(String(32), nullable=False, default="EARNING") # EARNING, DEDUCTION, EMPLOYER_CONTRIBUTION
    calculation_type = Column(String(32), nullable=False, default="PERCENTAGE_OF_BASIC") # PERCENTAGE_OF_BASIC, PERCENTAGE_OF_GROSS, FIXED_AMOUNT
    default_value_or_percent = Column(Numeric(12, 2), nullable=False, default=0.00)
    is_taxable = Column(Boolean, nullable=False, default=True)
    is_statutory = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=10)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class SalaryStructure(Base):
    """
    3.2 Salary Structure: Predefined packages with component formulas.
    """
    __tablename__ = "hr_salary_structures"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    structure_code = Column(String(50), nullable=False)
    name_en = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    items = relationship("SalaryStructureItem", back_populates="structure", cascade="all, delete-orphan")


class SalaryStructureItem(Base):
    __tablename__ = "hr_salary_structure_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    structure_id = Column(BigInteger, ForeignKey("hr_salary_structures.id", ondelete="CASCADE"), nullable=False, index=True)
    component_id = Column(BigInteger, ForeignKey("hr_salary_components.id", ondelete="CASCADE"), nullable=False, index=True)
    calculation_type = Column(String(32), nullable=False, default="PERCENTAGE_OF_BASIC")
    value_or_percent = Column(Numeric(12, 2), nullable=False, default=0.00)

    structure = relationship("SalaryStructure", back_populates="items")
    component = relationship("SalaryComponent")


class EmployeeSalary(Base):
    """
    3.3 Employee Salary Assignment: Employee-specific salary structure and effective dates.
    """
    __tablename__ = "hr_employee_salaries"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="CASCADE"), nullable=False, index=True)
    structure_id = Column(BigInteger, ForeignKey("hr_salary_structures.id", ondelete="RESTRICT"), nullable=False, index=True)
    gross_salary = Column(Numeric(14, 2), nullable=False, default=0.00)
    basic_salary = Column(Numeric(14, 2), nullable=False, default=0.00)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee")
    structure = relationship("SalaryStructure")


class SalaryRevision(Base):
    """
    3.4 Salary Revision: Increment, promotion, and transfer-related changes with history.
    """
    __tablename__ = "hr_salary_revisions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="CASCADE"), nullable=False, index=True)
    revision_type = Column(String(32), nullable=False, default="INCREMENT") # INCREMENT, PROMOTION, TRANSFER_ADJUSTMENT, MARKET_CORRECTION
    effective_date = Column(Date, nullable=False)
    previous_gross = Column(Numeric(14, 2), nullable=False, default=0.00)
    new_gross = Column(Numeric(14, 2), nullable=False, default=0.00)
    increment_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    increment_percent = Column(Numeric(5, 2), nullable=False, default=0.00)
    approved_by = Column(BigInteger, nullable=True)
    status = Column(String(20), nullable=False, default="APPROVED") # DRAFT, APPROVED, REJECTED
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee")


class PayrollPeriod(Base):
    """
    3.5 Payroll Period & 3.18 Maker-Checker-Approver & 3.19 Locking.
    """
    __tablename__ = "hr_payroll_periods"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    period_code = Column(String(30), nullable=False) # e.g. 2026-10
    period_name = Column(String(100), nullable=False) # October 2026
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    cut_off_date = Column(Date, nullable=False)
    status = Column(String(32), nullable=False, default="DRAFT") # DRAFT, PROCESSING, SUBMITTED, VERIFIED, APPROVED, POSTED, LOCKED
    total_employees = Column(Integer, nullable=False, default=0)
    total_gross = Column(Numeric(16, 2), nullable=False, default=0.00)
    total_deductions = Column(Numeric(16, 2), nullable=False, default=0.00)
    total_net_payable = Column(Numeric(16, 2), nullable=False, default=0.00)
    total_employer_cost = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    prepared_by = Column(BigInteger, nullable=True)
    prepared_at = Column(TIMESTAMP, nullable=True)
    verified_by = Column(BigInteger, nullable=True)
    verified_at = Column(TIMESTAMP, nullable=True)
    approved_by = Column(BigInteger, nullable=True)
    approved_at = Column(TIMESTAMP, nullable=True)
    is_locked = Column(Boolean, nullable=False, default=False)
    locked_at = Column(TIMESTAMP, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    payslips = relationship("PayrollPayslip", back_populates="period", cascade="all, delete-orphan")


class PayrollPayslip(Base):
    """
    3.7 - 3.10 & 3.20 Payroll Register & Payslip Item Breakdown.
    """
    __tablename__ = "hr_payroll_payslips"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    period_id = Column(BigInteger, ForeignKey("hr_payroll_periods.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="CASCADE"), nullable=False, index=True)

    gross_salary = Column(Numeric(14, 2), nullable=False, default=0.00)
    basic_salary = Column(Numeric(14, 2), nullable=False, default=0.00)
    house_rent = Column(Numeric(14, 2), nullable=False, default=0.00)
    medical_allowance = Column(Numeric(14, 2), nullable=False, default=0.00)
    conveyance_allowance = Column(Numeric(14, 2), nullable=False, default=0.00)
    other_allowances = Column(Numeric(14, 2), nullable=False, default=0.00)
    overtime_hours = Column(Numeric(6, 2), nullable=False, default=0.00)
    overtime_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    bonus_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    arrears_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_earnings = Column(Numeric(14, 2), nullable=False, default=0.00)

    unpaid_leave_days = Column(Numeric(5, 2), nullable=False, default=0.00)
    unpaid_leave_deduction = Column(Numeric(14, 2), nullable=False, default=0.00)
    income_tax_deduction = Column(Numeric(14, 2), nullable=False, default=0.00)
    provident_fund_employee = Column(Numeric(14, 2), nullable=False, default=0.00)
    provident_fund_employer = Column(Numeric(14, 2), nullable=False, default=0.00)
    staff_loan_recovery = Column(Numeric(14, 2), nullable=False, default=0.00)
    salary_advance_recovery = Column(Numeric(14, 2), nullable=False, default=0.00)
    other_deductions = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_deductions = Column(Numeric(14, 2), nullable=False, default=0.00)

    net_salary_payable = Column(Numeric(14, 2), nullable=False, default=0.00)
    bank_name = Column(String(100), nullable=True)
    bank_account_no = Column(String(50), nullable=True)
    payment_method = Column(String(32), nullable=False, default="BANK_TRANSFER")
    status = Column(String(20), nullable=False, default="CALCULATED")
    validation_warnings = Column(JSON, nullable=True)
    is_disbursed = Column(Boolean, nullable=False, default=False)
    disbursed_at = Column(TIMESTAMP, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    period = relationship("PayrollPeriod", back_populates="payslips")
    employee = relationship("Employee")


class StaffLoan(Base):
    """
    3.14 Staff Loan: Loan application, approval, and installment schedule.
    """
    __tablename__ = "hr_staff_loans"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="CASCADE"), nullable=False, index=True)
    loan_code = Column(String(50), nullable=False)
    loan_type = Column(String(32), nullable=False, default="EMERGENCY_LOAN") # EMERGENCY_LOAN, HOUSING_LOAN, MEDICAL_LOAN
    principal_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    interest_rate = Column(Numeric(5, 2), nullable=False, default=0.00)
    tenure_months = Column(Integer, nullable=False, default=12)
    monthly_installment = Column(Numeric(14, 2), nullable=False, default=0.00)
    disbursed_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    recovered_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    remaining_balance = Column(Numeric(14, 2), nullable=False, default=0.00)
    disbursement_date = Column(Date, nullable=False)
    start_recovery_period = Column(String(20), nullable=False) # e.g. 2026-10
    status = Column(String(20), nullable=False, default="ACTIVE") # ACTIVE, PAID_OFF, WRITTEN_OFF

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee")


class SalaryAdvance(Base):
    """
    3.15 Salary Advance: Advance approval and payroll recovery.
    """
    __tablename__ = "hr_salary_advances"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="CASCADE"), nullable=False, index=True)
    advance_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    requested_date = Column(Date, nullable=False)
    recovery_period = Column(String(20), nullable=False) # e.g. 2026-10
    recovered_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    status = Column(String(20), nullable=False, default="APPROVED") # PENDING, APPROVED, RECOVERED, REJECTED
    reason = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee")


class BonusIncentive(Base):
    """
    3.16 Bonus & Incentives: Festival bonus, performance incentive, project handover bonus.
    """
    __tablename__ = "hr_bonuses_incentives"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False, default=1, index=True)
    employee_id = Column(BigInteger, ForeignKey("hr_employees.id", ondelete="CASCADE"), nullable=False, index=True)
    bonus_type = Column(String(32), nullable=False, default="PERFORMANCE_BONUS") # EID_UL_FITR, EID_UL_ADHA, PERFORMANCE_BONUS, PROJECT_INCENTIVE
    period_code = Column(String(20), nullable=False) # e.g. 2026-10
    bonus_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    is_taxable = Column(Boolean, nullable=False, default=True)
    status = Column(String(20), nullable=False, default="APPROVED")
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee")


class TaxSlab(Base):
    """
    3.11 Tax Configuration: Effective-dated tax rules and employee withholding.
    """
    __tablename__ = "hr_tax_slabs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tax_year = Column(String(30), nullable=False, default="2025-2026", index=True)
    slab_name = Column(String(100), nullable=False)
    min_income = Column(Numeric(14, 2), nullable=False, default=0.00)
    max_income = Column(Numeric(14, 2), nullable=True)
    tax_rate_percent = Column(Numeric(5, 2), nullable=False, default=0.00)
    gender_applicability = Column(String(20), nullable=False, default="ALL")
    display_order = Column(Integer, nullable=False, default=10)
    is_active = Column(Boolean, nullable=False, default=True)

