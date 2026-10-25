"""
FastAPI Router for HRMS Statutory, Tax & Labour Compliance
Bangladesh Labour Act 2006 and Income Tax Act 2023 compliance engine.
"""
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
import random

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.hrms.statutory_models import (
    HrmTaxConfiguration,
    HrmTaxDeduction,
    HrmTaxCertificate,
    HrmStatutoryRegister,
    HrmEmploymentContract,
    HrmPolicyAcknowledgment,
    HrmStatutoryAuditDoc
)
from app.modules.hrms.statutory_schemas import (
    PaginatedResponse,
    TaxConfigCreate, TaxConfigUpdate, TaxConfigResponse,
    TaxDeductionCreate, TaxDeductionUpdate, TaxDeductionResponse,
    TaxCertificateCreate, TaxCertificateUpdate, TaxCertificateResponse,
    StatutoryRegisterCreate, StatutoryRegisterUpdate, StatutoryRegisterResponse,
    EmploymentContractCreate, EmploymentContractUpdate, EmploymentContractResponse,
    PolicyAcknowledgmentCreate, PolicyAcknowledgmentUpdate, PolicyAcknowledgmentResponse,
    StatutoryAuditDocCreate, StatutoryAuditDocUpdate, StatutoryAuditDocResponse,
    StatutoryMetadataResponse, DropdownOption
)

router = APIRouter(prefix="/statutory", tags=["HRMS Statutory & Compliance"])


