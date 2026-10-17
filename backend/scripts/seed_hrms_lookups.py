import asyncio
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.modules.lookups.models import LookupCategory, LookupItem

HRMS_LOOKUPS = [
    {
        "category_code": "HR_EMPLOYMENT_TYPE",
        "category_name": "HR Employment Type",
        "description": "Employment contracts and engagement categories",
        "items": [
            {"code": "PERMANENT", "name_en": "Permanent / Confirmed", "name_bn": "স্থায়ী কর্মকর্তা", "badge": "#10B981", "sort": 1},
            {"code": "PROBATION", "name_en": "Probationary", "name_bn": "শিক্ষানবিস", "badge": "#F59E0B", "sort": 2},
            {"code": "CONTRACTUAL", "name_en": "Contractual", "name_bn": "চুক্তিভিত্তিক", "badge": "#3B82F6", "sort": 3},
            {"code": "INTERN", "name_en": "Intern / Trainee", "name_bn": "ইন্টার্ন / শিক্ষানবিশ", "badge": "#8B5CF6", "sort": 4},
            {"code": "DAILY_WAGE", "name_en": "Daily Wage Staff", "name_bn": "দৈনিক মজুরি", "badge": "#64748B", "sort": 5},
        ]
    },
    {
        "category_code": "HR_EMPLOYEE_STATUS",
        "category_name": "HR Employee Status",
        "description": "Employee lifecycle status",
        "items": [
            {"code": "ACTIVE", "name_en": "Active", "name_bn": "সক্রিয়", "badge": "#10B981", "sort": 1},
            {"code": "PROBATION", "name_en": "Under Probation", "name_bn": "শিক্ষানবিসকাল", "badge": "#F59E0B", "sort": 2},
            {"code": "CONFIRMED", "name_en": "Confirmed", "name_bn": "স্থায়ীকৃত", "badge": "#059669", "sort": 3},
            {"code": "ON_LEAVE", "name_en": "On Extended Leave", "name_bn": "ছুটিতে", "badge": "#0284C7", "sort": 4},
            {"code": "RESIGNED", "name_en": "Resigned", "name_bn": "ইস্তফা প্রদানকারী", "badge": "#D97706", "sort": 5},
            {"code": "TERMINATED", "name_en": "Terminated", "name_bn": "বরখাস্তকৃত", "badge": "#EF4444", "sort": 6},
        ]
    },
    {
        "category_code": "HR_WORKFORCE_CATEGORY",
        "category_name": "HR Workforce Category",
        "description": "Workplace classification and operational zone",
        "items": [
            {"code": "CORPORATE", "name_en": "Corporate Head-Office", "name_bn": "কর্পোরেট প্রধান কার্যালয়", "badge": "#6366F1", "sort": 1},
            {"code": "SITE_ENGINEERING", "name_en": "Site Engineering & Operations", "name_bn": "সাইট ইঞ্জিনিয়ারিং", "badge": "#0D9488", "sort": 2},
            {"code": "SITE_SUPERVISION", "name_en": "Site Quality & Supervision", "name_bn": "সাইট সুপারভিশন", "badge": "#D97706", "sort": 3},
        ]
    },
    {
        "category_code": "HR_SYSTEM_ROLE",
        "category_name": "HR System & ERP Role",
        "description": "Authorization roles for ERP access",
        "items": [
            {"code": "EMPLOYEE", "name_en": "General Employee", "name_bn": "সাধারণ কর্মী", "badge": "#64748B", "sort": 1},
            {"code": "HR_EXECUTIVE", "name_en": "HR Executive", "name_bn": "এইচআর এক্সিকিউটিভ", "badge": "#3B82F6", "sort": 2},
            {"code": "HR_ADMIN", "name_en": "HR Administrator", "name_bn": "এইচআর অ্যাডমিনিস্ট্রেটর", "badge": "#8B5CF6", "sort": 3},
            {"code": "MANAGER", "name_en": "Department Manager / HOD", "name_bn": "বিভাগীয় প্রধান", "badge": "#F59E0B", "sort": 4},
            {"code": "AUDITOR", "name_en": "Internal Auditor", "name_bn": "অভ্যন্তরীণ নিরীক্ষক", "badge": "#EC4899", "sort": 5},
        ]
    },
    {
        "category_code": "HR_MARITAL_STATUS",
        "category_name": "HR Marital Status",
        "description": "Marital status classification",
        "items": [
            {"code": "SINGLE", "name_en": "Single", "name_bn": "অবিবাহিত", "badge": "#64748B", "sort": 1},
            {"code": "MARRIED", "name_en": "Married", "name_bn": "বিবাহিত", "badge": "#10B981", "sort": 2},
            {"code": "DIVORCED", "name_en": "Divorced", "name_bn": "তালাকপ্রাপ্ত", "badge": "#F59E0B", "sort": 3},
            {"code": "WIDOWED", "name_en": "Widowed", "name_bn": "বিধবা / বিপত্নীক", "badge": "#6B7280", "sort": 4},
        ]
    },
    {
        "category_code": "HR_GENDER",
        "category_name": "HR Gender",
        "description": "Gender classification",
        "items": [
            {"code": "MALE", "name_en": "Male", "name_bn": "পুরুষ", "badge": "#3B82F6", "sort": 1},
            {"code": "FEMALE", "name_en": "Female", "name_bn": "মহিলা", "badge": "#EC4899", "sort": 2},
            {"code": "OTHER", "name_en": "Other", "name_bn": "অন্যান্য", "badge": "#8B5CF6", "sort": 3},
        ]
    },
    {
        "category_code": "HR_BLOOD_GROUP",
        "category_name": "HR Blood Group",
        "description": "Blood group classifications",
        "items": [
            {"code": "A+", "name_en": "A+ (Positive)", "name_bn": "এ+", "badge": "#EF4444", "sort": 1},
            {"code": "A-", "name_en": "A- (Negative)", "name_bn": "এ-", "badge": "#DC2626", "sort": 2},
            {"code": "B+", "name_en": "B+ (Positive)", "name_bn": "বি+", "badge": "#EF4444", "sort": 3},
            {"code": "B-", "name_en": "B- (Negative)", "name_bn": "বি-", "badge": "#DC2626", "sort": 4},
            {"code": "AB+", "name_en": "AB+ (Positive)", "name_bn": "এবি+", "badge": "#EF4444", "sort": 5},
            {"code": "AB-", "name_en": "AB- (Negative)", "name_bn": "এবি-", "badge": "#DC2626", "sort": 6},
            {"code": "O+", "name_en": "O+ (Positive)", "name_bn": "ও+", "badge": "#EF4444", "sort": 7},
            {"code": "O-", "name_en": "O- (Negative)", "name_bn": "ও-", "badge": "#DC2626", "sort": 8},
        ]
    },
    {
        "category_code": "HR_DOCUMENT_TYPE",
        "category_name": "HR Document Type",
        "description": "Employee compliance and dossier document types",
        "items": [
            {"code": "APPOINTMENT_LETTER", "name_en": "Appointment Letter", "name_bn": "নিয়োগপত্র", "badge": "#10B981", "sort": 1},
            {"code": "NID_PASSPORT", "name_en": "National ID / Passport", "name_bn": "জাতীয় পরিচয়পত্র / পাসপোর্ট", "badge": "#3B82F6", "sort": 2},
            {"code": "ACADEMIC_CERTIFICATE", "name_en": "Academic Certificate", "name_bn": "শিক্ষাগত সনদপত্র", "badge": "#8B5CF6", "sort": 3},
            {"code": "EMPLOYMENT_CONTRACT", "name_en": "Employment Contract", "name_bn": "চুক্তিনামা", "badge": "#F59E0B", "sort": 4},
            {"code": "PHOTOGRAPH", "name_en": "Official Photograph", "name_bn": "ছবি", "badge": "#06B6D4", "sort": 5},
            {"code": "EXPERIENCE_LETTER", "name_en": "Experience Certificate", "name_bn": "অভিজ্ঞতার সনদপত্র", "badge": "#6366F1", "sort": 6},
            {"code": "POLICE_VERIFICATION", "name_en": "Police Verification Record", "name_bn": "পুলিশ ভেরিফিকেশন", "badge": "#EF4444", "sort": 7},
        ]
    },
    {
        "category_code": "HR_EMERGENCY_RELATION",
        "category_name": "HR Emergency Relation",
        "description": "Relationship with emergency contact person",
        "items": [
            {"code": "SPOUSE", "name_en": "Spouse (Husband / Wife)", "name_bn": "স্বামী / স্ত্রী", "badge": "#EC4899", "sort": 1},
            {"code": "PARENT", "name_en": "Parent (Father / Mother)", "name_bn": "পিতা / মাতা", "badge": "#3B82F6", "sort": 2},
            {"code": "SIBLING", "name_en": "Sibling (Brother / Sister)", "name_bn": "ভাই / বোন", "badge": "#10B981", "sort": 3},
            {"code": "CHILD", "name_en": "Child (Son / Daughter)", "name_bn": "ছেলে / মেয়ে", "badge": "#8B5CF6", "sort": 4},
            {"code": "RELATIVE", "name_en": "Relative", "name_bn": "আত্মীয়", "badge": "#F59E0B", "sort": 5},
            {"code": "FRIEND", "name_en": "Friend / Colleague", "name_bn": "বন্ধু / সহকর্মী", "badge": "#64748B", "sort": 6},
            {"code": "OTHER", "name_en": "Other", "name_bn": "অন্যান্য", "badge": "#94A3B8", "sort": 7},
        ]
    },
    {
        "category_code": "HR_ATTENDANCE_STATUS",
        "category_name": "HR Attendance Status",
        "description": "Daily employee attendance classification",
        "items": [
            {"code": "PRESENT", "name_en": "Present (On Time)", "name_bn": "উপস্থিত (সময়মতো)", "badge": "#10B981", "sort": 1},
            {"code": "LATE", "name_en": "Late Arrival", "name_bn": "দেরিতে উপস্থিতি", "badge": "#F59E0B", "sort": 2},
            {"code": "HALF_DAY", "name_en": "Half Day", "name_bn": "অর্ধদিবস", "badge": "#8B5CF6", "sort": 3},
            {"code": "ABSENT", "name_en": "Absent", "name_bn": "অনুপস্থিত", "badge": "#EF4444", "sort": 4},
            {"code": "ON_LEAVE", "name_en": "On Approved Leave", "name_bn": "ছুটিতে", "badge": "#0284C7", "sort": 5},
            {"code": "HOLIDAY", "name_en": "Statutory Holiday", "name_bn": "সরকারি ছুটি", "badge": "#059669", "sort": 6},
            {"code": "WEEKLY_OFF", "name_en": "Weekly Off Day", "name_bn": "সাপ্তাহিক ছুটি", "badge": "#64748B", "sort": 7},
        ]
    },
    {
        "category_code": "HR_PUNCH_SOURCE",
        "category_name": "Attendance Punch Source",
        "description": "Origin of attendance timestamp",
        "items": [
            {"code": "BIOMETRIC_DEVICE", "name_en": "Biometric Terminal (ZKTeco)", "name_bn": "বায়োমেট্রিক ডিভাইস", "badge": "#10B981", "sort": 1},
            {"code": "WEB_PUNCH", "name_en": "Web Portal Self-Punch", "name_bn": "ওয়েব পোর্টাল পাঞ্চ", "badge": "#3B82F6", "sort": 2},
            {"code": "GPS_MOBILE", "name_en": "GPS Mobile Geofenced", "name_bn": "মোবাইল জিওফেন্স পাঞ্চ", "badge": "#8B5CF6", "sort": 3},
            {"code": "MANUAL_OVERRIDE", "name_en": "HR Manual Entry", "name_bn": "ম্যানুয়াল এন্ট্রি", "badge": "#F59E0B", "sort": 4},
            {"code": "CORRECTION", "name_en": "Approved Correction", "name_bn": "অনুমোদিত সংশোধন", "badge": "#0D9488", "sort": 5},
        ]
    },
    {
        "category_code": "HR_HOLIDAY_TYPE",
        "category_name": "Holiday Classification",
        "description": "Statutory and organization holiday categories",
        "items": [
            {"code": "PUBLIC_HOLIDAY", "name_en": "National Public Holiday", "name_bn": "জাতীয় সরকারি ছুটি", "badge": "#10B981", "sort": 1},
            {"code": "RELIGIOUS_HOLIDAY", "name_en": "Religious Festival Holiday", "name_bn": "ধর্মীয় উৎসবের ছুটি", "badge": "#3B82F6", "sort": 2},
            {"code": "COMPANY_HOLIDAY", "name_en": "Company Declared Holiday", "name_bn": "কোম্পানি ছুটি", "badge": "#8B5CF6", "sort": 3},
            {"code": "WEEKLY_OFF", "name_en": "Weekly Day Off", "name_bn": "সাপ্তাহিক ছুটি", "badge": "#64748B", "sort": 4},
        ]
    },
    {
        "category_code": "HR_CORRECTION_STATUS",
        "category_name": "Attendance Correction Status",
        "description": "Workflow lifecycle for attendance adjustment requests",
        "items": [
            {"code": "PENDING_VERIFICATION", "name_en": "Pending Verification", "name_bn": "যাচাই অপেক্ষমান", "badge": "#F59E0B", "sort": 1},
            {"code": "VERIFIED_BY_MANAGER", "name_en": "Verified by Manager", "name_bn": "ম্যানেজার কর্তৃক যাচাইকৃত", "badge": "#0284C7", "sort": 2},
            {"code": "APPROVED", "name_en": "HR Approved", "name_bn": "এইচআর অনুমোদিত", "badge": "#10B981", "sort": 3},
            {"code": "REJECTED", "name_en": "Rejected", "name_bn": "বাতিলকৃত", "badge": "#EF4444", "sort": 4},
        ]
    },
    {
        "category_code": "HR_DEVICE_MODEL",
        "category_name": "Biometric Device Model",
        "description": "ZKTeco and biometric device models",
        "items": [
            {"code": "ZKTECO_K40", "name_en": "ZKTeco K40 (Fingerprint)", "name_bn": "জেডকেটেকো কে৪০", "badge": "#10B981", "sort": 1},
            {"code": "ZKTECO_F22", "name_en": "ZKTeco F22 Ultra-Thin", "name_bn": "জেডকেটেকো এফ২২", "badge": "#3B82F6", "sort": 2},
            {"code": "SILKBIO_101TC", "name_en": "SilkBio-101TC Face & Fingerprint", "name_bn": "সিল্কবায়ো-১০১টিসি", "badge": "#8B5CF6", "sort": 3},
            {"code": "FACEDEPOT_7B", "name_en": "FaceDepot-7B AI Face Turnstile", "name_bn": "ফেসডিপো-৭বি", "badge": "#EC4899", "sort": 4},
        ]
    },
    {
        "category_code": "HR_SHIFT_ASSIGNMENT_TYPE",
        "category_name": "Shift Assignment Target",
        "description": "Shift schedule target type",
        "items": [
            {"code": "EMPLOYEE", "name_en": "Individual Employee", "name_bn": "নির্দিষ্ট কর্মী", "badge": "#10B981", "sort": 1},
            {"code": "DEPARTMENT", "name_en": "Entire Department", "name_bn": "সম্পূর্ণ বিভাগ", "badge": "#3B82F6", "sort": 2},
            {"code": "PROJECT_SITE", "name_en": "Project Construction Site", "name_bn": "প্রকল্প নির্মাণ সাইট", "badge": "#F59E0B", "sort": 3},
        ]
    }
]

