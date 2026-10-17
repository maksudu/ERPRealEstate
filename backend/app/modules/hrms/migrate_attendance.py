import asyncio
import sys
import os
from datetime import time, date, datetime, timedelta
from decimal import Decimal

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal

DDL_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS hr_shifts (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL,
        shift_name VARCHAR(100) NOT NULL,
        shift_code VARCHAR(50) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        break_start_time TIME NULL,
        break_end_time TIME NULL,
        break_duration_minutes INT NOT NULL DEFAULT 60,
        grace_period_minutes INT NOT NULL DEFAULT 15,
        half_day_minimum_minutes INT NOT NULL DEFAULT 240,
        full_day_minimum_minutes INT NOT NULL DEFAULT 480,
        is_night_shift BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_shift_org (organization_id),
        UNIQUE KEY uq_shift_code_org (organization_id, shift_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_shift_assignments (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL,
        shift_id BIGINT NOT NULL,
        assignment_type VARCHAR(32) NOT NULL DEFAULT 'EMPLOYEE',
        employee_id BIGINT NULL,
        department_id BIGINT NULL,
        project_id BIGINT NULL,
        effective_from DATE NOT NULL,
        effective_to DATE NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        remarks VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sa_shift (shift_id),
        INDEX idx_sa_emp (employee_id),
        INDEX idx_sa_dept (department_id),
        INDEX idx_sa_proj (project_id),
        CONSTRAINT fk_sa_shift FOREIGN KEY (shift_id) REFERENCES hr_shifts (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_biometric_devices (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL,
        device_name VARCHAR(100) NOT NULL,
        device_serial VARCHAR(100) NOT NULL,
        device_model VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        port INT NOT NULL DEFAULT 4370,
        location VARCHAR(150) NOT NULL,
        assigned_branch_id BIGINT NULL,
        assigned_project_id BIGINT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'ONLINE',
        last_sync_at TIMESTAMP NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_bio_org (organization_id),
        UNIQUE KEY uq_bio_serial_org (organization_id, device_serial)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_site_geofences (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL,
        project_id BIGINT NOT NULL,
        site_name VARCHAR(150) NOT NULL,
        latitude DECIMAL(10, 7) NOT NULL,
        longitude DECIMAL(10, 7) NOT NULL,
        radius_meters INT NOT NULL DEFAULT 250,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_geo_proj (project_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_holiday_calendar (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL,
        holiday_name VARCHAR(150) NOT NULL,
        holiday_type VARCHAR(32) NOT NULL DEFAULT 'PUBLIC_HOLIDAY',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_days INT NOT NULL DEFAULT 1,
        applicable_branch_id BIGINT NULL,
        applicable_project_id BIGINT NULL,
        is_recurring_yearly BOOLEAN NOT NULL DEFAULT FALSE,
        description TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_hol_date (start_date, end_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS hr_attendance_corrections (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        organization_id BIGINT NOT NULL,
        employee_id BIGINT NOT NULL,
        attendance_id BIGINT NULL,
        request_date DATE NOT NULL,
        original_clock_in TIMESTAMP NULL,
        original_clock_out TIMESTAMP NULL,
        requested_clock_in TIMESTAMP NOT NULL,
        requested_clock_out TIMESTAMP NOT NULL,
        reason TEXT NOT NULL,
        manager_verifier_id BIGINT NULL,
        manager_remarks TEXT NULL,
        manager_verified_at TIMESTAMP NULL,
        hr_approver_id BIGINT NULL,
        hr_remarks TEXT NULL,
        hr_approved_at TIMESTAMP NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING_VERIFICATION',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_corr_emp (employee_id),
        INDEX idx_corr_date (request_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
]

ALTER_ATTENDANCE_STATEMENTS = [
    "ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS shift_id BIGINT NULL;",
    "ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS working_hours DECIMAL(5, 2) NOT NULL DEFAULT 0.00;",
    "ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(5, 2) NOT NULL DEFAULT 0.00;",
    "ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS is_missing_punch BOOLEAN NOT NULL DEFAULT FALSE;",
    "ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS is_anomaly BOOLEAN NOT NULL DEFAULT FALSE;",
    "ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS geofence_site_id BIGINT NULL;",
    "ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS is_geofence_verified BOOLEAN NOT NULL DEFAULT TRUE;",
    "ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;"
]

async def migrate_and_seed():
    print("Beginning Attendance & Shift Migration...")
    async with AsyncSessionLocal() as session:
        # 1. Create Tables
        for stmt in DDL_STATEMENTS:
            await session.execute(text(stmt))
        print("  Created Attendance & Shift Tables.")

        # 2. Alter hr_attendance table
        existing_cols = [r[0] for r in (await session.execute(text("SHOW COLUMNS FROM hr_attendance"))).fetchall()]
        if "shift_id" not in existing_cols:
            await session.execute(text("ALTER TABLE hr_attendance ADD COLUMN shift_id BIGINT NULL;"))
        if "working_hours" not in existing_cols:
            await session.execute(text("ALTER TABLE hr_attendance ADD COLUMN working_hours DECIMAL(5, 2) NOT NULL DEFAULT 0.00;"))
        if "overtime_hours" not in existing_cols:
            await session.execute(text("ALTER TABLE hr_attendance ADD COLUMN overtime_hours DECIMAL(5, 2) NOT NULL DEFAULT 0.00;"))
        if "is_missing_punch" not in existing_cols:
            await session.execute(text("ALTER TABLE hr_attendance ADD COLUMN is_missing_punch BOOLEAN NOT NULL DEFAULT FALSE;"))
        if "is_anomaly" not in existing_cols:
            await session.execute(text("ALTER TABLE hr_attendance ADD COLUMN is_anomaly BOOLEAN NOT NULL DEFAULT FALSE;"))
        if "geofence_site_id" not in existing_cols:
            await session.execute(text("ALTER TABLE hr_attendance ADD COLUMN geofence_site_id BIGINT NULL;"))
        if "is_geofence_verified" not in existing_cols:
            await session.execute(text("ALTER TABLE hr_attendance ADD COLUMN is_geofence_verified BOOLEAN NOT NULL DEFAULT TRUE;"))
        if "updated_at" not in existing_cols:
            await session.execute(text("ALTER TABLE hr_attendance ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;"))
        print("  Updated hr_attendance columns.")

        # 3. Seed Standard Shifts
        shifts_data = [
            {
                "name": "Corporate Standard Day Shift",
                "code": "CORP_DAY",
                "start": "09:00:00",
                "end": "18:00:00",
                "b_start": "13:00:00",
                "b_end": "14:00:00",
                "break": 60,
                "grace": 15,
                "night": False
            },
            {
                "name": "Project Site Morning Shift",
                "code": "SITE_MORN",
                "start": "07:30:00",
                "end": "16:30:00",
                "b_start": "12:30:00",
                "b_end": "13:30:00",
                "break": 60,
                "grace": 10,
                "night": False
            },
            {
                "name": "Site Concrete & Night Operations Shift",
                "code": "SITE_NIGHT",
                "start": "20:00:00",
                "end": "05:00:00",
                "b_start": "00:00:00",
                "b_end": "01:00:00",
                "break": 60,
                "grace": 15,
                "night": True
            },
            {
                "name": "Executive & Flexi Shift",
                "code": "EXEC_FLEXI",
                "start": "10:00:00",
                "end": "19:00:00",
                "b_start": "13:30:00",
                "b_end": "14:30:00",
                "break": 60,
                "grace": 30,
                "night": False
            }
        ]

        for s in shifts_data:
            chk = await session.execute(text("SELECT id FROM hr_shifts WHERE shift_code = :c AND organization_id = 1"), {"c": s["code"]})
            if not chk.scalar_one_or_none():
                await session.execute(text("""
                    INSERT INTO hr_shifts (organization_id, shift_name, shift_code, start_time, end_time, break_start_time, break_end_time, break_duration_minutes, grace_period_minutes, is_night_shift, is_active)
                    VALUES (1, :name, :code, :start, :end, :b_start, :b_end, :break, :grace, :night, TRUE)
                """), s)
                print(f"  Added Shift: {s['name']}")

        # 4. Seed Biometric Devices (ZKTeco)
        devices_data = [
            {
                "name": "Corporate HQ Entrance ZKTeco",
                "serial": "ZK-HQ-MAIN-01",
                "model": "ZKTeco SilkBio-101TC",
                "ip": "192.168.1.201",
                "port": 4370,
                "loc": "Gulshan Head Office - Ground Floor Reception",
                "status": "ONLINE"
            },
            {
                "name": "Bay's Parkview Project Turnstile",
                "serial": "ZK-SITE-BP-02",
                "model": "ZKTeco FaceDepot-7B",
                "ip": "192.168.10.45",
                "port": 4370,
                "loc": "Gulshan-2 Site Office Main Gate",
                "status": "ONLINE"
            },
            {
                "name": "Shanta Pinnacle Site Turnstile",
                "serial": "ZK-SITE-SP-03",
                "model": "ZKTeco F22",
                "ip": "192.168.12.18",
                "port": 4370,
                "loc": "Tejgaon Commercial Site Guard Post",
                "status": "ONLINE"
            }
        ]

        for d in devices_data:
            chk = await session.execute(text("SELECT id FROM hr_biometric_devices WHERE device_serial = :s AND organization_id = 1"), {"s": d["serial"]})
            if not chk.scalar_one_or_none():
                await session.execute(text("""
                    INSERT INTO hr_biometric_devices (organization_id, device_name, device_serial, device_model, ip_address, port, location, status, last_sync_at, is_active)
                    VALUES (1, :name, :serial, :model, :ip, :port, :loc, :status, NOW(), TRUE)
                """), d)
                print(f"  Added Device: {d['name']}")

        # 5. Seed Site Geofences
        geofences_data = [
            {"name": "Gulshan Head Office Compound", "lat": 23.7925000, "lng": 90.4078000, "radius": 200, "proj": 1},
            {"name": "Bay's Parkview Construction Perimeter", "lat": 23.7937000, "lng": 90.4145000, "radius": 250, "proj": 1},
            {"name": "Shanta Pinnacle Site Boundary", "lat": 23.7601000, "lng": 90.3955000, "radius": 300, "proj": 2}
        ]

        for g in geofences_data:
            chk = await session.execute(text("SELECT id FROM hr_site_geofences WHERE site_name = :n AND organization_id = 1"), {"n": g["name"]})
            if not chk.scalar_one_or_none():
                await session.execute(text("""
                    INSERT INTO hr_site_geofences (organization_id, project_id, site_name, latitude, longitude, radius_meters, is_active)
                    VALUES (1, :proj, :name, :lat, :lng, :radius, TRUE)
                """), g)
                print(f"  Added Geofence: {g['name']}")

        # 6. Seed Holiday Calendar (Bangladesh Statutory Holidays)
        holidays_data = [
            {"name": "International Mother Language Day", "type": "PUBLIC_HOLIDAY", "start": "2026-02-21", "end": "2026-02-21", "days": 1, "desc": "National Memorial & Martyrs Day"},
            {"name": "Independence & National Day", "type": "PUBLIC_HOLIDAY", "start": "2026-03-26", "end": "2026-03-26", "days": 1, "desc": "Bangladesh Independence Day"},
            {"name": "Eid-ul-Fitr Statutory Holidays", "type": "RELIGIOUS_HOLIDAY", "start": "2026-03-20", "end": "2026-03-24", "days": 5, "desc": "Holy Eid-ul-Fitr celebrations"},
            {"name": "Bengali New Year (Pahela Baishakh)", "type": "PUBLIC_HOLIDAY", "start": "2026-04-14", "end": "2026-04-14", "days": 1, "desc": "Bangla Noboborsho Festival"},
            {"name": "International Workers' Day (May Day)", "type": "PUBLIC_HOLIDAY", "start": "2026-05-01", "end": "2026-05-01", "days": 1, "desc": "May Day Labour Holiday"},
            {"name": "Eid-ul-Adha Holidays", "type": "RELIGIOUS_HOLIDAY", "start": "2026-05-27", "end": "2026-05-31", "days": 5, "desc": "Holy Eid-ul-Adha celebrations"},
            {"name": "Victory Day", "type": "PUBLIC_HOLIDAY", "start": "2026-12-16", "end": "2026-12-16", "days": 1, "desc": "Bijoy Dibosh celebrations"}
        ]

        for h in holidays_data:
            chk = await session.execute(text("SELECT id FROM hr_holiday_calendar WHERE holiday_name = :n AND organization_id = 1"), {"n": h["name"]})
            if not chk.scalar_one_or_none():
                await session.execute(text("""
                    INSERT INTO hr_holiday_calendar (organization_id, holiday_name, holiday_type, start_date, end_date, total_days, is_recurring_yearly, description, is_active)
                    VALUES (1, :name, :type, :start, :end, :days, TRUE, :desc, TRUE)
                """), h)
                print(f"  Added Holiday: {h['name']}")

        # 7. Seed Initial Shift Assignments for Employees
        emp_rows = (await session.execute(text("SELECT id, department_id, workforce_category FROM hr_employees WHERE organization_id = 1"))).fetchall()
        shift1 = (await session.execute(text("SELECT id FROM hr_shifts WHERE shift_code = 'CORP_DAY' AND organization_id = 1"))).scalar() or 1
        shift2 = (await session.execute(text("SELECT id FROM hr_shifts WHERE shift_code = 'SITE_MORN' AND organization_id = 1"))).scalar() or 2

        for emp in emp_rows:
            emp_id, dept_id, wf_cat = emp[0], emp[1], emp[2]
            chk = await session.execute(text("SELECT id FROM hr_shift_assignments WHERE employee_id = :e AND organization_id = 1"), {"e": emp_id})
            if not chk.scalar_one_or_none():
                assigned_shift = shift2 if wf_cat != "CORPORATE" else shift1
                await session.execute(text("""
                    INSERT INTO hr_shift_assignments (organization_id, shift_id, assignment_type, employee_id, effective_from, is_active, remarks)
                    VALUES (1, :s, 'EMPLOYEE', :e, '2026-01-01', TRUE, 'Default Organizational Assignment')
                """), {"s": assigned_shift, "e": emp_id})

        # 8. Enrich / Seed Today's Attendance with working hours, shifts, and missing punch simulation
        today = date.today()
        for idx, emp in enumerate(emp_rows):
            emp_id = emp[0]
            # Check existing attendance for today
            chk = await session.execute(text("SELECT id FROM hr_attendance WHERE employee_id = :e AND punch_date = :d"), {"e": emp_id, "d": today})
            row = chk.scalar_one_or_none()

            # Different scenarios for variety
            if idx % 5 == 0:
                # Late arrival
                c_in = datetime.combine(today, time(9, 28, 0))
                c_out = datetime.combine(today, time(18, 15, 0))
                status = "LATE"
                late_m = 28
                wh = Decimal("8.78")
                missing = False
            elif idx % 4 == 0:
                # Missing punch (forgot clock-out)
                c_in = datetime.combine(today, time(8, 55, 0))
                c_out = None
                status = "PRESENT"
                late_m = 0
                wh = Decimal("0.00")
                missing = True
            elif idx % 7 == 0:
                # Half Day
                c_in = datetime.combine(today, time(9, 0, 0))
                c_out = datetime.combine(today, time(13, 0, 0))
                status = "HALF_DAY"
                late_m = 0
                wh = Decimal("4.00")
                missing = False
            else:
                # Normal Present
                c_in = datetime.combine(today, time(8, 50, 0))
                c_out = datetime.combine(today, time(18, 5, 0))
                status = "PRESENT"
                late_m = 0
                wh = Decimal("9.25")
                missing = False

            if not row:
                await session.execute(text("""
                    INSERT INTO hr_attendance (organization_id, employee_id, shift_id, punch_date, clock_in, clock_out, working_hours, late_minutes, early_leaving_minutes, overtime_hours, status, source, is_missing_punch, is_anomaly, geofence_lat, geofence_lng, is_geofence_verified, remarks)
                    VALUES (1, :e, :s, :d, :cin, :cout, :wh, :late, 0, 0.00, :st, 'BIOMETRIC_DEVICE', :mis, :mis, 23.7925000, 90.4078000, TRUE, 'ZKTeco Sync')
                """), {
                    "e": emp_id,
                    "s": shift1,
                    "d": today,
                    "cin": c_in,
                    "cout": c_out,
                    "wh": wh,
                    "late": late_m,
                    "st": status,
                    "mis": missing
                })
            else:
                await session.execute(text("""
                    UPDATE hr_attendance
                    SET shift_id = :s, working_hours = :wh, is_missing_punch = :mis, is_anomaly = :mis
                    WHERE id = :id
                """), {"s": shift1, "wh": wh, "mis": missing, "id": row})

        # 9. Seed Sample Attendance Correction Request
        if len(emp_rows) > 0:
            first_emp_id = emp_rows[0][0]
            mgr_id = emp_rows[1][0] if len(emp_rows) > 1 else first_emp_id
            yesterday = today - timedelta(days=1)
            chk_corr = await session.execute(text("SELECT id FROM hr_attendance_corrections WHERE employee_id = :e"), {"e": first_emp_id})
            if not chk_corr.scalar_one_or_none():
                await session.execute(text("""
                    INSERT INTO hr_attendance_corrections (
                        organization_id, employee_id, request_date, 
                        original_clock_in, original_clock_out, 
                        requested_clock_in, requested_clock_out, 
                        reason, manager_verifier_id, status
                    ) VALUES (
                        1, :e, :d, 
                        :ocin, NULL, 
                        :rcin, :rcout, 
                        'ZKTeco device at Gulshan main gate was rebooting during evening checkout.', 
                        :m, 'PENDING_VERIFICATION'
                    )
                """), {
                    "e": first_emp_id,
                    "d": yesterday,
                    "ocin": datetime.combine(yesterday, time(8, 55, 0)),
                    "rcin": datetime.combine(yesterday, time(8, 55, 0)),
                    "rcout": datetime.combine(yesterday, time(18, 30, 0)),
                    "m": mgr_id
                })
                print("  Added Sample Attendance Correction Request.")

        await session.commit()
    print("Attendance & Shift migration and seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate_and_seed())
