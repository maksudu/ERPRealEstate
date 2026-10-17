"""
Database Migration & Lookup Seeding Script:
PROMPT 12: Legal & Statutory Compliance Vault, Land Dispute Tracking & RAJUK/CDA Approvals

Modules:
- prj_authority_clearances (enhanced with authority breakdown, renewal alert, sanction specs)
- prj_clearance_conditions (sanction condition compliance checklist)
- leg_court_cases (enhanced with legal sections, land plot, interim stay orders, advocate details)
- leg_case_documents (Digital Safe Archive for certified deeds, petitions, stay orders, judgments)
- leg_case_hearings (Court Hearing Timeline & Daily Proceeding Diary)
- Dynamic Lookups in sys_lookup_categories & sys_lookup_items
"""

import asyncio
import logging
import os
import sys
from datetime import date, timedelta
from decimal import Decimal

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app.modules.auth.models
import app.modules.lookups.models
import app.modules.land.models
import app.modules.projects.models
import app.modules.inventory.models
import app.modules.crm.models
import app.modules.sales.models
import app.modules.installments.models
import app.modules.construction.models
import app.modules.procurement.models
import app.modules.accounts.models
import app.modules.handover.models
import app.modules.operations.models
import app.modules.hrms.models
import app.modules.tax.models
import app.modules.governance.models
import app.modules.legal.models

from sqlalchemy import text, select
from app.core.database import AsyncSessionLocal, engine
from app.modules.projects.models import Project, AuthorityClearance, AuthorityClearanceCondition
from app.modules.operations.models import CourtCase, CourtCaseDocument, CourtCaseHearing

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_legal_compliance_vault")

