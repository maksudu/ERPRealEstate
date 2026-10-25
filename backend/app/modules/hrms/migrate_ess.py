import asyncio
import os
import sys

from sqlalchemy import text

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from app.core.database import AsyncSessionLocal


CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS hr_ess_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    organization_id BIGINT NOT NULL,
    employee_id BIGINT NULL,
    record_type VARCHAR(32) NOT NULL,
    reference VARCHAR(40) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    description TEXT NULL,
    amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    record_date DATE NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    priority VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
    attachment_url VARCHAR(255) NULL,
    extra_info VARCHAR(255) NULL,
    created_by_id BIGINT NULL,
    approved_by_id BIGINT NULL,
    approval_remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hr_ess_reference (organization_id, record_type, reference),
    INDEX ix_hr_ess_org_type_status (organization_id, record_type, status),
    INDEX ix_hr_ess_org_employee (organization_id, employee_id),
    CONSTRAINT fk_hr_ess_org FOREIGN KEY (organization_id)
        REFERENCES sys_organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hr_ess_employee FOREIGN KEY (employee_id)
        REFERENCES hr_employees(id) ON DELETE SET NULL,
    CONSTRAINT fk_hr_ess_creator FOREIGN KEY (created_by_id)
        REFERENCES sys_users(id) ON DELETE SET NULL,
    CONSTRAINT fk_hr_ess_approver FOREIGN KEY (approved_by_id)
        REFERENCES sys_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""

