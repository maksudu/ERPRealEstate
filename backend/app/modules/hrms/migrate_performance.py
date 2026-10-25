import asyncio
import os
import sys

from sqlalchemy import text

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from app.core.database import AsyncSessionLocal


CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS hr_performance_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    organization_id BIGINT NOT NULL,
    record_type VARCHAR(32) NOT NULL,
    reference VARCHAR(40) NOT NULL,
    employee_id BIGINT NULL,
    title VARCHAR(180) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
    fiscal_year VARCHAR(9) NULL,
    period_start DATE NULL,
    period_end DATE NULL,
    due_date DATE NULL,
    score DECIMAL(5, 2) NULL,
    details JSON NOT NULL,
    created_by_id BIGINT NULL,
    approved_by_id BIGINT NULL,
    reviewed_by_id BIGINT NULL,
    reviewed_at TIMESTAMP NULL,
    review_remarks TEXT NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hr_performance_reference (organization_id, record_type, reference),
    INDEX ix_hr_performance_org_type_status (organization_id, record_type, status),
    INDEX ix_hr_performance_org_employee (organization_id, employee_id),
    INDEX ix_hr_performance_org_fy (organization_id, fiscal_year),
    CONSTRAINT fk_hr_performance_org FOREIGN KEY (organization_id)
        REFERENCES sys_organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hr_performance_employee FOREIGN KEY (employee_id)
        REFERENCES hr_employees(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hr_performance_creator FOREIGN KEY (created_by_id)
        REFERENCES sys_users(id) ON DELETE SET NULL,
    CONSTRAINT fk_hr_performance_approver FOREIGN KEY (approved_by_id)
        REFERENCES sys_users(id) ON DELETE SET NULL,
    CONSTRAINT fk_hr_performance_reviewer FOREIGN KEY (reviewed_by_id)
        REFERENCES sys_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""


LOOKUP_SEEDS = [
    ("HR_PERF_UNIT", "Performance KPI Measurement Units", [
        ("PERCENT", "Percentage (%)", "শতাংশ (%)", "#10B981"),
        ("BDT", "BDT Currency Amount (৳)", "টাকা (৳)", "#3B82F6"),
        ("UNITS", "Volume / Units Delivered", "একক / পরিমাণ", "#6366F1"),
        ("HOURS", "Hours / Time", "ঘণ্টা", "#F59E0B"),
        ("MILESTONE", "Milestone Handover", "মাইলফলক হস্তান্তর", "#8B5CF6"),
        ("RATING", "Rating Score (1-5)", "রেটিং স্কোর (১-৫)", "#06B6D4"),
    ]),
    ("HR_PERF_CADENCE", "Performance Measurement Cadence", [
        ("MONTHLY", "Monthly Review", "মাসিক মূল্যায়ন", "#3B82F6"),
        ("QUARTERLY", "Quarterly Milestone", "ত্রৈমাসিক মাইলফলক", "#10B981"),
        ("SEMI_ANNUAL", "Semi-Annual Review", "ষাণ্মাসিক পর্যালোচনা", "#F59E0B"),
        ("ANNUAL", "Annual Appraisal Year", "বার্ষিক মূল্যায়ন বছর", "#6366F1"),
        ("PROJECT_CLOSE", "Project Closeout", "প্রকল্প সমাপ্তি", "#8B5CF6"),
    ]),
    ("HR_PERF_REVIEW_STAGE", "Appraisal Review Stages", [
        ("GOAL_SETTING", "Goal & Target Setting", "লক্ষ্য ও টার্গেট নির্ধারণ", "#3B82F6"),
        ("SELF_REVIEW", "Employee Self-Assessment", "কর্মীর স্ব-মূল্যায়ন", "#06B6D4"),
        ("MANAGER_EVAL", "Manager Evaluation", "ম্যানেজার মূল্যায়ন", "#F59E0B"),
        ("CALIBRATION", "Committee / HOD Calibration", "কমিটি / বিভাগীয় সমন্বয়", "#8B5CF6"),
        ("HR_SIGNOFF", "HR & Managing Director Signoff", "এইচআর ও ব্যবস্থাপনা পরিচালক অনুমোদন", "#10B981"),
    ]),
    ("HR_PERF_CYCLE_KIND", "Appraisal Cycle Types", [
        ("ANNUAL_APPRAISAL", "Annual Appraisal (July-June)", "বার্ষিক মূল্যায়ন (জুলাই-জুন)", "#10B981"),
        ("MID_YEAR_REVIEW", "Mid-Year Performance Review", "অর্ধ-বার্ষিক পর্যালোচনা", "#3B82F6"),
        ("PROBATION_CONFIRM", "Probation Confirmation Review", "শিক্ষানবিস স্থায়ীত্ব মূল্যায়ন", "#F59E0B"),
        ("QUARTERLY_PULSE", "Quarterly Pulse Check", "ত্রৈমাসিক পর্যালোচনা", "#6366F1"),
    ]),
    ("HR_PERF_ELIGIBLE_POPULATION", "Appraisal Eligible Populations", [
        ("ALL_PERMANENT", "All Permanent Staff", "সকল স্থায়ী কর্মকর্তা-কর্মচারী", "#10B981"),
        ("CONFIRMED_STAFF", "Confirmed Employees (> 6 Months)", "স্থায়ী কর্মী (৬ মাসের অধিক)", "#3B82F6"),
        ("SITE_ENGINEERS", "Site & Project Engineers", "সাইট ও প্রজেক্ট প্রকৌশলী", "#F59E0B"),
        ("HQ_CORPORATE", "Head Office Corporate Teams", "প্রধান কার্যালয়ের টিম", "#6366F1"),
    ]),
    ("HR_PERF_TRAINING_MODE", "Training Delivery Modes", [
        ("CLASSROOM", "In-House Classroom Workshop", "ইন-হাউজ ক্লাসরুম প্রশিক্ষণ", "#3B82F6"),
        ("SITE_PRACTICAL", "On-Site Practical & Safety Drill", "সাইটে বাস্তব ও নিরাপত্তা মহড়া", "#F59E0B"),
        ("ONLINE_LMS", "Online / Virtual Classroom", "অনলাইন / ভার্চুয়াল ক্লাস", "#06B6D4"),
        ("EXTERNAL_CERT", "External Professional Certification", "বাহ্যিক পেশাদার সনদ কোর্স", "#10B981"),
    ]),
    ("HR_PERF_COMPLETION_RESULT", "Training Completion Results", [
        ("DISTINCTION", "Completed with Distinction", "কৃতিত্বের সাথে উত্তীর্ণ", "#10B981"),
        ("PASSED", "Successfully Completed", "সফলভাবে সমাপ্ত", "#059669"),
        ("ATTENDED", "Attended (Participation Only)", "অংশগ্রহণমূলক সমাপ্তি", "#3B82F6"),
        ("INCOMPLETE", "Incomplete / Retake Required", "অসম্পূর্ণ / পুনরায় কোর্স প্রয়োজন", "#EF4444"),
    ]),
    ("HR_PERF_SKILL_PROFICIENCY", "Competency Proficiency Levels", [
        ("1_NOVICE", "1 - Fundamental / Novice", "১ - প্রাথমিক ধারণা", "#64748B"),
        ("2_DEVELOPING", "2 - Developing / Guided", "২ - উন্নয়নশীল / নির্দেশনায় সক্ষম", "#F59E0B"),
        ("3_COMPETENT", "3 - Competent / Independent", "৩ - দক্ষ / স্বাধীনভাবে কার্যকর", "#3B82F6"),
        ("4_ADVANCED", "4 - Advanced / Specialist", "৪ - উচ্চতর / বিশেষজ্ঞ", "#10B981"),
        ("5_EXPERT", "5 - Expert / Authority", "৫ - মাস্টার / শীর্ষ বিশেষজ্ঞ", "#8B5CF6"),
    ]),
    ("HR_PERF_MERIT_BAND", "Merit & Increment Bands", [
        ("BAND_APLUS", "A+ Exceptional Outperformance (12-15%)", "এ+ অসাধারণ পারফরম্যান্স (১২-১৫%)", "#10B981"),
        ("BAND_A", "A Exceeds Expectations (8-10%)", "এ প্রত্যাশার চেয়ে ভালো (৮-১০%)", "#059669"),
        ("BAND_B", "B Meets Expectations (5-7%)", "বি প্রত্যাশা অনুযায়ী (৫-৭%)", "#3B82F6"),
        ("BAND_C", "C Needs Improvement (0-3%)", "সি মানোন্নয়ন প্রয়োজন (০-৩%)", "#F59E0B"),
    ]),
    ("HR_PERF_PROMOTION_GRADE", "Promotion Grade Bands", [
        ("GRADE_EXEC", "Grade 1 - Executive / Officer", "গ্রেড ১ - এক্সিকিউটিভ / কর্মকর্তা", "#3B82F6"),
        ("GRADE_SREXEC", "Grade 2 - Senior Executive / Engineer", "গ্রেড ২ - সিনিয়র এক্সিকিউটিভ / প্রকৌশলী", "#10B981"),
        ("GRADE_AM", "Grade 3 - Assistant Manager", "গ্রেড ৩ - সহকারী ব্যবস্থাপক", "#8B5CF6"),
        ("GRADE_MGR", "Grade 4 - Manager / Project Lead", "গ্রেড ৪ - ব্যবস্থাপক / প্রকল্প প্রধান", "#F59E0B"),
        ("GRADE_SRMGR", "Grade 5 - Senior Manager / AGM", "গ্রেড ৫ - সিনিয়র ম্যানেজার / এজিএম", "#EC4899"),
        ("GRADE_DGM_GM", "Grade 6 - DGM / General Manager", "গ্রেড ৬ - ডিজিএম / জিএম", "#EF4444"),
    ]),
    ("HR_PERFORMANCE_STATUS", "Performance Record Statuses", [
        ("DRAFT", "Draft", "খসড়া", "#64748B"),
        ("SUBMITTED", "Submitted for Review", "দাখিলকৃত", "#3B82F6"),
        ("APPROVED", "Approved", "অনুমোদিত", "#10B981"),
        ("REJECTED", "Rejected", "প্রত্যাখ্যাত", "#EF4444"),
        ("RETURNED", "Returned for Revision", "পুনর্বিবেচনার জন্য প্রেরিত", "#F59E0B"),
    ]),
    ("HR_FISCAL_YEAR", "Bangladesh Financial Years", [
        ("2024-25", "FY 2024-25 (July 2024 – June 2025)", "অর্থবছর ২০২৪-২৫", "#3B82F6"),
        ("2025-26", "FY 2025-26 (July 2025 – June 2026)", "অর্থবছর ২০২৫-২৬", "#10B981"),
        ("2026-27", "FY 2026-27 (July 2026 – June 2027)", "অর্থবছর ২০২৬-২৭", "#F59E0B"),
        ("2027-28", "FY 2027-28 (July 2027 – June 2028)", "অর্থবছর ২০২৭-২৮", "#8B5CF6"),
    ]),
    ("HR_PERF_SKILL_NAME", "Core Technical & Management Competencies", [
        ("AUTOCAD_3D", "AutoCAD & Civil 3D", "অটোক্যাড ও সিভিল থ্রিডি", "#3B82F6"),
        ("ETABS_STRUCT", "ETABS & Structural Design", "ইট্যাবস ও স্ট্রাকচারাল ডিজাইন", "#10B981"),
        ("PROJECT_SCHED", "Primavera P6 & Project Scheduling", "প্রজেক্ট সময়সূচি ও পি৬", "#F59E0B"),
        ("SITE_SAFETY", "Site Safety & OSHA Compliance", "সাইট নিরাপত্তা ও ওশা কমপ্লায়েন্স", "#EF4444"),
        ("PROCUREMENT_COST", "BOQ Cost Estimation & Tendering", "বিওকিউ ব্যয় প্রাক্কলন ও দরপত্র", "#8B5CF6"),
        ("QUALITY_CONC", "Concrete Testing & Quality Audit", "কংক্রিট পরীক্ষা ও মান নিয়ন্ত্রণ", "#06B6D4"),
        ("PEOPLE_LEAD", "Site Team Leadership & Conflict Resolution", "টিম নেতৃত্ব ও বিরোধ নিষ্পত্তি", "#EC4899"),
    ]),
    ("HR_SEPARATION_TYPE", "Workforce Separation Types", [
        ("RESIGNATION", "Voluntary Resignation", "স্বেচ্ছায় পদত্যাগ", "#3B82F6"),
        ("TERMINATION", "Statutory Employer Termination", "সংবিধিবদ্ধ বরখাস্তকরণ", "#EF4444"),
        ("RETIREMENT", "Normal Age Retirement", "স্বাভাবিক অবসর গ্রহণ", "#10B981"),
        ("CONTRACT_END", "Contract Expiration", "চুক্তিভিত্তিক মেয়াদ সমাপ্তি", "#F59E0B"),
        ("MUTUAL_SEPARATION", "Mutual Separation Agreement", "পারস্পরিক সমঝোতামূলক বিচ্ছেদ", "#8B5CF6"),
    ]),
    ("HR_CLEARANCE_STATUS", "Clearance Verification Status", [
        ("PENDING", "Pending Verification", "অপেক্ষমান", "#F59E0B"),
        ("CLEARED", "Cleared & Verified", "ছাড়পত্র সম্পন্ন", "#10B981"),
        ("DISPUTED", "Disputed / Unresolved", "বকেয়া বা আপত্তি রয়েছে", "#EF4444"),
    ]),
    ("HR_SEPARATION_APPROVAL_STATUS", "Separation Settlement Approval Status", [
        ("PENDING", "Pending Review & Signoff", "অনুমোদনের অপেক্ষায়", "#F59E0B"),
        ("APPROVED", "Approved & Cleared for Disbursal", "অনুমোদিত ও পরিশোধযোগ্য", "#10B981"),
        ("REJECTED", "Rejected / Settlement Returned", "প্রত্যাখ্যাত", "#EF4444"),
    ]),
    ("HR_SEPARATION_RECORD_STATUS", "Separation Record Statuses", [
        ("ACTIVE", "Active Case", "সক্রিয় কেস", "#3B82F6"),
        ("IN_REVIEW", "In Departmental Review", "পর্যালোচনাধীন", "#F59E0B"),
        ("COMPLETED", "Settled & Closed", "নিষ্পন্ন ও সমাপ্ত", "#10B981"),
        ("CANCELLED", "Cancelled / Withdrawn", "বাতিলকৃত / প্রত্যাহার", "#64748B"),
    ]),
]


async def migrate():
    async with AsyncSessionLocal() as session:
        await session.execute(text(CREATE_TABLE))
        await session.commit()
        print("hr_performance_records table verified.")

        for cat_code, cat_name, items in LOOKUP_SEEDS:
            cat_res = await session.execute(
                text("SELECT id FROM sys_lookup_categories WHERE category_code = :code"),
                {"code": cat_code},
            )
            cat_row = cat_res.fetchone()
            if not cat_row:
                await session.execute(
                    text("""
                        INSERT INTO sys_lookup_categories (category_code, category_name, description, is_hierarchical, is_system_locked, is_active)
                        VALUES (:code, :name, :name, FALSE, FALSE, TRUE)
                    """),
                    {"code": cat_code, "name": cat_name},
                )
                await session.commit()
                cat_res = await session.execute(
                    text("SELECT id FROM sys_lookup_categories WHERE category_code = :code"),
                    {"code": cat_code},
                )
                cat_id = cat_res.scalar_one()
            else:
                cat_id = cat_row[0]

            for idx, item in enumerate(items):
                item_code, name_en, name_bn, color = item
                item_chk = await session.execute(
                    text("SELECT id FROM sys_lookup_items WHERE category_id = :cat_id AND item_code = :code"),
                    {"cat_id": cat_id, "code": item_code},
                )
                if not item_chk.fetchone():
                    await session.execute(
                        text("""
                            INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, color_badge, sort_order, is_default, is_active)
                            VALUES (:cat_id, :code, :name_en, :name_bn, :color, :sort, FALSE, TRUE)
                        """),
                        {"cat_id": cat_id, "code": item_code, "name_en": name_en, "name_bn": name_bn, "color": color, "sort": idx + 1},
                    )
        await session.commit()
        print("Performance dynamic lookups successfully seeded.")


if __name__ == "__main__":
    asyncio.run(migrate())
