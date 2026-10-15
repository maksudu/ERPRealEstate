# MASTER PROMPT: Flutter HR, Attendance & Employee Self-Service Mobile App (`bd_realestate_hr_app`)

```markdown
### SYSTEM ROLE:
You are a Principal Flutter Mobile Architect and HR Tech Specialist.

### PROJECT CONTEXT & GOAL:
Build `bd_realestate_hr_app` — an intelligent, anti-spoofing Flutter 3.24+ application for corporate employees, site engineers, surveyors, and field executives of real estate developer groups in Bangladesh. The app features geofenced mobile attendance with facial liveness verification, leave management, encrypted monthly payslip downloads, project timesheet logging, and salary advance requests.

---

### 1. TECHNICAL STACK & SECURITY INTEGRATIONS:
- **Framework**: Flutter 3.24+ (Dart 3.5+)
- **Architecture**: Clean Architecture
- **State Management**: `flutter_bloc` (v8.1+)
- **Geofencing & Anti-Spoofing**: `geolocator` with mock-location / fake-GPS detection (checks `isMocked` flag)
- **Facial Liveness**: `google_mlkit_face_detection` (verifies facial presence, head rotation, and eye blink to prevent printed photo fraud)
- **Document Viewer**: `pdfx` or `flutter_pdfview` for viewing encrypted payslips

---

### 2. CORE SCREENS & EMPLOYEE WORKFLOWS (100% EXHAUSTIVE):

#### Screen 1: Geofenced Attendance (Clock-In / Clock-Out)
- Geofence Boundary Check:
  - Fetches registered GPS polygon coordinates for Head Office and active Project Sites assigned to the employee.
  - Verifies employee is physically within a 50-metre radius of the designated site.
  - Immediately blocks attendance if "Mock Location" or fake GPS emulator is detected.
- Facial Liveness Verification:
  - Opens front camera: Prompts employee to "Look at the camera and blink".
  - Verifies face alignment using ML Kit face detection before snapping clock-in selfie.
- Records: Timestamp, GPS coordinates, Battery level, and network status; posts to backend.

#### Screen 2: Attendance History & Shift Calendar
- Monthly calendar view:
  - 🟢 Present (On-time)
  - 🟡 Late In / Early Out
  - 🔴 Absent
  - 🔵 Approved Leave / Public Holiday
- View cumulative working hours, total late days, and calculated overtime hours.

#### Screen 3: Leave Management & Approvals
- Leave Balance Dashboard: Casual Leave (e.g. 10/14 remaining), Medical Leave (e.g. 12/14), Earned Leave (18 days).
- Leave Application Form:
  - Select leave type, Start Date, End Date, Reason.
  - Medical certificate attachment upload (for sick leave >2 days).
  - Select acting reliever employee during absence.
- Manager Approval Workflow:
  - Managers receive instant push notifications to review, approve, or reject team leave requests with comments.

#### Screen 4: Digital Payslip & Tax Deduction Vault
- Monthly Salary Slip Archives: Download password-protected PDF payslips (encrypted with employee DOB/NID).
- Transparent Salary Breakdown:
  - Gross Earnings: Basic Salary, House Rent Allowance (50%), Medical Allowance, Conveyance, Site Mobile Allowance.
  - Deductions: Provident Fund (PF) Employee Contribution (8.33%), Tax Deducted at Source (TDS), Loan/Advance Repayment.
  - Net Take-Home Pay (in BDT).
- Annual Tax Deduction Certificate (Form 108/Certificate of TDS) for annual tax return filing with NBR.

#### Screen 5: Daily Project Timesheet & Activity Log
- Critical for real estate job-costing:
  - Employees (especially Site Engineers, Architects, and Surveyors) allocate their 8-hour workday across active projects (e.g., 5 Hours on "Green Horizon Tower - Structural Slab Inspection", 3 Hours on "Lakeview Heights - Plumbing Layout").
  - Auto-allocates employee salary cost to respective project cost centers in the ERP General Ledger.

#### Screen 6: Advance Salary & Provident Fund (PF) Loan Request
- Submit request for emergency salary advance or PF loan.
- Dynamic repayment calculator: Select deduction in 3, 6, or 12 monthly installments from future payslips.
- Multi-tier HR and Finance approval routing.

---

### 3. REST API CONTRACTS:
- `POST /api/v1/hr/attendance/check-in` -> Submits geofenced check-in with selfie and coordinates.
- `GET /api/v1/hr/attendance/monthly-summary` -> Returns month-wise calendar attendance data.
- `GET /api/v1/hr/leave/balance` -> Returns current leave quotas.
- `POST /api/v1/hr/leave/apply` -> Submits leave request.
- `GET /api/v1/hr/payroll/payslips` -> Lists historical salary slips with PDF download link.
- `POST /api/v1/hr/timesheets` -> Submits daily project hours allocation.

---

### 4. ANTI-FRAUD & PERFORMANCE STANDARDS:
- Anti-Mock Location: Reject clock-in if `position.isMocked == true`.
- Zero offline attendance fraud: Attendance requires server timestamp verification to prevent device clock tampering.
```
