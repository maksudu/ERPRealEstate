import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from datetime import date, timedelta
from sqlalchemy import select, func, text
from app.core.database import engine, Base, AsyncSessionLocal
import app.modules.construction.models
import app.modules.projects.models
from app.modules.projects.models import Project, ProjectProfitability, ProjectMilestone

async def run_migration_and_seed():
    print("Migrating prj_profitability_forecasts and prj_milestones tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created/verified.")

    async with AsyncSessionLocal() as session:
        # Check projects
        p1 = (await session.execute(select(Project).where(Project.project_code == "PRJ-2026-001"))).scalar_one_or_none()
        p2 = (await session.execute(select(Project).where(Project.project_code == "PRJ-2026-002"))).scalar_one_or_none()

        if not p1 or not p2:
            print("Default projects not found. Listing available projects:")
            all_p = (await session.execute(select(Project))).scalars().all()
            for p in all_p:
                print(f"Project ID {p.id}: {p.project_code} - {p.project_name}")
            if all_p:
                p1 = all_p[0]
                p2 = all_p[1] if len(all_p) > 1 else all_p[0]
            else:
                print("No projects exist in DB. Please run project seed first.")
                return

        # 1. Seed Submodule 2.6 Profitability Forecasts
        p1_roi = (await session.execute(select(ProjectProfitability).where(ProjectProfitability.project_id == p1.id))).scalars().all()
        if not p1_roi:
            print(f"Seeding ROI & Profitability forecasts for Project: {p1.project_name}...")
            f1 = ProjectProfitability(
                project_id=p1.id,
                forecast_code=f"{p1.project_code}-PRF-01",
                version_label="Base Case Financial Model V1.0",
                calculation_date=date(2026, 1, 15),
                apartment_revenue_est=350000000.0,
                shop_revenue_est=75000000.0,
                office_revenue_est=50000000.0,
                parking_revenue_est=20000000.0,
                other_revenue_est=5000000.0,
                total_estimated_revenue=500000000.0,
                jv_sharing_ratio="50:50",
                developer_share_pct=50.0,
                landowner_share_pct=50.0,
                developer_revenue_share_bdt=250000000.0,
                landowner_revenue_share_bdt=250000000.0,
                construction_cost_est=120000000.0,
                consultant_fee_est=12000000.0,
                marketing_sales_cost_est=15000000.0,
                admin_overhead_est=10000000.0,
                financing_interest_cost_est=18000000.0,
                contingency_cost_est=8000000.0,
                total_project_cost_est=183000000.0,
                defined_investment_base_type="EQUITY_INVESTED",
                defined_investment_base_bdt=183000000.0,
                estimated_project_profit=67000000.0,
                gross_profit_margin_pct=26.8,
                breakeven_sales_revenue=195000000.0,
                breakeven_units_sqft=24000.0,
                roi_pct=36.61,
                recognized_revenue=120000000.0,
                recognized_project_expenses=85000000.0,
                actual_project_profit=35000000.0,
                actual_roi_pct=19.13,
                committed_costs=98000000.0,
                posted_expenses=82000000.0,
                cost_to_complete_forecast=85000000.0,
                revised_completion_date=date(2028, 12, 31),
                scenario_price_increase_pct=5.0,
                scenario_sales_delay_months=3,
                scenario_cost_overrun_pct=4.0,
                scenario_modeled_profit_bdt=64500000.0,
                scenario_modeled_roi_pct=35.24,
                collection_schedule_json=[
                    {"milestone": "Booking & Agreement (20%)", "expected_amount": 50000000.0, "realized_amount": 50000000.0, "status": "RECEIVED"},
                    {"milestone": "Piling & Substructure (25%)", "expected_amount": 62500000.0, "realized_amount": 55000000.0, "status": "IN_PROGRESS"},
                    {"milestone": "Superstructure RCC Casting (35%)", "expected_amount": 87500000.0, "realized_amount": 15000000.0, "status": "PENDING"},
                    {"milestone": "Finishing & Handover (20%)", "expected_amount": 50000000.0, "realized_amount": 0.0, "status": "PENDING"}
                ],
                status="ACTIVE_FORECAST",
                remarks="Baseline JV financial model approved by Executive Investment Board"
            )
            session.add(f1)

            if p2:
                f2 = ProjectProfitability(
                    project_id=p2.id,
                    forecast_code=f"{p2.project_code}-PRF-01",
                    version_label="Prime Tower Commercial Projections V2.1",
                    calculation_date=date(2026, 2, 1),
                    apartment_revenue_est=420000000.0,
                    shop_revenue_est=180000000.0,
                    office_revenue_est=110000000.0,
                    parking_revenue_est=35000000.0,
                    other_revenue_est=5000000.0,
                    total_estimated_revenue=750000000.0,
                    jv_sharing_ratio="55:45",
                    developer_share_pct=55.0,
                    landowner_share_pct=45.0,
                    developer_revenue_share_bdt=412500000.0,
                    landowner_revenue_share_bdt=337500000.0,
                    construction_cost_est=210000000.0,
                    consultant_fee_est=18000000.0,
                    marketing_sales_cost_est=22000000.0,
                    admin_overhead_est=14000000.0,
                    financing_interest_cost_est=25000000.0,
                    contingency_cost_est=11000000.0,
                    total_project_cost_est=300000000.0,
                    defined_investment_base_type="TOTAL_PROJECT_INVESTMENT",
                    defined_investment_base_bdt=300000000.0,
                    estimated_project_profit=112500000.0,
                    gross_profit_margin_pct=27.27,
                    breakeven_sales_revenue=315000000.0,
                    breakeven_units_sqft=38000.0,
                    roi_pct=37.5,
                    recognized_revenue=150000000.0,
                    recognized_project_expenses=110000000.0,
                    actual_project_profit=40000000.0,
                    actual_roi_pct=13.33,
                    committed_costs=145000000.0,
                    posted_expenses=105000000.0,
                    cost_to_complete_forecast=155000000.0,
                    revised_completion_date=date(2029, 6, 30),
                    scenario_price_increase_pct=7.5,
                    scenario_sales_delay_months=2,
                    scenario_cost_overrun_pct=5.0,
                    scenario_modeled_profit_bdt=118000000.0,
                    scenario_modeled_roi_pct=39.33,
                    collection_schedule_json=[
                        {"milestone": "Pre-Launch Sales Tranche 1", "expected_amount": 100000000.0, "realized_amount": 95000000.0, "status": "RECEIVED"},
                        {"milestone": "Excavation & Shoring Complete", "expected_amount": 80000000.0, "realized_amount": 55000000.0, "status": "IN_PROGRESS"},
                        {"milestone": "Floor 1-10 Structural Slab Castings", "expected_amount": 150000000.0, "realized_amount": 0.0, "status": "PENDING"},
                        {"milestone": "Completion & Fit-out Handover", "expected_amount": 82500000.0, "realized_amount": 0.0, "status": "PENDING"}
                    ],
                    status="ACTIVE_FORECAST",
                    remarks="Commercial tower investment model incorporating high-yield retail frontage"
                )
                session.add(f2)
            await session.commit()
            print("Submodule 2.6 ROI forecasts seeded.")

        # 2. Seed Submodule 2.7 Milestones (All 15 standard milestones)
        p1_ms = (await session.execute(select(ProjectMilestone).where(ProjectMilestone.project_id == p1.id))).scalars().all()
        if not p1_ms:
            print(f"Seeding 15 standard timeline milestones for Project: {p1.project_name}...")
            start = date(2026, 1, 1)

            milestone_specs = [
                (1, "Project Feasibility Approval", "FEASIBILITY_APPROVAL", "PRE_CONSTRUCTION", 0, 30, True, 4.0, 100.0, 100.0, "COMPLETED", "Business Planning & Finance", "Engr. Tanvir Ahmed", "Arch. Masudul Karim"),
                (2, "Land Acquisition and Possession", "LAND_ACQUISITION", "PRE_CONSTRUCTION", 25, 70, True, 8.0, 100.0, 100.0, "COMPLETED", "Land Management & Legal", "Advocate Kamrul Islam", "Mustafa Rahman"),
                (3, "Architectural Concept Approval", "ARCHITECTURAL_CONCEPT", "PRE_CONSTRUCTION", 60, 110, False, 5.0, 100.0, 95.0, "COMPLETED", "Design & Architecture", "Arch. Masudul Karim", "Engr. Tanvir Ahmed"),
                (4, "Authority Submission and Approval (RAJUK)", "AUTHORITY_APPROVAL", "REGULATORY", 100, 180, True, 7.0, 100.0, 100.0, "COMPLETED", "Permits & Compliance", "Liaison Officer S. Haque", "Mustafa Rahman"),
                (5, "Detailed Engineering Design", "DETAILED_ENGINEERING", "PRE_CONSTRUCTION", 160, 240, True, 6.0, 100.0, 90.0, "COMPLETED", "Structural & Civil Engineering", "Engr. Rezaul Kabir", "Engr. Tanvir Ahmed"),
                (6, "Contractor Selection and Contract Award", "CONTRACTOR_AWARD", "PROCUREMENT", 220, 270, True, 5.0, 100.0, 100.0, "COMPLETED", "Procurement & Contracts", "Head of Procurement", "Mustafa Rahman"),
                (7, "Site Preparation and Excavation", "SITE_PREP_EXCAVATION", "CIVIL_STRUCTURE", 260, 320, True, 6.0, 100.0, 100.0, "COMPLETED", "Engineering & Civil Projects", "Engr. Ashraful Islam", "Engr. Rezaul Kabir"),
                (8, "Foundation and Piling (Cast-in-situ Piles)", "FOUNDATION_PILING", "CIVIL_STRUCTURE", 300, 420, True, 12.0, 85.0, 90.0, "IN_PROGRESS", "Engineering & Civil Projects", "Engr. Ashraful Islam", "Engr. Rezaul Kabir"),
                (9, "Structural Construction (Sub & Superstructure)", "STRUCTURAL_CONSTRUCTION", "CIVIL_STRUCTURE", 400, 680, True, 20.0, 30.0, 45.0, "IN_PROGRESS", "Engineering & Civil Projects", "Engr. Ashraful Islam", "Engr. Rezaul Kabir"),
                (10, "Masonry and Internal Partitions", "MASONRY_PARTITIONS", "CIVIL_STRUCTURE", 640, 780, False, 7.0, 0.0, 0.0, "PENDING", "Engineering & Civil Projects", "Engr. Nayeem Siddiqui", "Engr. Ashraful Islam"),
                (11, "Electrical, Plumbing and Mechanical Installations (MEP)", "MEP_INSTALLATIONS", "MEP_FINISHING", 720, 880, True, 8.0, 0.0, 0.0, "PENDING", "MEP & Services", "Engr. Forhad Hossain", "Engr. Rezaul Kabir"),
                (12, "Plastering, Flooring and Finishing", "PLASTERING_FINISHING", "MEP_FINISHING", 820, 980, False, 7.0, 0.0, 0.0, "PENDING", "Finishing & Interiors", "Engr. Nayeem Siddiqui", "Engr. Ashraful Islam"),
                (13, "Lift, Fire-Safety and Utility Installations", "LIFT_FIRE_UTILITY", "MEP_FINISHING", 920, 1060, True, 5.0, 0.0, 0.0, "PENDING", "MEP & Services", "Engr. Forhad Hossain", "Engr. Rezaul Kabir"),
                (14, "Testing, Inspections and Rectification (QA/QC)", "TESTING_INSPECTIONS", "COMMISSIONING", 1040, 1120, True, 4.0, 0.0, 0.0, "PENDING", "Quality Assurance & QC", "QC Lead Engr. Bashir", "Engr. Tanvir Ahmed"),
                (15, "Completion Documentation and Handover", "COMPLETION_HANDOVER", "COMMISSIONING", 1100, 1160, True, 2.0, 0.0, 0.0, "PENDING", "Customer Service & Handover", "CRM Operations Lead", "Mustafa Rahman"),
            ]

            for num, name, ref, cat, s_days, f_days, is_cp, weight, phys_p, fin_p, st, dept, resp, sup in milestone_specs:
                p_start = start + timedelta(days=s_days)
                p_finish = start + timedelta(days=f_days)
                b_start = p_start
                b_finish = p_finish
                a_start = p_start if st in ["COMPLETED", "IN_PROGRESS"] else None
                a_finish = p_finish if st == "COMPLETED" else None

                ms = ProjectMilestone(
                    project_id=p1.id,
                    milestone_code=f"{p1.project_code}-MLS-{num:02d}",
                    milestone_number=num,
                    milestone_name=name,
                    standard_milestone_ref=ref,
                    category=cat,
                    planned_start_date=p_start,
                    planned_finish_date=p_finish,
                    baseline_start_date=b_start,
                    baseline_finish_date=b_finish,
                    actual_start_date=a_start,
                    actual_finish_date=a_finish,
                    assigned_department=dept,
                    contractor_name="Apex Construction & Civil Consortium Ltd." if num >= 7 else None,
                    responsible_person=resp,
                    supervisor_name=sup,
                    is_critical_path=is_cp,
                    weightage_percent=weight,
                    physical_progress_pct=phys_p,
                    financial_progress_pct=fin_p,
                    delay_days=5 if num == 8 else 0,
                    delay_reason="Subsoil sand stratum stabilization during heavy monsoon showers" if num == 8 else None,
                    recovery_plan="Additional night shifts deployed with 2 rotary drilling rigs" if num == 8 else None,
                    escalation_level="LOW" if num == 8 else "NONE",
                    supervisor_verification="VERIFIED" if st == "COMPLETED" else "PENDING",
                    status=st,
                    remarks=f"Phase {num}: {name} schedule tracking"
                )
                session.add(ms)

            await session.commit()
            print("Submodule 2.7 Standard 15 Milestones seeded.")

    print("Migration and seed completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration_and_seed())
