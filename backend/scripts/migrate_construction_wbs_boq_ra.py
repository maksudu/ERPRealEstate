import asyncio
import os
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text

from app.core.database import engine, Base, AsyncSessionLocal
import app.modules.projects.models
import app.modules.auth.models
import app.modules.construction.models
from app.modules.projects.models import Project, Tower, BOQItem
from app.modules.construction.models import (
    WBSNode, VariationOrder, JointMeasurementSheet,
    Subcontractor, WorkOrder, DPRReport, LaborMuster, RABill
)


async def migrate_and_seed_construction_wbs_boq_ra():
    print(">>> Starting Construction WBS, BOQ Hard Budget Locks, DPR & RA Billing Migration...")

    async with engine.begin() as conn:
        # 1. Ensure new tables are created
        print(">>> Creating new tables con_wbs_nodes, con_variation_orders, con_joint_measurements...")
        await conn.run_sync(Base.metadata.create_all)

        # 2. Schema alterations for prj_boq_items
        print(">>> Altering prj_boq_items columns...")
        for col_def in [
            "ALTER TABLE prj_boq_items ADD COLUMN item_code VARCHAR(64) NULL",
            "ALTER TABLE prj_boq_items ADD COLUMN wbs_node_id BIGINT NULL",
            "ALTER TABLE prj_boq_items ADD COLUMN requisitioned_quantity DECIMAL(14,4) NOT NULL DEFAULT 0.0000",
            "ALTER TABLE prj_boq_items ADD COLUMN variation_order_quantity DECIMAL(14,4) NOT NULL DEFAULT 0.0000",
            "ALTER TABLE prj_boq_items ADD COLUMN hard_lock_percentage DECIMAL(5,2) NOT NULL DEFAULT 105.00",
            "ALTER TABLE prj_boq_items ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT FALSE"
        ]:
            try:
                await conn.execute(text(col_def))
            except Exception:
                pass

        # 3. Schema alterations for con_dpr_reports
        print(">>> Altering con_dpr_reports columns...")
        for col_def in [
            "ALTER TABLE con_dpr_reports ADD COLUMN wbs_node_id BIGINT NULL",
            "ALTER TABLE con_dpr_reports ADD COLUMN floor_unit_location VARCHAR(191) NULL",
            "ALTER TABLE con_dpr_reports ADD COLUMN machinery_deployed VARCHAR(255) NULL",
            "ALTER TABLE con_dpr_reports ADD COLUMN site_photos JSON NULL",
            "ALTER TABLE con_dpr_reports ADD COLUMN safety_incident_logged BOOLEAN NOT NULL DEFAULT FALSE",
            "ALTER TABLE con_dpr_reports ADD COLUMN safety_incident_notes TEXT NULL"
        ]:
            try:
                await conn.execute(text(col_def))
            except Exception:
                pass

        # 4. Schema alterations for con_ra_bills
        print(">>> Altering con_ra_bills columns...")
        for col_def in [
            "ALTER TABLE con_ra_bills ADD COLUMN billing_period_start DATE NULL",
            "ALTER TABLE con_ra_bills ADD COLUMN billing_period_end DATE NULL",
            "ALTER TABLE con_ra_bills ADD COLUMN retention_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00",
            "ALTER TABLE con_ra_bills ADD COLUMN material_store_recovery_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00",
            "ALTER TABLE con_ra_bills ADD COLUMN tds_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00",
            "ALTER TABLE con_ra_bills ADD COLUMN vds_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00",
            "ALTER TABLE con_ra_bills ADD COLUMN approval_signature_chain JSON NULL"
        ]:
            try:
                await conn.execute(text(col_def))
            except Exception:
                pass

    print(">>> Schema alterations complete. Now verifying and seeding demo construction data...")

    async with AsyncSessionLocal() as session:
        # Check Project
        p_res = await session.execute(select(Project).order_by(Project.id.asc()))
        project = p_res.scalars().first()
        if not project:
            print(">>> No project found, skipping seeding.")
            return

        t_res = await session.execute(select(Tower).where(Tower.project_id == project.id).order_by(Tower.id.asc()))
        tower = t_res.scalars().first()

        # Check existing WBS nodes
        wbs_count = (await session.execute(select(text("COUNT(*) FROM con_wbs_nodes WHERE project_id = :pid")).params(pid=project.id))).scalar() or 0
        if wbs_count == 0:
            print(">>> Seeding Work Breakdown Structure (WBS) Multi-Tier Tree...")
            # 1. Substructure Phase
            substructure = WBSNode(
                project_id=project.id,
                tower_id=tower.id if tower else None,
                parent_id=None,
                node_code="WBS-P01-SUB",
                node_name="Substructure Works (Foundation & Basement)",
                wbs_tier="PHASE",
                phase_category="SUBSTRUCTURE",
                planned_start_date=date.today() - timedelta(days=120),
                planned_end_date=date.today() - timedelta(days=20),
                actual_start_date=date.today() - timedelta(days=118),
                actual_end_date=None,
                progress_percentage=85.00,
                weightage_percentage=25.00,
                status="IN_PROGRESS",
                responsible_engineer="Engr. Tanvir Ahmed (Project Lead)",
                remarks="Cast-in-situ bored piling and raft foundation casting."
            )
            session.add(substructure)
            await session.flush()

            # Piling Activity under Substructure
            piling = WBSNode(
                project_id=project.id,
                tower_id=tower.id if tower else None,
                parent_id=substructure.id,
                node_code="WBS-P01-PIL",
                node_name="Cast-in-situ Bored Piling & Non-Destructive Integrity Tests",
                wbs_tier="ACTIVITY",
                phase_category="SUBSTRUCTURE",
                activity_type="PILING",
                planned_start_date=date.today() - timedelta(days=120),
                planned_end_date=date.today() - timedelta(days=70),
                actual_start_date=date.today() - timedelta(days=118),
                actual_end_date=date.today() - timedelta(days=68),
                progress_percentage=100.00,
                weightage_percentage=12.00,
                status="COMPLETED",
                responsible_engineer="Engr. Maksudul Haque",
                remarks="All 182 bored piles cast and low-strain integrity tested."
            )
            session.add(piling)

            # Mat Casting under Substructure
            mat_casting = WBSNode(
                project_id=project.id,
                tower_id=tower.id if tower else None,
                parent_id=substructure.id,
                node_code="WBS-P01-MAT",
                node_name="Raft Mat Foundation Heavy Concrete Pouring",
                wbs_tier="ACTIVITY",
                phase_category="SUBSTRUCTURE",
                activity_type="MAT_CASTING",
                planned_start_date=date.today() - timedelta(days=65),
                planned_end_date=date.today() - timedelta(days=20),
                actual_start_date=date.today() - timedelta(days=62),
                actual_end_date=None,
                progress_percentage=90.00,
                weightage_percentage=13.00,
                status="IN_PROGRESS",
                responsible_engineer="Engr. Tanvir Ahmed",
                remarks="Mat Zone-A and Zone-B completed, curing underway."
            )
            session.add(mat_casting)

            # 2. Superstructure Phase
            superstructure = WBSNode(
                project_id=project.id,
                tower_id=tower.id if tower else None,
                parent_id=None,
                node_code="WBS-P01-SUP",
                node_name="Superstructure Reinforced Concrete Framing",
                wbs_tier="PHASE",
                phase_category="SUPERSTRUCTURE",
                planned_start_date=date.today() - timedelta(days=30),
                planned_end_date=date.today() + timedelta(days=180),
                actual_start_date=date.today() - timedelta(days=25),
                actual_end_date=None,
                progress_percentage=35.00,
                weightage_percentage=45.00,
                status="IN_PROGRESS",
                responsible_engineer="Engr. Kazi Orin (Structural Lead)",
                remarks="Casting of columns, shear walls and PT post-tensioned floor slabs."
            )
            session.add(superstructure)
            await session.flush()

            # Column Casting
            col_casting = WBSNode(
                project_id=project.id,
                tower_id=tower.id if tower else None,
                parent_id=superstructure.id,
                node_code="WBS-P01-COL",
                node_name="Columns & Shear Walls (Level 1 to 10)",
                wbs_tier="ACTIVITY",
                phase_category="SUPERSTRUCTURE",
                activity_type="COLUMN",
                planned_start_date=date.today() - timedelta(days=25),
                planned_end_date=date.today() + timedelta(days=100),
                actual_start_date=date.today() - timedelta(days=22),
                actual_end_date=None,
                progress_percentage=55.00,
                weightage_percentage=22.00,
                status="IN_PROGRESS",
                responsible_engineer="Engr. Kazi Orin",
                remarks="Level 1 to 5 columns cast and stripped."
            )
            session.add(col_casting)

            # Beam & Slab Casting
            slab_casting = WBSNode(
                project_id=project.id,
                tower_id=tower.id if tower else None,
                parent_id=superstructure.id,
                node_code="WBS-P01-SLB",
                node_name="Post-Tensioned Beams & Suspended Slabs (Level 1 to 10)",
                wbs_tier="ACTIVITY",
                phase_category="SUPERSTRUCTURE",
                activity_type="BEAM_SLAB",
                planned_start_date=date.today() - timedelta(days=15),
                planned_end_date=date.today() + timedelta(days=160),
                actual_start_date=date.today() - timedelta(days=12),
                actual_end_date=None,
                progress_percentage=40.00,
                weightage_percentage=23.00,
                status="IN_PROGRESS",
                responsible_engineer="Engr. Kazi Orin",
                remarks="Level 3 suspended slab poured; strand stressing completed."
            )
            session.add(slab_casting)

            # 3. Architectural Finishing Phase
            finishing = WBSNode(
                project_id=project.id,
                tower_id=tower.id if tower else None,
                parent_id=None,
                node_code="WBS-P01-FIN",
                node_name="Architectural Finishing & MEP Services",
                wbs_tier="PHASE",
                phase_category="FINISHING",
                planned_start_date=date.today() + timedelta(days=30),
                planned_end_date=date.today() + timedelta(days=280),
                actual_start_date=None,
                actual_end_date=None,
                progress_percentage=10.00,
                weightage_percentage=30.00,
                status="NOT_STARTED",
                responsible_engineer="Engr. Mostofa Kamal (Finishing Architect)",
                remarks="Block masonry, internal/external plaster, floor tiles, and sanitary rough-ins."
            )
            session.add(finishing)
            await session.flush()

            # Brickwork & AAC Block
            brickwork = WBSNode(
                project_id=project.id,
                tower_id=tower.id if tower else None,
                parent_id=finishing.id,
                node_code="WBS-P01-BRK",
                node_name="AAC Lightweight Block Masonry (Level 1 to 5)",
                wbs_tier="ACTIVITY",
                phase_category="FINISHING",
                activity_type="BRICKWORK",
                planned_start_date=date.today() + timedelta(days=30),
                planned_end_date=date.today() + timedelta(days=120),
                actual_start_date=None,
                actual_end_date=None,
                progress_percentage=15.00,
                weightage_percentage=10.00,
                status="IN_PROGRESS",
                responsible_engineer="Engr. Mostofa Kamal",
                remarks="Level 1 and 2 perimeter walls underway."
            )
            session.add(brickwork)

            # Plaster
            plaster = WBSNode(
                project_id=project.id,
                tower_id=tower.id if tower else None,
                parent_id=finishing.id,
                node_code="WBS-P01-PLS",
                node_name="Internal Wall Plaster & Ceiling Punning",
                wbs_tier="ACTIVITY",
                phase_category="FINISHING",
                activity_type="PLASTER",
                planned_start_date=date.today() + timedelta(days=90),
                planned_end_date=date.today() + timedelta(days=200),
                actual_start_date=None,
                actual_end_date=None,
                progress_percentage=5.00,
                weightage_percentage=10.00,
                status="NOT_STARTED",
                responsible_engineer="Engr. Mostofa Kamal",
                remarks="Mockup apartment plastering approved."
            )
            session.add(plaster)

            # Tiles & Stone
            tiles = WBSNode(
                project_id=project.id,
                tower_id=tower.id if tower else None,
                parent_id=finishing.id,
                node_code="WBS-P01-TLS",
                node_name="Vitrified Floor & Rustic Wall Tile Installation",
                wbs_tier="ACTIVITY",
                phase_category="FINISHING",
                activity_type="TILES",
                planned_start_date=date.today() + timedelta(days=150),
                planned_end_date=date.today() + timedelta(days=270),
                actual_start_date=None,
                actual_end_date=None,
                progress_percentage=0.00,
                weightage_percentage=10.00,
                status="NOT_STARTED",
                responsible_engineer="Engr. Mostofa Kamal",
                remarks="Sample selections approved by client."
            )
            session.add(tiles)
            await session.commit()
            print(">>> WBS tree created successfully!")

        # Refresh WBS nodes for linking
        wbs_nodes_res = await session.execute(select(WBSNode).where(WBSNode.project_id == project.id))
        all_wbs = {n.node_code: n for n in wbs_nodes_res.scalars().all()}

        # 2. Seed / Update BOQ Items with Hard Budget Lock Parameters
        print(">>> Updating & Seeding BOQ Items with 105% Hard Budget Lock...")
        boq_items_res = await session.execute(select(BOQItem).where(BOQItem.project_id == project.id))
        existing_boqs = boq_items_res.scalars().all()

        if not existing_boqs:
            # Create standard BOQ items
            b1 = BOQItem(
                project_id=project.id,
                tower_id=tower.id if tower else None,
                wbs_phase_id="SUB_STRUCTURE",
                material_category_id="REBAR_500W",
                item_code="BOQ-CIV-001",
                item_description="500W High-Yield Deformed Steel Rebar (10mm - 25mm)",
                unit_of_measure_id="TON",
                wbs_node_id=all_wbs.get("WBS-P01-PIL", None).id if "WBS-P01-PIL" in all_wbs else None,
                estimated_quantity=300.0000,
                estimated_unit_rate=98000.00,
                total_estimated_cost=29400000.00,
                actual_consumed_quantity=220.0000,
                requisitioned_quantity=280.0000, # Safe under 105% (ceiling = 315.00)
                variation_order_quantity=0.0000,
                hard_lock_percentage=105.00,
                is_locked=False
            )
            b2 = BOQItem(
                project_id=project.id,
                tower_id=tower.id if tower else None,
                wbs_phase_id="SUB_STRUCTURE",
                material_category_id="CEMENT_OPC",
                item_code="BOQ-CIV-002",
                item_description="Portland Composite Cement (PCC 50kg Bags)",
                unit_of_measure_id="BAG",
                wbs_node_id=all_wbs.get("WBS-P01-MAT", None).id if "WBS-P01-MAT" in all_wbs else None,
                estimated_quantity=6000.0000,
                estimated_unit_rate=580.00,
                total_estimated_cost=3480000.00,
                actual_consumed_quantity=5800.0000,
                requisitioned_quantity=6250.0000, # Near 105% ceiling (ceiling = 6300.00)
                variation_order_quantity=0.0000,
                hard_lock_percentage=105.00,
                is_locked=False
            )
            b3 = BOQItem(
                project_id=project.id,
                tower_id=tower.id if tower else None,
                wbs_phase_id="SUB_STRUCTURE",
                material_category_id="SAND_FM_2_5",
                item_code="BOQ-CIV-003",
                item_description="Coarse Sylhet Sand FM 2.5 for Heavy Concrete",
                unit_of_measure_id="CFT",
                wbs_node_id=all_wbs.get("WBS-P01-MAT", None).id if "WBS-P01-MAT" in all_wbs else None,
                estimated_quantity=20000.0000,
                estimated_unit_rate=65.00,
                total_estimated_cost=1300000.00,
                actual_consumed_quantity=21000.0000,
                requisitioned_quantity=21000.0000, # At exactly 105% ceiling (20,000 * 1.05 = 21,000) -> LOCKED!
                variation_order_quantity=0.0000,
                hard_lock_percentage=105.00,
                is_locked=True
            )
            session.add_all([b1, b2, b3])
            await session.commit()
            print(">>> Seeded 3 BOQ items with Hard Budget Lock simulation!")
        else:
            # Ensure existing items have codes and realistic numbers
            for idx, item in enumerate(existing_boqs):
                if not item.item_code:
                    item.item_code = f"BOQ-CIV-{idx+1:03d}"
                if not item.hard_lock_percentage:
                    item.hard_lock_percentage = 105.00
                if item.requisitioned_quantity is None:
                    item.requisitioned_quantity = float(item.estimated_quantity) * 0.90
            await session.commit()

        # Re-fetch BOQ items
        b_res = await session.execute(select(BOQItem).where(BOQItem.project_id == project.id).order_by(BOQItem.id.asc()))
        all_boqs = b_res.scalars().all()
        locked_boq = next((b for b in all_boqs if b.is_locked), all_boqs[0] if all_boqs else None)

        # 3. Seed Variation Order (VO)
        vo_count = (await session.execute(select(text("COUNT(*) FROM con_variation_orders WHERE project_id = :pid")).params(pid=project.id))).scalar() or 0
        if vo_count == 0 and locked_boq:
            print(">>> Seeding approved Variation Order (VO) for locked BOQ item...")
            vo = VariationOrder(
                project_id=project.id,
                boq_item_id=locked_boq.id,
                vo_number=f"VO-PRJ01-{date.today().year}-001",
                additional_quantity=3500.0000,
                revised_rate=float(locked_boq.estimated_unit_rate),
                additional_budget=round(3500.0000 * float(locked_boq.estimated_unit_rate), 2),
                reason="Subsoil stratum geotechnical variation required additional raft depth (+400mm) approved in soil review.",
                approved_by_pm="Engr. Mostofa Kamal (Project Director)",
                status="APPROVED",
                approval_date=date.today() - timedelta(days=5)
            )
            session.add(vo)
            # Update BOQ VO quantity
            locked_boq.variation_order_quantity = 3500.0000
            locked_boq.is_locked = False # Unlocked due to approved VO headroom!
            await session.commit()
            print(">>> Variation Order seeded and BOQ item headroom unlocked!")

        # 4. Seed Joint Measurement Sheet (JMS)
        wo_res = await session.execute(select(WorkOrder).where(WorkOrder.project_id == project.id).order_by(WorkOrder.id.asc()))
        work_order = wo_res.scalars().first()
        if not work_order:
            # Create a subcontractor and work order
            sub_res = await session.execute(select(Subcontractor).order_by(Subcontractor.id.asc()))
            sub = sub_res.scalars().first()
            if not sub:
                sub = Subcontractor(
                    contractor_code="CONT-0001",
                    company_name="Bengal Civil & Structural Engineering Ltd.",
                    trade_specialization="CIVIL_STRUCTURE",
                    contact_person="Md. Rafiqul Islam",
                    primary_phone="+8801711223344",
                    tin_number="123456789012",
                    bin_number="987654321012"
                )
                session.add(sub)
                await session.flush()

            work_order = WorkOrder(
                project_id=project.id,
                contractor_id=sub.id,
                work_order_no=f"WO-{date.today().year}-0001",
                contract_type="CIVIL_SUPERSTRUCTURE",
                total_contract_value=12500000.00,
                retention_money_percent=5.00,
                defect_liability_months=12,
                status="ACTIVE",
                scope_of_work="Complete RCC Structure, bored piling, raft foundation, columns, shear walls, and floor slabs."
            )
            session.add(work_order)
            await session.commit()

        jms_count = (await session.execute(select(text("COUNT(*) FROM con_joint_measurements WHERE work_order_id = :woid")).params(woid=work_order.id))).scalar() or 0
        if jms_count == 0:
            print(">>> Seeding Joint Measurement Sheets (JMS)...")
            jms1 = JointMeasurementSheet(
                work_order_id=work_order.id,
                wbs_node_id=all_wbs.get("WBS-P01-MAT", None).id if "WBS-P01-MAT" in all_wbs else None,
                jms_number=f"JMS-WO01-{date.today().year}-001",
                measurement_date=date.today() - timedelta(days=10),
                location_floor="Basement Level 2 - Raft Mat Foundation Zone A",
                trade_item="Raft Reinforcement Binding & Shuttering",
                unit_of_measure="CFT",
                measured_length=120.00,
                measured_breadth=80.00,
                measured_depth=4.50,
                measured_quantity=43200.0000,
                unit_rate=32.50,
                total_amount=1404000.00,
                verified_by_site_engineer="Engr. Tanvir Ahmed",
                subcontractor_representative="Md. Rafiqul Islam (Project Manager)",
                status="VERIFIED_BY_ENGINEER"
            )
            jms2 = JointMeasurementSheet(
                work_order_id=work_order.id,
                wbs_node_id=all_wbs.get("WBS-P01-COL", None).id if "WBS-P01-COL" in all_wbs else None,
                jms_number=f"JMS-WO01-{date.today().year}-002",
                measurement_date=date.today() - timedelta(days=3),
                location_floor="Level 1 to Level 3 - Columns C1 to C16",
                trade_item="Column Plywood Shuttering & Scaffolding",
                unit_of_measure="SFT",
                measured_length=16.00,
                measured_breadth=12.00,
                measured_depth=0.00,
                measured_quantity=14200.0000,
                unit_rate=28.00,
                total_amount=397600.00,
                verified_by_site_engineer="Engr. Tanvir Ahmed",
                subcontractor_representative="Md. Rafiqul Islam",
                status="VERIFIED_BY_ENGINEER"
            )
            session.add_all([jms1, jms2])
            await session.commit()
            print(">>> Seeded 2 Joint Measurement Sheets!")

        # 5. Enrich DPR Reports with Machinery, Safety & Site Photos
        print(">>> Enriching Daily Progress Reports (DPR)...")
        dpr_res = await session.execute(select(DPRReport).where(DPRReport.project_id == project.id).order_by(DPRReport.id.desc()))
        dprs = dpr_res.scalars().all()
        if dprs:
            for d in dprs:
                if not d.machinery_deployed:
                    d.floor_unit_location = "Tower 1 - Floor 4 Beam & Slab B4-S4"
                    d.machinery_deployed = "1x Putzmeister 42m Concrete Pump, 3x Transit Mixers 7m3, 6x Electric Needle Vibrators"
                    d.site_photos = [
                        {"url": "assets/images/construction/dpr_pour_1.jpg", "caption": "Concrete pouring at Zone B slab"},
                        {"url": "assets/images/construction/dpr_pour_2.jpg", "caption": "Slump cone test reading 120mm"}
                    ]
                    d.safety_incident_logged = False
                    d.safety_incident_notes = "Zero safety incidents. 100% PPE compliance verified at morning toolbox briefing."
            await session.commit()
            print(">>> DPR reports enriched!")

        # 6. Seed / Enrich RA Bill with Full Statutory Deductions & 4-Tier Approval Chain
        print(">>> Seeding RA Bill with statutory deduction breakdown & multi-role approval chain...")
        ra_count = (await session.execute(select(text("COUNT(*) FROM con_ra_bills WHERE work_order_id = :woid")).params(woid=work_order.id))).scalar() or 0
        if ra_count == 0:
            gross_val = 2500000.00
            retention_amt = round(gross_val * 0.05, 2) # 125,000
            advance_amt = 150000.00 # Mobilization advance recovery
            store_amt = 100000.00 # Cement / Steel recovery from developer warehouse
            tds_amt = round(gross_val * 0.05, 2) # Sec 52 TDS: 125,000
            vds_amt = round(gross_val * 0.05, 2) # VDS: 125,000
            net_val = round(gross_val - retention_amt - advance_amt - store_amt - tds_amt - vds_amt, 2) # 1,875,000

            sig_chain = [
                {
                    "role": "SITE_ENGINEER",
                    "title": "Site Engineer",
                    "status": "APPROVED",
                    "signed_by": "Engr. Tanvir Ahmed",
                    "signed_at": (datetime.now() - timedelta(days=2)).isoformat(),
                    "notes": "Verified against JMS-WO01-2026-001 and concrete cube 28-day strength reports."
                },
                {
                    "role": "QUANTITY_SURVEYOR",
                    "title": "Quantity Surveyor (QS)",
                    "status": "APPROVED",
                    "signed_by": "Engr. Maksudul Haque (Lead QS)",
                    "signed_at": (datetime.now() - timedelta(days=1)).isoformat(),
                    "notes": "Quantity reconciliation verified with BOQ budget limits. Net payable confirmed."
                },
                {
                    "role": "PROJECT_DIRECTOR",
                    "title": "Project Director",
                    "status": "PENDING",
                    "signed_by": None,
                    "signed_at": None,
                    "notes": None
                },
                {
                    "role": "ACCOUNTS",
                    "title": "Head of Accounts",
                    "status": "PENDING",
                    "signed_by": None,
                    "signed_at": None,
                    "notes": None
                }
            ]

            ra = RABill(
                work_order_id=work_order.id,
                ra_bill_number=f"RA-BILL-PRJ01-01",
                bill_date=date.today() - timedelta(days=2),
                billing_period_start=date.today() - timedelta(days=32),
                billing_period_end=date.today() - timedelta(days=2),
                gross_work_certified_amount=gross_val,
                retention_percent=5.00,
                retention_money_deducted=retention_amt,
                advance_recovery_deducted=advance_amt,
                material_store_recovery_amount=store_amt,
                tds_rate=5.00,
                tds_withheld_amount=tds_amt,
                vds_rate=5.00,
                vds_withheld_amount=vds_amt,
                net_payable_amount=net_val,
                approval_signature_chain=sig_chain,
                status="VERIFIED_BY_QS",
                remarks="Running Account Bill #01 covering Substructure Mat Foundation and Column Level 1 casting."
            )
            session.add(ra)
            await session.commit()
            print(">>> RA Bill with 4-tier approval signature chain seeded!")

    print(">>> All Construction WBS, BOQ Hard Lock & RA Billing migrations complete!")


if __name__ == "__main__":
    asyncio.run(migrate_and_seed_construction_wbs_boq_ra())
