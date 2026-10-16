from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, Date, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.modules.projects.models import Project, Tower
from app.modules.auth.models import User

class Subcontractor(Base):
    """
    Subcontractor / Labor Contractor master registry for civil, MEP, and finishing trades.
    """
    __tablename__ = "con_contractors"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    contractor_code = Column(String(32), unique=True, nullable=False, index=True)
    company_name = Column(String(191), nullable=False)
    trade_specialization = Column(String(64), nullable=False) # CIVIL_STRUCTURE, ROD_BINDING, SANITARY_PLUMBING, ELECTRICAL, TILES_MASONRY
    contact_person = Column(String(128), nullable=False)
    primary_phone = Column(String(32), nullable=False)
    tin_number = Column(String(64), nullable=True)
    bin_number = Column(String(64), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    work_orders = relationship("WorkOrder", back_populates="contractor")


class DPRReport(Base):
    """
    Daily Progress Report (DPR) site diary recorded by Project Engineers.
    Tracks structural activities, material consumption (CFT concrete, MT rebar, cement bags),
    weather conditions, and headcount.
    """
    __tablename__ = "con_dpr_reports"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True, index=True)
    report_date = Column(Date, nullable=False, index=True, default=func.current_date())
    
    # Weather: SUNNY, OVERCAST, RAIN_LIGHT, RAIN_HEAVY, STORMY
    weather_condition_id = Column(String(32), nullable=False, default="SUNNY")
    site_engineer_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    
    structural_activity_summary = Column(Text, nullable=False)
    concrete_casting_cft = Column(Numeric(12, 2), nullable=False, default=0.00)
    steel_rod_consumed_mt = Column(Numeric(10, 3), nullable=False, default=0.000)
    cement_consumed_bags = Column(Integer, nullable=False, default=0)
    total_workers_onsite = Column(Integer, nullable=False, default=0)
    
    # Status: DRAFT, SUBMITTED, APPROVED_BY_PM
    status = Column(String(32), nullable=False, default="SUBMITTED", index=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    tower = relationship("Tower")
    site_engineer = relationship("User")
    labor_entries = relationship("LaborMuster", back_populates="dpr", cascade="all, delete-orphan")


class LaborMuster(Base):
    """
    Subcontractor Daily Labor Muster Roll recording headcounts and wage allocations per trade.
    """
    __tablename__ = "con_labor_muster"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    dpr_id = Column(BigInteger, ForeignKey("con_dpr_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True)
    
    # Trade: ROD_BINDER, MASON, CARPENTER, PLUMBER, ELECTRICIAN, HELPER
    trade_category = Column(String(64), nullable=False)
    worker_count = Column(Integer, nullable=False, default=1)
    daily_wage_rate = Column(Numeric(10, 2), nullable=False, default=800.00)
    total_wage = Column(Numeric(12, 2), nullable=False) # worker_count * daily_wage_rate

    created_at = Column(TIMESTAMP, server_default=func.now())

    dpr = relationship("DPRReport", back_populates="labor_entries")
    contractor = relationship("Subcontractor")


class WorkOrder(Base):
    """
    Subcontractor Formal Work Order / Service Contract.
    Enforces statutory 5.0% Retention Money deduction and 12-month Defect Liability Period (DLP).
    """
    __tablename__ = "con_work_orders"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="RESTRICT"), nullable=False, index=True)
    work_order_no = Column(String(64), unique=True, nullable=False, index=True) # e.g. "WO-2026-0041"
    
    # Contract Type: CIVIL_SUPERSTRUCTURE, SHUTTERING_CARPENTRY, PLUMBING_SANITARY, TILES_MARBLE
    contract_type = Column(String(64), nullable=False)
    total_contract_value = Column(Numeric(14, 2), nullable=False)
    retention_money_percent = Column(Numeric(5, 2), nullable=False, default=5.00) # Standard 5.0%
    defect_liability_months = Column(Integer, nullable=False, default=12) # Standard 12 Months
    
    status = Column(String(32), nullable=False, default="ACTIVE") # ACTIVE, COMPLETED, TERMINATED
    scope_of_work = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    contractor = relationship("Subcontractor", back_populates="work_orders")
    ra_bills = relationship("RABill", back_populates="work_order", cascade="all, delete-orphan")


class RABill(Base):
    """
    Running Account (RA) Bill / Contractor Progress Certificate.
    Enforces Bangladesh Statutory Deduction Formula:
    $$\\text{Net Payable} = \\text{Gross Work Certified} - \\text{Retention (5\\%)} - \\text{Advance Recovery} - \\text{TDS (Sec 52)} - \\text{VDS}$$
    """
    __tablename__ = "con_ra_bills"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    work_order_id = Column(BigInteger, ForeignKey("con_work_orders.id", ondelete="RESTRICT"), nullable=False, index=True)
    ra_bill_number = Column(String(64), nullable=False) # e.g. "RA-BILL-01", "RA-BILL-02"
    bill_date = Column(Date, nullable=False, default=func.current_date())
    
    # Certified Quantities & Deductions
    gross_work_certified_amount = Column(Numeric(14, 2), nullable=False)
    retention_money_deducted = Column(Numeric(14, 2), nullable=False, default=0.00) # 5.0% of Gross
    advance_recovery_deducted = Column(Numeric(14, 2), nullable=False, default=0.00)
    tds_withheld_amount = Column(Numeric(14, 2), nullable=False, default=0.00) # Bangladesh Income Tax Sec 52 (e.g. 5-7%)
    vds_withheld_amount = Column(Numeric(14, 2), nullable=False, default=0.00) # Value Added Tax Deducted at Source (e.g. 5%)
    net_payable_amount = Column(Numeric(14, 2), nullable=False)
    
    # Status: DRAFT, VERIFIED_BY_QS, APPROVED_BY_PD, ACCOUNTS_VOUCHER_POSTED
    status = Column(String(32), nullable=False, default="DRAFT", index=True)
    accounts_journal_voucher_ref = Column(String(64), nullable=True) # Ref returned by emitted accounts event
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    work_order = relationship("WorkOrder", back_populates="ra_bills")


class ConcreteCubeTest(Base):
    """
    Concrete Cube Crushing Test Register (Module 40).
    Tracks batching, slump tests, and ASTM/BNBC 7-day, 14-day, and 28-day compressive crushing strength.
    """
    __tablename__ = "con_concrete_cube_tests"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="SET NULL"), nullable=True, index=True)
    structural_element = Column(String(128), nullable=False) # e.g. Column C1-C8 L-04, Mat Foundation Zone-B, Shear Wall W2
    casting_date = Column(Date, nullable=False, index=True)
    design_compressive_strength_psi = Column(Integer, nullable=False, default=4000) # e.g. 3500 psi, 4000 psi, 5000 psi
    concrete_grade = Column(String(32), nullable=False, default="M25") # M20, M25, M30, M35
    batching_plant_name = Column(String(128), nullable=False) # e.g. On-site Batching, Ready-Mix Mir Cement, Crown Cement RMC
    slump_test_mm = Column(Integer, nullable=False, default=100) # Slump in mm (e.g. 75 - 125 mm)

    # 7-Day Crushing Test (Target: >= 65-70% of design strength)
    day7_testing_date = Column(Date, nullable=True)
    day7_strength_psi = Column(Integer, nullable=True)

    # 14-Day Crushing Test (Target: >= 85-90% of design strength)
    day14_testing_date = Column(Date, nullable=True)
    day14_strength_psi = Column(Integer, nullable=True)

    # 28-Day Crushing Test (Target: >= 100% of design strength)
    day28_testing_date = Column(Date, nullable=True)
    day28_strength_psi = Column(Integer, nullable=True)

    # Verdict: PENDING, PASSED, FAILED
    test_verdict = Column(String(32), nullable=False, default="PENDING", index=True)
    lab_test_report_url = Column(String(255), nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    tower = relationship("Tower")


class SafetyNCR(Base):
    """
    Non-Conformance Reports (NCR) & Site Safety Violations Register (Module 40).
    Tracks structural defects, honeycombing, cover missing, safety violations, contractor rectification deadlines.
    """
    __tablename__ = "con_safety_ncrs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    ncr_number = Column(String(64), unique=True, nullable=False, index=True) # e.g. NCR-PRJ01-2026-001
    category = Column(String(64), nullable=False) # Structural Defect, Honeycombing, Cover Missing, Safety Violation
    severity = Column(String(32), nullable=False, default="Medium") # Low, Medium, High, Critical
    description = Column(Text, nullable=True)
    location_details = Column(String(191), nullable=True) # e.g. Tower A - Floor 4 Beam B-12
    photo_url = Column(String(255), nullable=True)
    assigned_contractor_id = Column(BigInteger, ForeignKey("con_contractors.id", ondelete="SET NULL"), nullable=True, index=True)
    rectification_deadline = Column(Date, nullable=False)
    status = Column(String(32), nullable=False, default="Open", index=True) # Open, Rectified, Verified_Closed
    rectification_notes = Column(Text, nullable=True)
    rectification_photo_url = Column(String(255), nullable=True)
    closed_date = Column(Date, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    contractor = relationship("Subcontractor")