async def seed():
    print("Seeding HRMS dynamic lookups...")
    async with AsyncSessionLocal() as session:
        for cat_data in HRMS_LOOKUPS:
            stmt = select(LookupCategory).where(LookupCategory.category_code == cat_data["category_code"])
            res = await session.execute(stmt)
            cat = res.scalar_one_or_none()
            if not cat:
                cat = LookupCategory(
                    category_code=cat_data["category_code"],
                    category_name=cat_data["category_name"],
                    description=cat_data["description"],
                    is_active=True
                )
                session.add(cat)
                await session.flush()
                print(f"Created category: {cat.category_code}")
            
            for it in cat_data["items"]:
                stmt_it = select(LookupItem).where(
                    LookupItem.category_id == cat.id,
                    LookupItem.item_code == it["code"]
                )
                res_it = await session.execute(stmt_it)
                existing_it = res_it.scalar_one_or_none()
                if not existing_it:
                    item = LookupItem(
                        category_id=cat.id,
                        item_code=it["code"],
                        item_name_en=it["name_en"],
                        item_name_bn=it["name_bn"],
                        color_badge=it.get("badge", "#10B981"),
                        sort_order=it.get("sort", 1),
                        is_active=True
                    )
                    session.add(item)
                    print(f"  Added item: {it['code']} - {it['name_en']}")
        
        await session.commit()
    print("HRMS Lookups seeding finished successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
