"""
Seed script for Spec 4.6: Customer Requirements & Budget Tracking demo data.
Run: python backend/scripts/seed_crm_customer_requirements.py
"""
import os
import sys
import asyncio
import logging
import json
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath("backend"))
import app.main
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from sqlalchemy import select, func
from app.core.database import AsyncSessionLocal
from app.modules.crm.models import Customer, CustomerRequirement, RequirementAuditLog, InventoryRecommendation, InventoryAlert
from app.modules.projects.models import Project
from app.modules.inventory.models import Unit


async def seed_requirements():
    logger.info("Seeding demo data for Customer Requirements & Budget Tracking (Spec 4.6)...")
    async with AsyncSessionLocal() as session:
        # Check if already seeded
        existing_res = await session.execute(select(func.count(CustomerRequirement.id)))
        count = existing_res.scalar_one() or 0
        if count > 0:
            logger.info(f"Customer requirements already exist ({count} records). Skipping seeding.")
            return

        # Fetch some customers
        cust_res = await session.execute(select(Customer).limit(5))
        customers = cust_res.scalars().all()
        if not customers:
            logger.warning("No customers found in crm_customers. Please seed customers first.")
            return

        # Fetch projects
        proj_res = await session.execute(select(Project).limit(5))
        projects = proj_res.scalars().all()
        proj1 = projects[0] if projects else None
        proj2 = projects[1] if len(projects) > 1 else proj1

        # Fetch available units
        unit_res = await session.execute(select(Unit).where(Unit.status_id == "AVAILABLE").limit(10))
        units = unit_res.scalars().all()

        c1 = customers[0]
        c2 = customers[1] if len(customers) > 1 else c1

        # Requirement 1: Matching Prompt 4.6 specification exactly!
        req1 = CustomerRequirement(
            requirement_code="REQ-2026-00001",
            customer_id=c1.id,
            title="Primary Residence - 3BHK in Uttara",
            preferred_project_id=proj1.id if proj1 else None,
            preferred_location="Uttara, Dhaka",
            property_type="APARTMENT",
            budget_min_bdt=12000000.00,  # 1.20 crore
            budget_max_bdt=15000000.00,  # 1.50 crore
            area_min_sqft=1400.00,
            area_max_sqft=1700.00,
            bedrooms=3,
            bathrooms=3,
            preferred_floor="MID_FLOOR",
            preferred_facing="SOUTH_FACING",
            parking_required=True,
            parking_count=1,
            purchase_timeline="WITHIN_6_MONTHS",
            payment_preference="INSTALLMENTS",
            amenities_required="High-speed Lift, Standby Generator, 24/7 CCTV & Security, Gymnasium, Community Hall",
            special_notes="Prefers south or east corner unit with open green view. Interested in construction-linked installment schedule.",
            status="MATCHED",
            assigned_sales_rep_id=c1.relationship_manager_id,
            matched_units_count=len(units),
            last_matched_at=datetime.utcnow(),
            created_at=datetime.utcnow() - timedelta(days=12)
        )
        session.add(req1)

        # Requirement 2: Second requirement profile for same customer (investor / duplex)
        req2 = CustomerRequirement(
            requirement_code="REQ-2026-00002",
            customer_id=c1.id,
            title="Investment Portfolio - Duplex / Penthouse",
            preferred_project_id=proj2.id if proj2 else None,
            preferred_location="Gulshan / Banani, Dhaka",
            property_type="DUPLEX",
            budget_min_bdt=25000000.00,  # 2.50 crore
            budget_max_bdt=35000000.00,  # 3.50 crore
            area_min_sqft=2400.00,
            area_max_sqft=3200.00,
            bedrooms=4,
            bathrooms=4,
            preferred_floor="HIGH_FLOOR",
            preferred_facing="SOUTH_EAST",
            parking_required=True,
            parking_count=2,
            purchase_timeline="WITHIN_3_MONTHS",
            payment_preference="BANK_FINANCING",
            amenities_required="Rooftop Swimming Pool, Private Terrace, Dedicated Concierge, Smart Home Automation",
            special_notes="Client is an NRB investor looking for high rental yield and premium capital appreciation.",
            status="ACTIVE",
            assigned_sales_rep_id=c1.relationship_manager_id,
            matched_units_count=3,
            last_matched_at=datetime.utcnow(),
            created_at=datetime.utcnow() - timedelta(days=5)
        )
        session.add(req2)

        # Requirement 3: For second customer
        req3 = CustomerRequirement(
            requirement_code="REQ-2026-00003",
            customer_id=c2.id,
            title="Compact 2BHK Starter Home - Mirpur DOHS",
            preferred_project_id=proj1.id if proj1 else None,
            preferred_location="Mirpur DOHS, Dhaka",
            property_type="APARTMENT",
            budget_min_bdt=7500000.00,   # 75 Lakh
            budget_max_bdt=9500000.00,   # 95 Lakh
            area_min_sqft=950.00,
            area_max_sqft=1200.00,
            bedrooms=2,
            bathrooms=2,
            preferred_floor="LOW_FLOOR",
            preferred_facing="EAST_FACING",
            parking_required=True,
            parking_count=1,
            purchase_timeline="IMMEDIATE",
            payment_preference="INSTALLMENTS",
            amenities_required="Elevator, Substation, Rooftop Garden, Fire Safety System",
            special_notes="Ready to sign booking token within this month if floor and pricing fit budget.",
            status="ACTIVE",
            assigned_sales_rep_id=c2.relationship_manager_id,
            matched_units_count=4,
            last_matched_at=datetime.utcnow(),
            created_at=datetime.utcnow() - timedelta(days=2)
        )
        session.add(req3)

        await session.flush()

        # Audit logs for Requirement 1
        audit1 = RequirementAuditLog(
            requirement_id=req1.id,
            change_summary="Initial requirement profile created (Budget ৳1.00 Cr - ৳1.30 Cr)",
            new_values_json=json.dumps({"budget_min_bdt": 10000000, "budget_max_bdt": 13000000, "bedrooms": 3}),
            created_at=datetime.utcnow() - timedelta(days=12)
        )
        audit2 = RequirementAuditLog(
            requirement_id=req1.id,
            change_summary="Budget revised upward: ৳1.20 Cr - ৳1.50 Cr; Added East Facing as acceptable",
            old_values_json=json.dumps({"budget_min_bdt": 10000000, "budget_max_bdt": 13000000, "facing": "SOUTH_FACING"}),
            new_values_json=json.dumps({"budget_min_bdt": 12000000, "budget_max_bdt": 15000000, "facing": "SOUTH_FACING / EAST_FACING"}),
            created_at=datetime.utcnow() - timedelta(days=4)
        )
        session.add_all([audit1, audit2])

        # Recommendations for Requirement 1
        if units:
            u1 = units[0]
            rec1 = InventoryRecommendation(
                requirement_id=req1.id,
                unit_id=u1.id,
                match_score_percentage=94.50,
                match_details_json=json.dumps({
                    "budget_score": 30,
                    "area_score": 25,
                    "bedroom_score": 20,
                    "floor_facing_score": 15,
                    "project_location_score": 4.5
                }),
                status="SHORTLISTED",
                recommended_at=datetime.utcnow() - timedelta(days=3),
                feedback_at=datetime.utcnow() - timedelta(days=2)
            )
            session.add(rec1)

            if len(units) > 1:
                u2 = units[1]
                rec2 = InventoryRecommendation(
                    requirement_id=req1.id,
                    unit_id=u2.id,
                    match_score_percentage=82.00,
                    match_details_json=json.dumps({
                        "budget_score": 22,
                        "area_score": 18,
                        "bedroom_score": 20,
                        "floor_facing_score": 14,
                        "project_location_score": 8
                    }),
                    status="REJECTED",
                    rejection_reason="PRICE_TOO_HIGH",
                    rejection_notes="Customer found the additional corner premium of ৳15 Lakh above desired range.",
                    recommended_at=datetime.utcnow() - timedelta(days=6),
                    feedback_at=datetime.utcnow() - timedelta(days=5)
                )
                session.add(rec2)

            # Alert for sales rep
            alert1 = InventoryAlert(
                requirement_id=req1.id,
                unit_id=u1.id,
                sales_rep_id=req1.assigned_sales_rep_id,
                alert_title=f"Inventory Recommended: Unit {u1.unit_number}",
                alert_message=f"Unit {u1.unit_number} (3BHK, {float(u1.gross_saleable_area_sqft)} sqft) has 94.5% match with customer {c1.full_name_en}.",
                is_read=False,
                created_at=datetime.utcnow() - timedelta(hours=8)
            )
            session.add(alert1)

        await session.commit()
        logger.info("Successfully seeded 3 customer requirement profiles with audit logs and recommendations!")


if __name__ == "__main__":
    asyncio.run(seed_requirements())
