"""
Migration & Seeding Script: Handover, Digital Snag List, 12-Month DLP Warranty & Commercial Rental Leasing
Modules:
- hnd_snag_items
- hnd_handover_inspections (extended with key cert, joint signoff, 12-month warranty dates)
- hnd_dlp_tickets (extended with SLA timers, severity, warranty tracking)
- rnt_lease_agreements (extended with commercial space, tenant profile, deposit status)
- rnt_cam_bills
- rnt_utility_submeter_readings
- Lookup Categories: SNAG_CATEGORY, SNAG_LOCATION, SNAG_SEVERITY, SNAG_STATUS, COMMERCIAL_SPACE_TYPE, UTILITY_METER_TYPE, DLP_DEFECT_CATEGORY
"""

import asyncio
import logging
import os
import sys
import uuid
from decimal import Decimal
from datetime import date, timedelta

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

from sqlalchemy import text, select
from app.core.database import AsyncSessionLocal, engine
from app.modules.inventory.models import Unit
from app.modules.sales.models import Booking
from app.modules.auth.models import User
from app.modules.projects.models import Project
from app.modules.handover.models import (
    HandoverInspection, SnagItem, DLPTicket, OwnersAssociation, LeaseAgreement, CAMBill, UtilitySubMeterReading
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_handover_snag_dlp_leasing")

TABLE_DDL = [
    """
    CREATE TABLE IF NOT EXISTS `hnd_snag_items` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `inspection_id` BIGINT NULL,
        `unit_id` BIGINT NOT NULL,
        `snag_code` VARCHAR(64) NOT NULL,
        `category` VARCHAR(64) NOT NULL,
        `location` VARCHAR(128) NOT NULL,
        `defect_description` TEXT NOT NULL,
        `photo_attachment_url` VARCHAR(500) NULL,
        `severity` VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
        `contractor_name` VARCHAR(128) NULL,
        `target_fix_date` DATE NULL,
        `status` VARCHAR(32) NOT NULL DEFAULT 'OPEN',
        `fix_date` DATE NULL,
        `verified_by_engineer_id` BIGINT NULL,
        `verification_notes` TEXT NULL,
        `customer_accepted` BOOLEAN NOT NULL DEFAULT FALSE,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `ix_hnd_snag_items_snag_code` (`snag_code`),
        KEY `ix_hnd_snag_items_inspection_id` (`inspection_id`),
        KEY `ix_hnd_snag_items_unit_id` (`unit_id`),
        KEY `ix_hnd_snag_items_category` (`category`),
        KEY `ix_hnd_snag_items_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS `rnt_cam_bills` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `bill_number` VARCHAR(64) NOT NULL,
        `lease_id` BIGINT NOT NULL,
        `bill_month` VARCHAR(16) NOT NULL,
        `billing_date` DATE NOT NULL,
        `due_date` DATE NOT NULL,
        `area_sqft` DECIMAL(10, 2) NOT NULL,
        `cam_rate_per_sqft` DECIMAL(10, 2) NOT NULL,
        `cam_amount` DECIMAL(12, 2) NOT NULL,
        `sinking_fund_charge` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        `generator_backup_charge` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        `common_electricity_water` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        `total_bill_amount` DECIMAL(12, 2) NOT NULL,
        `paid_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        `payment_status` VARCHAR(32) NOT NULL DEFAULT 'UNPAID',
        `paid_date` DATE NULL,
        `remarks` TEXT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `ix_rnt_cam_bills_bill_number` (`bill_number`),
        KEY `ix_rnt_cam_bills_lease_id` (`lease_id`),
        KEY `ix_rnt_cam_bills_bill_month` (`bill_month`),
        KEY `ix_rnt_cam_bills_payment_status` (`payment_status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS `rnt_utility_submeter_readings` (
        `id` BIGINT NOT NULL AUTO_INCREMENT,
        `lease_id` BIGINT NOT NULL,
        `meter_number` VARCHAR(64) NOT NULL,
        `meter_type` VARCHAR(32) NOT NULL DEFAULT 'ELECTRICITY',
        `reading_date` DATE NOT NULL,
        `previous_reading` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        `current_reading` DECIMAL(12, 2) NOT NULL,
        `units_consumed` DECIMAL(12, 2) NOT NULL,
        `tariff_rate_per_unit` DECIMAL(8, 2) NOT NULL,
        `subtotal_amount` DECIMAL(12, 2) NOT NULL,
        `vat_rate_percent` DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
        `total_utility_amount` DECIMAL(12, 2) NOT NULL,
        `billing_status` VARCHAR(32) NOT NULL DEFAULT 'UNBILLED',
        `remarks` TEXT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `ix_rnt_utility_submeter_lease_id` (`lease_id`),
        KEY `ix_rnt_utility_submeter_meter_no` (`meter_number`),
        KEY `ix_rnt_utility_submeter_meter_type` (`meter_type`),
        KEY `ix_rnt_utility_submeter_status` (`billing_status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
]

ALTER_COMMANDS = [
    # Handover Inspections
    ("hnd_handover_inspections", "key_handover_certificate_number", "VARCHAR(64) NULL UNIQUE"),
    ("hnd_handover_inspections", "key_sets_count", "INT NOT NULL DEFAULT 3"),
    ("hnd_handover_inspections", "joint_customer_signoff", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("hnd_handover_inspections", "customer_signoff_date", "DATE NULL"),
    ("hnd_handover_inspections", "warranty_start_date", "DATE NULL"),
    ("hnd_handover_inspections", "warranty_end_date", "DATE NULL"),
    
    # DLP Tickets
    ("hnd_dlp_tickets", "ticket_code", "VARCHAR(64) NULL UNIQUE"),
    ("hnd_dlp_tickets", "defect_severity", "VARCHAR(32) NOT NULL DEFAULT 'MEDIUM'"),
    ("hnd_dlp_tickets", "sla_hours", "INT NOT NULL DEFAULT 72"),
    ("hnd_dlp_tickets", "sla_breach_status", "VARCHAR(32) NOT NULL DEFAULT 'WITHIN_SLA'"),
    ("hnd_dlp_tickets", "warranty_valid_until", "DATE NULL"),
    ("hnd_dlp_tickets", "is_under_warranty", "BOOLEAN NOT NULL DEFAULT TRUE"),
    ("hnd_dlp_tickets", "assigned_technician", "VARCHAR(128) NULL"),
    ("hnd_dlp_tickets", "resolution_cost_bdt", "DECIMAL(12, 2) NOT NULL DEFAULT 0.00"),
    ("hnd_dlp_tickets", "borne_by", "VARCHAR(32) NOT NULL DEFAULT 'DEVELOPER_WARRANTY'"),
    
    # Lease Agreements
    ("rnt_lease_agreements", "lease_reference_no", "VARCHAR(64) NULL UNIQUE"),
    ("rnt_lease_agreements", "tenant_company_name", "VARCHAR(191) NULL"),
    ("rnt_lease_agreements", "trade_license_number", "VARCHAR(64) NULL"),
    ("rnt_lease_agreements", "tin_bin_number", "VARCHAR(64) NULL"),
    ("rnt_lease_agreements", "tenant_email", "VARCHAR(128) NULL"),
    ("rnt_lease_agreements", "emergency_contact_phone", "VARCHAR(32) NULL"),
    ("rnt_lease_agreements", "commercial_space_type", "VARCHAR(64) NOT NULL DEFAULT 'RETAIL_SHOP'"),
    ("rnt_lease_agreements", "floor_area_sqft", "DECIMAL(10, 2) NOT NULL DEFAULT 500.00"),
    ("rnt_lease_agreements", "rent_per_sqft_bdt", "DECIMAL(10, 2) NOT NULL DEFAULT 90.00"),
    ("rnt_lease_agreements", "cam_rate_per_sqft_bdt", "DECIMAL(10, 2) NOT NULL DEFAULT 15.00"),
    ("rnt_lease_agreements", "fitout_grace_period_days", "INT NOT NULL DEFAULT 30"),
    ("rnt_lease_agreements", "security_deposit_status", "VARCHAR(32) NOT NULL DEFAULT 'RECEIVED'"),
    ("rnt_lease_agreements", "escalation_frequency_months", "INT NOT NULL DEFAULT 12"),
    ("rnt_lease_agreements", "remarks", "TEXT NULL")
]

LOOKUP_CATEGORIES = [
    {
        "category_code": "SNAG_CATEGORY",
        "category_name": "Pre-Handover Snag Categories",
        "description": "Defect categories reported during customer joint handover inspection",
        "items": [
            ("Civil", "Civil & Structural Plaster", "সিভিল ও প্লাস্টার ত্রুটি"),
            ("Paint", "Paint Finish & Surface Blemishes", "পেইন্ট ফিনিশিং ও দাগ"),
            ("Plumbing", "Plumbing, CPVC Lines & Sanitaryware", "প্লাম্বিং ও স্যানিটারি ফিটিংস"),
            ("Electrical", "Electrical Wiring, DB Board & Switches", "ইলেকট্রিক্যাল ও সুইচবোর্ড"),
            ("Joinery", "Wooden Doors, Windows & Joinery", "কাঠের দরজা, জানালা ও লক"),
            ("Waterproofing", "Bathroom & Balcony Waterproofing", "ওয়াটারপ্রুফিং ও আর্দ্রতা"),
            ("Tiles", "Floor & Wall Tile Alignment/Hollowness", "টাইলস ও মার্বেল সারফেস")
        ]
    },
    {
        "category_code": "SNAG_LOCATION",
        "category_name": "Apartment Snag Locations",
        "description": "Specific internal locations within an apartment for defect recording",
        "items": [
            ("Master Bed Suite", "Master Bedroom & Attached Toilet", "মাস্টার বেড ও টয়লেট"),
            ("Kitchen Area", "Kitchen & Service Balcony", "কিচেন ও সার্ভিস বারান্দা"),
            ("Living Room", "Living Room & Foyer Area", "ড্রয়িং রুম ও প্রবেশদ্বার"),
            ("Dining Hall", "Dining Room & Common Basin", "ডাইনিং স্পেস"),
            ("Child Bed", "Child Bedroom & Balcony", "চাইল্ড বেডরুম ও বারান্দা"),
            ("Guest Bed", "Guest Bedroom", "গেস্ট বেডরুম"),
            ("Common Bath", "Common Bathroom", "কমন বাথরুম"),
            ("South Balcony", "South Front Facing Balcony", "দক্ষিণমুখী বারান্দা")
        ]
    },
    {
        "category_code": "SNAG_SEVERITY",
        "category_name": "Snag Defect Severity Levels",
        "description": "Urgency and priority level of snag rectification",
        "items": [
            ("CRITICAL", "Critical - Blocking Handover (24h SLA)", "অতি জরুরি - হস্তান্তর স্থগিত"),
            ("HIGH", "High Priority (48h SLA)", "উচ্চ অগ্রাধিকার"),
            ("MEDIUM", "Medium Priority (72h SLA)", "মাঝারি অগ্রাধিকার"),
            ("LOW", "Minor Cosmetic Issue (120h SLA)", "সামান্য ত্রুটি")
        ]
    },
    {
        "category_code": "COMMERCIAL_SPACE_TYPE",
        "category_name": "Commercial Space & Shop Types",
        "description": "Classification of rental commercial premises and shops",
        "items": [
            ("RETAIL_SHOP", "Ground Floor Retail Shop", "খুচরা বিক্রয় শপ"),
            ("OFFICE_SPACE", "Corporate Commercial Office", "বাণিজ্যিক অফিস স্পেস"),
            ("RESTAURANT", "Food Court / Restaurant Space", "রেস্তোরাঁ / ফুড কোর্ট"),
            ("BANK_BOOTH", "Bank Branch / ATM Booth", "ব্যাংক শাখা / বুথ"),
            ("SHOWROOM", "Display Showroom / Flagship Outlet", "শোরুম ও আউটলেট")
        ]
    },
    {
        "category_code": "UTILITY_METER_TYPE",
        "category_name": "Commercial Sub-Meter Types",
        "description": "Sub-meter types for commercial space utility consumption",
        "items": [
            ("ELECTRICITY", "Electricity (DESCO/DPDC Sub-Meter)", "বিদ্যুৎ সাব-মিটার"),
            ("WATER", "Water Consumption (WASA Sub-Meter)", "পানি সাব-মিটার"),
            ("GAS", "Gas Consumption (Titas Sub-Meter)", "গ্যাস সাব-মিটার"),
            ("HVAC_BTU", "Chilled Water HVAC (BTU Meter)", "সেন্ট্রাল এসি বিটিইউ মিটার")
        ]
    },
    {
        "category_code": "DLP_DEFECT_CATEGORY",
        "category_name": "12-Month DLP Warranty Defect Types",
        "description": "Categories covered under statutory 12-month defect liability warranty",
        "items": [
            ("Structural", "Structural Crack & Concrete Integrity", "কাঠামোগত ফাটল ও ক্ষতি"),
            ("Plumbing", "Concealed Plumbing & Sewage Leaks", "কনসিলড পাইপলাইন লিকেজ"),
            ("Electrical", "Electrical Short Circuit & Substation", "ইলেকট্রিক্যাল ও সাবস্টেশন"),
            ("Waterproofing", "Rooftop & Balcony Water Seepage", "ছাদ ও বারান্দার সিপেজ"),
            ("Lift & Generator", "Lift & Generator Auto-Transfer Defects", "লিফট ও জেনারেটর ত্রুটি")
        ]
    }
]

async def apply_migrations():
    logger.info("Starting schema migrations for Handover, Snags, DLP Warranty & Commercial Leasing...")
    async with engine.begin() as conn:
        for ddl in TABLE_DDL:
            await conn.execute(text(ddl))
            logger.info("Table ensured via DDL.")

        for table, col, col_def in ALTER_COMMANDS:
            try:
                check_sql = text(f"""
                    SELECT COUNT(*) FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table}' AND COLUMN_NAME = '{col}';
                """)
                res = await conn.execute(check_sql)
                exists = res.scalar() > 0
                if not exists:
                    alter_sql = text(f"ALTER TABLE `{table}` ADD COLUMN `{col}` {col_def};")
                    await conn.execute(alter_sql)
                    logger.info(f"Added column {col} to {table}.")
            except Exception as e:
                logger.warning(f"Column check/add failed for {table}.{col}: {e}")

async def seed_lookups(session):
    logger.info("Seeding dynamic lookup categories and items...")
    for cat in LOOKUP_CATEGORIES:
        cat_code = cat["category_code"]
        check_cat = await session.execute(
            text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"),
            {"c": cat_code}
        )
        cat_id = check_cat.scalar()
        if not cat_id:
            await session.execute(
                text("""
                    INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active, created_at, updated_at)
                    VALUES (:c, :n, :d, 1, NOW(), NOW())
                """),
                {
                    "c": cat_code,
                    "n": cat["category_name"],
                    "d": cat["description"]
                }
            )
            await session.commit()
            check_cat = await session.execute(
                text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"),
                {"c": cat_code}
            )
            cat_id = check_cat.scalar()
            logger.info(f"Created lookup category: {cat_code}")

        for sort_order, item in enumerate(cat["items"], 1):
            item_code = item[0]
            name_en = item[1]
            name_bn = item[2] if len(item) > 2 else name_en

            res_item = await session.execute(
                text("SELECT id FROM sys_lookup_items WHERE category_id = :cid AND item_code = :ic"),
                {"cid": cat_id, "ic": item_code}
            )
            if not res_item.scalar():
                await session.execute(
                    text("""
                        INSERT INTO sys_lookup_items 
                        (category_id, item_code, item_name_en, item_name_bn, sort_order, is_active, created_at, updated_at)
                        VALUES (:cid, :ic, :en, :bn, :so, 1, NOW(), NOW())
                    """),
                    {"cid": cat_id, "ic": item_code, "en": name_en, "bn": name_bn, "so": sort_order}
                )
    await session.commit()
    logger.info("Dynamic lookups seeded.")

async def seed_sample_data(session):
    logger.info("Seeding sample data for Handover, Snags, DLP Warranty & Commercial Leasing...")
    
    # 1. Fetch reference entities
    unit_res = await session.execute(select(Unit).limit(5))
    units = unit_res.scalars().all()
    if not units:
        logger.warning("No units found to link sample data.")
        return

    user_res = await session.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()
    user_id = user.id if user else 1

    booking_res = await session.execute(select(Booking).limit(5))
    bookings = booking_res.scalars().all()

    # 2. Seed Handover Inspections with Key Certificate & 12-Month Warranty
    insp_count_res = await session.execute(select(HandoverInspection))
    existing_insps = insp_count_res.scalars().all()
    
    if not existing_insps and bookings:
        b = bookings[0]
        u = units[0]
        handover_date = date.today() - timedelta(days=45)
        warranty_end = handover_date + timedelta(days=365)
        
        insp = HandoverInspection(
            booking_id=b.id,
            unit_id=u.id,
            site_engineer_id=user_id,
            inspection_date=handover_date - timedelta(days=5),
            all_financial_dues_cleared=True,
            possession_letter_number="POSS-2026-0001",
            key_handover_certificate_number="KEY-2026-0001",
            key_sets_count=3,
            possession_handover_date=handover_date,
            joint_customer_signoff=True,
            customer_signoff_date=handover_date,
            warranty_start_date=handover_date,
            warranty_end_date=warranty_end,
            status="POSSESSION_HANDED_OVER",
            notes="100% financial clearance verified. 3 sets of brass keys, electrical DB key, and sub-meter handed over."
        )
        session.add(insp)
        await session.commit()
        await session.refresh(insp)
        existing_insps = [insp]
        logger.info(f"Seeded HandoverInspection: {insp.possession_letter_number}")

    # 3. Seed Snag Items
    snag_count = (await session.execute(text("SELECT COUNT(*) FROM hnd_snag_items"))).scalar()
    if snag_count == 0 and units:
        insp_id = existing_insps[0].id if existing_insps else None
        target_unit_id = units[0].id

        sample_snags = [
            SnagItem(
                inspection_id=insp_id,
                unit_id=target_unit_id,
                snag_code="SNG-2026-0001",
                category="Paint",
                location="Master Bed Suite",
                defect_description="Hairline paint touch-up needed around north window reveal.",
                photo_attachment_url="assets/images/common/snag_paint_01.jpg",
                severity="LOW",
                contractor_name="Asian Paints Surface Finishers Ltd.",
                target_fix_date=date.today() - timedelta(days=30),
                status="VERIFIED_CLOSED",
                fix_date=date.today() - timedelta(days=28),
                verified_by_engineer_id=user_id,
                verification_notes="Touch-up completed with matching Dulux Velvet shade. Approved by allottee.",
                customer_accepted=True
            ),
            SnagItem(
                inspection_id=insp_id,
                unit_id=target_unit_id,
                snag_code="SNG-2026-0002",
                category="Plumbing",
                location="Kitchen Area",
                defect_description="Slight water seepage from sink drain coupling under counter.",
                photo_attachment_url="assets/images/common/snag_plumb_01.jpg",
                severity="HIGH",
                contractor_name="RAK Sanitary & Piping Contractors",
                target_fix_date=date.today() - timedelta(days=32),
                status="VERIFIED_CLOSED",
                fix_date=date.today() - timedelta(days=31),
                verified_by_engineer_id=user_id,
                verification_notes="Gasket replaced with high-pressure neoprene seal. No leak on testing.",
                customer_accepted=True
            ),
            SnagItem(
                inspection_id=insp_id,
                unit_id=target_unit_id,
                snag_code="SNG-2026-0003",
                category="Electrical",
                location="Living Room",
                defect_description="Dimmer switch on false ceiling spot lights flickering intermittently.",
                photo_attachment_url="assets/images/common/snag_elec_01.jpg",
                severity="MEDIUM",
                contractor_name="Havells Substation Team",
                target_fix_date=date.today() + timedelta(days=2),
                status="IN_PROGRESS",
                customer_accepted=False
            ),
            SnagItem(
                inspection_id=insp_id,
                unit_id=target_unit_id,
                snag_code="SNG-2026-0004",
                category="Joinery",
                location="South Balcony",
                defect_description="Aluminium sliding door latch stiff and requires alignment.",
                photo_attachment_url="assets/images/common/snag_door_01.jpg",
                severity="LOW",
                contractor_name="BSRM Aluminium Fab",
                target_fix_date=date.today() + timedelta(days=4),
                status="OPEN",
                customer_accepted=False
            )
        ]
        session.add_all(sample_snags)
        await session.commit()
        logger.info("Seeded 4 realistic Pre-Handover Snag Items.")

    # 4. Seed DLP Tickets with SLA Timers
    dlp_count = (await session.execute(text("SELECT COUNT(*) FROM hnd_dlp_tickets"))).scalar()
    if dlp_count == 0 and units:
        possession_d = date.today() - timedelta(days=45)
        w_valid = possession_d + timedelta(days=365)
        
        sample_dlp = [
            DLPTicket(
                unit_id=units[0].id,
                ticket_code="DLP-2026-0001",
                ticket_category="Plumbing",
                defect_severity="CRITICAL",
                issue_description="Concealed geyser inlet angle valve weeping inside false ceiling.",
                reported_date=date.today() - timedelta(days=2),
                rectification_deadline=date.today() - timedelta(days=1),
                sla_hours=24,
                sla_breach_status="WITHIN_SLA",
                warranty_valid_until=w_valid,
                is_under_warranty=True,
                assigned_technician="Md. Jahangir Alam (Senior Plumber)",
                resolution_cost_bdt=Decimal("2500.00"),
                borne_by="DEVELOPER_WARRANTY",
                status="RESOLVED",
                rectified_date=date.today() - timedelta(days=1),
                rectification_notes="Angle valve replaced under 12-month DLP warranty. Customer signed off."
            ),
            DLPTicket(
                unit_id=units[0].id,
                ticket_code="DLP-2026-0002",
                ticket_category="Electrical",
                defect_severity="HIGH",
                issue_description="MCB in sub-distribution board tripping when microwave turned on.",
                reported_date=date.today() - timedelta(days=1),
                rectification_deadline=date.today() + timedelta(days=1),
                sla_hours=48,
                sla_breach_status="WITHIN_SLA",
                warranty_valid_until=w_valid,
                is_under_warranty=True,
                assigned_technician="Engr. Moinul Hasan (Maintenance Engineer)",
                resolution_cost_bdt=Decimal("1800.00"),
                borne_by="DEVELOPER_WARRANTY",
                status="IN_PROGRESS"
            )
        ]
        session.add_all(sample_dlp)
        await session.commit()
        logger.info("Seeded 2 DLP Warranty Tickets with SLA Timers.")

    # 5. Seed Commercial Space Lease Agreements, CAM Bills & Utility Meter Readings
    lease_count = (await session.execute(text("SELECT COUNT(*) FROM rnt_lease_agreements"))).scalar()
    if lease_count == 0 and len(units) >= 2:
        comm_unit = units[1]
        start_d = date.today() - timedelta(days=90)
        exp_d = start_d + timedelta(days=365 * 3)

        lease = LeaseAgreement(
            unit_id=comm_unit.id,
            lease_reference_no="LSE-2026-001",
            tenant_name="Mr. Asifuzzaman Chowdhury",
            tenant_company_name="Shwapno Super Shop (ACI Logistics Ltd.)",
            trade_license_number="TRAD-DNCC-2024-99882",
            tin_bin_number="BIN-0033445566-0101",
            tenant_nid="19872691234567890",
            tenant_phone="+8801712345678",
            tenant_email="commercial.lease@shwapno.com.bd",
            emergency_contact_phone="+8801819876543",
            commercial_space_type="RETAIL_SHOP",
            floor_area_sqft=Decimal("1450.00"),
            rent_per_sqft_bdt=Decimal("120.00"),
            monthly_rent_bdt=Decimal("174000.00"),
            cam_rate_per_sqft_bdt=Decimal("18.00"),
            fitout_grace_period_days=30,
            lease_start_date=start_d,
            lease_expiry_date=exp_d,
            security_deposit_bdt=Decimal("522000.00"),
            security_deposit_status="RECEIVED",
            rent_escalation_percent=Decimal("10.00"),
            escalation_frequency_months=12,
            status="ACTIVE",
            remarks="Standard 3-year commercial retail lease with 6 months security deposit and 30-day fit-out period."
        )
        session.add(lease)
        await session.commit()
        await session.refresh(lease)
        logger.info(f"Seeded Commercial Lease: {lease.lease_reference_no}")

        # Seed Monthly CAM Bills
        cam_bill_1 = CAMBill(
            bill_number="CAM-2026-09-001",
            lease_id=lease.id,
            bill_month="2026-09",
            billing_date=date.today() - timedelta(days=40),
            due_date=date.today() - timedelta(days=25),
            area_sqft=Decimal("1450.00"),
            cam_rate_per_sqft=Decimal("18.00"),
            cam_amount=Decimal("26100.00"),
            sinking_fund_charge=Decimal("2500.00"),
            generator_backup_charge=Decimal("4500.00"),
            common_electricity_water=Decimal("3200.00"),
            total_bill_amount=Decimal("36300.00"),
            paid_amount=Decimal("36300.00"),
            payment_status="PAID",
            paid_date=date.today() - timedelta(days=26),
            remarks="September 2026 CAM service charge cleared via corporate cheque."
        )

        cam_bill_2 = CAMBill(
            bill_number="CAM-2026-10-001",
            lease_id=lease.id,
            bill_month="2026-10",
            billing_date=date.today() - timedelta(days=10),
            due_date=date.today() + timedelta(days=5),
            area_sqft=Decimal("1450.00"),
            cam_rate_per_sqft=Decimal("18.00"),
            cam_amount=Decimal("26100.00"),
            sinking_fund_charge=Decimal("2500.00"),
            generator_backup_charge=Decimal("4800.00"),
            common_electricity_water=Decimal("3500.00"),
            total_bill_amount=Decimal("36900.00"),
            paid_amount=Decimal("0.00"),
            payment_status="UNPAID",
            remarks="October 2026 CAM invoice pending payment."
        )
        session.add_all([cam_bill_1, cam_bill_2])

        # Seed Utility Sub-Meter Readings
        meter_1 = UtilitySubMeterReading(
            lease_id=lease.id,
            meter_number="DESCO-SUB-0402",
            meter_type="ELECTRICITY",
            reading_date=date.today() - timedelta(days=10),
            previous_reading=Decimal("14200.00"),
            current_reading=Decimal("15650.00"),
            units_consumed=Decimal("1450.00"),
            tariff_rate_per_unit=Decimal("14.50"),
            subtotal_amount=Decimal("21025.00"),
            vat_rate_percent=Decimal("5.00"),
            total_utility_amount=Decimal("22076.25"),
            billing_status="BILLED",
            remarks="Monthly retail electrical consumption - commercial tariff."
        )

        meter_2 = UtilitySubMeterReading(
            lease_id=lease.id,
            meter_number="WASA-SUB-102",
            meter_type="WATER",
            reading_date=date.today() - timedelta(days=10),
            previous_reading=Decimal("520.00"),
            current_reading=Decimal("585.00"),
            units_consumed=Decimal("65.00"),
            tariff_rate_per_unit=Decimal("42.00"),
            subtotal_amount=Decimal("2730.00"),
            vat_rate_percent=Decimal("5.00"),
            total_utility_amount=Decimal("2866.50"),
            billing_status="BILLED",
            remarks="WASA commercial kitchen & wash water supply."
        )
        session.add_all([meter_1, meter_2])
        await session.commit()
        logger.info("Seeded CAM Bills and Utility Sub-Meter Readings.")

async def main():
    await apply_migrations()
    async with AsyncSessionLocal() as session:
        await seed_lookups(session)
        await seed_sample_data(session)
    logger.info("Migration & seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