# ==========================================
# SEEDING HELPER FUNCTION
# ==========================================
async def seed_statutory_defaults(db: AsyncSession):
    # Check if tax configurations exist
    tax_count = await db.scalar(select(func.count(HrmTaxConfiguration.id)))
    if tax_count == 0:
        configs = [
            HrmTaxConfiguration(
                assessment_year="2026-2027",
                slab_name="First ৳ 3,50,000 (General Exemption Limit)",
                min_amount=Decimal("0.00"),
                max_amount=Decimal("350000.00"),
                tax_rate_percent=Decimal("0.00"),
                gender_group="ALL",
                special_exemption_limit=Decimal("350000.00"),
                min_tax_amount=Decimal("5000.00"),
                is_active=True,
                notes="General individual exemption under Finance Act / Income Tax Act 2023"
            ),
            HrmTaxConfiguration(
                assessment_year="2026-2027",
                slab_name="Female & Senior Citizens (৳ 4,00,000 Limit)",
                min_amount=Decimal("0.00"),
                max_amount=Decimal("400000.00"),
                tax_rate_percent=Decimal("0.00"),
                gender_group="FEMALE_SENIOR",
                special_exemption_limit=Decimal("400000.00"),
                min_tax_amount=Decimal("5000.00"),
                is_active=True,
                notes="Women and senior citizens aged 65 or above exemption threshold"
            ),
            HrmTaxConfiguration(
                assessment_year="2026-2027",
                slab_name="Next ৳ 1,00,000 @ 5%",
                min_amount=Decimal("350000.01"),
                max_amount=Decimal("450000.00"),
                tax_rate_percent=Decimal("5.00"),
                gender_group="ALL",
                special_exemption_limit=Decimal("350000.00"),
                min_tax_amount=Decimal("5000.00"),
                is_active=True,
                notes="First taxable progressive slab"
            ),
            HrmTaxConfiguration(
                assessment_year="2026-2027",
                slab_name="Next ৳ 4,00,000 @ 10%",
                min_amount=Decimal("450000.01"),
                max_amount=Decimal("850000.00"),
                tax_rate_percent=Decimal("10.00"),
                gender_group="ALL",
                special_exemption_limit=Decimal("350000.00"),
                min_tax_amount=Decimal("5000.00"),
                is_active=True,
                notes="Second progressive salary tax slab"
            ),
            HrmTaxConfiguration(
                assessment_year="2026-2027",
                slab_name="Next ৳ 5,00,000 @ 15%",
                min_amount=Decimal("850000.01"),
                max_amount=Decimal("1350000.00"),
                tax_rate_percent=Decimal("15.00"),
                gender_group="ALL",
                special_exemption_limit=Decimal("350000.00"),
                min_tax_amount=Decimal("5000.00"),
                is_active=True,
                notes="Third progressive slab"
            ),
            HrmTaxConfiguration(
                assessment_year="2026-2027",
                slab_name="Next ৳ 5,00,000 @ 20%",
                min_amount=Decimal("1350000.01"),
                max_amount=Decimal("1850000.00"),
                tax_rate_percent=Decimal("20.00"),
                gender_group="ALL",
                special_exemption_limit=Decimal("350000.00"),
                min_tax_amount=Decimal("5000.00"),
                is_active=True,
                notes="Senior executive tier"
            ),
            HrmTaxConfiguration(
                assessment_year="2026-2027",
                slab_name="Remaining Balance Exceeding ৳ 18,50,000 @ 25%",
                min_amount=Decimal("1850000.01"),
                max_amount=Decimal("99999999.00"),
                tax_rate_percent=Decimal("25.00"),
                gender_group="ALL",
                special_exemption_limit=Decimal("350000.00"),
                min_tax_amount=Decimal("5000.00"),
                is_active=True,
                notes="Maximum personal income tax rate for top tier salaries"
            )
        ]
        db.add_all(configs)

    deduct_count = await db.scalar(select(func.count(HrmTaxDeduction.id)))
    if deduct_count == 0:
        deductions = [
            HrmTaxDeduction(
                deduction_ref="TDS-2026-10-001",
                employee_id=1,
                employee_name="Engr. Rafiqul Islam",
                department="Engineering & Site Operations",
                fiscal_year="2026-2027",
                tax_month="October 2026",
                gross_salary=Decimal("145000.00"),
                taxable_salary=Decimal("125000.00"),
                tds_amount=Decimal("12500.00"),
                challan_number="CHL-NBR-8849-T",
                challan_date=date(2026, 10, 7),
                bank_name="Sonali Bank PLC",
                bank_branch="Customs & Treasury Branch, Dhaka",
                status="DEPOSITED",
                remarks="Monthly salary TDS under Section 50 Income Tax Act 2023"
            ),
            HrmTaxDeduction(
                deduction_ref="TDS-2026-10-002",
                employee_id=2,
                employee_name="Tahmina Sultana",
                department="Accounts & Finance",
                fiscal_year="2026-2027",
                tax_month="October 2026",
                gross_salary=Decimal("98000.00"),
                taxable_salary=Decimal("82000.00"),
                tds_amount=Decimal("6200.00"),
                challan_number="CHL-NBR-8849-T",
                challan_date=date(2026, 10, 7),
                bank_name="Sonali Bank PLC",
                bank_branch="Customs & Treasury Branch, Dhaka",
                status="DEPOSITED",
                remarks="Section 50 tax deduction deposited in government treasury"
            ),
            HrmTaxDeduction(
                deduction_ref="TDS-2026-10-003",
                employee_id=3,
                employee_name="Kazi Morshed Alam",
                department="Human Resources",
                fiscal_year="2026-2027",
                tax_month="October 2026",
                gross_salary=Decimal("110000.00"),
                taxable_salary=Decimal("95000.00"),
                tds_amount=Decimal("8500.00"),
                challan_number="CHL-NBR-8849-T",
                challan_date=date(2026, 10, 7),
                bank_name="Sonali Bank PLC",
                bank_branch="Customs & Treasury Branch, Dhaka",
                status="DEPOSITED",
                remarks="Section 50 tax deduction deposited"
            ),
            HrmTaxDeduction(
                deduction_ref="TDS-2026-10-004",
                employee_id=4,
                employee_name="Arif Chowdhury",
                department="Sales & Marketing",
                fiscal_year="2026-2027",
                tax_month="October 2026",
                gross_salary=Decimal("130000.00"),
                taxable_salary=Decimal("112000.00"),
                tds_amount=Decimal("10500.00"),
                challan_number="CHL-NBR-8850-T",
                challan_date=date(2026, 10, 10),
                bank_name="Sonali Bank PLC",
                bank_branch="Customs & Treasury Branch, Dhaka",
                status="DEPOSITED",
                remarks="Commission and monthly salary TDS"
            )
        ]
        db.add_all(deductions)

    cert_count = await db.scalar(select(func.count(HrmTaxCertificate.id)))
    if cert_count == 0:
        certs = [
            HrmTaxCertificate(
                certificate_number="CERT-108-2026-001",
                employee_id=1,
                employee_name="Engr. Rafiqul Islam",
                etin="482910482918",
                tax_circle="Circle 12, Salary",
                tax_zone="Tax Zone 06, Dhaka",
                assessment_year="2026-2027",
                gross_earnings=Decimal("1740000.00"),
                total_tax_deducted=Decimal("150000.00"),
                issue_date=date(2026, 10, 15),
                authorized_signatory="Chief Financial Officer",
                status="ISSUED",
                remarks="Form 108 certified for annual tax return filing with NBR"
            ),
            HrmTaxCertificate(
                certificate_number="CERT-108-2026-002",
                employee_id=2,
                employee_name="Tahmina Sultana",
                etin="719284910283",
                tax_circle="Circle 08, Corporate Salary",
                tax_zone="Tax Zone 04, Dhaka",
                assessment_year="2026-2027",
                gross_earnings=Decimal("1176000.00"),
                total_tax_deducted=Decimal("74400.00"),
                issue_date=date(2026, 10, 15),
                authorized_signatory="Chief Financial Officer",
                status="ISSUED",
                remarks="Form 108 annual certificate issued"
            )
        ]
        db.add_all(certs)

    reg_count = await db.scalar(select(func.count(HrmStatutoryRegister.id)))
    if reg_count == 0:
        registers = [
            HrmStatutoryRegister(
                register_code="BLA-REG-008",
                register_type="FORM_8_WORKER",
                register_name="Form 8: Register of Adult Workers",
                department_or_site="Civil Project Site #4 - Mirpur",
                calendar_year="2026",
                total_entries=142,
                verified_by="Head of HR & Admin",
                verification_date=date(2026, 10, 1),
                status="CURRENT",
                remarks="Mandatory under Section 9 of Bangladesh Labour Act 2006"
            ),
            HrmStatutoryRegister(
                register_code="BLA-REG-009",
                register_type="FORM_9_LEAVE",
                register_name="Form 9: Leave Book & Register",
                department_or_site="Head Office & Operations",
                calendar_year="2026",
                total_entries=86,
                verified_by="HR Compliance Manager",
                verification_date=date(2026, 10, 5),
                status="CURRENT",
                remarks="Maintained pursuant to Section 10 & 115-117 BLA 2006"
            ),
            HrmStatutoryRegister(
                register_code="BLA-REG-011",
                register_type="FORM_11_OVERTIME",
                register_name="Form 11: Register of Overtime Work",
                department_or_site="Electrical & MEP Site Unit",
                calendar_year="2026",
                total_entries=54,
                verified_by="Project Director",
                verification_date=date(2026, 10, 10),
                status="CURRENT",
                remarks="Under Section 102 & 108 BLA 2006 with overtime payment rates"
            ),
            HrmStatutoryRegister(
                register_code="BLA-REG-015",
                register_type="FORM_15_FINE",
                register_name="Form 15: Register of Fines & Deductions",
                department_or_site="All Real Estate Project Sites",
                calendar_year="2026",
                total_entries=3,
                verified_by="Head of Internal Audit",
                verification_date=date(2026, 10, 12),
                status="CURRENT",
                remarks="Maintained under Section 25 BLA 2006; fines utilized for welfare"
            )
        ]
        db.add_all(registers)

    cnt_count = await db.scalar(select(func.count(HrmEmploymentContract.id)))
    if cnt_count == 0:
        contracts = [
            HrmEmploymentContract(
                contract_code="CNT-2026-042",
                employee_id=1,
                employee_name="Engr. Tareq Hasan",
                designation="Senior Project Manager",
                department="Engineering & Site Operations",
                contract_type="PERMANENT",
                start_date=date(2023, 3, 1),
                end_date=None,
                probation_months=6,
                notice_period_days=60,
                base_salary=Decimal("160000.00"),
                status="ACTIVE",
                terms_summary="Permanent executive appointment with provident fund and gratuity eligibility"
            ),
            HrmEmploymentContract(
                contract_code="CNT-2026-088",
                employee_id=2,
                employee_name="Engr. A. K. Azad",
                designation="Structural Site Engineer",
                department="Civil Project Site #4",
                contract_type="PROJECT_BASED",
                start_date=date(2025, 1, 15),
                end_date=date(2027, 12, 31),
                probation_months=3,
                notice_period_days=30,
                base_salary=Decimal("95000.00"),
                status="ACTIVE",
                terms_summary="Fixed-term project contract for Ocean Heights Tower construction"
            ),
            HrmEmploymentContract(
                contract_code="CNT-2026-104",
                employee_id=3,
                employee_name="Mahmudur Rahman",
                designation="Procurement Specialist",
                department="Procurement & Supply Chain",
                contract_type="PERMANENT",
                start_date=date(2024, 6, 1),
                end_date=None,
                probation_months=6,
                notice_period_days=60,
                base_salary=Decimal("80000.00"),
                status="ACTIVE",
                terms_summary="Permanent appointment pursuant to Bangladesh Labour Rules 2015"
            )
        ]
        db.add_all(contracts)

    pol_count = await db.scalar(select(func.count(HrmPolicyAcknowledgment.id)))
    if pol_count == 0:
        policies = [
            HrmPolicyAcknowledgment(
                policy_code="POL-HR-001",
                policy_title="Code of Corporate Integrity & Workplace Ethics",
                category="CONDUCT",
                mandatory_for="ALL",
                version="3.0",
                effective_date=date(2026, 1, 1),
                required_signoffs=180,
                acknowledged_count=176,
                status="ACTIVE",
                description="General code of professional ethics, confidentiality, and anti-conflict of interest"
            ),
            HrmPolicyAcknowledgment(
                policy_code="POL-OHS-004",
                policy_title="Occupational Health, Safety & Construction Site OHS Protocol",
                category="SAFETY_OHS",
                mandatory_for="SITE_ENGINEERS",
                version="2.4",
                effective_date=date(2026, 2, 1),
                required_signoffs=65,
                acknowledged_count=65,
                status="ACTIVE",
                description="Mandatory personal protective equipment (PPE) and zero-tolerance safety policy"
            ),
            HrmPolicyAcknowledgment(
                policy_code="POL-HR-008",
                policy_title="Prevention of Sexual Harassment at Workplace (High Court Mandate)",
                category="ANTI_HARASSMENT",
                mandatory_for="ALL",
                version="2.1",
                effective_date=date(2026, 1, 1),
                required_signoffs=180,
                acknowledged_count=178,
                status="ACTIVE",
                description="Formal internal complaint committee and investigation mechanism"
            )
        ]
        db.add_all(policies)

    audit_count = await db.scalar(select(func.count(HrmStatutoryAuditDoc.id)))
    if audit_count == 0:
        audit_docs = [
            HrmStatutoryAuditDoc(
                audit_code="AUD-DIFE-2026-01",
                regulatory_authority="DIFE",
                document_type="Factory & Establishment Inspection Clearance",
                title="DIFE Annual Labor Compliance Certificate - Dhaka Zone",
                reference_number="DIFE/DH-3/EST-4920/2026",
                issue_date=date(2026, 3, 1),
                expiry_date=date(2027, 2, 28),
                responsible_officer="Chief Compliance Officer",
                compliance_rating="GRADE_A",
                status="VALID",
                notes="Inspected by Joint Inspector General of DIFE; 100% compliance verified"
            ),
            HrmStatutoryAuditDoc(
                audit_code="AUD-FIRE-2026-02",
                regulatory_authority="FIRE_SERVICE",
                document_type="Fire Safety & Rescue Clearance License",
                title="Head Office & Project Site Fire Safety Clearance",
                reference_number="FSCD/DZ-08/LIC-9932",
                issue_date=date(2026, 5, 10),
                expiry_date=date(2027, 5, 9),
                responsible_officer="Safety Officer",
                compliance_rating="GRADE_A",
                status="VALID",
                notes="Bi-annual fire evacuation drill conducted and approved"
            ),
            HrmStatutoryAuditDoc(
                audit_code="AUD-NBR-2026-03",
                regulatory_authority="NBR",
                document_type="Income Tax Assessment & Withholding Acknowledgment",
                title="NBR Form 108 Annual Filing Acknowledgment Receipt",
                reference_number="NBR/LTU-SAL/108-8831/2026",
                issue_date=date(2026, 9, 30),
                expiry_date=date(2027, 9, 29),
                responsible_officer="Head of Accounts & Taxation",
                compliance_rating="GRADE_A",
                status="VALID",
                notes="Official e-filing return submitted with complete payroll reconciliation"
            )
        ]
        db.add_all(audit_docs)

    await db.commit()


