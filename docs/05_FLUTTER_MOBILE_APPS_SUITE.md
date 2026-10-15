# Flutter Mobile Apps Suite Specification (6 Production Apps)

## 1. Mobile Architecture & Unified Ecosystem

The Real Estate ERP mobile ecosystem consists of **six purpose-built Flutter 3.24+ applications** sharing a core mobile architecture (Clean Architecture with BLoC / Riverpod state management, Dio HTTP client, Hive/Isar for offline caching, and Firebase Cloud Messaging for instant push notifications).

```
                      [ Microservices API Gateway ]
                                    │
                                    ▼
       ┌────────────────────────────┼────────────────────────────┐
       │                            │                            │
 ┌─────▼──────┐              ┌──────▼─────┐               ┌──────▼─────┐
 │ 1. Sales   │              │  2. Site   │               │3.Collection│
 │    App     │              │    App     │               │    App     │
 └─────┬──────┘              └──────┬─────┘               └──────┬─────┘
       │                            │                            │
 ┌─────▼──────┐              ┌──────▼─────┐               ┌──────▼─────┐
 │4.Management│              │5. HR & Emp │               │6. Customer │
 │    App     │              │    App     │               │    App     │
 └────────────┘              └────────────┘               └────────────┘
```

---

## 2. App 1: Sales & CRM Mobile App (`bd_realestate_sales_app`)

### Target Users:
Sales Representatives, Relationship Managers, Direct Sales Executives, Channel Partner Managers.

### Core Workflows & Screens:
1. **Interactive Visual Unit Matrix (Digital Rate Card)**:
   - Color-coded grid per tower/floor: Green (Available), Amber (On Hold), Red (Sold), Purple (Landowner Share).
   - Tap to view flat layout, 3D render, carpet area, facing, floor escalation, and gross price.
2. **Instant Unit Locking & Reservation**:
   - 15-minute temporary lock via WebSocket to prevent collision while negotiating with a walk-in client.
   - Earnest money collection form (Cash/Card/Cheque upload) generating an instant provisional allotment receipt.
3. **Dynamic Payment Plan & EMI Calculator**:
   - Sliders for Down Payment (10% to 50%) and Tenure (12 to 60 months).
   - Generates exact milestone/monthly installment schedule PDF directly shareable to client's WhatsApp.
4. **Omnichannel Lead Management**:
   - Real-time push alert when a Facebook Lead Ad or website inquiry is assigned.
   - 1-Tap call/WhatsApp with automatic call-log duration and meeting notes capture.
5. **Site Visit Dispatch & Geofenced Check-in**:
   - Client pickup scheduler, site visit route map, and arrival confirmation at the project site.

---

## 3. App 2: Site Engineer & Construction App (`bd_realestate_site_app`)

### Target Users:
Project Site Engineers, Project Managers, Store In-Charges, Safety Inspectors.

### Core Workflows & Screens:
1. **Daily Progress Report (DPR) with Watermarked Geo-Tagging**:
   - Offline-capable camera capture embedding GPS coordinates, project ID, tower/floor, and timestamp into the image.
   - Daily narrative: Slab casting volume, brick masonry progress, plastering, and weather conditions.
2. **Subcontractor Labor Attendance (Daily Muster Roll)**:
   - Headcount logging by trade: Rod-binders, Masons, Plumbers, Electricians, and Casual Helpers.
   - Allocation to specific structural activities for accurate cost center accounting.
3. **Quality & Concrete Cube Test Records**:
   - Logging batching plant concrete mix, slump test value, and cylinder casting serials.
   - Automated push notifications on Day 7, Day 14, and Day 28 for crushing tests with lab report image upload.
4. **Site Store Requisition & GRN Receiver**:
   - Site Store keeper scans delivery challan for incoming Cement/Rod/Sand.
   - Flags quantity discrepancies against the Purchase Order before generating physical GRN.
5. **Safety & Non-Conformance Report (NCR)**:
   - Photo logging of safety violations (no helmet/harness) or substandard construction work.
   - Assigns corrective actions to subcontractors with strict closure deadlines.

---

## 4. App 3: Collection & Recovery Mobile App (`bd_realestate_collection_app`)

### Target Users:
Collection Officers, Field Recovery Agents, Accounts Receivable Executives.

### Core Workflows & Screens:
1. **Daily Collection Portfolio & Overdue Agenda**:
   - Map and route listing of clients with upcoming dues or bounced cheques in the officer's assigned territory.
2. **On-the-Spot Payment Collection**:
   - Supports Cash, Cheque, Pay Order, and bKash/Nagad merchant QR generation.
   - Instant digital Money Receipt (MR) issuance with digital signature capture.