LOOKUP_SEEDS = [
    ("HR_LEAVE_TYPE", "Employee Leave Types", [
        ("CASUAL", "Casual Leave (CL)", "নৈমিত্তিক ছুটি", "#10B981"),
        ("SICK", "Sick / Medical Leave (SL)", "অসুস্থতাজনিত ছুটি", "#3B82F6"),
        ("EARNED", "Earned / Annual Leave (EL)", "অর্জিত ছুটি", "#6366F1"),
        ("MATERNITY", "Maternity Leave", "মাতৃত্বকালীন ছুটি", "#EC4899"),
        ("PATERNITY", "Paternity Leave", "পিতৃত্বকালীন ছুটি", "#8B5CF6"),
        ("COMPENSATORY", "Compensatory Leave", "বিকল্প ছুটি", "#F59E0B")
    ]),
    ("HR_EXPENSE_CATEGORY", "ESS Field & Office Expense Categories", [
        ("TRAVEL_CONVEYANCE", "Conveyance & Local Travel", "স্থানীয় যাতায়াত ভাতা", "#3B82F6"),
        ("SITE_VISIT_FUEL", "Project Site Visit & Fuel", "প্রকল্প পরিদর্শন ও জ্বালানি", "#10B981"),
        ("CLIENT_ENTERTAINMENT", "Client Meeting & Refreshment", "গ্রাহক আপ্যায়ন", "#F59E0B"),
        ("MOBILE_INTERNET", "Official Mobile & Internet", "মোবাইল ও ইন্টারনেট বিল", "#6366F1"),
        ("OFFICE_SUPPLIES", "Site Office Supplies & Stationery", "সাইট স্টেশনারি ও সরবরাহ", "#06B6D4"),
        ("TRAINING_CERTIFICATION", "Training & Certification Fee", "প্রশিক্ষণ ও সনদ ফি", "#8B5CF6")
    ]),
    ("HR_LOAN_TYPE", "ESS Staff Loan & Advance Types", [
        ("WELFARE_LOAN", "Staff Welfare Loan", "কল্যাণমূলক ঋণ", "#10B981"),
        ("FESTIVAL_ADVANCE", "Eid / Festival Salary Advance", "উৎসব অগ্রিম বেতন", "#F59E0B"),
        ("EMERGENCY_MEDICAL_LOAN", "Emergency Medical Treatment Loan", "জরুরি চিকিৎসা ঋণ", "#EF4444"),
        ("HOUSING_ADVANCE", "Housing / Relocation Advance", "বাসা স্থানান্তর অগ্রিম", "#3B82F6")
    ]),
    ("HR_DOCUMENT_TYPE", "Digital Document Locker Types", [
        ("NID_CARD", "National ID Card (NID)", "জাতীয় পরিচয়পত্র", "#3B82F6"),
        ("APPOINTMENT_LETTER", "Official Appointment Letter", "নিয়োগপত্র", "#10B981"),
        ("EDUCATIONAL_CERTIFICATE", "Academic Degrees / Certificates", "শিক্ষাগত সনদপত্র", "#6366F1"),
        ("DRIVING_LICENSE", "Driving License", "ড্রাইভিং লাইসেন্স", "#F59E0B"),
        ("TIN_TAX_CERTIFICATE", "E-TIN Certificate & Form 108", "ই-টিন সার্টিফিকেট", "#06B6D4"),
        ("PASSPORT", "Passport Copy", "পাসপোর্ট কপি", "#8B5CF6"),
        ("NOMINEE_DOC", "Nominee Declaration & Photo", "নমিনী প্রত্যয়নপত্র", "#EC4899")
    ]),
    ("HR_HELPDESK_CATEGORY", "ESS Helpdesk Ticket Categories", [
        ("ATTENDANCE_DISPUTE", "Biometric Punch / Attendance Regularization", "উপস্থিতি সংশোধন", "#EF4444"),
        ("PAYSLIP_QUERY", "Salary Slip & Tax Deduction Query", "বেতন ও কর সংক্রান্ত জিজ্ঞাসা", "#F59E0B"),
        ("PF_GRATUITY", "Provident Fund & Gratuity Statement", "পিএফ ও গ্র্যাচুইটি তথ্য", "#3B82F6"),
        ("IT_EQUIPMENT", "Laptop / Desktop / Peripheral Request", "আইটি সরঞ্জাম সহায়তা", "#10B981"),
        ("SOFTWARE_ACCESS", "ERP & Email Login Credentials", "সফটওয়্যার ও ইমেইল এক্সেস", "#6366F1"),
        ("WORKPLACE_SAFETY", "Workplace Safety & Admin Facilities", "কর্মক্ষেত্রের নিরাপত্তা ও সুবিধা", "#06B6D4")
    ]),
    ("HR_HELPDESK_PRIORITY", "Ticket Priority Levels", [
        ("LOW", "Low Priority", "স্বল্প অগ্রাধিকার", "#64748B"),
        ("MEDIUM", "Medium Priority", "মাঝারি অগ্রাধিকার", "#3B82F6"),
        ("HIGH", "High Priority", "উচ্চ অগ্রাধিকার", "#F59E0B"),
        ("URGENT", "Urgent / Escalated", "জরুরি", "#EF4444")
    ]),
    ("HR_ESS_STATUS", "ESS Record Status", [
        ("PENDING", "Pending Review", "বিবেচনাধীন", "#F59E0B"),
        ("APPROVED", "Approved", "অনুমোদিত", "#10B981"),
        ("RESOLVED", "Resolved / Completed", "নিষ্পন্ন", "#3B82F6"),
        ("ACTIVE", "Active / Issued", "সক্রিয়", "#06B6D4"),
        ("REJECTED", "Rejected", "প্রত্যাখ্যাত", "#EF4444")
    ])
]