# ==========================================
# 0. METADATA ENDPOINT FOR DYNAMIC DROPDOWNS
# ==========================================
@router.get("/metadata", response_model=StatutoryMetadataResponse)
async def get_statutory_metadata(db: AsyncSession = Depends(get_db)):
    await seed_statutory_defaults(db)

    assessment_years = [
        DropdownOption(value="2025-2026", label="Assessment Year 2025-2026"),
        DropdownOption(value="2026-2027", label="Assessment Year 2026-2027"),
        DropdownOption(value="2027-2028", label="Assessment Year 2027-2028")
    ]
    gender_groups = [
        DropdownOption(value="ALL", label="All Individual Assessees"),
        DropdownOption(value="MALE", label="Male Individuals"),
        DropdownOption(value="FEMALE_SENIOR", label="Female & Senior Citizens (65+)"),
        DropdownOption(value="PHYSICALLY_CHALLENGED", label="Physically Challenged"),
        DropdownOption(value="FREEDOM_FIGHTER", label="Gazetted War-Wounded Freedom Fighters")
    ]
    regulatory_authorities = [
        DropdownOption(value="DIFE", label="Dept of Inspection for Factories (DIFE)"),
        DropdownOption(value="NBR", label="National Board of Revenue (NBR)"),
        DropdownOption(value="RJSC", label="Registrar of Joint Stock Companies (RJSC)"),
        DropdownOption(value="FIRE_SERVICE", label="Fire Service & Civil Defence"),
        DropdownOption(value="RAJUK", label="Rajdhani Unnayan Kartripakkha (RAJUK)"),
        DropdownOption(value="CITY_CORP", label="Dhaka North / South City Corporation")
    ]
    register_types = [
        DropdownOption(value="FORM_8_WORKER", label="Form 8: Register of Adult Workers"),
        DropdownOption(value="FORM_9_LEAVE", label="Form 9: Leave Book & Register"),
        DropdownOption(value="FORM_11_OVERTIME", label="Form 11: Register of Overtime Work"),
        DropdownOption(value="FORM_15_FINE", label="Form 15: Register of Fines & Deductions"),
        DropdownOption(value="FORM_35_MATERNITY", label="Form 35: Maternity Benefit Register"),
        DropdownOption(value="FORM_36_ACCIDENT", label="Form 36: Notice of Accidents & Injuries")
    ]
    contract_types = [
        DropdownOption(value="PERMANENT", label="Permanent Employment Contract"),
        DropdownOption(value="PROBATION", label="Probationary Service Agreement"),
        DropdownOption(value="CONTRACTUAL", label="Fixed-Term Contractual Appointment"),
        DropdownOption(value="PROJECT_BASED", label="Project-Specific Construction Contract"),
        DropdownOption(value="CONSULTANT", label="Professional Retainer / Consultant")
    ]
    policy_categories = [
        DropdownOption(value="CONDUCT", label="Corporate Code of Conduct"),
        DropdownOption(value="SAFETY_OHS", label="Occupational Health & Site Safety (OHS)"),
        DropdownOption(value="ANTI_HARASSMENT", label="Anti-Harassment & Workplace Respect"),
        DropdownOption(value="PRIVACY", label="Data Privacy & Confidentiality"),
        DropdownOption(value="WHISTLEBLOWER", label="Whistleblower Protection Policy")
    ]
    departments = [
        DropdownOption(value="Engineering & Site Operations", label="Engineering & Site Operations"),
        DropdownOption(value="Civil Project Site #4", label="Civil Project Site #4"),
        DropdownOption(value="Electrical & MEP", label="Electrical & MEP"),
        DropdownOption(value="Accounts & Finance", label="Accounts & Finance"),
        DropdownOption(value="Human Resources", label="Human Resources"),
        DropdownOption(value="Sales & Marketing", label="Sales & Marketing"),
        DropdownOption(value="Procurement & Supply Chain", label="Procurement & Supply Chain")
    ]
    designations = [
        DropdownOption(value="Project Director", label="Project Director"),
        DropdownOption(value="Senior Project Manager", label="Senior Project Manager"),
        DropdownOption(value="Structural Site Engineer", label="Structural Site Engineer"),
        DropdownOption(value="HR Compliance Manager", label="HR Compliance Manager"),
        DropdownOption(value="Head of Accounts & Taxation", label="Head of Accounts & Taxation"),
        DropdownOption(value="Chief Compliance Officer", label="Chief Compliance Officer"),
        DropdownOption(value="Procurement Specialist", label="Procurement Specialist")
    ]
    compliance_ratings = [
        DropdownOption(value="GRADE_A", label="Grade A - Fully Compliant"),
        DropdownOption(value="GRADE_B", label="Grade B - Substantially Compliant"),
        DropdownOption(value="CONDITIONAL", label="Conditional Clearance (Rectification Due)"),
        DropdownOption(value="NON_COMPLIANT", label="Non-Compliant / Notice Issued")
    ]
    statuses = [
        DropdownOption(value="ACTIVE", label="Active / Current"),
        DropdownOption(value="VALID", label="Valid / In Effect"),
        DropdownOption(value="PENDING", label="Pending / Due for Filing"),
        DropdownOption(value="DEPOSITED", label="Challan Deposited"),
        DropdownOption(value="ISSUED", label="Official Certificate Issued"),
        DropdownOption(value="RENEWAL_DUE", label="Renewal Due"),
        DropdownOption(value="EXPIRED", label="Expired")
    ]

    return StatutoryMetadataResponse(
        assessment_years=assessment_years,
        gender_groups=gender_groups,
        regulatory_authorities=regulatory_authorities,
        register_types=register_types,
        contract_types=contract_types,
        policy_categories=policy_categories,
        departments=departments,
        designations=designations,
        compliance_ratings=compliance_ratings,
        statuses=statuses
    )