TABLE_DDL = [
    """
    CREATE TABLE IF NOT EXISTS `prj_clearance_conditions` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `clearance_id` BIGINT NOT NULL,
        `condition_code` VARCHAR(32) NOT NULL,
        `condition_title` VARCHAR(255) NOT NULL,
        `condition_category` VARCHAR(64) NOT NULL DEFAULT 'STATUTORY_MANDATE',
        `mandatory_level` VARCHAR(32) NOT NULL DEFAULT 'CRITICAL',
        `compliance_status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        `compliance_date` DATE NULL,
        `verified_by_officer` VARCHAR(128) NULL,
        `evidence_doc_url` VARCHAR(255) NULL,
        `remarks` TEXT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_cond_clearance_id` (`clearance_id`),
        KEY `idx_cond_status` (`compliance_status`),
        CONSTRAINT `fk_cond_clearance` FOREIGN KEY (`clearance_id`) REFERENCES `prj_authority_clearances` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS `leg_case_documents` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `case_id` BIGINT NOT NULL,
        `document_code` VARCHAR(32) NOT NULL,
        `document_category` VARCHAR(64) NOT NULL,
        `document_title` VARCHAR(255) NOT NULL,
        `certified_copy_no` VARCHAR(128) NULL,
        `issue_or_filing_date` DATE NULL,
        `issuing_authority_or_court` VARCHAR(128) NULL,
        `file_url` VARCHAR(255) NOT NULL,
        `file_size_kb` INT NOT NULL DEFAULT 0,
        `digital_safe_hash` VARCHAR(64) NULL,
        `uploaded_by_name` VARCHAR(128) NULL,
        `is_confidential` TINYINT(1) NOT NULL DEFAULT 1,
        `summary_notes` TEXT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_doc_case_id` (`case_id`),
        KEY `idx_doc_category` (`document_category`),
        CONSTRAINT `fk_doc_case` FOREIGN KEY (`case_id`) REFERENCES `leg_court_cases` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS `leg_case_hearings` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `case_id` BIGINT NOT NULL,
        `hearing_date` DATE NOT NULL,
        `presiding_judge` VARCHAR(128) NULL,
        `court_bench` VARCHAR(128) NULL,
        `summary_of_proceedings` TEXT NOT NULL,
        `order_passed` VARCHAR(128) NULL,
        `next_hearing_date` DATE NULL,
        `attended_advocate` VARCHAR(128) NULL,
        `action_items` TEXT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_hearing_case_id` (`case_id`),
        KEY `idx_hearing_date` (`hearing_date`),
        CONSTRAINT `fk_hearing_case` FOREIGN KEY (`case_id`) REFERENCES `leg_court_cases` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
]

ALTER_COMMANDS = [
    # prj_authority_clearances enhancements
    ("prj_authority_clearances", "authority_name", "ALTER TABLE `prj_authority_clearances` ADD COLUMN `authority_name` VARCHAR(64) NOT NULL DEFAULT 'RAJUK' AFTER `clearance_type_id`;"),
    ("prj_authority_clearances", "reference_no", "ALTER TABLE `prj_authority_clearances` ADD COLUMN `reference_no` VARCHAR(64) NULL AFTER `authority_name`;"),
    ("prj_authority_clearances", "validity_months", "ALTER TABLE `prj_authority_clearances` ADD COLUMN `validity_months` INT NOT NULL DEFAULT 12 AFTER `expiry_date`;"),
    ("prj_authority_clearances", "renewal_reminder_days", "ALTER TABLE `prj_authority_clearances` ADD COLUMN `renewal_reminder_days` INT NOT NULL DEFAULT 30 AFTER `validity_months`;"),
    ("prj_authority_clearances", "renewal_fee_bdt", "ALTER TABLE `prj_authority_clearances` ADD COLUMN `renewal_fee_bdt` DECIMAL(14,2) NOT NULL DEFAULT 0.00 AFTER `renewal_reminder_days`;"),
    ("prj_authority_clearances", "renewal_alert_status", "ALTER TABLE `prj_authority_clearances` ADD COLUMN `renewal_alert_status` VARCHAR(32) NOT NULL DEFAULT 'VALID' AFTER `renewal_fee_bdt`;"),
    ("prj_authority_clearances", "sanctioned_floors", "ALTER TABLE `prj_authority_clearances` ADD COLUMN `sanctioned_floors` VARCHAR(64) NULL AFTER `renewal_alert_status`;"),
    ("prj_authority_clearances", "sanctioned_height_m", "ALTER TABLE `prj_authority_clearances` ADD COLUMN `sanctioned_height_m` DECIMAL(8,2) NULL AFTER `sanctioned_floors`;"),
    ("prj_authority_clearances", "contact_officer_name", "ALTER TABLE `prj_authority_clearances` ADD COLUMN `contact_officer_name` VARCHAR(128) NULL AFTER `sanctioned_height_m`;"),
    ("prj_authority_clearances", "contact_officer_phone", "ALTER TABLE `prj_authority_clearances` ADD COLUMN `contact_officer_phone` VARCHAR(64) NULL AFTER `contact_officer_name`;"),
    
    # leg_court_cases enhancements
    ("leg_court_cases", "legal_act_section", "ALTER TABLE `leg_court_cases` ADD COLUMN `legal_act_section` VARCHAR(128) NULL AFTER `concerned_court`;"),
    ("leg_court_cases", "dispute_category", "ALTER TABLE `leg_court_cases` ADD COLUMN `dispute_category` VARCHAR(64) NOT NULL DEFAULT 'LAND_TITLE_DISPUTE' AFTER `legal_act_section`;"),
    ("leg_court_cases", "land_mouza", "ALTER TABLE `leg_court_cases` ADD COLUMN `land_mouza` VARCHAR(128) NULL AFTER `dispute_category`;"),
    ("leg_court_cases", "cs_rs_bs_plot_no", "ALTER TABLE `leg_court_cases` ADD COLUMN `cs_rs_bs_plot_no` VARCHAR(128) NULL AFTER `land_mouza`;"),
    ("leg_court_cases", "disputed_area_decimals", "ALTER TABLE `leg_court_cases` ADD COLUMN `disputed_area_decimals` DECIMAL(10,4) NOT NULL DEFAULT 0.0000 AFTER `cs_rs_bs_plot_no`;"),
    ("leg_court_cases", "advocate_chamber", "ALTER TABLE `leg_court_cases` ADD COLUMN `advocate_chamber` VARCHAR(128) NULL AFTER `appointed_advocate`;"),
    ("leg_court_cases", "advocate_contact_phone", "ALTER TABLE `leg_court_cases` ADD COLUMN `advocate_contact_phone` VARCHAR(64) NULL AFTER `advocate_chamber`;"),
    ("leg_court_cases", "advocate_email", "ALTER TABLE `leg_court_cases` ADD COLUMN `advocate_email` VARCHAR(128) NULL AFTER `advocate_contact_phone`;"),
    ("leg_court_cases", "is_interim_stay_active", "ALTER TABLE `leg_court_cases` ADD COLUMN `is_interim_stay_active` TINYINT(1) NOT NULL DEFAULT 0 AFTER `advocate_email`;"),
    ("leg_court_cases", "stay_order_details", "ALTER TABLE `leg_court_cases` ADD COLUMN `stay_order_details` TEXT NULL AFTER `is_interim_stay_active`;"),
    ("leg_court_cases", "stay_order_granted_date", "ALTER TABLE `leg_court_cases` ADD COLUMN `stay_order_granted_date` DATE NULL AFTER `stay_order_details`;"),
    ("leg_court_cases", "stay_order_valid_until", "ALTER TABLE `leg_court_cases` ADD COLUMN `stay_order_valid_until` DATE NULL AFTER `stay_order_granted_date`;"),
    ("leg_court_cases", "estimated_risk_level", "ALTER TABLE `leg_court_cases` ADD COLUMN `estimated_risk_level` VARCHAR(32) NOT NULL DEFAULT 'MEDIUM' AFTER `stay_order_valid_until`;"),
    ("leg_court_cases", "financial_claim_bdt", "ALTER TABLE `leg_court_cases` ADD COLUMN `financial_claim_bdt` DECIMAL(16,2) NOT NULL DEFAULT 0.00 AFTER `estimated_risk_level`;"),
    ("leg_court_cases", "decree_outcome", "ALTER TABLE `leg_court_cases` ADD COLUMN `decree_outcome` VARCHAR(64) NULL AFTER `status`;"),
]

LOOKUP_SEEDS = [
    {
        "category_code": "STATUTORY_AUTHORITY",
        "category_name": "Statutory Approval Authorities",
        "description": "Government bodies and authorities granting sanctions and clearances in Bangladesh",
        "items": [
            ("RAJUK", "Rajdhani Unnayan Kartripakkha (RAJUK - Dhaka)", 1),
            ("CDA", "Chattogram Development Authority (CDA)", 2),
            ("KDA", "Khulna Development Authority (KDA)", 3),
            ("RDA", "Rajshahi Development Authority (RDA)", 4),
            ("DoE", "Department of Environment (DoE / Paribesh)", 5),
            ("FSCD", "Fire Service & Civil Defence Directorate", 6),
            ("CAAB", "Civil Aviation Authority of Bangladesh (CAAB)", 7),
            ("WASA", "Water & Sewerage Authority (DWASA / CWASA)", 8),
            ("DESCO_DPDC", "DESCO / DPDC / REB Power Sub-station", 9),
            ("TITAS_GAS", "Titas Gas Transmission & Distribution", 10),
        ]
    },
    {
        "category_code": "CLEARANCE_PERMIT_TYPE",
        "category_name": "Statutory Permit & Clearance Types",
        "description": "Categories of statutory sanctions and regulatory approvals",
        "items": [
            ("LUC", "Land Use Clearance (Nagar Unnayan Chharpatra)", 1),
            ("SPECIAL_PROJECT", "Special Project Sanction (Bishesh Prokolpo)", 2),
            ("BUILDING_PLAN", "Building Construction Sanction (Imarat Nirman Anumodan)", 3),
            ("FIRE_NOC", "Fire Fighting & Safety NOC (FSCD)", 4),
            ("ENVIRONMENTAL", "Environmental Clearance (DoE IEE/ECC)", 5),
            ("AVIATION_HEIGHT", "Height Clearance (Civil Aviation CAAB)", 6),
            ("WASA_SEWERAGE", "Deep Tubewell & Sewerage Discharge Clearance (WASA)", 7),
            ("SUBSTATION_POWER", "Substation & HT Line Sanction (DESCO/DPDC)", 8),
            ("OCCUPANCY_CERT", "Occupancy Certificate (Babsahar Sanad)", 9),
        ]
    },
    {
        "category_code": "CLEARANCE_CONDITION_CATEGORY",
        "category_name": "Sanction Condition Categories",
        "description": "Categories of conditional compliance mandates imposed by regulatory authorities",
        "items": [
            ("ARCHITECTURAL_SETBACK", "Architectural Setback & Road Widening", 1),
            ("FIRE_SAFETY", "Fire Hydrant, Enclosed Stair & Water Reservoir", 2),
            ("ENVIRONMENTAL_ETP", "Rainwater Harvesting & ETP/STP Plant", 3),
            ("STRUCTURAL_INTEGRITY", "Soil Test, Piling Load & BNBC 2020 Compliance", 4),
            ("ELECTRICAL_SUBSTATION", "Transformer & Sub-station Room Handover", 5),
            ("TRAFFIC_PARKING", "Basement Ramp & Mechanical Parking Circulation", 6),
        ]
    },
    {
        "category_code": "LEGAL_CASE_TYPE",
        "category_name": "Legal Case Types (Court Litigation)",
        "description": "Classifications of legal suits, petitions, and appeals in Bangladesh courts",
        "items": [
            ("Title Suit", "Title Suit (Declaration of Title & Ownership)", 1),
            ("Temporary Injunction", "Temporary Injunction (Order 39 Rule 1 & 2 CPC)", 2),
            ("Writ Petition", "High Court Writ Petition (Article 102)", 3),
            ("Money Suit", "Money Suit (Contractual Damage Recovery)", 4),
            ("Pre-emption Suit", "Pre-emption Suit (Sec 96 SAT Act)", 5),
            ("Partition Suit", "Partition Suit (Baton Mukaddama)", 6),
            ("NI Act 138", "NI Act 1881 Section 138 (Cheque Bounce)", 7),
            ("Land Survey Tribunal", "Land Survey Tribunal Appeal (Record Correction)", 8),
        ]
    },
    {
        "category_code": "LEGAL_ACT_SECTION",
        "category_name": "Statutory Act & Legal Sections",
        "description": "Key statutory provisions and sections cited in Bangladesh litigation",
        "items": [
            ("Specific Relief Act 1877 Sec 42", "Specific Relief Act 1877 Sec 42 (Declaration of Title)", 1),
            ("Specific Relief Act 1877 Sec 54", "Specific Relief Act 1877 Sec 54 (Permanent Injunction)", 2),
            ("CPC 1908 Order 39 Rule 1 & 2", "CPC 1908 Order 39 Rule 1 & 2 (Temporary Injunction)", 3),
            ("Transfer of Property Act Sec 53A", "Transfer of Property Act 1882 Sec 53A (Part Performance)", 4),
            ("SAT Act 1950 Sec 96", "State Acquisition & Tenancy Act 1950 Sec 96 (Pre-emption)", 5),
            ("NI Act 1881 Sec 138", "Negotiable Instruments Act 1881 Sec 138 (Cheque Dishonour)", 6),
            ("Constitution Art 102", "Constitution of Bangladesh Article 102 (Writ Jurisdiction)", 7),
        ]
    },
    {
        "category_code": "COURT_NAME",
        "category_name": "Courts & Judicial Forums",
        "description": "Judicial forums and courts in Bangladesh handling property litigation",
        "items": [
            ("Supreme Court of Bangladesh - Appellate Division", "Supreme Court of Bangladesh - Appellate Division", 1),
            ("Supreme Court of Bangladesh - High Court Division", "Supreme Court of Bangladesh - High Court Division", 2),
            ("District & Sessions Judge Court, Dhaka", "District & Sessions Judge Court, Dhaka", 3),
            ("Joint District Judge 1st Court, Dhaka", "Joint District Judge 1st Court, Dhaka", 4),
            ("Joint District Judge 2nd Court, Dhaka", "Joint District Judge 2nd Court, Dhaka", 5),
            ("Joint District Judge 1st Court, Chattogram", "Joint District Judge 1st Court, Chattogram", 6),
            ("Land Survey Tribunal (LST), Dhaka", "Land Survey Tribunal (LST), Dhaka", 7),
            ("Court of Senior Assistant Judge, Tejgaon, Dhaka", "Court of Senior Assistant Judge, Tejgaon, Dhaka", 8),
        ]
    },
    {
        "category_code": "SAFE_DOCUMENT_CATEGORY",
        "category_name": "Digital Safe Document Categories",
        "description": "Certified document classifications stored in the digital safe vault",
        "items": [
            ("CERTIFIED_LAND_TITLE", "Certified Copy of Baya / Main Sale Deed", 1),
            ("HIGH_COURT_WRIT_PETITION", "Certified High Court Writ Petition & Rule Nisi", 2),
            ("INTERIM_INJUNCTION_ORDER", "Certified Copy of Injunction / Stay Order", 3),
            ("JUDGMENT_SUMMARY", "Certified Decree & Judgment Summary", 4),
            ("PLAINT_WRITTEN_STATEMENT", "Plaint, Written Statement & Frame of Issues", 5),
            ("CS_RS_BS_PORCHA", "Certified CS/SA/RS/BS Khatian Porcha & Mutation", 6),
            ("VAKALATNAMA", "Vakalatnama & Advocate Engagement Memo", 7),
        ]
    }
]


async def run_migration():
    async with engine.begin() as conn:
        logger.info("Executing DDL for new tables...")
        for ddl in TABLE_DDL:
            await conn.execute(text(ddl))

        logger.info("Checking and executing column migrations...")
        for table, col, alter_sql in ALTER_COMMANDS:
            try:
                check_sql = f"""
                SELECT COUNT(*) FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = '{table}' 
                AND COLUMN_NAME = '{col}';
                """
                res = await conn.execute(text(check_sql))
                count = res.scalar()
                if count == 0:
                    logger.info(f"Adding column {col} to {table}...")
                    await conn.execute(text(alter_sql))
            except Exception as e:
                logger.warning(f"Column check/alter error on {table}.{col}: {e}")

    logger.info("Seeding dynamic lookup categories and items...")
    async with AsyncSessionLocal() as session:
        for cat in LOOKUP_SEEDS:
            res = await session.execute(
                text("SELECT id FROM sys_lookup_categories WHERE category_code = :code"),
                {"code": cat["category_code"]}
            )
            cat_id = res.scalar()
            if not cat_id:
                insert_cat = text("""
                    INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active, created_at, updated_at)
                    VALUES (:code, :name, :desc, 1, NOW(), NOW())
                """)
                res_ins = await session.execute(insert_cat, {
                    "code": cat["category_code"],
                    "name": cat["category_name"],
                    "desc": cat["description"]
                })
                cat_id = res_ins.lastrowid
                logger.info(f"Created lookup category: {cat['category_code']}")

            for item_code, item_label, sort_order in cat["items"]:
                res_item = await session.execute(
                    text("SELECT id FROM sys_lookup_items WHERE category_id = :cat_id AND item_code = :item_code"),
                    {"cat_id": cat_id, "item_code": item_code}
                )
                if not res_item.scalar():
                    insert_item = text("""
                        INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, sort_order, is_active, created_at, updated_at)
                        VALUES (:cat_id, :code, :name_en, :sort, 1, NOW(), NOW())
                    """)
                    await session.execute(insert_item, {
                        "cat_id": cat_id,
                        "code": item_code,
                        "name_en": item_label,
                        "sort": sort_order
                    })

        await session.commit()
        logger.info("Lookup categories and items seeded successfully.")

    # Seed sample realistic permits and cases if none exist
    async with AsyncSessionLocal() as session:
        p_res = await session.execute(select(Project).limit(1))
        project = p_res.scalar_one_or_none()
        p_id = project.id if project else 1

        # Check permits count
        permits_count = (await session.execute(select(text("COUNT(*) FROM prj_authority_clearances")))).scalar()
        if permits_count == 0 or permits_count < 3:
            logger.info("Seeding sample statutory permits & condition checklists...")
            
            p1 = AuthorityClearance(
                project_id=p_id,
                clearance_type_id="BUILDING_PLAN",
                authority_name="RAJUK",
                reference_no="CLR-RAJUK-2026-001",
                application_memo_no="RAJUK/IMARAT/2025/MEMO-8891",
                approved_memo_no="RAJUK/PLAN-APPR/2026/SEC-4/0912",
                approval_date=date.today() - timedelta(days=90),
                expiry_date=date.today() + timedelta(days=275),
                validity_months=12,
                renewal_reminder_days=30,
                renewal_fee_bdt=Decimal("250000.00"),
                renewal_alert_status="VALID",
                sanctioned_floors="2 Basement + Ground + 14 Floors",
                sanctioned_height_m=Decimal("52.80"),
                contact_officer_name="Engr. M. A. Rashid (Authorized Officer, RAJUK Zone 4)",
                contact_officer_phone="+8801711223344",
                status="APPROVED",
                document_url="/static/uploads/clearances/rajuk_plan_sanction_lotus.pdf",
                remarks="Full structural and architectural sanction granted under Dhaka Building Construction Rules 2008."
            )
            session.add(p1)
            await session.flush()

            # Add conditions for RAJUK
            session.add_all([
                AuthorityClearanceCondition(
                    clearance_id=p1.id,
                    condition_code="COND-01",
                    condition_title="Minimum 3.0 Meter Mandatory Front Setback & Road Widening Handover",
                    condition_category="ARCHITECTURAL_SETBACK",
                    mandatory_level="CRITICAL",
                    compliance_status="COMPLIED",
                    compliance_date=date.today() - timedelta(days=60),
                    verified_by_officer="Engr. M. A. Rashid",
                    remarks="Demarcation verified by RAJUK survey inspector team."
                ),
                AuthorityClearanceCondition(
                    clearance_id=p1.id,
                    condition_code="COND-02",
                    condition_title="Provision of 50,000 Gallon Dedicated Underground Fire Water Reservoir",
                    condition_category="FIRE_SAFETY",
                    mandatory_level="CRITICAL",
                    compliance_status="IN_PROGRESS",
                    remarks="Reservoir construction ongoing in Basement 2 slab."
                ),
                AuthorityClearanceCondition(
                    clearance_id=p1.id,
                    condition_code="COND-03",
                    condition_title="Installation of Rainwater Harvesting Catchment Pit & Ground Recharge",
                    condition_category="ENVIRONMENTAL_ETP",
                    mandatory_level="MANDATORY",
                    compliance_status="PENDING",
                    remarks="Scheduled during landscaping and external utility drainage stage."
                )
            ])

            # Permit 2: Civil Aviation Height Clearance (Expiring in 20 days - Warning!)
            p2 = AuthorityClearance(
                project_id=p_id,
                clearance_type_id="AVIATION_HEIGHT",
                authority_name="CAAB",
                reference_no="CLR-CAAB-2025-084",
                application_memo_no="CAAB/ATS/CLEARANCE/2024-912",
                approved_memo_no="CAAB/NOC-HT/2025/1124",
                approval_date=date.today() - timedelta(days=345),
                expiry_date=date.today() + timedelta(days=20),
                validity_months=12,
                renewal_reminder_days=30,
                renewal_fee_bdt=Decimal("50000.00"),
                renewal_alert_status="EXPIRING_SOON",
                sanctioned_floors="15 Floors",
                sanctioned_height_m=Decimal("54.00"),
                contact_officer_name="Air Commodore S. K. Roy (Director ATS, CAAB)",
                contact_officer_phone="+8801819556677",
                status="APPROVED",
                document_url="/static/uploads/clearances/caab_height_noc_2025.pdf",
                remarks="Permissible AMSL height approved 54 meters. Renewal application must be filed within 10 days."
            )
            session.add(p2)
            await session.flush()

            session.add(
                AuthorityClearanceCondition(
                    clearance_id=p2.id,
                    condition_code="CAAB-01",
                    condition_title="Installation of Red Aviation Obstruction Warning Light on Topmost Roof Parapet",
                    condition_category="FIRE_SAFETY",
                    mandatory_level="CRITICAL",
                    compliance_status="COMPLIED",
                    compliance_date=date.today() - timedelta(days=200),
                    verified_by_officer="Inspector J. Kabir, CAAB",
                    remarks="Dual solar-backed LED obstruction lights installed."
                )
            )

            # Permit 3: DoE Environmental Clearance (Approved)
            p3 = AuthorityClearance(
                project_id=p_id,
                clearance_type_id="ENVIRONMENTAL",
                authority_name="DoE",
                reference_no="CLR-DOE-2026-039",
                application_memo_no="DOE/ECC/DHAKA-METRO/2025/4432",
                approved_memo_no="DOE/CLEARANCE/2026/092",
                approval_date=date.today() - timedelta(days=45),
                expiry_date=date.today() + timedelta(days=320),
                validity_months=12,
                renewal_reminder_days=30,
                renewal_fee_bdt=Decimal("75000.00"),
                renewal_alert_status="VALID",
                contact_officer_name="Dr. Farhana Yasmin (Director, DoE Dhaka Regional Office)",
                contact_officer_phone="+8801912334455",
                status="APPROVED",
                document_url="/static/uploads/clearances/doe_environmental_clearance.pdf",
                remarks="Environmental Clearance Certificate (ECC) granted with mandatory STP."
            )
            session.add(p3)

        # Check court cases count
        cases_count = (await session.execute(select(text("COUNT(*) FROM leg_court_cases")))).scalar()
        if cases_count == 0 or cases_count < 2:
            logger.info("Seeding sample court cases with interim stay orders & digital safe archive...")
            
            c1 = CourtCase(
                project_id=p_id,
                case_type="Writ Petition",
                case_number="Writ Petition No. 14209 of 2025",
                concerned_court="Supreme Court of Bangladesh - High Court Division",
                legal_act_section="Constitution Art 102",
                dispute_category="INJUNCTION_STAY",
                land_mouza="Mouza: Tejgaon Industrial Area, Dhaka",
                cs_rs_bs_plot_no="CS Plot 108, RS Plot 245, BS Plot 892",
                disputed_area_decimals=Decimal("6.5000"),
                plaintiff="Haji Shamsuddin & Others (Purported Co-sharers)",
                defendant="Bengal Real Estate Ltd & RAJUK",
                appointed_advocate="Barrister Tanjib-ul Alam",
                advocate_chamber="Tanjib Alam & Associates, Motijheel C/A",
                advocate_contact_phone="+8801711998877",
                advocate_email="tanjib@tanjiblaw.com",
                is_interim_stay_active=True,
                stay_order_details="Interim stay granted on eastern boundary demarcation for 3 months pending survey report.",
                stay_order_granted_date=date.today() - timedelta(days=40),
                stay_order_valid_until=date.today() + timedelta(days=50),
                estimated_risk_level="HIGH",
                financial_claim_bdt=Decimal("15000000.00"),
                next_hearing_date=date.today() + timedelta(days=14),
                status="STAY_ORDER_GRANTED",
                case_summary="Challenge against boundary wall alignment along 30-feet master plan road. Company filed comprehensive counter-affidavit with registered Baya deeds."
            )
            session.add(c1)
            await session.flush()

            # Add Digital Safe Documents for Case 1
            session.add_all([
                CourtCaseDocument(
                    case_id=c1.id,
                    document_code="DOC-SAFE-01",
                    document_category="CERTIFIED_LAND_TITLE",
                    document_title="Certified Copy of Registered Baya Sale Deed No. 4412/1984 (Volume 98)",
                    certified_copy_no="CC-REG-TEJGAON-84-4412",
                    issue_or_filing_date=date(1984, 6, 12),
                    issuing_authority_or_court="Tejgaon Sub-Registry Office, Dhaka",
                    file_url="/static/uploads/legal_vault/certified_baya_deed_4412_1984.pdf",
                    file_size_kb=3420,
                    digital_safe_hash="a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
                    uploaded_by_name="Advocate K. M. Rahman (Legal Counsel)",
                    is_confidential=True,
                    summary_notes="Authentic registered parent title establishing 40 years of unbroken chain of possession."
                ),
                CourtCaseDocument(
                    case_id=c1.id,
                    document_code="DOC-SAFE-02",
                    document_category="HIGH_COURT_WRIT_PETITION",
                    document_title="High Court Rule Nisi & Interim Injunction Order Sheet",
                    certified_copy_no="HC-WRIT-2025-14209-OR",
                    issue_or_filing_date=date.today() - timedelta(days=40),
                    issuing_authority_or_court="Supreme Court of Bangladesh High Court Division Bench 07",
                    file_url="/static/uploads/legal_vault/hc_stay_order_14209_2025.pdf",
                    file_size_kb=1850,
                    digital_safe_hash="f0e1d2c3b4a567890123456789abcdef0123456789abcdef0123456789abcdef1",
                    uploaded_by_name="Advocate K. M. Rahman",
                    is_confidential=True,
                    summary_notes="Certified copy of interim stay order granted by Division Bench."
                )
            ])

            # Add Hearings for Case 1
            session.add_all([
                CourtCaseHearing(
                    case_id=c1.id,
                    hearing_date=date.today() - timedelta(days=40),
                    presiding_judge="Hon'ble Justice M. Enayetur Rahim & Justice Md. Mostafizur Rahman",
                    court_bench="High Court Division Bench No. 07",
                    summary_of_proceedings="Plaintiff moved application for ad-interim injunction. Court issued Rule Nisi with temporary status quo on eastern strip.",
                    order_passed="RULE_NISI_WITH_STATUS_QUO",
                    next_hearing_date=date.today() - timedelta(days=10),
                    attended_advocate="Barrister Tanjib-ul Alam",
                    action_items="File Affidavit-in-Opposition with certified CS/SA/RS khatian maps."
                ),
                CourtCaseHearing(
                    case_id=c1.id,
                    hearing_date=date.today() - timedelta(days=10),
                    presiding_judge="Hon'ble Justice M. Enayetur Rahim & Justice Md. Mostafizur Rahman",
                    court_bench="High Court Division Bench No. 07",
                    summary_of_proceedings="Affidavit-in-Opposition filed by Bengal Real Estate. Plaintiff prayed 2 weeks time for filing Affidavit-in-Reply.",
                    order_passed="TIME_PETITION_ALLOWED",
                    next_hearing_date=date.today() + timedelta(days=14),
                    attended_advocate="Barrister Tanjib-ul Alam",
                    action_items="Prepare for final hearing on discharge of status quo order."
                )
            ])

            # Case 2: Title Suit in Joint District Judge Court
            c2 = CourtCase(
                project_id=p_id,
                case_type="Title Suit",
                case_number="Title Suit No. 88 of 2024",
                concerned_court="Joint District Judge 1st Court, Dhaka",
                legal_act_section="Specific Relief Act 1877 Sec 42",
                dispute_category="LAND_TITLE_DISPUTE",
                land_mouza="Mouza: Baunia, Mirpur, Dhaka",
                cs_rs_bs_plot_no="RS Plot 452, BS Khatian 109",
                disputed_area_decimals=Decimal("4.2500"),
                plaintiff="Bengal Real Estate Ltd",
                defendant="Kazi Moazzem Hossain & Government of Bangladesh",
                appointed_advocate="Advocate Rafiqul Islam (Senior Advocate, Dhaka Bar)",
                advocate_chamber="Dhaka Bar Association Building, Room 402",
                advocate_contact_phone="+8801712445566",
                advocate_email="rafiq.adv@dhakabar.org",
                is_interim_stay_active=False,
                estimated_risk_level="MEDIUM",
                financial_claim_bdt=Decimal("8000000.00"),
                next_hearing_date=date.today() + timedelta(days=28),
                status="HEARING_ONGOING",
                case_summary="Suit filed for declaration of lawful ownership and permanent injunction against fraudulent mutation entry in BS Khatian."
            )
            session.add(c2)

        await session.commit()
        logger.info("Sample legal data seeded successfully.")


if __name__ == "__main__":
    asyncio.run(run_migration())
