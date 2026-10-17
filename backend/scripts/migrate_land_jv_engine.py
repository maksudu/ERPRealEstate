import asyncio
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text

from app.core.database import engine, Base, AsyncSessionLocal
import app.modules.lookups.models
import app.modules.auth.models
import app.modules.land.models
from app.modules.land.models import (
    LandBank, Landowner, LandKhatian, LandDag, LandDeedDocument,
    JVAgreement, JVUnitAllocation, LandJVMilestonePayment
)


async def migrate_land_jv_engine():
    print(">>> Starting Land Bank, Khatian/Dag & JV Ratio Sharing Database Migration...")

    async with engine.begin() as conn:
        # Check and alter lnd_land_banks columns if missing
        print(">>> Ensuring schema updates on existing land tables...")
        try:
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN upazila_thana VARCHAR(128) NOT NULL DEFAULT 'Gulshan'"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN district VARCHAR(64) NOT NULL DEFAULT 'Dhaka'"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN sub_registry_office VARCHAR(128) NOT NULL DEFAULT 'Gulshan Sub-Registry Office'"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE lnd_land_banks ADD COLUMN total_area_bigha DECIMAL(14,4) NOT NULL DEFAULT 0.00"))
        except Exception:
            pass

        # Check and alter lnd_jv_agreements
        try:
            await conn.execute(text("ALTER TABLE lnd_jv_agreements ADD COLUMN signing_money_paid DECIMAL(16,2) NOT NULL DEFAULT 0.00"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE lnd_jv_agreements ADD COLUMN poa_deed_number VARCHAR(128) NULL"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE lnd_jv_agreements ADD COLUMN poa_execution_date DATE NULL"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE lnd_jv_agreements ADD COLUMN poa_expiry_date DATE NULL"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE lnd_jv_agreements ADD COLUMN poa_verified BOOLEAN NOT NULL DEFAULT 1"))
        except Exception:
            pass

        # Check and alter lnd_jv_unit_allocations
        try:
            await conn.execute(text("ALTER TABLE lnd_jv_unit_allocations ADD COLUMN tower_name VARCHAR(64) NOT NULL DEFAULT 'Tower 1'"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE lnd_jv_unit_allocations ADD COLUMN floor_number INT NOT NULL DEFAULT 1"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE lnd_jv_unit_allocations ADD COLUMN unit_number VARCHAR(64) NOT NULL DEFAULT '1A'"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE lnd_jv_unit_allocations ADD COLUMN unit_type VARCHAR(32) NOT NULL DEFAULT 'APARTMENT'"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE lnd_jv_unit_allocations ADD COLUMN gross_sft DECIMAL(10,2) NOT NULL DEFAULT 1500.00"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE lnd_jv_unit_allocations ADD COLUMN parking_slot_number VARCHAR(32) NULL"))
        except Exception:
            pass

        # Create all new tables
        await conn.run_sync(Base.metadata.create_all)
    print(">>> Tables verified & created successfully.")

    async with AsyncSessionLocal() as db:
        # 1. Seed or retrieve a sample Land Bank parcel
        res = await db.execute(select(LandBank).where(LandBank.project_code == "PRJ-LND-GULSHAN-01"))
        parcel = res.scalar_one_or_none()
        if not parcel:
            print(">>> Seeding Land Parcel 'Gulshan North Lakefront Parcel'...")
            parcel = LandBank(
                project_code="PRJ-LND-GULSHAN-01",
                proposal_title="Gulshan North Lakefront Luxury Twin Tower Parcel",
                mouza_name="Gulshan Model Town",
                jl_number="JL-210",
                upazila_thana="Gulshan",
                district="Dhaka",
                sub_registry_office="Gulshan Sub-Registry Office",
                total_area_katha=30.00, # 1.5 Bigha
                total_area_decimal=49.58,
                total_area_bigha=1.50,
                total_area_sqft=21600.00,
                deal_type="JOINT_VENTURE",
                status="JV_SIGNED",
                location_description="Plot #12, Road #44, Gulshan-2, Dhaka-1212"
            )
            db.add(parcel)
            await db.flush()

            # Add Landowner
            lo = Landowner(
                land_bank_id=parcel.id,
                owner_type="INDIVIDUAL",
                full_name_en="Alhaj Nurul Islam Chowdhury",
                full_name_bn="আলহাজ্ব নুরুল ইসলাম চৌধুরী",
                nid_number="1958269123450001",
                tin_number="584729103412",
                phone_number="01711-554433",
                ownership_share_ratio=1.0000,
                bank_details={"bank_name": "Islami Bank Bangladesh", "branch": "Gulshan", "account_no": "2050123456789"}
            )
            db.add(lo)
            await db.flush()

        # 2. Seed Khatian Hierarchy: CS -> SA -> RS -> BS -> Mutation
        khat_count = (await db.execute(select(text("COUNT(*)")).select_from(LandKhatian).where(LandKhatian.land_bank_id == parcel.id))).scalar()
        if khat_count == 0:
            print(">>> Seeding Khatian Hierarchy (CS, SA, RS, BS, Mutation)...")
            khatians = [
                LandKhatian(
                    land_bank_id=parcel.id,
                    khatian_type="CS",
                    khatian_number="CS-114",
                    recorded_tenant_name="Late Golam Ali Chowdhury",
                    case_or_jote_no="Jote-14/1922",
                    remarks="Cadastral Survey 1910 records original zamindari tenancy settlement."
                ),
                LandKhatian(
                    land_bank_id=parcel.id,
                    khatian_type="SA",
                    khatian_number="SA-450",
                    recorded_tenant_name="Late Akram Hossain Chowdhury",
                    case_or_jote_no="Case-89/1958",
                    remarks="State Acquisition 1962 mutation to sole heir."
                ),
                LandKhatian(
                    land_bank_id=parcel.id,
                    khatian_type="RS",
                    khatian_number="RS-892",
                    recorded_tenant_name="Alhaj Nurul Islam Chowdhury & Brothers",
                    case_or_jote_no="Jote-302/1984",
                    remarks="Revisional Survey 1984 title continuity confirmed."
                ),
                LandKhatian(
                    land_bank_id=parcel.id,
                    khatian_type="BS",
                    khatian_number="BS-1540",
                    recorded_tenant_name="Alhaj Nurul Islam Chowdhury",
                    case_or_jote_no="City-BS-991/2008",
                    remarks="Dhaka City Survey (BS) published and certified by Directorate of Land Records."
                ),
                LandKhatian(
                    land_bank_id=parcel.id,
                    khatian_type="MUTATION",
                    khatian_number="MUT-4421/2020",
                    recorded_tenant_name="Alhaj Nurul Islam Chowdhury",
                    case_or_jote_no="Namjari Case # 4421/IX-I/2020",
                    remarks="AC Land Gulshan circle verified Namjari Khatian with DCR."
                )
            ]
            db.add_all(khatians)
            await db.flush()
            print(f">>> Seeded {len(khatians)} Khatians.")

        # 3. Seed Dag / Plot records
        dag_count = (await db.execute(select(text("COUNT(*)")).select_from(LandDag).where(LandDag.land_bank_id == parcel.id))).scalar()
        if dag_count == 0:
            print(">>> Seeding Dag / Plot details...")
            dags = [
                LandDag(
                    land_bank_id=parcel.id,
                    dag_number="RS-2410 / BS-5104",
                    land_class="BHITI",
                    area_decimal=30.00,
                    area_katha=18.15,
                    area_bigha=0.91,
                    area_sqft=13068.0,
                    possession_status="FULL_POSSESSION",
                    remarks="Prime lakefront high residential land with clear demarcated boundary pillars."
                ),
                LandDag(
                    land_bank_id=parcel.id,
                    dag_number="RS-2411 / BS-5105",
                    land_class="NAL",
                    area_decimal=19.58,
                    area_katha=11.85,
                    area_bigha=0.59,
                    area_sqft=8532.0,
                    possession_status="FULL_POSSESSION",
                    remarks="Adjoining plot consolidated under single mutation demarcation."
                )
            ]
            db.add_all(dags)
            await db.flush()
            print(f">>> Seeded {len(dags)} Dags.")

        # 4. Seed Legal Documents (Deed, Mutation Parcha, DCR, Khajna, PoA)
        doc_count = (await db.execute(select(text("COUNT(*)")).select_from(LandDeedDocument).where(LandDeedDocument.land_bank_id == parcel.id))).scalar()
        if doc_count == 0:
            print(">>> Seeding Statutory Legal Deeds & Expiry Tracking Records...")
            docs = [
                LandDeedDocument(
                    land_bank_id=parcel.id,
                    doc_type="DEED_BAYA",
                    doc_number="DEED-1988-GUL-4819",
                    issuing_office="Gulshan Sub-Registry Office",
                    execution_date=date(1988, 5, 12),
                    expiry_date=None,
                    is_expired=False,
                    verification_status="VERIFIED",
                    notes="Parent Baya Deed registered with certified copy from Sadar Record Room."
                ),
                LandDeedDocument(
                    land_bank_id=parcel.id,
                    doc_type="MUTATION_PARCHA",
                    doc_number="MUT-PARCHA-2020-4421",
                    issuing_office="Gulshan AC Land Revenue Circle",
                    execution_date=date(2020, 9, 14),
                    expiry_date=None,
                    is_expired=False,
                    verification_status="VERIFIED",
                    notes="Statutory Namjari Parcha with corrected Jote number."
                ),
                LandDeedDocument(
                    land_bank_id=parcel.id,
                    doc_type="DCR_RECEIPT",
                    doc_number="DCR-2020-88192",
                    issuing_office="Tehsil Office, Gulshan",
                    execution_date=date(2020, 9, 18),
                    expiry_date=None,
                    is_expired=False,
                    verification_status="VERIFIED",
                    notes="Duplicate Carbon Receipt for government revenue fee clearance."
                ),
                LandDeedDocument(
                    land_bank_id=parcel.id,
                    doc_type="KHAJNA_TAX",
                    doc_number="LDTAX-1432-88190",
                    issuing_office="Land Development Tax (Ministry of Land Portal)",
                    execution_date=date.today() - timedelta(days=300),
                    expiry_date=date.today() + timedelta(days=45), # Expiring in 45 days -> triggers ALERT!
                    is_expired=False,
                    verification_status="VERIFIED",
                    notes="Annual 1432 Bangabda Land Development Tax receipt. Renewal due soon!"
                ),
                LandDeedDocument(
                    land_bank_id=parcel.id,
                    doc_type="POA_DEED",
                    doc_number="POA-IRREVOCABLE-2025-0042",
                    issuing_office="Gulshan Joint Sub-Registry",
                    execution_date=date(2025, 2, 1),
                    expiry_date=date(2028, 2, 1),
                    is_expired=False,
                    verification_status="VERIFIED",
                    notes="Registered Irrevocable Power of Attorney (PoA) authorizing development & sales."
                )
            ]
            db.add_all(docs)
            await db.flush()
            print(f">>> Seeded {len(docs)} Legal Documents with expiry alert tracking.")

        # 5. Seed 50:50 Joint Venture Agreement with Unit Allocation Matrix
        jv_count = (await db.execute(select(text("COUNT(*)")).select_from(JVAgreement).where(JVAgreement.land_bank_id == parcel.id))).scalar()
        if jv_count == 0:
            print(">>> Seeding 50:50 Joint Venture Agreement & Unit Allocations...")
            jv = JVAgreement(
                land_bank_id=parcel.id,
                agreement_deed_no="JV-AGR-2026-GUL-5050",
                landowner_share_percent=50.00,
                developer_share_percent=50.00,
                signing_money_total=30000000.00, # ৳3 Crore signing money
                signing_money_paid=10000000.00,  # ৳1 Crore advance paid
                tenure_months=42,
                poa_deed_number="POA-IRREVOCABLE-2025-0042",
                poa_execution_date=date(2025, 2, 1),
                poa_expiry_date=date(2028, 2, 1),
                poa_verified=True,
                status="ACTIVE"
            )
            db.add(jv)
            await db.flush()

            # Seed 12 units (6 Landowner, 6 Developer)
            allocs = []
            for fl in range(1, 7):
                # Unit A (Landowner - Locked)
                allocs.append(JVUnitAllocation(
                    jv_agreement_id=jv.id,
                    tower_name="Tower 1",
                    floor_number=fl,
                    unit_number=f"{fl}A",
                    unit_identifier=f"Tower 1 - Floor {fl} - Unit {fl}A",
                    unit_type="APARTMENT",
                    allocation_type="LANDOWNER_UNIT",
                    is_locked_for_sales=True, # Locked!
                    gross_sft=1850.00,
                    parking_slot_number=f"B1-0{fl}",
                    allocation_notes="Landowner 50% Share - Barred from Sales"
                ))
                # Unit B (Developer - Available)
                allocs.append(JVUnitAllocation(
                    jv_agreement_id=jv.id,
                    tower_name="Tower 1",
                    floor_number=fl,
                    unit_number=f"{fl}B",
                    unit_identifier=f"Tower 1 - Floor {fl} - Unit {fl}B",
                    unit_type="APARTMENT",
                    allocation_type="DEVELOPER_UNIT",
                    is_locked_for_sales=False,
                    gross_sft=1850.00,
                    parking_slot_number=f"B2-0{fl}",
                    allocation_notes="Developer 50% Commercial Inventory"
                ))
            db.add_all(allocs)
            await db.flush()

            # Seed Signing Money & Milestone Payments
            milestones = [
                LandJVMilestonePayment(
                    jv_agreement_id=jv.id,
                    milestone_name="Signing Advance (Signing Money)",
                    due_date=date.today() - timedelta(days=60),
                    amount_bdt=10000000.00,
                    payment_status="PAID",
                    paid_date=date.today() - timedelta(days=60),
                    voucher_ref="BR-2026-0012",
                    notes="Paid via Account Payee Cheque #982101 (Sonali Bank)"
                ),
                LandJVMilestonePayment(
                    jv_agreement_id=jv.id,
                    milestone_name="Rajuk Plan Approval & Building Permit",
                    due_date=date.today() + timedelta(days=90),
                    amount_bdt=10000000.00,
                    payment_status="PENDING",
                    notes="Payable upon receiving sanctioned architectural plans from Rajuk."
                ),
                LandJVMilestonePayment(
                    jv_agreement_id=jv.id,
                    milestone_name="Piling & Substructure Completion",
                    due_date=date.today() + timedelta(days=240),
                    amount_bdt=10000000.00,
                    payment_status="PENDING",
                    notes="Final installment of signing money advance."
                )
            ]
            db.add_all(milestones)
            await db.flush()
            print(f">>> Seeded JV Agreement with {len(allocs)} units and {len(milestones)} milestones.")

        await db.commit()
    print(">>> Land Bank & JV Sharing Engine Migration Complete! 100% SUCCESS.")


if __name__ == "__main__":
    asyncio.run(migrate_land_jv_engine())