# ==========================================
# 1. TAX CONFIGURATION CRUD
# ==========================================
@router.get("/tax-config", response_model=PaginatedResponse[TaxConfigResponse])
async def list_tax_configs(
    assessment_year: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await seed_statutory_defaults(db)
    query = select(HrmTaxConfiguration)
    count_query = select(func.count(HrmTaxConfiguration.id))

    if assessment_year:
        query = query.where(HrmTaxConfiguration.assessment_year == assessment_year)
        count_query = count_query.where(HrmTaxConfiguration.assessment_year == assessment_year)
    if search:
        s = f"%{search.strip()}%"
        query = query.where(HrmTaxConfiguration.slab_name.ilike(s))
        count_query = count_query.where(HrmTaxConfiguration.slab_name.ilike(s))

    total = await db.scalar(count_query) or 0
    query = query.order_by(HrmTaxConfiguration.min_amount.asc()).limit(limit).offset(offset)
    result = await db.execute(query)
    items = result.scalars().all()
    return PaginatedResponse(items=list(items), total=total, limit=limit, offset=offset)


@router.get("/tax-config/{id}", response_model=TaxConfigResponse)
async def get_tax_config(id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmTaxConfiguration, id)
    if not item:
        raise HTTPException(status_code=404, detail="Tax configuration not found")
    return item


@router.post("/tax-config", response_model=TaxConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_tax_config(payload: TaxConfigCreate, db: AsyncSession = Depends(get_db)):
    item = HrmTaxConfiguration(**payload.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/tax-config/{id}", response_model=TaxConfigResponse)
async def update_tax_config(id: int, payload: TaxConfigUpdate, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmTaxConfiguration, id)
    if not item:
        raise HTTPException(status_code=404, detail="Tax configuration not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/tax-config/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tax_config(id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmTaxConfiguration, id)
    if not item:
        raise HTTPException(status_code=404, detail="Tax configuration not found")
    await db.delete(item)
    await db.commit()
    return None


# ==========================================
# 2. TAX DEDUCTION (TDS) CRUD
# ==========================================
@router.get("/tax-deductions", response_model=PaginatedResponse[TaxDeductionResponse])
async def list_tax_deductions(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await seed_statutory_defaults(db)
    query = select(HrmTaxDeduction)
    count_query = select(func.count(HrmTaxDeduction.id))

    if status_filter and status_filter != "ALL":
        query = query.where(HrmTaxDeduction.status == status_filter)
        count_query = count_query.where(HrmTaxDeduction.status == status_filter)
    if search:
        s = f"%{search.strip()}%"
        cond = or_(
            HrmTaxDeduction.employee_name.ilike(s),
            HrmTaxDeduction.deduction_ref.ilike(s),
            HrmTaxDeduction.challan_number.ilike(s),
            HrmTaxDeduction.department.ilike(s)
        )
        query = query.where(cond)
        count_query = count_query.where(cond)

    total = await db.scalar(count_query) or 0
    query = query.order_by(desc(HrmTaxDeduction.id)).limit(limit).offset(offset)
    result = await db.execute(query)
    items = result.scalars().all()
    return PaginatedResponse(items=list(items), total=total, limit=limit, offset=offset)


@router.get("/tax-deductions/{id}", response_model=TaxDeductionResponse)
async def get_tax_deduction(id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmTaxDeduction, id)
    if not item:
        raise HTTPException(status_code=404, detail="Tax deduction record not found")
    return item


@router.post("/tax-deductions", response_model=TaxDeductionResponse, status_code=status.HTTP_201_CREATED)
async def create_tax_deduction(payload: TaxDeductionCreate, db: AsyncSession = Depends(get_db)):
    data = payload.model_dump()
    if not data.get("deduction_ref"):
        count = await db.scalar(select(func.count(HrmTaxDeduction.id))) or 0
        data["deduction_ref"] = f"TDS-{date.today().year}-{count + 1:04d}"
    item = HrmTaxDeduction(**data)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/tax-deductions/{id}", response_model=TaxDeductionResponse)
async def update_tax_deduction(id: int, payload: TaxDeductionUpdate, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmTaxDeduction, id)
    if not item:
        raise HTTPException(status_code=404, detail="Tax deduction record not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/tax-deductions/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tax_deduction(id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmTaxDeduction, id)
    if not item:
        raise HTTPException(status_code=404, detail="Tax deduction record not found")
    await db.delete(item)
    await db.commit()
    return None


# ==========================================
# 3. TAX CERTIFICATES (FORM 108) CRUD
# ==========================================
@router.get("/tax-certificates", response_model=PaginatedResponse[TaxCertificateResponse])
async def list_tax_certificates(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await seed_statutory_defaults(db)
    query = select(HrmTaxCertificate)
    count_query = select(func.count(HrmTaxCertificate.id))

    if status_filter and status_filter != "ALL":
        query = query.where(HrmTaxCertificate.status == status_filter)
        count_query = count_query.where(HrmTaxCertificate.status == status_filter)
    if search:
        s = f"%{search.strip()}%"
        cond = or_(
            HrmTaxCertificate.employee_name.ilike(s),
            HrmTaxCertificate.certificate_number.ilike(s),
            HrmTaxCertificate.etin.ilike(s)
        )
        query = query.where(cond)
        count_query = count_query.where(cond)

    total = await db.scalar(count_query) or 0
    query = query.order_by(desc(HrmTaxCertificate.id)).limit(limit).offset(offset)
    result = await db.execute(query)
    items = result.scalars().all()
    return PaginatedResponse(items=list(items), total=total, limit=limit, offset=offset)


@router.get("/tax-certificates/{id}", response_model=TaxCertificateResponse)
async def get_tax_certificate(id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmTaxCertificate, id)
    if not item:
        raise HTTPException(status_code=404, detail="Tax certificate not found")
    return item


@router.post("/tax-certificates", response_model=TaxCertificateResponse, status_code=status.HTTP_201_CREATED)
async def create_tax_certificate(payload: TaxCertificateCreate, db: AsyncSession = Depends(get_db)):
    data = payload.model_dump()
    if not data.get("certificate_number"):
        count = await db.scalar(select(func.count(HrmTaxCertificate.id))) or 0
        data["certificate_number"] = f"CERT-108-{date.today().year}-{count + 1:04d}"
    item = HrmTaxCertificate(**data)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/tax-certificates/{id}", response_model=TaxCertificateResponse)
async def update_tax_certificate(id: int, payload: TaxCertificateUpdate, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmTaxCertificate, id)
    if not item:
        raise HTTPException(status_code=404, detail="Tax certificate not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/tax-certificates/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tax_certificate(id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmTaxCertificate, id)
    if not item:
        raise HTTPException(status_code=404, detail="Tax certificate not found")
    await db.delete(item)
    await db.commit()
    return None


# ==========================================
# 4. STATUTORY REGISTERS CRUD
# ==========================================
@router.get("/registers", response_model=PaginatedResponse[StatutoryRegisterResponse])
async def list_registers(
    register_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await seed_statutory_defaults(db)
    query = select(HrmStatutoryRegister)
    count_query = select(func.count(HrmStatutoryRegister.id))

    if register_type and register_type != "ALL":
        query = query.where(HrmStatutoryRegister.register_type == register_type)
        count_query = count_query.where(HrmStatutoryRegister.register_type == register_type)
    if search:
        s = f"%{search.strip()}%"
        cond = or_(
            HrmStatutoryRegister.register_name.ilike(s),
            HrmStatutoryRegister.register_code.ilike(s),
            HrmStatutoryRegister.department_or_site.ilike(s)
        )
        query = query.where(cond)
        count_query = count_query.where(cond)

    total = await db.scalar(count_query) or 0
    query = query.order_by(desc(HrmStatutoryRegister.id)).limit(limit).offset(offset)
    result = await db.execute(query)
    items = result.scalars().all()
    return PaginatedResponse(items=list(items), total=total, limit=limit, offset=offset)


@router.get("/registers/{id}", response_model=StatutoryRegisterResponse)
async def get_register(id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmStatutoryRegister, id)
    if not item:
        raise HTTPException(status_code=404, detail="Statutory register not found")
    return item


@router.post("/registers", response_model=StatutoryRegisterResponse, status_code=status.HTTP_201_CREATED)
async def create_register(payload: StatutoryRegisterCreate, db: AsyncSession = Depends(get_db)):
    data = payload.model_dump()
    if not data.get("register_code"):
        count = await db.scalar(select(func.count(HrmStatutoryRegister.id))) or 0
        data["register_code"] = f"BLA-REG-{count + 1:04d}"
    item = HrmStatutoryRegister(**data)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/registers/{id}", response_model=StatutoryRegisterResponse)
async def update_register(id: int, payload: StatutoryRegisterUpdate, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmStatutoryRegister, id)
    if not item:
        raise HTTPException(status_code=404, detail="Statutory register not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/registers/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_register(id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmStatutoryRegister, id)
    if not item:
        raise HTTPException(status_code=404, detail="Statutory register not found")
    await db.delete(item)
    await db.commit()
    return None


# ==========================================
# 5. EMPLOYMENT CONTRACTS CRUD
# ==========================================
@router.get("/contracts", response_model=PaginatedResponse[EmploymentContractResponse])
async def list_contracts(
    contract_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await seed_statutory_defaults(db)
    query = select(HrmEmploymentContract)
    count_query = select(func.count(HrmEmploymentContract.id))

    if contract_type and contract_type != "ALL":
        query = query.where(HrmEmploymentContract.contract_type == contract_type)
        count_query = count_query.where(HrmEmploymentContract.contract_type == contract_type)
    if status_filter and status_filter != "ALL":
        query = query.where(HrmEmploymentContract.status == status_filter)
        count_query = count_query.where(HrmEmploymentContract.status == status_filter)
    if search:
        s = f"%{search.strip()}%"
        cond = or_(
            HrmEmploymentContract.employee_name.ilike(s),
            HrmEmploymentContract.contract_code.ilike(s),
            HrmEmploymentContract.department.ilike(s),
            HrmEmploymentContract.designation.ilike(s)
        )
        query = query.where(cond)
        count_query = count_query.where(cond)

    total = await db.scalar(count_query) or 0
    query = query.order_by(desc(HrmEmploymentContract.id)).limit(limit).offset(offset)
    result = await db.execute(query)
    items = result.scalars().all()
    return PaginatedResponse(items=list(items), total=total, limit=limit, offset=offset)


@router.get("/contracts/{id}", response_model=EmploymentContractResponse)
async def get_contract(id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmEmploymentContract, id)
    if not item:
        raise HTTPException(status_code=404, detail="Employment contract not found")
    return item


@router.post("/contracts", response_model=EmploymentContractResponse, status_code=status.HTTP_201_CREATED)
async def create_contract(payload: EmploymentContractCreate, db: AsyncSession = Depends(get_db)):
    data = payload.model_dump()
    if not data.get("contract_code"):
        count = await db.scalar(select(func.count(HrmEmploymentContract.id))) or 0
        data["contract_code"] = f"CNT-{date.today().year}-{count + 1:04d}"
    item = HrmEmploymentContract(**data)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/contracts/{id}", response_model=EmploymentContractResponse)
async def update_contract(id: int, payload: EmploymentContractUpdate, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmEmploymentContract, id)
    if not item:
        raise HTTPException(status_code=404, detail="Employment contract not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/contracts/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contract(id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmEmploymentContract, id)
    if not item:
        raise HTTPException(status_code=404, detail="Employment contract not found")
    await db.delete(item)
    await db.commit()
    return None


# ==========================================
# 6. POLICY ACKNOWLEDGMENT CRUD
# ==========================================
@router.get("/policies", response_model=PaginatedResponse[PolicyAcknowledgmentResponse])
async def list_policies(
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await seed_statutory_defaults(db)
    query = select(HrmPolicyAcknowledgment)
    count_query = select(func.count(HrmPolicyAcknowledgment.id))

    if category and category != "ALL":
        query = query.where(HrmPolicyAcknowledgment.category == category)
        count_query = count_query.where(HrmPolicyAcknowledgment.category == category)
    if search:
        s = f"%{search.strip()}%"
        cond = or_(
            HrmPolicyAcknowledgment.policy_title.ilike(s),
            HrmPolicyAcknowledgment.policy_code.ilike(s)
        )
        query = query.where(cond)
        count_query = count_query.where(cond)

    total = await db.scalar(count_query) or 0
    query = query.order_by(desc(HrmPolicyAcknowledgment.id)).limit(limit).offset(offset)
    result = await db.execute(query)
    items = result.scalars().all()
    return PaginatedResponse(items=list(items), total=total, limit=limit, offset=offset)


@router.get("/policies/{id}", response_model=PolicyAcknowledgmentResponse)
async def get_policy(id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmPolicyAcknowledgment, id)
    if not item:
        raise HTTPException(status_code=404, detail="Policy acknowledgment record not found")
    return item


@router.post("/policies", response_model=PolicyAcknowledgmentResponse, status_code=status.HTTP_201_CREATED)
async def create_policy(payload: PolicyAcknowledgmentCreate, db: AsyncSession = Depends(get_db)):
    data = payload.model_dump()
    if not data.get("policy_code"):
        count = await db.scalar(select(func.count(HrmPolicyAcknowledgment.id))) or 0
        data["policy_code"] = f"POL-HR-{count + 1:04d}"
    item = HrmPolicyAcknowledgment(**data)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/policies/{id}", response_model=PolicyAcknowledgmentResponse)
async def update_policy(id: int, payload: PolicyAcknowledgmentUpdate, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmPolicyAcknowledgment, id)
    if not item:
        raise HTTPException(status_code=404, detail="Policy acknowledgment record not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/policies/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_policy(id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmPolicyAcknowledgment, id)
    if not item:
        raise HTTPException(status_code=404, detail="Policy acknowledgment record not found")
    await db.delete(item)
    await db.commit()
    return None


# ==========================================
# 7. STATUTORY AUDIT DOCUMENTS CRUD
# ==========================================
@router.get("/audit-documents", response_model=PaginatedResponse[StatutoryAuditDocResponse])
async def list_audit_documents(
    authority: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await seed_statutory_defaults(db)
    query = select(HrmStatutoryAuditDoc)
    count_query = select(func.count(HrmStatutoryAuditDoc.id))

    if authority and authority != "ALL":
        query = query.where(HrmStatutoryAuditDoc.regulatory_authority == authority)
        count_query = count_query.where(HrmStatutoryAuditDoc.regulatory_authority == authority)
    if status_filter and status_filter != "ALL":
        query = query.where(HrmStatutoryAuditDoc.status == status_filter)
        count_query = count_query.where(HrmStatutoryAuditDoc.status == status_filter)
    if search:
        s = f"%{search.strip()}%"
        cond = or_(
            HrmStatutoryAuditDoc.title.ilike(s),
            HrmStatutoryAuditDoc.audit_code.ilike(s),
            HrmStatutoryAuditDoc.reference_number.ilike(s)
        )
        query = query.where(cond)
        count_query = count_query.where(cond)

    total = await db.scalar(count_query) or 0
    query = query.order_by(desc(HrmStatutoryAuditDoc.id)).limit(limit).offset(offset)
    result = await db.execute(query)
    items = result.scalars().all()
    return PaginatedResponse(items=list(items), total=total, limit=limit, offset=offset)


@router.get("/audit-documents/{id}", response_model=StatutoryAuditDocResponse)
async def get_audit_document(id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmStatutoryAuditDoc, id)
    if not item:
        raise HTTPException(status_code=404, detail="Audit document not found")
    return item


@router.post("/audit-documents", response_model=StatutoryAuditDocResponse, status_code=status.HTTP_201_CREATED)
async def create_audit_document(payload: StatutoryAuditDocCreate, db: AsyncSession = Depends(get_db)):
    data = payload.model_dump()
    if not data.get("audit_code"):
        count = await db.scalar(select(func.count(HrmStatutoryAuditDoc.id))) or 0
        data["audit_code"] = f"AUD-{date.today().year}-{count + 1:04d}"
    item = HrmStatutoryAuditDoc(**data)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/audit-documents/{id}", response_model=StatutoryAuditDocResponse)
async def update_audit_document(id: int, payload: StatutoryAuditDocUpdate, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmStatutoryAuditDoc, id)
    if not item:
        raise HTTPException(status_code=404, detail="Audit document not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/audit-documents/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_audit_document(id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(HrmStatutoryAuditDoc, id)
    if not item:
        raise HTTPException(status_code=404, detail="Audit document not found")
    await db.delete(item)
    await db.commit()
    return None
