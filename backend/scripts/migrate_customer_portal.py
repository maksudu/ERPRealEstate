import asyncio
import logging
import os
import sys
from datetime import date, timedelta
from decimal import Decimal

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_customer_portal")

DDL_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS portal_construction_updates (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        project_id BIGINT NOT NULL,
        tower_id BIGINT NULL,
        update_title VARCHAR(191) NOT NULL,
        update_date DATE NOT NULL,
        week_number INT NOT NULL DEFAULT 1,
        completion_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        milestone_phase VARCHAR(64) NOT NULL DEFAULT 'SUPER_STRUCTURE',
        engineer_notes TEXT NULL,
        photos_json JSON NULL,
        posted_by_engineer_id BIGINT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pcu_proj (project_id),
        INDEX idx_pcu_date (update_date),
        INDEX idx_pcu_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS portal_service_tickets (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        ticket_number VARCHAR(64) NOT NULL UNIQUE,
        customer_id BIGINT NOT NULL,
        booking_id BIGINT NOT NULL,
        unit_id BIGINT NOT NULL,
        category VARCHAR(64) NOT NULL DEFAULT 'GENERAL_MAINTENANCE',
        title VARCHAR(191) NOT NULL,
        description TEXT NOT NULL,
        location_in_unit VARCHAR(128) NULL,
        urgency VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
        attachment_photo_url VARCHAR(512) NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
        assigned_engineer_id BIGINT NULL,
        resolution_notes TEXT NULL,
        resolved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pst_cust (customer_id),
        INDEX idx_pst_book (booking_id),
        INDEX idx_pst_unit (unit_id),
        INDEX idx_pst_status (status),
        INDEX idx_pst_urgency (urgency)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS portal_online_payments (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        transaction_reference VARCHAR(64) NOT NULL UNIQUE,
        booking_id BIGINT NOT NULL,
        installment_id BIGINT NOT NULL,
        customer_id BIGINT NOT NULL,
        payment_gateway VARCHAR(32) NOT NULL DEFAULT 'BKASH',
        amount_bdt DECIMAL(14, 2) NOT NULL,
        gateway_fee_bdt DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        gateway_transaction_id VARCHAR(128) NULL,
        payer_mobile VARCHAR(32) NULL,
        gateway_status VARCHAR(32) NOT NULL DEFAULT 'INITIATED',
        generated_money_receipt_id BIGINT NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pop_ref (transaction_reference),
        INDEX idx_pop_book (booking_id),
        INDEX idx_pop_cust (customer_id),
        INDEX idx_pop_status (gateway_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
]

LOOKUP_CATEGORIES = [
    {
        "category_code": "PORTAL_TICKET_CATEGORY",
        "category_name": "Portal Service Ticket Categories",
        "items": [
            ("CIVIL_STRUCTURE", "Civil Structure & Plaster", 1),
            ("PAINT_FINISH", "Paint & Surface Finishing", 2),
            ("PLUMBING_SANITARY", "Plumbing, Piping & Sanitary Fixtures", 3),
            ("ELECTRICAL_FIXTURES", "Electrical Outlets, Switches & Wiring", 4),
            ("TILES_FLOORING", "Floor & Wall Tile Grouts", 5),
            ("DOORS_WINDOWS", "Doors, Locks & Sliding Windows", 6),
            ("WATERPROOFING", "Roof & Bathroom Waterproofing", 7),
            ("GENERAL_MAINTENANCE", "General Facilities Maintenance", 8),
        ]
    },
    {
        "category_code": "PORTAL_TICKET_URGENCY",
        "category_name": "Portal Service Ticket Urgency",
        "items": [
            ("NORMAL", "Normal Priority (5-day SLA)", 1),
            ("URGENT", "Urgent Priority (48-hour SLA)", 2),
            ("EMERGENCY", "Emergency (Immediate Safety Dispatch)", 3),
        ]
    },
    {
        "category_code": "PORTAL_PAYMENT_GATEWAY",
        "category_name": "Portal Online Payment Gateways",
        "items": [
            ("BKASH", "bKash Digital Merchant Checkout", 1),
            ("NAGAD", "Nagad Direct PGW", 2),
            ("SSLCOMMERZ", "SSLCommerz Multi-Bank Gateway", 3),
            ("VISA_MASTERCARD", "Visa / Mastercard Credit/Debit", 4),
            ("CITY_TOUCH", "City Bank CityTouch NetBanking", 5),
        ]
    },
    {
        "category_code": "PORTAL_MILESTONE_PHASE",
        "category_name": "Portal Construction Milestone Phases",
        "items": [
            ("SUB_STRUCTURE", "Sub-Structure Piling & Raft Foundation", 1),
            ("SUPER_STRUCTURE", "Super-Structure Floor Slab Casting", 2),
            ("BRICK_WORK", "Brickwork & Interior Conduit Piping", 3),
            ("FINISHING", "Plaster, Paint & Tile Flooring", 4),
            ("EXTERIOR_FACADE", "Exterior Curtain Wall & Glass Glazing", 5),
            ("ROOFTOP_AMENITIES", "Rooftop Garden & Community Hall", 6),
        ]
    }
]


async def run_migration():
    logger.info("Executing DDL for Customer Portal tables...")
    async with engine.begin() as conn:
        for stmt in DDL_STATEMENTS:
            await conn.execute(text(stmt))

        logger.info("Seeding dynamic lookup categories and items...")
        for cat in LOOKUP_CATEGORIES:
            res = await conn.execute(
                text("SELECT id FROM sys_lookup_categories WHERE category_code = :code"),
                {"code": cat["category_code"]}
            )
            cat_row = res.fetchone()
            if not cat_row:
                ins = await conn.execute(
                    text("INSERT INTO sys_lookup_categories (category_code, category_name) VALUES (:code, :name)"),
                    {"code": cat["category_code"], "name": cat["category_name"]}
                )
                cat_id = ins.lastrowid
                logger.info(f"Created lookup category: {cat['category_code']}")
            else:
                cat_id = cat_row[0]

            for code, name, sort_order in cat["items"]:
                it_res = await conn.execute(
                    text("SELECT id FROM sys_lookup_items WHERE category_id = :cid AND item_code = :code"),
                    {"cid": cat_id, "code": code}
                )
                if not it_res.fetchone():
                    await conn.execute(
                        text("""
                            INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, is_active, sort_order)
                            VALUES (:cid, :code, :name, 1, :order)
                        """),
                        {"cid": cat_id, "code": code, "name": name, "order": sort_order}
                    )

        # Check and seed sample construction progress updates
        updates_res = await conn.execute(text("SELECT COUNT(*) FROM portal_construction_updates"))
        if updates_res.scalar() == 0:
            logger.info("Seeding weekly site progress updates with photo galleries...")
            proj_res = await conn.execute(text("SELECT id FROM prj_projects LIMIT 1"))
            proj_id = proj_res.scalar() or 1

            sample_updates = [
                {
                    "project_id": proj_id,
                    "update_title": "12th Floor Roof Slab Concrete Pouring & Curing Completed",
                    "update_date": date.today() - timedelta(days=5),
                    "week_number": 42,
                    "completion_percentage": Decimal("68.50"),
                    "milestone_phase": "SUPER_STRUCTURE",
                    "engineer_notes": "4000 PSI concrete casting executed continuously with 3 concrete pumps. Cylinder slump tests recorded 120mm with satisfactory 7-day curing.",
                    "photos_json": """[
                        {"url": "https://images.unsplash.com/photo-1541888946425-d0fbb18615f3?w=800", "caption": "North-East tower slab reinforcement mesh inspection", "uploaded_at": "2026-10-12"},
                        {"url": "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800", "caption": "Concrete transit mixer and boom pump continuous discharge", "uploaded_at": "2026-10-12"},
                        {"url": "https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?w=800", "caption": "Core lift shear wall steel reinforcement verification", "uploaded_at": "2026-10-12"}
                    ]"""
                },
                {
                    "project_id": proj_id,
                    "update_title": "Interior Masonry Brickwork & Concealed Electrical Conduit Laying on 8th Floor",
                    "update_date": date.today() - timedelta(days=12),
                    "week_number": 41,
                    "completion_percentage": Decimal("64.20"),
                    "milestone_phase": "BRICK_WORK",
                    "engineer_notes": "Autoclaved Aerated Concrete (AAC) light blocks installed for interior partitions. Conduit drop boxes aligned for modern home automation.",
                    "photos_json": """[
                        {"url": "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800", "caption": "Master bedroom partition alignment and lintel beam placing", "uploaded_at": "2026-10-05"},
                        {"url": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800", "caption": "Kitchen plumbing riser and sanitary shaft plumbing piping", "uploaded_at": "2026-10-05"}
                    ]"""
                },
                {
                    "project_id": proj_id,
                    "update_title": "Basement Parking B1/B2 Epoxy Flooring & Fire Sprinkler Installation",
                    "update_date": date.today() - timedelta(days=19),
                    "week_number": 40,
                    "completion_percentage": Decimal("59.80"),
                    "milestone_phase": "FINISHING",
                    "engineer_notes": "Heavy-duty abrasion-resistant epoxy coat applied across 84 parking bays. High-velocity overhead deluge fire sprinkler system tested.",
                    "photos_json": """[
                        {"url": "https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?w=800", "caption": "Basement 1 marked parking bays and directional signage", "uploaded_at": "2026-09-28"}
                    ]"""
                }
            ]

            for u in sample_updates:
                await conn.execute(
                    text("""
                        INSERT INTO portal_construction_updates
                        (project_id, update_title, update_date, week_number, completion_percentage, milestone_phase, engineer_notes, photos_json, status)
                        VALUES (:project_id, :update_title, :update_date, :week_number, :completion_percentage, :milestone_phase, :engineer_notes, :photos_json, 'PUBLISHED')
                    """),
                    u
                )

        # Check and seed sample service ticket
        tkt_res = await conn.execute(text("SELECT COUNT(*) FROM portal_service_tickets"))
        if tkt_res.scalar() == 0:
            logger.info("Seeding sample flat owner service tickets...")
            b_res = await conn.execute(text("SELECT id, primary_customer_id, unit_id FROM sls_bookings LIMIT 1"))
            booking_row = b_res.fetchone()
            if booking_row:
                await conn.execute(
                    text("""
                        INSERT INTO portal_service_tickets
                        (ticket_number, customer_id, booking_id, unit_id, category, title, description, location_in_unit, urgency, status)
                        VALUES
                        ('TKT-202610-A192', :cid, :bid, :uid, 'PLUMBING_SANITARY', 'Master Bathroom Shower Mixer Water Pressure Low', 'Water flow in master bathroom concealed diverter mixer is low during morning peak hours.', 'Master Bathroom', 'NORMAL', 'WORK_IN_PROGRESS'),
                        ('TKT-202610-B404', :cid, :bid, :uid, 'PAINT_FINISH', 'Balcony Ceiling Plaster Paint Touch-up Required', 'Subtle paint discoloration spotted near balcony exterior cornice edge.', 'South Balcony', 'NORMAL', 'RESOLVED')
                    """),
                    {"cid": booking_row[1], "bid": booking_row[0], "uid": booking_row[2]}
                )

    logger.info("Customer Portal migration and seeding completed successfully.")


if __name__ == "__main__":
    asyncio.run(run_migration())
