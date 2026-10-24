import asyncio
import json
import sys
from decimal import Decimal
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import engine


BDT_COMPANY_GRADES = [
    ("GRADE-01", "Grade 1 - Apex Executive / C-Suite", "C_SUITE", 250000, 500000, 50, 20000, 25000, "Managing Director, CEO, and board-appointed executives"),
    ("GRADE-02", "Grade 2 - Executive Director / VP", "DIRECTOR", 180000, 300000, 50, 15000, 20000, "Functional directors and division heads"),
    ("GRADE-03", "Grade 3 - Senior Management", "SR_MANAGEMENT", 120000, 220000, 50, 10000, 15000, "General managers, chief engineers, and functional heads"),
    ("GRADE-04", "Grade 4 - Project / Mid Management", "MID_MANAGEMENT", 80000, 150000, 50, 8000, 10000, "Project managers, AGM, and senior managers"),
    ("GRADE-05", "Grade 5 - Senior Engineers / Managers", "SITE_ENGINEER", 55000, 95000, 50, 5000, 6000, "Senior civil and structural engineers, lead architects"),
    ("GRADE-06", "Grade 6 - Officers & Site Engineers", "SITE_ENGINEER", 35000, 60000, 50, 4000, 4000, "Site engineers, accountants, sales executives, and inspectors"),
    ("GRADE-07", "Grade 7 - Junior Executives & Supervisors", "OFFICER", 25000, 40000, 50, 3000, 3000, "Site supervisors, surveyors, junior accountants, and associates"),
    ("GRADE-08", "Grade 8 - Support & Operations Staff", "SUPPORT_STAFF", 16000, 28000, 50, 2000, 2000, "Office assistants, electricians, drivers, and security personnel"),
]


def allowance_package(house_rent_pct, medical, conveyance):
    return [
        {"name": "House Rent", "amount": float(house_rent_pct), "calculation_type": "PERCENT"},
        {"name": "Medical Allowance", "amount": float(medical), "calculation_type": "FIXED"},
        {"name": "Conveyance", "amount": float(conveyance), "calculation_type": "FIXED"},
    ]


async def run_migration():
    async with engine.begin() as conn:
        exists = await conn.execute(text("SHOW COLUMNS FROM hr_salary_grades LIKE 'allowance_package'"))
        if not exists.fetchone():
            await conn.execute(text("ALTER TABLE hr_salary_grades ADD COLUMN allowance_package JSON NULL AFTER default_conveyance"))

    inserted = 0
    updated = 0
    async with engine.begin() as conn:
        for code, name, level, minimum, maximum, house_pct, medical, conveyance, description in BDT_COMPANY_GRADES:
            result = await conn.execute(
                text("""SELECT id, allowance_package, default_house_rent_pct,
                    default_medical_allowance, default_conveyance
                    FROM hr_salary_grades WHERE organization_id = 1 AND grade_code = :code LIMIT 1"""),
                {"code": code},
            )
            existing = result.mappings().first()
            if existing:
                if not existing["allowance_package"]:
                    package = allowance_package(
                        existing["default_house_rent_pct"],
                        existing["default_medical_allowance"],
                        existing["default_conveyance"],
                    )
                    await conn.execute(
                        text("UPDATE hr_salary_grades SET allowance_package = :package WHERE id = :id"),
                        {"package": json.dumps(package), "id": existing["id"]},
                    )
                    updated += 1
                continue

            await conn.execute(text("""INSERT INTO hr_salary_grades
                (organization_id, grade_code, grade_name, employee_level, min_salary, max_salary,
                 default_house_rent_pct, default_medical_allowance, default_conveyance,
                 allowance_package, description, is_active)
                VALUES (1, :code, :name, :level, :minimum, :maximum, :house_pct, :medical,
                        :conveyance, :package, :description, TRUE)"""), {
                "code": code,
                "name": name,
                "level": level,
                "minimum": Decimal(str(minimum)),
                "maximum": Decimal(str(maximum)),
                "house_pct": Decimal(str(house_pct)),
                "medical": Decimal(str(medical)),
                "conveyance": Decimal(str(conveyance)),
                "package": json.dumps(allowance_package(house_pct, medical, conveyance)),
                "description": f"{description}. Illustrative company-defined monthly BDT band; review against approved company policy.",
            })
            inserted += 1
    print(f"Salary grades ready: {inserted} added, {updated} allowance packages populated")


if __name__ == "__main__":
    async def main():
        try:
            await run_migration()
        finally:
            await engine.dispose()

    asyncio.run(main())