3. **Thermal Bluetooth Printer Integration (ESC/POS)**:
   - Pairs via Bluetooth with standard portable 58mm/80mm thermal printers to print physical official money receipts on the spot.
4. **PDC (Post-Dated Cheque) Vault Management**:
   - Officer photographs collected cheques; optical/form capture of Cheque No, Bank, Branch, Clearing Date.
   - Cheque delivery confirmation to central treasury.
5. **Cheque Dishonour (NI Act 138) Action Tracker**:
   - Real-time alert when a deposited cheque bounces.
   - Officer logs physical service of statutory legal notices with photo proof of receiver signature.

---

## 5. App 4: Executive Management & BI App (`bd_realestate_management_app`)

### Target Users:
Managing Director, Chairman, Board of Directors, CFO, Chief Engineer.

### Core Workflows & Screens:
1. **Executive Cockpit (Bird's Eye View)**:
   - Daily/Monthly sales revenue, actual installment collections, construction expenditures, and liquid cash/bank balance.
   - Interactive charts of sold vs. unsold inventory valuation across all company projects.
2. **Universal 1-Tap Approval Center**:
   - Biometric (FaceID / Fingerprint) authenticated approvals for:
     - Sales discounts and price overrides exceeding standard matrix.
     - Procurement Purchase Orders (POs) and Comparative Statements (CS).
     - Subcontractor Running Account (RA) bills and advance releases.
     - Customer booking cancellations and refund tranches.
3. **Project Progress & Cost Variance Radar**:
   - High-level S-Curve (Planned Baseline vs. Actual Construction Progress).
   - Cost overrun alerts when actual material consumption exceeds BOQ threshold by >5%.
4. **Emergency & Incident Alert Broadcast**:
   - Instant push notifications for critical site accidents, legal notices, or major client disputes.

---

## 6. App 5: HR, Payroll & Field Employee App (`bd_realestate_hr_app`)

### Target Users:
All corporate staff, site engineers, surveyors, and field executives.

### Core Workflows & Screens:
1. **Geofenced Attendance with Anti-Spoofing**:
   - Clock-in / Clock-out validated against pre-registered GPS boundaries of the Head Office or assigned Project Sites.
   - Facial recognition liveness verification to prevent proxy attendance.
2. **Leave Management & Approvals**:
   - View annual, casual, and sick leave balances.
   - Submit leave applications with attachment upload; immediate manager push notification.
3. **Digital Payslip & Tax Deduction Vault**:
   - Download encrypted monthly salary slips detailing basic pay, house rent, allowances, provident fund (PF), and Tax Deducted at Source (TDS).
4. **Project Daily Timesheet & Activity Log**:
   - Site engineers log daily working hours against specific project WBS tasks for internal labor costing.

---

## 7. App 6: Customer Self-Service Mobile App (`bd_realestate_customer_app`)

### Target Users:
Apartment Buyers, Commercial Space Allottees, Co-buyers.

### Core Workflows & Screens:
1. **My Property Digital Portfolio**:
   - Unit specs: Tower, Floor, Flat No, Facing, Gross Area, Allotted Parking Bay.
   - View and download signed Allotment Letter, Deed of Agreement, and Floor Blueprint.
2. **Live Construction Progress Tracker**:
   - Milestone timeline (Foundation -> Structure -> Brickwork -> Finishing -> Handover).
   - High-resolution site progress photos and 360-degree virtual walkthrough updates uploaded monthly.
3. **Financial Statement & Online Installment Payment**:
   - Clear breakdown: Total Price, Paid Amount, Upcoming Due, and Overdue Balance.
   - Integrated online payment gateway (bKash, Nagad, Visa, Mastercard, Net Banking).
   - Instant download of official Money Receipts (MR) and annual statement of accounts.
4. **Pre-Handover Snagging & Inspection**:
   - Buyer inspects unit prior to handover; logs snags (e.g., paint scratch, tile crack, plumbing leak) with photos.
   - Real-time status tracking as the site team rectifies each punch item.
5. **Post-Handover Helpdesk & Association Management**:
   - Submit maintenance tickets during the 12-month Defect Liability Period (DLP).
   - View Building Owners' Association (Kallyan Samity) monthly service charge notices and AGM minutes.

---

## 8. Mobile Security, Offline Sync & Production Deployment
- **Offline Data Sync**:
  - Site App and Collection App use **Isar/Hive local storage** to allow 100% offline logging in deep basements or remote land sites.
  - Background synchronization service queues mutations and syncs with the FastAPI backend via idempotency keys upon network restoration.
- **Secure Storage**: Sensitive auth tokens and biometric credentials stored in iOS Keychain and Android EncryptedSharedPreferences.
- **Push Notification Infrastructure**: Firebase Cloud Messaging (FCM) topics segmented by Role, Project ID, and Customer ID.
