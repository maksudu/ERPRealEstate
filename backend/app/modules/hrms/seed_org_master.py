import asyncio
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import AsyncSessionLocal, engine, Base
import app.modules.construction.models
import app.modules.land.models
import app.modules.projects.models
import app.modules.accounts.models
import app.modules.inventory.models
import app.modules.sales.models
import app.modules.crm.models
import app.modules.lookups.models
import app.modules.auth.models
import app.modules.hrms.models

from app.modules.hrms.models import (
    Company, LegalEntity, Branch, ProjectOffice,
    Department, DepartmentHeadHistory, DepartmentProjectMapping, DepartmentAuditLog,
    Employee
)
from app.modules.lookups.models import LookupCategory, LookupItem
from app.modules.projects.models import Project


LOOKUP_DATA = [
    {
        "code": "DEPARTMENT_STATUS",
        "name": "Department Lifecycle Status",
        "desc": "Operating status of departments across corporate and sites",
        "items": [
            ("ACTIVE", "Active & Operational", "সক্রিয় ও পরিচালিত", "#10b981"),
            ("INACTIVE", "Deactivated / Retired", "নিষ্ক্রিয় / বাতিলকৃত", "#ef4444"),
            ("RESTRUCTURED", "Restructured / Merged", "পুনর্গঠিত / একীভূত", "#8b5cf6")
        ]
    },
    {
        "code": "HEAD_ASSIGNMENT_TYPE",
        "name": "Department Head Assignment Type",
        "desc": "Executive tenure type for department heads",
        "items": [
            ("PERMANENT", "Permanent Head of Department", "স্থায়ী বিভাগীয় প্রধান", "#10b981"),
            ("ACTING", "Acting Department Head", "ভারপ্রাপ্ত বিভাগীয় প্রধান", "#3b82f6"),
            ("INTERIM", "Interim / Transitional Head", "অন্তর্বর্তীকালীন প্রধান", "#f59e0b")
        ]
    },
    {
        "code": "COST_CENTER_CODE",
        "name": "Accounting Cost Center Mapping",
        "desc": "Chart of accounts cost centers linked to functional departments",
        "items": [
            ("CC-MD-01", "CC-MD-01 (Executive Office)", "নির্বাহী অফিস ব্যয়কেন্দ্র", "#3b82f6"),
            ("CC-FIN-01", "CC-FIN-01 (Finance & Accounting)", "অর্থ ও হিসাব ব্যয়কেন্দ্র", "#10b981"),
            ("CC-FIN-AP", "CC-FIN-AP (Accounts Payable)", "প্রদেয় হিসাব ব্যয়কেন্দ্র", "#06b6d4"),
            ("CC-FIN-AR", "CC-FIN-AR (Accounts Receivable)", "প্রাপ্য হিসাব ব্যয়কেন্দ্র", "#8b5cf6"),
            ("CC-FIN-TR", "CC-FIN-TR (Treasury & Payroll)", "কোষাগার ও বেতন ব্যয়কেন্দ্র", "#f59e0b"),
            ("CC-ENG-01", "CC-ENG-01 (Civil & Structural Eng.)", "প্রকৌশল ও নির্মাণ ব্যয়কেন্দ্র", "#d97706"),
            ("CC-ENG-SITE", "CC-ENG-SITE (Site Operations)", "সাইট পরিচালনা ব্যয়কেন্দ্র", "#ef4444"),
            ("CC-ENG-QA", "CC-ENG-QA (Quality & Safety)", "মান ও নিরাপত্তা ব্যয়কেন্দ্র", "#6366f1"),
            ("CC-SALES-01", "CC-SALES-01 (Sales & Experience)", "বিক্রয় ও অভিজ্ঞতা কেন্দ্র", "#ec4899"),
            ("CC-ARCH-01", "CC-ARCH-01 (Architecture & Design)", "স্থাপত্য ও নকশা ব্যয়কেন্দ্র", "#14b8a6")
        ]
    },
    {
        "code": "COMPANY_TYPE",
        "name": "Company Classification Type",
        "desc": "Corporate hierarchy classification (Parent, Operating, Subsidiary, SPV)",
        "items": [
            ("PARENT", "Parent Corporate Group", "প্যারেন্ট কর্পোরেট গ্রুপ", "#3b82f6"),
            ("OPERATING_COMPANY", "Operating Company", "পরিচালনাকারী কোম্পানি", "#10b981"),
            ("SUBSIDIARY", "Subsidiary Company", "সহায়ক কোম্পানি", "#8b5cf6"),
            ("JOINT_VENTURE", "Joint Venture Entity", "যৌথ উদ্যোগ সংস্থা", "#f59e0b"),
            ("SPV", "Special Purpose Vehicle (SPV)", "বিশেষ উদ্দেশ্য প্রকল্প প্রতিষ্ঠান", "#06b6d4")
        ]
    },
    {
        "code": "LEGAL_FORM",
        "name": "Legal Form & Entity Structure",
        "desc": "Statutory registration classification under RJSC & Bangladesh laws",
        "items": [
            ("PVT_LTD", "Private Limited Company", "প্রাইভেট লিমিটেড কোম্পানি", "#10b981"),
            ("PUBLIC_LTD", "Public Limited Company", "পাবলিক লিমিটেড কোম্পানি", "#3b82f6"),
            ("SOLE_PROPRIETORSHIP", "Sole Proprietorship", "একমালিকানা প্রতিষ্ঠান", "#f59e0b"),
            ("PARTNERSHIP", "Partnership Firm", "অংশীদারি প্রতিষ্ঠান", "#8b5cf6"),
            ("CONSORTIUM", "Joint Venture Consortium", "যৌথ উদ্যোগ কনসোর্টিয়াম", "#ec4899")
        ]
    },
    {
        "code": "BRANCH_TYPE",
        "name": "Branch Operational Type",
        "desc": "Operating offices classification across Bangladesh",
        "items": [
            ("HEAD_OFFICE", "Head Office", "প্রধান কার্যালয়", "#10b981"),
            ("REGIONAL_OFFICE", "Regional Office", "আঞ্চলিক কার্যালয়", "#3b82f6"),
            ("SALES_OFFICE", "Sales & Experience Center", "বিক্রয় ও অভিজ্ঞতা কেন্দ্র", "#8b5cf6"),
            ("ADMIN_OFFICE", "Administrative Office", "প্রশাসনিক কার্যালয়", "#64748b"),
            ("ACCOUNTS_OFFICE", "Accounts & Audit Office", "হিসাব ও নিরীক্ষা কার্যালয়", "#06b6d4"),
            ("CUSTOMER_SERVICE", "Customer Service Lounge", "গ্রাহক সেবা লাউঞ্জ", "#f59e0b"),
            ("WAREHOUSE", "Central Warehouse / Store Depot", "কেন্দ্রীয় গুদাম ও উপকরণ ডিপো", "#d97706"),
            ("OTHER", "Other Operating Location", "অন্যান্য পরিচালন এলাকা", "#94a3b8")
        ]
    },
    {
        "code": "PROJECT_OFFICE_TYPE",
        "name": "Project Site Office Type",
        "desc": "On-site real estate construction and site admin offices",
        "items": [
            ("CONSTRUCTION_SITE", "Construction Site Office", "নির্মাণ সাইট অফিস", "#f59e0b"),
            ("PROJECT_ADMIN", "Project Site Administration", "প্রকল্প সাইট প্রশাসন", "#3b82f6"),
            ("SALES_SITE_OFFICE", "Site Sales Gallery & Mock-up", "সাইট সেলস গ্যালারি ও মকআপ", "#10b981"),
            ("QA_TESTING_LAB", "Site Concrete QA/QC Lab", "সাইট কিউএ/কিউসি ল্যাব", "#8b5cf6")
        ]
    },
    {
        "code": "PROJECT_OFFICE_STATUS",
        "name": "Project Office Operational Status",
        "desc": "Operational lifecycle of site offices",
        "items": [
            ("PLANNING", "Planning & Mobilization", "পরিকল্পনা ও মোবিলাইজেশন", "#f59e0b"),
            ("ACTIVE_MOBILIZED", "Active & Mobilized", "সক্রিয় ও পরিচালিত", "#10b981"),
            ("DEMOBILIZING", "Demobilizing / Nearing Handover", "হস্তান্তর পূর্ব ডিমোবিলাইজিং", "#3b82f6"),
            ("CLOSED", "Decommissioned & Closed", "সমাপ্ত ও সংরক্ষিত", "#64748b")
        ]
    },
    {
        "code": "BD_DIVISION",
        "name": "Bangladesh Administrative Division",
        "desc": "8 Divisions of Bangladesh",
        "items": [
            ("DHAKA", "Dhaka", "ঢাকা", "#3b82f6"),
            ("CHATTOGRAM", "Chattogram", "চট্টগ্রাম", "#10b981"),
            ("RAJSHAHI", "Rajshahi", "রাজশাহী", "#8b5cf6"),
            ("KHULNA", "Khulna", "খুলনা", "#f59e0b"),
            ("BARISHAL", "Barishal", "বরিশাল", "#06b6d4"),
            ("SYLHET", "Sylhet", "সিলেট", "#10b981"),
            ("RANGPUR", "Rangpur", "রংপুর", "#ec4899"),
            ("MYMENSINGH", "Mymensingh", "ময়মনসিংহ", "#64748b")
        ]
    },
    {
        "code": "BD_DISTRICT",
        "name": "Bangladesh District",
        "desc": "Major Districts of Bangladesh",
        "items": [
            ("DHAKA", "Dhaka", "ঢাকা", "#3b82f6"),
            ("GAZIPUR", "Gazipur", "গাজীপুর", "#10b981"),
            ("NARAYANGANJ", "Narayanganj", "নারায়ণগঞ্জ", "#8b5cf6"),
            ("CHATTOGRAM", "Chattogram", "চট্টগ্রাম", "#06b6d4"),
            ("COXS_BAZAR", "Cox's Bazar", "কক্সবাজার", "#f59e0b"),
            ("SYLHET", "Sylhet", "সিলেট", "#10b981"),
            ("RAJSHAHI", "Rajshahi", "রাজশাহী", "#8b5cf6"),
            ("KHULNA", "Khulna", "খুলনা", "#ec4899"),
            ("CUMILLA", "Cumilla", "কুমিল্লা", "#64748b"),
            ("BOGURA", "Bogura", "বগুড়া", "#f59e0b")
        ]
    },
    {
        "code": "BD_UPAZILA",
        "name": "Bangladesh Upazila / Thana",
        "desc": "Key administrative areas & Thanas",
        "items": [
            ("GULSHAN", "Gulshan", "গুলশান", "#3b82f6"),
            ("BANANI", "Banani", "বনানী", "#10b981"),
            ("DHANMONDI", "Dhanmondi", "ধানমন্ডি", "#8b5cf6"),
            ("UTTARA", "Uttara", "উত্তরা", "#06b6d4"),
            ("MIRPUR", "Mirpur", "মিরপুর", "#f59e0b"),
            ("MOTIJHEEL", "Motijheel", "মতিঝিল", "#64748b"),
            ("TEJGAON", "Tejgaon", "তেজগাঁও", "#ec4899"),
            ("BADDA", "Badda", "বাড্ডা", "#10b981"),
            ("SAVAR", "Savar", "সাভার", "#8b5cf6"),
            ("MOHAMMADPUR", "Mohammadpur", "মোহাম্মদপুর", "#3b82f6")
        ]
    },
    {
        "code": "CURRENCY",
        "name": "Operating Currency",
        "desc": "Supported financial currencies",
        "items": [
            ("BDT", "BDT (Bangladeshi Taka - ৳)", "বাংলাদেশী টাকা (৳)", "#10b981"),
            ("USD", "USD (US Dollar - $)", "মার্কিন ডলার ($)", "#3b82f6"),
            ("EUR", "EUR (Euro - €)", "ইউরো (€)", "#8b5cf6"),
            ("GBP", "GBP (British Pound - £)", "ব্রিটিশ পাউন্ড (£)", "#f59e0b")
        ]
    },
    {
        "code": "TIMEZONE",
        "name": "Operational Time Zone",
        "desc": "System time zones",
        "items": [
            ("Asia/Dhaka", "Asia/Dhaka (UTC+06:00)", "এশিয়া/ঢাকা (ইউটিসি+০৬:০০)", "#10b981"),
            ("UTC", "UTC (Coordinated Universal Time)", "আন্তর্জাতিক সময় (ইউটিসি)", "#64748b")
        ]
    },
    {
        "code": "FISCAL_YEAR_START",
        "name": "Fiscal Year Starting Month",
        "desc": "Standard accounting period beginning",
        "items": [
            ("7", "July (Bangladesh Fiscal Cycle July-June)", "জুলাই (বাংলাদেশ অর্থবছর জুলাই-জুন)", "#10b981"),
            ("1", "January (Calendar Year Cycle Jan-Dec)", "জানুয়ারি (ক্যালেন্ডার বছর)", "#3b82f6"),
            ("4", "April (Q1 Fiscal Cycle April-March)", "এপ্রিল (অর্থবছর এপ্রিল-মার্চ)", "#f59e0b")
        ]
    }
]