async def migrate():
    async with AsyncSessionLocal() as session:
        print("[MIGRATE] Creating hr_ess_records table...")
        await session.execute(text(CREATE_TABLE))
        await session.commit()
        print("[MIGRATE] Table hr_ess_records created or verified.")

        # Seed Lookups
        for group_code, group_name, items in LOOKUP_SEEDS:
            res = await session.execute(
                text("SELECT id FROM sys_lookup_categories WHERE category_code = :code"),
                {"code": group_code}
            )
            cat_row = res.fetchone()
            if not cat_row:
                await session.execute(
                    text("""
                        INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active, created_at, updated_at)
                        VALUES (:code, :name, :name, 1, NOW(), NOW())
                    """),
                    {"code": group_code, "name": group_name}
                )
                await session.commit()
                res = await session.execute(
                    text("SELECT id FROM sys_lookup_categories WHERE category_code = :code"),
                    {"code": group_code}
                )
                cat_row = res.fetchone()
            
            cat_id = cat_row[0]
            for order_idx, (val, lbl_en, lbl_bn, color) in enumerate(items, 1):
                exist_item = await session.execute(
                    text("SELECT id FROM sys_lookup_items WHERE category_id = :cat_id AND item_code = :val"),
                    {"cat_id": cat_id, "val": val}
                )
                if not exist_item.fetchone():
                    await session.execute(
                        text("""
                            INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, color_badge, sort_order, is_active, created_at, updated_at)
                            VALUES (:cat_id, :val, :en, :bn, :color, :ord, 1, NOW(), NOW())
                        """),
                        {"cat_id": cat_id, "val": val, "en": lbl_en, "bn": lbl_bn, "color": color, "ord": order_idx}
                    )
            await session.commit()
            print(f"[LOOKUP] Seeded {group_code}")

        # Ensure user_id link on employees
        await session.execute(text("UPDATE hr_employees SET user_id = 1 WHERE id = 21 AND user_id IS NULL"))
        await session.execute(text("UPDATE hr_employees SET user_id = 2 WHERE id = 24 AND user_id IS NULL"))
        await session.execute(text("UPDATE hr_employees SET user_id = 3 WHERE id = 23 AND user_id IS NULL"))
        await session.execute(text("UPDATE hr_employees SET user_id = 4 WHERE id = 22 AND user_id IS NULL"))
        await session.commit()

        # Seed sample notices and circulars if none
        res_notices = await session.execute(
            text("SELECT COUNT(*) FROM hr_ess_records WHERE record_type = 'notices'")
        )
        if (res_notices.scalar() or 0) == 0:
            sample_notices = [
                ("NOT-2026-001", "Durga Puja & Eid-ul-Fitr Office Holiday Schedule 2026", "HOLIDAY_NOTICE", "All corporate headquarters and project site offices will remain closed from Oct 28 to Nov 02, 2026 for public holidays.", 0.00, "2026-10-15", "ACTIVE", "HIGH"),
                ("NOT-2026-002", "Annual Performance Appraisal & Merit Bonus Policy 2026-27", "HR_POLICY", "Department heads and team leads are requested to finalize employee KPI evaluations before Nov 15 for Q4 incentive payouts.", 0.00, "2026-10-12", "ACTIVE", "MEDIUM"),
                ("NOT-2026-003", "Mandatory HSE Helmet & Safety Boots on All Construction Sites", "SAFETY_COMPLIANCE", "Strict occupational safety protocol: Any personnel entering Grand Emerald Tower or Horizon site must wear yellow safety helmet and high-visibility vest.", 0.00, "2026-10-08", "ACTIVE", "URGENT")
            ]
            for ref, title, cat, desc, amt, dt, st, pri in sample_notices:
                await session.execute(
                    text("""
                        INSERT INTO hr_ess_records (organization_id, employee_id, record_type, reference, title, category, description, amount, record_date, status, priority, extra_info, created_at, updated_at)
                        VALUES (1, 21, 'notices', :ref, :title, :cat, :desc, :amt, :dt, :st, :pri, 'Issued by Corporate HR', NOW(), NOW())
                    """),
                    {"ref": ref, "title": title, "cat": cat, "desc": desc, "amt": amt, "dt": dt, "st": st, "pri": pri}
                )
            await session.commit()
            print("[ESS] Seeded sample official notices")

        # Seed sample helpdesk tickets for Employee 21 if none
        res_hd = await session.execute(
            text("SELECT COUNT(*) FROM hr_ess_records WHERE record_type = 'helpdesk' AND employee_id = 21")
        )
        if (res_hd.scalar() or 0) == 0:
            sample_hd = [
                ("HD-2026-001", "Biometric Punch Regularization for Site Visit Oct 14", "ATTENDANCE_DISPUTE", "Was at Grand Emerald site meeting during morning shift punch. In-time 09:15 AM requested.", 0.00, "2026-10-14", "RESOLVED", "MEDIUM"),
                ("HD-2026-002", "Form 108 Tax Exemption Certificate Copy Request", "PAYSLIP_QUERY", "Need attested copy of Tax Deduction at Source (TDS) statement for TIN tax filing.", 0.00, "2026-10-18", "PENDING", "HIGH")
            ]
            for ref, title, cat, desc, amt, dt, st, pri in sample_hd:
                await session.execute(
                    text("""
                        INSERT INTO hr_ess_records (organization_id, employee_id, record_type, reference, title, category, description, amount, record_date, status, priority, extra_info, created_at, updated_at)
                        VALUES (1, 21, 'helpdesk', :ref, :title, :cat, :desc, :amt, :dt, :st, :pri, 'Support Desk Ticket', NOW(), NOW())
                    """),
                    {"ref": ref, "title": title, "cat": cat, "desc": desc, "amt": amt, "dt": dt, "st": st, "pri": pri}
                )
            await session.commit()
            print("[ESS] Seeded sample helpdesk tickets")

        # Seed sample expense claims for Employee 21 if none
        res_exp = await session.execute(
            text("SELECT COUNT(*) FROM hr_ess_records WHERE record_type = 'expense-claims' AND employee_id = 21")
        )
        if (res_exp.scalar() or 0) == 0:
            sample_exp = [
                ("EXP-2026-001", "Bashundhara Site Soil Testing Travel & Refreshment", "TRAVEL_CONVEYANCE", "Conveyance by Uber and refreshment for soil test inspection team.", 3450.00, "2026-10-15", "APPROVED", "MEDIUM"),
                ("EXP-2026-002", "Monthly Official Mobile & Internet Bill Oct 2026", "MOBILE_INTERNET", "Reimbursement for corporate data package and customer calling.", 1500.00, "2026-10-20", "PENDING", "LOW")
            ]
            for ref, title, cat, desc, amt, dt, st, pri in sample_exp:
                await session.execute(
                    text("""
                        INSERT INTO hr_ess_records (organization_id, employee_id, record_type, reference, title, category, description, amount, record_date, status, priority, extra_info, created_at, updated_at)
                        VALUES (1, 21, 'expense-claims', :ref, :title, :cat, :desc, :amt, :dt, :st, :pri, 'Accounts Voucher Verified', NOW(), NOW())
                    """),
                    {"ref": ref, "title": title, "cat": cat, "desc": desc, "amt": amt, "dt": dt, "st": st, "pri": pri}
                )
            await session.commit()
            print("[ESS] Seeded sample expense claims")

        # Seed sample documents for Employee 21 if none
        res_doc = await session.execute(
            text("SELECT COUNT(*) FROM hr_ess_records WHERE record_type = 'my-documents' AND employee_id = 21")
        )
        if (res_doc.scalar() or 0) == 0:
            sample_doc = [
                ("DOC-2026-001", "Bangladesh Smart National ID Card (NID)", "NID_CARD", "Verified NID copy with hologram for security clearance.", 0.00, "2026-01-15", "ACTIVE", "HIGH"),
                ("DOC-2026-002", "Apex Real Estate Official Appointment Letter", "APPOINTMENT_LETTER", "Signed joining appointment letter and NDA.", 0.00, "2024-03-01", "ACTIVE", "HIGH"),
                ("DOC-2026-003", "B.Sc Civil Engineering Degree Certificate - BUET", "EDUCATIONAL_CERTIFICATE", "Attested original academic certificate and grade transcripts.", 0.00, "2024-03-01", "ACTIVE", "MEDIUM")
            ]
            for ref, title, cat, desc, amt, dt, st, pri in sample_doc:
                await session.execute(
                    text("""
                        INSERT INTO hr_ess_records (organization_id, employee_id, record_type, reference, title, category, description, amount, record_date, status, priority, extra_info, created_at, updated_at)
                        VALUES (1, 21, 'my-documents', :ref, :title, :cat, :desc, :amt, :dt, :st, :pri, 'Verified by HR Admin', NOW(), NOW())
                    """),
                    {"ref": ref, "title": title, "cat": cat, "desc": desc, "amt": amt, "dt": dt, "st": st, "pri": pri}
                )
            await session.commit()
            print("[ESS] Seeded sample documents")

        # Seed sample leave application for Employee 21 if none
        res_lv = await session.execute(
            text("SELECT COUNT(*) FROM hr_leave_applications WHERE employee_id = 21")
        )
        if (res_lv.scalar() or 0) == 0:
            await session.execute(
                text("""
                    INSERT INTO hr_leave_applications (organization_id, employee_id, leave_type, start_date, end_date, total_days, reason, status, is_paid, is_half_day, created_at, updated_at)
                    VALUES (1, 21, 'CASUAL', '2026-10-22', '2026-10-24', 3.0, 'Family ceremony and private affairs', 'APPROVED', 1, 0, NOW(), NOW())
                """)
            )
            await session.commit()
            print("[ESS] Seeded sample leave application")

    print("[MIGRATE] Completed ESS migration successfully.")

if __name__ == "__main__":
    asyncio.run(migrate())
