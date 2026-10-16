import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.modules.land.models import LandBank, Landowner, SurveyRecord, JVAgreement, JVUnitAllocation
from app.modules.land.schemas import convert_area_to_all_units

async def seed_land_data():
    print("Starting Land Acquisition, Survey Records & JV Seeding...")
    async with AsyncSessionLocal() as session:
        # Check if already seeded
        st = select(LandBank).where(LandBank.project_code == "PRJ-GULSHAN-AVENUE")
        res = await session.execute(st)
        if res.scalar_one_or_none():
            print("Land demo parcels already exist. Skipping seed.")
            return

        # 1. Parcel 1: Gulshan Avenue High-End Luxury Tower
        area_1 = convert_area_to_all_units(katha=18.5)
        parcel_1 = LandBank(
            project_code="PRJ-GULSHAN-AVENUE",
            proposal_title="Gulshan North Avenue Prime Lakefront Land",
            mouza_name="Gulshan Model Town",
            jl_number="JL-24",
            total_area_katha=area_1["katha"],
            total_area_decimal=area_1["decimal"],
            total_area_sqft=area_1["sqft"],
            deal_type="JOINT_VENTURE",
            status="JV_SIGNED",
            location_description="Plot #14, Road #71, Gulshan-2, Dhaka 1212. Facing Gulshan North Lake."
        )
        session.add(parcel_1)
        await session.flush()

        # Landowners for Parcel 1
        lo_1 = Landowner(
            land_bank_id=parcel_1.id,
            owner_type="INDIVIDUAL",
            full_name_en="Alhaj Rafiqul Islam Chowdhury",
            full_name_bn="আলহাজ্ব রফিকুল ইসলাম চৌধুরী",
            nid_number="19782690223450012",
            tin_number="214589632145",
            phone_number="+8801711223344",
            ownership_share_ratio=0.6000,
            bank_details={"bank_name": "Dutch-Bangla Bank PLC", "branch": "Gulshan", "account_no": "116.120.0049281"}
        )
        lo_2 = Landowner(
            land_bank_id=parcel_1.id,
            owner_type="INDIVIDUAL",
            full_name_en="Begum Nurunnahar Chowdhury",
            full_name_bn="বেগম নুরুননাহার চৌধুরী",
            nid_number="19822690223450088",
            tin_number="345678912345",
            phone_number="+8801711998877",
            ownership_share_ratio=0.4000,
            bank_details={"bank_name": "City Bank PLC", "branch": "Gulshan Avenue", "account_no": "310.228.0091122"}
        )
        session.add_all([lo_1, lo_2])

        # Historic Surveys for Parcel 1 (Full CS -> SA -> RS -> BS Chain)
        surveys_1 = [
            SurveyRecord(
                land_bank_id=parcel_1.id,
                survey_type_id="CS",
                khatian_number="CS-112",
                recorded_tenant_name="Late Golam Rahman Mia",
                dag_number="CS-504",
                recorded_area_decimal=30.55,
                recorded_area_katha=18.48,
                remarks="Cadastral Survey 1912 - Title originating ancestor"
            ),
            SurveyRecord(
                land_bank_id=parcel_1.id,
                survey_type_id="SA",
                khatian_number="SA-489",
                recorded_tenant_name="Late Golam Rahman Mia",
                dag_number="SA-812",
                recorded_area_decimal=30.55,
                recorded_area_katha=18.48,
                remarks="State Acquisition Survey 1956"
            ),
            SurveyRecord(
                land_bank_id=parcel_1.id,
                survey_type_id="RS",
                khatian_number="RS-1402",
                recorded_tenant_name="Alhaj Rafiqul Islam Chowdhury",
                dag_number="RS-2201",
                recorded_area_decimal=30.58,
                recorded_area_katha=18.50,
                remarks="Revisional Survey - Mutated and up-to-date dakhila"
            ),
            SurveyRecord(
                land_bank_id=parcel_1.id,
                survey_type_id="BS_CITY",
                khatian_number="BS-8891",
                recorded_tenant_name="Alhaj Rafiqul Islam Chowdhury & Co.",
                dag_number="BS-4410",
                recorded_area_decimal=30.58,
                recorded_area_katha=18.50,
                remarks="City Survey Dhaka - Final title published"
            )
        ]
        session.add_all(surveys_1)

        # JV Agreement for Parcel 1
        jv_1 = JVAgreement(
            land_bank_id=parcel_1.id,
            agreement_deed_no="DEED-DHK-2026-90412",
            landowner_share_percent=45.00,
            developer_share_percent=55.00,
            signing_money_total=50000000.00, # 5 Crore BDT
            tenure_months=42,
            status="ACTIVE"
        )
        session.add(jv_1)
        await session.flush()

        # JV Units - Landowner Units strictly LOCKED from Sales
        units_1 = [
            JVUnitAllocation(
                jv_agreement_id=jv_1.id,
                unit_identifier="Tower A - 3rd Floor (Unit 3A)",
                allocation_type="LANDOWNER_UNIT",
                is_locked_for_sales=True,
                allocation_notes="Permanent landowner residential flat. Strictly non-saleable."
            ),
            JVUnitAllocation(
                jv_agreement_id=jv_1.id,
                unit_identifier="Tower A - 4th Floor (Unit 4A)",
                allocation_type="LANDOWNER_UNIT",
                is_locked_for_sales=True,
                allocation_notes="Landowner daughter residential allotment. Locked for sales."
            ),
            JVUnitAllocation(
                jv_agreement_id=jv_1.id,
                unit_identifier="Tower A - 5th Floor (Unit 5A)",
                allocation_type="DEVELOPER_UNIT",
                is_locked_for_sales=False,
                allocation_notes="Open for general customer booking via CRM sales inventory."
            ),
            JVUnitAllocation(
                jv_agreement_id=jv_1.id,
                unit_identifier="Tower A - 6th Floor (Unit 6A)",
                allocation_type="DEVELOPER_UNIT",
                is_locked_for_sales=False,
                allocation_notes="Open for general customer booking."
            )
        ]
        session.add_all(units_1)

        # 2. Parcel 2: Banani Diplomatic Commercial Zone
        area_2 = convert_area_to_all_units(katha=12.0)
        parcel_2 = LandBank(
            project_code="PRJ-BANANI-COMMERCIAL",
            proposal_title="Banani Road 11 Boutique Commercial Plot",
            mouza_name="Banani C/A",
            jl_number="JL-19",
            total_area_katha=area_2["katha"],
            total_area_decimal=area_2["decimal"],
            total_area_sqft=area_2["sqft"],
            deal_type="JOINT_VENTURE",
            status="LEGAL_VETTING",
            location_description="Plot 55, Block D, Road 11, Banani, Dhaka."
        )
        session.add(parcel_2)
        await session.flush()

        lo_3 = Landowner(
            land_bank_id=parcel_2.id,
            owner_type="COMPANY",
            full_name_en="Orion Holdings BD Ltd.",
            full_name_bn="ওরিয়ন হোল্ডিংস বিডি লি.",
            tin_number="998877665544",
            phone_number="+8801911002233",
            ownership_share_ratio=1.0000,
            bank_details={"bank_name": "Standard Chartered Bank", "branch": "Gulshan", "account_no": "01-9283741-01"}
        )
        session.add(lo_3)

        surveys_2 = [
            SurveyRecord(
                land_bank_id=parcel_2.id,
                survey_type_id="SA",
                khatian_number="SA-702",
                recorded_tenant_name="Dacca Cantonment Land Registry",
                dag_number="SA-110",
                recorded_area_decimal=19.83,
                recorded_area_katha=12.00,
                remarks="SA Record under District Settlement"
            ),
            SurveyRecord(
                land_bank_id=parcel_2.id,
                survey_type_id="RS",
                khatian_number="RS-3310",
                recorded_tenant_name="Orion Holdings BD Ltd.",
                dag_number="RS-890",
                recorded_area_decimal=19.83,
                recorded_area_katha=12.00,
                remarks="RS record mutated in 2018"
            )
        ]
        session.add_all(surveys_2)

        await session.commit()
        print("Land Acquisition, Survey Records & JV Seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_land_data())
