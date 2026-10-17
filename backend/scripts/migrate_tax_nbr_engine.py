import asyncio
import json
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text

from app.core.database import engine, Base, AsyncSessionLocal
import app.modules.lookups.models
import app.modules.auth.models
import app.modules.projects.models
import app.modules.inventory.models
import app.modules.procurement.models
import app.modules.construction.models
import app.modules.accounts.models
import app.modules.tax.models
from app.modules.tax.models import TaxWithholdingRule, TaxZoneRate, Mushak65Challan, TaxTreasuryChallan
from app.modules.projects.models import Project
from app.modules.construction.models import Subcontractor


async def migrate_tax_nbr_engine():
    print(">>> Starting NBR VAT, TDS/VDS & Section 53FF AIT Database Migration...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print(">>> Tables verified & created successfully.")

    async with AsyncSessionLocal() as db:
        # 1. Seed Dynamic Section 53FF Tax Zones
        zone_count = (await db.execute(select(text("COUNT(*)")).select_from(TaxZoneRate))).scalar()
        if zone_count == 0:
            print(">>> Seeding Section 53FF Statutory Tax Zones...")
            zones = [
                TaxZoneRate(
                    zone_code="GULSHAN_BANANI",
                    zone_name="Gulshan, Banani, Baridhara, Motijheel, Dilkusha",
                    city_authority="RAJUK",
                    rate_per_sqm_residential=4000.00,
                    rate_per_sqm_commercial=8000.00,
                    rate_per_sft_residential=371.60,
                    rate_per_sft_commercial=743.20,
                    is_active=True,
                    description="Tier 1 Prime Diplomatic & Commercial Hub under Rajuk Jurisdiction"
                ),
                TaxZoneRate(
                    zone_code="DHANMONDI_UTTARA",
                    zone_name="Dhanmondi, DOHS, Lalmatia, Uttara, Bashundhara, Mohakhali",
                    city_authority="RAJUK",
                    rate_per_sqm_residential=3000.00,
                    rate_per_sqm_commercial=6000.00,
                    rate_per_sft_residential=278.70,
                    rate_per_sft_commercial=557.40,
                    is_active=True,
                    description="Tier 2 High-Density Residential & Business Hubs"
                ),
                TaxZoneRate(
                    zone_code="PURBACHAL_OTHER",
                    zone_name="Other Dhaka City Corporation, Purbachal New Town, Cantonment",
                    city_authority="RAJUK",
                    rate_per_sqm_residential=2000.00,
                    rate_per_sqm_commercial=4000.00,
                    rate_per_sft_residential=185.80,
                    rate_per_sft_commercial=371.60,
                    is_active=True,
                    description="Developing Mega Townships & Expanded Dhaka Urban Areas"
                ),
                TaxZoneRate(
                    zone_code="CHITTAGONG_METRO",
                    zone_name="Chittagong, Gazipur, Narayanganj City Corporations",
                    city_authority="CDA",
                    rate_per_sqm_residential=1500.00,
                    rate_per_sqm_commercial=3000.00,
                    rate_per_sft_residential=139.35,
                    rate_per_sft_commercial=278.70,
                    is_active=True,
                    description="Major Port City & Industrial Corridor Metropolises"
                ),
                TaxZoneRate(
                    zone_code="OTHER_DISTRICT",
                    zone_name="Other Pourashavas, Municipalities & District Headquarter Areas",
                    city_authority="POURASHAVA",
                    rate_per_sqm_residential=1000.00,
                    rate_per_sqm_commercial=2000.00,
                    rate_per_sft_residential=92.90,
                    rate_per_sft_commercial=185.80,
                    is_active=True,
                    description="Divisional & District Town Urban Local Authorities"
                )
            ]
            db.add_all(zones)
            await db.commit()
            print(f">>> Seeded {len(zones)} Tax Zones.")

        # 2. Seed Dynamic Withholding Rules (TDS & VDS)
        rule_count = (await db.execute(select(text("COUNT(*)")).select_from(TaxWithholdingRule))).scalar()
        if rule_count == 0:
            print(">>> Seeding Statutory TDS & VDS Withholding Rules...")
            rules = [
                # TDS Section 89 (Contractor execution of civil work)
                TaxWithholdingRule(
                    rule_code="SEC_89_CONTRACTOR_TIER_1",
                    rule_type="TDS",
                    tax_section="Section 89 (Income Tax Act 2023)",
                    category_name="Civil Works Contractor (Up to ৳50 Lakh)",
                    min_bill_amount=0.00,
                    max_bill_amount=5000000.00,
                    rate_with_tin=3.00,
                    rate_without_tin=4.50,
                    is_active=True,
                    description="Contractor bill up to BDT 50 Lakh (3% standard, 4.5% without TIN/PSR)"
                ),
                TaxWithholdingRule(
                    rule_code="SEC_89_CONTRACTOR_TIER_2",
                    rule_type="TDS",
                    tax_section="Section 89 (Income Tax Act 2023)",
                    category_name="Civil Works Contractor (৳50L to ৳2 Crore)",
                    min_bill_amount=5000000.00,
                    max_bill_amount=20000000.00,
                    rate_with_tin=5.00,
                    rate_without_tin=7.50,
                    is_active=True,
                    description="Contractor bill from BDT 50 Lakh to BDT 2 Crore (5% standard, 7.5% without TIN/PSR)"
                ),
                TaxWithholdingRule(
                    rule_code="SEC_89_CONTRACTOR_TIER_3",
                    rule_type="TDS",
                    tax_section="Section 89 (Income Tax Act 2023)",
                    category_name="Civil Works Contractor (Exceeding ৳2 Crore)",
                    min_bill_amount=20000000.00,
                    max_bill_amount=None,
                    rate_with_tin=7.00,
                    rate_without_tin=10.50,
                    is_active=True,
                    description="Large infrastructure contractor bill above BDT 2 Crore (7% standard, 10.5% penalty)"
                ),
                # TDS Section 86 (Professional, Architecture & Consultant Fees)
                TaxWithholdingRule(
                    rule_code="SEC_86_CONSULTANT_FEES",
                    rule_type="TDS",
                    tax_section="Section 86 (Income Tax Act 2023)",
                    category_name="Architecture, Engineering & Technical Consultancy",
                    min_bill_amount=0.00,
                    max_bill_amount=None,
                    rate_with_tin=10.00,
                    rate_without_tin=12.00,
                    is_active=True,
                    description="Design, structural engineering & supervision consulting (10% standard, 12% without PSR)"
                ),
                # TDS Section 89 (Material Supply)
                TaxWithholdingRule(
                    rule_code="SEC_89_SUPPLIER_GOODS",
                    rule_type="TDS",
                    tax_section="Section 89 (Income Tax Act 2023)",
                    category_name="Construction Materials & Hardware Supply",
                    min_bill_amount=0.00,
                    max_bill_amount=None,
                    rate_with_tin=3.00,
                    rate_without_tin=5.00,
                    is_active=True,
                    description="Supply of steel, cement, hardware, aggregates (3% standard, 5% non-compliant)"
                ),
                # VDS Rules (VAT Act 2012)
                TaxWithholdingRule(
                    rule_code="VDS_SAND_STONE",
                    rule_type="VDS",
                    tax_section="VAT Act 2012 (Third Schedule)",
                    category_name="Sand, Stone Chips & Mining Aggregates",
                    min_bill_amount=0.00,
                    max_bill_amount=None,
                    rate_with_tin=5.00,
                    rate_without_tin=5.00,
                    is_active=True,
                    description="Statutory VDS deduction on bulk sand and stone aggregates supply (5%)"
                ),
                TaxWithholdingRule(
                    rule_code="VDS_BRICKS_PROCUREMENT",
                    rule_type="VDS",
                    tax_section="VAT Act 2012 (Third Schedule)",
                    category_name="Auto & Clay Bricks Supply",
                    min_bill_amount=0.00,
                    max_bill_amount=None,
                    rate_with_tin=7.50,
                    rate_without_tin=7.50,
                    is_active=True,
                    description="Statutory VDS on brickfield and auto-brick supplies (7.5%)"
                ),
                TaxWithholdingRule(
                    rule_code="VDS_TILES_SANITARY",
                    rule_type="VDS",
                    tax_section="VAT Act 2012 (Third Schedule)",
                    category_name="Ceramic Tiles & Sanitaryware Procurement",
                    min_bill_amount=0.00,
                    max_bill_amount=None,
                    rate_with_tin=7.50,
                    rate_without_tin=7.50,
                    is_active=True,
                    description="Finishing tiles, CP fittings & sanitary equipment supply (7.5%)"
                ),
                TaxWithholdingRule(
                    rule_code="VDS_TRANSPORT_CARRIAGE",
                    rule_type="VDS",
                    tax_section="VAT Act 2012 (Third Schedule)",
                    category_name="Transport, Freight & Carriage Contractor",
                    min_bill_amount=0.00,
                    max_bill_amount=None,
                    rate_with_tin=10.00,
                    rate_without_tin=10.00,
                    is_active=True,
                    description="Truck, trailer and equipment transport hire charges (10%)"
                ),
                TaxWithholdingRule(
                    rule_code="VDS_CONSULTANCY_SERVICES",
                    rule_type="VDS",
                    tax_section="VAT Act 2012 (Third Schedule)",
                    category_name="Architectural, Structural & Soil Test Consultancy",
                    min_bill_amount=0.00,
                    max_bill_amount=None,
                    rate_with_tin=15.00,
                    rate_without_tin=15.00,
                    is_active=True,
                    description="Full 15% statutory VAT withholding on technical & consultancy fees"
                )
            ]
            db.add_all(rules)
            await db.commit()
            print(f">>> Seeded {len(rules)} Statutory Withholding Rules.")

        # 3. Seed Sample Mushak 6.5 Transfer Challan
        mushak_65_count = (await db.execute(select(text("COUNT(*)")).select_from(Mushak65Challan))).scalar()
        if mushak_65_count == 0:
            print(">>> Seeding Sample Mushak 6.5 Goods Transfer Challan...")
            p_res = await db.execute(select(Project).order_by(Project.id.asc()))
            projects = p_res.scalars().all()
            sub_res = await db.execute(select(Subcontractor).order_by(Subcontractor.id.asc()))
            subs = sub_res.scalars().all()

            orig_id = projects[0].id if projects else 1
            dest_id = projects[1].id if len(projects) > 1 else orig_id
            sub_id = subs[0].id if subs else None

            sample_items = [
                {
                    "item_name": "Deformed Steel Rebar 60-Grade (16mm & 20mm)",
                    "specification": "BSRM Xtreme 500W High Yield",
                    "quantity": 15.0,
                    "unit": "TON",
                    "unit_value": 98000.0,
                    "total_value": 1470000.0
                },
                {
                    "item_name": "Portland Composite Cement (PCC)",
                    "specification": "Shah Cement Special 50kg Bags",
                    "quantity": 400.0,
                    "unit": "BAG",
                    "unit_value": 560.0,
                    "total_value": 224000.0
                },
                {
                    "item_name": "Sylhet Sand (FM 2.5 Coarse)",
                    "specification": "Washed Coarse Sand for RCC Column Casting",
                    "quantity": 800.0,
                    "unit": "CFT",
                    "unit_value": 65.0,
                    "total_value": 52000.0
                }
            ]

            tot_val = sum(x["total_value"] for x in sample_items)
            c1 = Mushak65Challan(
                challan_number=f"MUSHAK-6.5-{date.today().year}-00001",
                issue_date=date.today(),
                issue_time="09:30 AM",
                origin_project_id=orig_id,
                destination_project_id=dest_id,
                subcontractor_id=sub_id,
                transport_vehicle_type="TRUCK",
                vehicle_number="DHAKA METRO-TA-14-5590",
                driver_name="Md. Harun-ur-Rashid",
                driver_phone="01712-998877",
                items_json=json.dumps(sample_items),
                total_declared_value=tot_val,
                purpose="INTERNAL_TRANSFER",
                status="ISSUED",
                remarks="Inter-project site stock rebalance for 4th floor slab casting."
            )
            db.add(c1)
            await db.commit()
            print(">>> Seeded Sample Mushak 6.5 Challan.")

        # 4. Seed Sample Treasury Deposit Challans
        treasury_count = (await db.execute(select(text("COUNT(*)")).select_from(TaxTreasuryChallan))).scalar()
        if treasury_count == 0:
            print(">>> Seeding NBR Statutory Treasury Challans...")
            ch1 = TaxTreasuryChallan(
                challan_no="TR-CHALLAN-2026-9901",
                deposit_date=date.today(),
                bank_name="Sonali Bank PLC",
                branch_name="Local Office Branch, Motijheel, Dhaka",
                economic_code="1-1141-0010-0111",
                tax_type="VAT",
                total_deposit_amount=450000.00,
                status="DEPOSITED",
                remarks="Quarterly VDS & Customer Billing Mushak 6.3 VAT Deposit."
            )
            ch2 = TaxTreasuryChallan(
                challan_no="TR-CHALLAN-2026-9902",
                deposit_date=date.today(),
                bank_name="Sonali Bank PLC",
                branch_name="Banani Branch, Dhaka",
                economic_code="1-1141-0020-0101",
                tax_type="TDS",
                total_deposit_amount=325000.00,
                status="DEPOSITED",
                remarks="Section 89 Subcontractor and Supplier Tax Deduction at Source deposit."
            )
            db.add_all([ch1, ch2])
            await db.commit()
            print(">>> Seeded Statutory Treasury Challans.")

    print(">>> NBR Tax Engine Migration & Seeding Complete! 100% SUCCESS.")


if __name__ == "__main__":
    asyncio.run(migrate_tax_nbr_engine())
