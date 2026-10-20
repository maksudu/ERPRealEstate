from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, func
from app.core.database import Base


class MobileMgmtKpi(Base):
    __tablename__ = "mobile_mgmt_kpis"

    id = Column(Integer, primary_key=True, index=True)
    fiscal_period = Column(String(50), nullable=False, default="FY 2026-27")
    total_revenue = Column(Float, default=0.0)
    total_expenses = Column(Float, default=0.0)
    net_profit = Column(Float, default=0.0)
    total_collections = Column(Float, default=0.0)
    outstanding_receivables = Column(Float, default=0.0)
    profit_margin_percentage = Column(Float, default=0.0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class MobileMgmtProject(Base):
    __tablename__ = "mobile_mgmt_projects"

    id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String(150), nullable=False, index=True)
    location = Column(String(150), nullable=False)
    total_budget = Column(Float, default=0.0)
    actual_cost = Column(Float, default=0.0)
    cost_variance = Column(Float, default=0.0)
    progress_percentage = Column(Float, default=0.0)
    estimated_revenue = Column(Float, default=0.0)
    projected_profitability_percentage = Column(Float, default=0.0)
    status = Column(String(50), default="IN_PROGRESS")  # IN_PROGRESS, DELAYED, ON_SCHEDULE, COMPLETED
    created_at = Column(DateTime, server_default=func.now())


class MobileMgmtSalesAnalytics(Base):
    __tablename__ = "mobile_mgmt_sales_analytics"

    id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String(150), nullable=False, index=True)
    total_units = Column(Integer, default=0)
    booked_units = Column(Integer, default=0)
    available_units = Column(Integer, default=0)
    sales_target = Column(Float, default=0.0)
    actual_sales = Column(Float, default=0.0)
    conversion_rate_percentage = Column(Float, default=0.0)
    average_price_per_sqft = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=func.now())


class MobileMgmtCashFlow(Base):
    __tablename__ = "mobile_mgmt_cash_flows"

    id = Column(Integer, primary_key=True, index=True)
    period_month = Column(String(50), nullable=False)
    receivables_due = Column(Float, default=0.0)
    payables_due = Column(Float, default=0.0)
    net_cash_position = Column(Float, default=0.0)
    projected_collections = Column(Float, default=0.0)
    actual_surplus_deficit = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=func.now())


class MobileMgmtApproval(Base):
    __tablename__ = "mobile_mgmt_approvals"

    id = Column(Integer, primary_key=True, index=True)
    approval_code = Column(String(50), unique=True, index=True)
    request_category = Column(String(50), nullable=False)  # PURCHASE_ORDER, BUDGET_REVISION, DISCOUNT, REFUND, HIGH_VALUE_PAYMENT
    title = Column(String(200), nullable=False)
    project_name = Column(String(150), nullable=False)
    requested_amount = Column(Float, default=0.0)
    requested_by = Column(String(100), nullable=False)
    priority = Column(String(30), default="MEDIUM")  # LOW, MEDIUM, HIGH, URGENT
    status = Column(String(50), default="PENDING")  # PENDING, APPROVED, REJECTED
    executive_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class MobileMgmtProcurement(Base):
    __tablename__ = "mobile_mgmt_procurements"

    id = Column(Integer, primary_key=True, index=True)
    pr_code = Column(String(50), unique=True, index=True)
    project_name = Column(String(150), nullable=False)
    material_description = Column(String(200), nullable=False)
    estimated_cost = Column(Float, default=0.0)
    lowest_quotation_cost = Column(Float, default=0.0)
    vendor_selected = Column(String(150), nullable=True)
    po_status = Column(String(50), default="PENDING_PO")  # PENDING_PO, PO_ISSUED, DELIVERED
    created_at = Column(DateTime, server_default=func.now())


class MobileMgmtConstruction(Base):
    __tablename__ = "mobile_mgmt_constructions"

    id = Column(Integer, primary_key=True, index=True)
    milestone_code = Column(String(50), unique=True, index=True)
    project_name = Column(String(150), nullable=False)
    milestone_name = Column(String(200), nullable=False)
    target_completion_date = Column(String(50), nullable=False)
    delay_days = Column(Integer, default=0)
    contractor_name = Column(String(150), nullable=False)
    contractor_performance_score = Column(Float, default=85.0)  # e.g. 92%
    status = Column(String(50), default="ON_TRACK")  # ON_TRACK, AT_RISK, DELAYED
    critical_issues = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class MobileMgmtHrOverview(Base):
    __tablename__ = "mobile_mgmt_hr_overviews"

    id = Column(Integer, primary_key=True, index=True)
    department_name = Column(String(100), nullable=False)
    total_headcount = Column(Integer, default=0)
    present_today = Column(Integer, default=0)
    on_leave = Column(Integer, default=0)
    monthly_payroll_cost = Column(Float, default=0.0)
    pending_leave_requests = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class MobileMgmtCompliance(Base):
    __tablename__ = "mobile_mgmt_compliances"

    id = Column(Integer, primary_key=True, index=True)
    alert_code = Column(String(50), unique=True, index=True)
    compliance_type = Column(String(100), nullable=False)  # RAJUK_APPROVAL, FIRE_LICENSE, ENVIRONMENT_CLEARANCE, LEASE_RENEWAL, COURT_HEARING
    authority_name = Column(String(150), nullable=False)
    project_name = Column(String(150), nullable=False)
    expiry_date = Column(String(50), nullable=False)
    days_remaining = Column(Integer, default=30)
    risk_level = Column(String(30), default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(50), default="ACTIVE")  # ACTIVE, IN_RENEWAL, EXPIRED, RESOLVED
    created_at = Column(DateTime, server_default=func.now())


class MobileMgmtReport(Base):
    __tablename__ = "mobile_mgmt_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_code = Column(String(50), unique=True, index=True)
    title = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)  # FINANCIAL, CONSTRUCTION, SALES, AUDIT
    format = Column(String(20), default="PDF")
    generation_date = Column(String(50), nullable=False)
    generated_by = Column(String(100), default="Board Secretarial Unit")
    file_size = Column(String(30), default="2.4 MB")
    download_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