async def seed_org_master_data():
    # 1. Create tables if not existing
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        print("[Org Master] Seeding Dynamic Lookups & Dropdowns...")

        # 2. Seed Lookups
        for cat in LOOKUP_DATA:
            q = select(LookupCategory).where(LookupCategory.category_code == cat["code"])
            existing_cat = (await db.execute(q)).scalar_one_or_none()
            if not existing_cat:
                category = LookupCategory(
                    category_code=cat["code"],
                    category_name=cat["name"],
                    description=cat["desc"],
                    is_system_locked=False,
                    is_active=True
                )
                db.add(category)
                await db.flush()
                existing_cat = category

            # Seed items
            for idx, (code, en, bn, color) in enumerate(cat["items"], 1):
                item_q = select(LookupItem).where(
                    LookupItem.category_id == existing_cat.id,
                    LookupItem.item_code == code
                )
                existing_item = (await db.execute(item_q)).scalar_one_or_none()
                if not existing_item:
                    item = LookupItem(
                        category_id=existing_cat.id,
                        item_code=code,
                        item_name_en=en,
                        item_name_bn=bn,
                        color_badge=color,
                        sort_order=idx,
                        is_active=True
                    )
                    db.add(item)
            await db.commit()

        print("[Org Master] Seeding Sample Corporate Hierarchy...")

        # 3. Seed Corporate Group Company (Parent)
        parent_comp = (await db.execute(select(Company).where(Company.company_code == "BRE-GRP"))).scalar_one_or_none()
        if not parent_comp:
            parent_comp = Company(
                organization_id=1,
                company_code="BRE-GRP",
                company_name="Blue Oceans Holdings Ltd.",
                short_name="Blue Oceans Group",
                company_type="PARENT",
                parent_company_id=None,
                country="Bangladesh",
                currency="BDT",
                time_zone="Asia/Dhaka",
                status="ACTIVE",
                default_language="en",
                financial_year_start_month=7,
                employee_code_prefix="BOG-",
                is_active=True
            )
            db.add(parent_comp)
            await db.flush()

        # 4. Seed Operating Company
        op_comp = (await db.execute(select(Company).where(Company.company_code == "BRE-OPS"))).scalar_one_or_none()
        if not op_comp:
            op_comp = Company(
                organization_id=1,
                company_code="BRE-OPS",
                company_name="ABC Real Estate Ltd.",
                short_name="ABC Real Estate",
                company_type="OPERATING_COMPANY",
                parent_company_id=parent_comp.id,
                country="Bangladesh",
                currency="BDT",
                time_zone="Asia/Dhaka",
                status="ACTIVE",
                default_language="en",
                financial_year_start_month=7,
                employee_code_prefix="BRE-",
                is_active=True
            )
            db.add(op_comp)
            await db.flush()

        # 5. Seed Legal Entity
        legal_entity = (await db.execute(select(LegalEntity).where(LegalEntity.entity_code == "LE-001"))).scalar_one_or_none()
        if not legal_entity:
            legal_entity = LegalEntity(
                company_id=op_comp.id,
                entity_code="LE-001",
                registered_name="ABC Real Estate Holdings Limited",
                registration_number="RJSC-C-98432/2014",
                registration_date=date(2014, 5, 12),
                legal_form="PVT_LTD",
                registered_office_address="Plot 45, Road 11, Block D, Banani, Dhaka-1213, Bangladesh",
                tin_number="482910394812",
                bin_number="002349182-0101",
                trade_license_number="TRAD/DNCC/029182/2026",
                trade_license_expiry=date(2027, 6, 30),
                rjsc_registration_details="Registrar of Joint Stock Companies and Firms, Dhaka Division",
                authorized_signatory_name="Engr. Maksudul Haque",
                authorized_signatory_designation="Managing Director & CEO",
                statutory_documents=[
                    {"title": "Certificate of Incorporation", "type": "CERTIFICATE", "file_url": "/static/uploads/legal/incorp_c98432.pdf"},
                    {"title": "Trade License FY26", "type": "TRADE_LICENSE", "file_url": "/static/uploads/legal/trade_license_2026.pdf"},
                    {"title": "13-Digit e-BIN VAT Certificate", "type": "VAT_BIN", "file_url": "/static/uploads/legal/bin_002349182.pdf"}
                ],
                effective_date=date(2014, 6, 1),
                is_default=True,
                status="ACTIVE"
            )
            db.add(legal_entity)
            await db.flush()

        # 6. Seed Head Office Branch
        ho_branch = (await db.execute(select(Branch).where(Branch.branch_code == "BR-HO-01"))).scalar_one_or_none()
        if not ho_branch:
            ho_branch = Branch(
                company_id=op_comp.id,
                branch_code="BR-HO-01",
                branch_name="Corporate Head Office (Gulshan-2)",
                branch_type="HEAD_OFFICE",
                legal_entity_id=legal_entity.id,
                phone="+880 2 9882341",
                email="corporate@abcrealestatebd.com",
                division="DHAKA",
                district="DHAKA",
                upazila_thana="GULSHAN",
                address="Level 14-16, Bay's Bellavista, 96 Gulshan North Avenue, Gulshan-2, Dhaka-1212",
                is_head_office=True,
                opening_date=date(2015, 1, 1),
                default_cost_center="CC-CORP-HQ",
                status="ACTIVE"
            )
            db.add(ho_branch)
            await db.flush()

        # 7. Seed Sales Office Branch
        sales_branch = (await db.execute(select(Branch).where(Branch.branch_code == "BR-SALES-01"))).scalar_one_or_none()
        if not sales_branch:
            sales_branch = Branch(
                company_id=op_comp.id,
                branch_code="BR-SALES-01",
                branch_name="Banani Premium Sales & CRM Lounge",
                branch_type="SALES_OFFICE",
                legal_entity_id=legal_entity.id,
                phone="+880 17 00000101",
                email="sales@abcrealestatebd.com",
                division="DHAKA",
                district="DHAKA",
                upazila_thana="BANANI",
                address="Road 11, Block E, Banani Commercial Area, Dhaka-1213",
                is_head_office=False,
                opening_date=date(2018, 3, 1),
                default_cost_center="CC-SALES-BANANI",
                status="ACTIVE"
            )
            db.add(sales_branch)
            await db.flush()

        # 8. Seed Project Offices linked to real projects
        projects = (await db.execute(select(Project).limit(2))).scalars().all()
        if projects:
            proj1 = projects[0]
            po1 = (await db.execute(select(ProjectOffice).where(ProjectOffice.office_code == "PO-SITE-01"))).scalar_one_or_none()
            if not po1:
                po1 = ProjectOffice(
                    office_code="PO-SITE-01",
                    office_name=f"{proj1.project_name} - Construction Site Office",
                    company_id=op_comp.id,
                    legal_entity_id=legal_entity.id,
                    project_id=proj1.id,
                    office_type="CONSTRUCTION_SITE",
                    phone="+880 18 11112233",
                    email=f"site-{proj1.project_code.lower()}@abcrealestatebd.com",
                    division="DHAKA",
                    district="DHAKA",
                    upazila_thana="GULSHAN",
                    address=f"Project Site Location: {proj1.project_name}, Dhaka",
                    opening_date=date(2023, 1, 10),
                    operational_status="ACTIVE_MOBILIZED",
                    default_cost_center=f"CC-SITE-{proj1.project_code}",
                    supporting_documents=[
                        {"title": "RAJUK Construction Approval Permit", "type": "PERMIT", "file_url": "/static/uploads/permits/rajuk_permit.pdf"}
                    ]
                )
                db.add(po1)

            if len(projects) > 1:
                proj2 = projects[1]
                po2 = (await db.execute(select(ProjectOffice).where(ProjectOffice.office_code == "PO-SITE-02"))).scalar_one_or_none()
                if not po2:
                    po2 = ProjectOffice(
                        office_code="PO-SITE-02",
                        office_name=f"{proj2.project_name} - Site Administration & Sales Lounge",
                        company_id=op_comp.id,
                        legal_entity_id=legal_entity.id,
                        project_id=proj2.id,
                        office_type="SALES_SITE_OFFICE",
                        phone="+880 18 22223344",
                        email=f"site-{proj2.project_code.lower()}@abcrealestatebd.com",
                        division="DHAKA",
                        district="DHAKA",
                        upazila_thana="UTTARA",
                        address=f"Project Site Location: {proj2.project_name}, Sector 3, Uttara, Dhaka",
                        opening_date=date(2023, 6, 1),
                        operational_status="ACTIVE_MOBILIZED",
                        default_cost_center=f"CC-SITE-{proj2.project_code}"
                    )
                    db.add(po2)

        # 9. Seed Corporate Department Master & Hierarchy (Section 2, 3, 4, 5)
        print("[Org Master] Seeding Corporate Real Estate Department Hierarchy...")
        
        # Check an employee to optionally assign as head
        emp1 = (await db.execute(select(Employee).order_by(Employee.id).limit(1))).scalar_one_or_none()
        emp1_id = emp1.id if emp1 else None

        dept_defs = [
            # Top-Level Parent: Managing Director / Corporate Office
            {
                "code": "DEPT-MD",
                "name_en": "Managing Director / Corporate Office",
                "name_bn": "ব্যবস্থাপনা পরিচালক ও কর্পোরেট কার্যালয়",
                "parent_code": None,
                "cost_center": "CC-MD-01",
                "desc": "Executive governance, board administration, strategy and corporate direction.",
                "branch_id": ho_branch.id if ho_branch else None,
                "head_id": emp1_id
            },
            # Parent Department: Finance & Accounts
            {
                "code": "DEPT-FIN",
                "name_en": "Finance & Accounts",
                "name_bn": "অর্থ ও হিসাব বিভাগ",
                "parent_code": "DEPT-MD",
                "cost_center": "CC-FIN-01",
                "desc": "Corporate financial planning, banking, accounting, statutory VAT/tax, audits.",
                "branch_id": ho_branch.id if ho_branch else None,
                "head_id": emp1_id
            },
            # Sub-departments under Finance & Accounts
            {
                "code": "DEPT-FIN-AP",
                "name_en": "Accounts Payable",
                "name_bn": "প্রদেয় হিসাব শাখা",
                "parent_code": "DEPT-FIN",
                "cost_center": "CC-FIN-AP",
                "desc": "Vendor billing, subcontractor payment processing, and TDS/VDS compliance.",
                "branch_id": ho_branch.id if ho_branch else None,
                "head_id": None
            },
            {
                "code": "DEPT-FIN-AR",
                "name_en": "Accounts Receivable",
                "name_bn": "প্রাপ্য হিসাব ও গ্রাহক আদায়",
                "parent_code": "DEPT-FIN",
                "cost_center": "CC-FIN-AR",
                "desc": "Customer booking collections, installment monitoring, and money receipt issuance.",
                "branch_id": ho_branch.id if ho_branch else None,
                "head_id": None
            },
            {
                "code": "DEPT-FIN-TR",
                "name_en": "Payroll & Treasury",
                "name_bn": "কোষাগার ও বেতন ব্যবস্থাপনা",
                "parent_code": "DEPT-FIN",
                "cost_center": "CC-FIN-TR",
                "desc": "Employee payroll runs, PF/Gratuity funds, bank reconciliation, and cash liquidity.",
                "branch_id": ho_branch.id if ho_branch else None,
                "head_id": None
            },
            # Parent Department: Engineering & Construction
            {
                "code": "DEPT-ENG",
                "name_en": "Engineering & Construction",
                "name_bn": "প্রকৌশল ও নির্মাণ বিভাগ",
                "parent_code": "DEPT-MD",
                "cost_center": "CC-ENG-01",
                "desc": "Project execution, structural design, site civil engineering, and building handover.",
                "branch_id": ho_branch.id if ho_branch else None,
                "head_id": emp1_id
            },
            # Sub-departments under Engineering & Construction
            {
                "code": "DEPT-ENG-STR",
                "name_en": "Structural Engineering",
                "name_bn": "স্ট্রাকচারাল ইঞ্জিনিয়ারিং",
                "parent_code": "DEPT-ENG",
                "cost_center": "CC-ENG-01",
                "desc": "RCC design, foundation analysis, BNBC compliance, and architectural approvals.",
                "branch_id": ho_branch.id if ho_branch else None,
                "head_id": None
            },
            {
                "code": "DEPT-ENG-SITE",
                "name_en": "Site Operations",
                "name_bn": "সাইট অপারেশন ও নির্মাণ তদারকি",
                "parent_code": "DEPT-ENG",
                "cost_center": "CC-ENG-SITE",
                "desc": "On-site construction execution, labour muster roll, materials casting, equipment management.",
                "branch_id": ho_branch.id if ho_branch else None,
                "head_id": emp1_id
            },
            {
                "code": "DEPT-ENG-QA",
                "name_en": "Quality & Safety",
                "name_bn": "গুণমান ও পেশাগত নিরাপত্তা (কিউএ/কিউসি)",
                "parent_code": "DEPT-ENG",
                "cost_center": "CC-ENG-QA",
                "desc": "Concrete cube crushing tests, site safety audits, PPE compliance, and ISO quality standards.",
                "branch_id": ho_branch.id if ho_branch else None,
                "head_id": None
            },
            # Other Key Departments
            {
                "code": "DEPT-SALES",
                "name_en": "Sales & CRM",
                "name_bn": "বিক্রয় ও গ্রাহক সম্পর্ক ব্যবস্থাপনা",
                "parent_code": "DEPT-MD",
                "cost_center": "CC-SALES-01",
                "desc": "Property sales, customer experience lounge, apartment allotment, and deed documentation.",
                "branch_id": sales_branch.id if sales_branch else (ho_branch.id if ho_branch else None),
                "head_id": None
            },
            {
                "code": "DEPT-ARCH",
                "name_en": "Architecture & Planning",
                "name_bn": "স্থাপত্য ও নগর পরিকল্পনা",
                "parent_code": "DEPT-MD",
                "cost_center": "CC-ARCH-01",
                "desc": "Master planning, 3D renderings, floor layouts, and interior space design.",
                "branch_id": ho_branch.id if ho_branch else None,
                "head_id": None
            }
        ]

        # Seed in hierarchy order
        created_depts = {}
        for ddef in dept_defs:
            existing_d = (await db.execute(select(Department).where(Department.department_code == ddef["code"]))).scalar_one_or_none()
            parent_id = created_depts.get(ddef["parent_code"]) if ddef["parent_code"] else None
            if not existing_d:
                new_d = Department(
                    organization_id=1,
                    company_id=op_comp.id,
                    department_code=ddef["code"],
                    name_en=ddef["name_en"],
                    name_bn=ddef["name_bn"],
                    parent_department_id=parent_id,
                    head_of_dept_id=ddef["head_id"],
                    branch_id=ddef["branch_id"],
                    cost_center_id=ddef["cost_center"],
                    description=ddef["desc"],
                    effective_from=date(2020, 1, 1),
                    status="ACTIVE",
                    approval_policies={
                        "financial_limit_bdt": 500000.0,
                        "requires_md_approval_above": 1000000.0,
                        "can_approve_leave": True,
                        "can_approve_overtime": True
                    },
                    is_active=True
                )
                db.add(new_d)
                await db.flush()
                created_depts[ddef["code"]] = new_d.id

                # Seed Head Assignment History if head assigned
                if ddef["head_id"]:
                    h_hist = DepartmentHeadHistory(
                        department_id=new_d.id,
                        employee_id=ddef["head_id"],
                        assignment_type="PERMANENT",
                        effective_from=date(2020, 1, 1),
                        permissions_json={
                            "view_employees": True,
                            "approve_leave": True,
                            "approve_overtime": True,
                            "review_attendance": True,
                            "initiate_transfer": True,
                            "recommend_salary": True,
                            "view_payroll_cost": True,
                            "approve_expenses": True,
                            "expense_limit": 500000.00
                        },
                        is_current=True,
                        remarks="Standard permanent appointment from executive management."
                    )
                    db.add(h_hist)

                # Seed Initial Audit Log
                audit = DepartmentAuditLog(
                    department_id=new_d.id,
                    action_type="CREATED",
                    performed_by_name="System Initialization",
                    new_values={"code": ddef["code"], "name": ddef["name_en"], "status": "ACTIVE"},
                    remarks="Department created in initial corporate hierarchy seed."
                )
                db.add(audit)
            else:
                created_depts[ddef["code"]] = existing_d.id

        # 10. Seed Project Department Mappings for Construction Projects
        if projects and "DEPT-ENG-SITE" in created_depts:
            site_dept_id = created_depts["DEPT-ENG-SITE"]
            for p in projects[:2]:
                existing_map = (await db.execute(
                    select(DepartmentProjectMapping).where(
                        DepartmentProjectMapping.department_id == site_dept_id,
                        DepartmentProjectMapping.project_id == p.id
                    )
                )).scalar_one_or_none()
                if not existing_map:
                    mapping = DepartmentProjectMapping(
                        department_id=site_dept_id,
                        project_id=p.id,
                        site_lead_employee_id=emp1_id,
                        effective_from=date(2023, 1, 1),
                        status="ACTIVE"
                    )
                    db.add(mapping)

        await db.commit()
        print("[Org Master] Seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_org_master_data())

