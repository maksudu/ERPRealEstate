import asyncio
from datetime import datetime, date, time, timedelta
from decimal import Decimal
import random
from sqlalchemy import text
from app.core.database import engine

async def populate_today_attendance():
    today = date.today()
    print(f"--- Seeding Demo Attendance for Today: {today} ---")
    
    async with engine.begin() as conn:
        # 1. Fetch active employees
        emp_res = await conn.execute(text("""
            SELECT e.id, e.employee_code, e.first_name, e.last_name, e.department_id, e.organization_id, e.assigned_project_id
            FROM hr_employees e
            WHERE e.status = 'ACTIVE' OR e.status IS NULL
        """))
        employees = emp_res.fetchall()
        print(f"Found {len(employees)} active employees.")
        
        if not employees:
            print("No active employees found! Exiting.")
            return

        # 2. Fetch shifts
        shift_res = await conn.execute(text("SELECT id, shift_name, start_time, end_time, grace_period_minutes FROM hr_shifts WHERE is_active = 1"))
        shifts = shift_res.fetchall()
        print(f"Found {len(shifts)} active shifts.")
        
        default_shift_id = shifts[0][0] if shifts else None

        # 3. Fetch project / geofences
        geo_res = await conn.execute(text("SELECT id, project_id, site_name, latitude, longitude FROM hr_site_geofences WHERE is_active = 1"))
        geofences = geo_res.fetchall()
        print(f"Found {len(geofences)} site geofences.")

        prj_res = await conn.execute(text("SELECT id, project_name FROM prj_projects LIMIT 10"))
        projects = prj_res.fetchall()

        # Delete existing attendance for today to ensure clean and complete demo dataset
        del_res = await conn.execute(text("DELETE FROM hr_attendance WHERE punch_date = :today"), {"today": today})
        print(f"Cleaned up {del_res.rowcount} prior attendance records for today.")

        sources = ['BIOMETRIC_DEVICE', 'WEB_PUNCH', 'GPS_MOBILE', 'MANUAL_OVERRIDE']
        
        inserted_count = 0
        for i, emp in enumerate(employees):
            emp_id = emp[0]
            org_id = emp[5] or 1
            assigned_prj = emp[6]
            
            # Choose shift
            shift_id = default_shift_id
            if shifts:
                shift_id = shifts[i % len(shifts)][0]

            # Choose geofence / project
            geo_site_id = assigned_prj
            lat = Decimal("23.7925000")
            lng = Decimal("90.4078000")
            is_geo_verified = True
            
            if geofences:
                g = geofences[i % len(geofences)]
                lat = g[3]
                lng = g[4]
                geo_site_id = g[1]
            elif projects:
                geo_site_id = projects[i % len(projects)][0]

            # Assign statuses realistically:
            # 80% Present, 10% Late, 5% Half-day, 5% On Leave / Rest
            mod = i % 20
            if mod == 18:
                # On Leave / Absent
                status = "ON_LEAVE"
                clock_in = None
                clock_out = None
                work_hrs = Decimal("0.00")
                late_mins = 0
                early_mins = 0
                ot_hrs = Decimal("0.00")
                is_missing = False
                source = "MANUAL_OVERRIDE"
                remarks = "Approved Casual Leave"
            elif mod == 19:
                status = "ABSENT"
                clock_in = None
                clock_out = None
                work_hrs = Decimal("0.00")
                late_mins = 0
                early_mins = 0
                ot_hrs = Decimal("0.00")
                is_missing = True
                source = "MANUAL_OVERRIDE"
                remarks = "Uninformed Absence"
            elif mod in (16, 17):
                # Late arrival
                status = "LATE"
                late_mins = random.randint(20, 65)
                # In at 09:20 - 10:05
                in_dt = datetime.combine(today, time(9, 0)) + timedelta(minutes=late_mins)
                out_dt = datetime.combine(today, time(18, 0)) + timedelta(minutes=random.randint(0, 30))
                dur_secs = (out_dt - in_dt).total_seconds()
                work_hrs = Decimal(str(round(dur_secs / 3600.0, 2)))
                early_mins = 0
                ot_hrs = Decimal(str(round(work_hrs - Decimal("8.00"), 2))) if work_hrs > Decimal("8.00") else Decimal("0.00")
                clock_in = in_dt
                clock_out = out_dt
                is_missing = False
                source = sources[i % len(sources)]
                remarks = f"Traffic congestion on Dhaka-Mymensingh highway ({late_mins} min late)"
            elif mod == 15:
                # Half Day
                status = "HALF_DAY"
                late_mins = 0
                in_dt = datetime.combine(today, time(9, 0)) + timedelta(minutes=random.randint(-10, 10))
                out_dt = datetime.combine(today, time(13, 30))
                dur_secs = (out_dt - in_dt).total_seconds()
                work_hrs = Decimal(str(round(dur_secs / 3600.0, 2)))
                early_mins = 270
                ot_hrs = Decimal("0.00")
                clock_in = in_dt
                clock_out = out_dt
                is_missing = False
                source = "WEB_PUNCH"
                remarks = "Early departure for medical emergency"
            else:
                # Normal PRESENT (on-time)
                status = "PRESENT"
                late_mins = 0
                # In between 08:45 and 09:10
                in_minute = random.randint(45, 65) # 08:45 - 09:05
                if in_minute < 60:
                    in_dt = datetime.combine(today, time(8, in_minute))
                else:
                    in_dt = datetime.combine(today, time(9, in_minute - 60))
                
                # Out between 18:00 and 19:30
                out_minute = random.randint(0, 90)
                out_dt = datetime.combine(today, time(18, 0)) + timedelta(minutes=out_minute)
                
                dur_secs = (out_dt - in_dt).total_seconds()
                work_hrs = Decimal(str(round(dur_secs / 3600.0, 2)))
                early_mins = 0
                ot_hrs = Decimal(str(round(work_hrs - Decimal("8.00"), 2))) if work_hrs > Decimal("8.00") else Decimal("0.00")
                clock_in = in_dt
                clock_out = out_dt
                is_missing = False
                source = sources[i % len(sources)]
                remarks = "Regular shift duty"

            await conn.execute(text("""
                INSERT INTO hr_attendance (
                    organization_id, employee_id, shift_id, punch_date,
                    clock_in, clock_out, working_hours, late_minutes,
                    early_leaving_minutes, overtime_hours, status,
                    source, is_missing_punch, is_anomaly, geofence_lat,
                    geofence_lng, geofence_site_id, is_geofence_verified,
                    remarks, created_at, updated_at
                ) VALUES (
                    :org_id, :emp_id, :shift_id, :punch_date,
                    :clock_in, :clock_out, :working_hours, :late_minutes,
                    :early_leaving_minutes, :overtime_hours, :status,
                    :source, :is_missing_punch, :is_anomaly, :geofence_lat,
                    :geofence_lng, :geofence_site_id, :is_geofence_verified,
                    :remarks, NOW(), NOW()
                )
            """), {
                "org_id": org_id,
                "emp_id": emp_id,
                "shift_id": shift_id,
                "punch_date": today,
                "clock_in": clock_in,
                "clock_out": clock_out,
                "working_hours": work_hrs,
                "late_minutes": late_mins,
                "early_leaving_minutes": early_mins,
                "overtime_hours": ot_hrs,
                "status": status,
                "source": source,
                "is_missing_punch": is_missing,
                "is_anomaly": False,
                "geofence_lat": lat,
                "geofence_lng": lng,
                "geofence_site_id": geo_site_id,
                "is_geofence_verified": is_geo_verified,
                "remarks": remarks
            })
            inserted_count += 1

        print(f"Successfully inserted {inserted_count} attendance records for today ({today})!")

if __name__ == "__main__":
    asyncio.run(populate_today_attendance())
