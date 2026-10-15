# MASTER PROMPT: Flutter Site Engineer & Construction Operations Mobile App (`bd_realestate_site_app`)

```markdown
### SYSTEM ROLE:
You are a Principal Flutter Mobile Architect and Lead Construction Tech Engineer.

### PROJECT CONTEXT & GOAL:
Build `bd_realestate_site_app` — an offline-first, rugged Flutter 3.24+ application for project site engineers, construction project managers (PM), store in-charges, and safety officers in Bangladesh. The app enables comprehensive Daily Progress Reports (DPR), anti-tamper photographic logging with embedded GPS watermarks, subcontractor daily labor muster rolls, concrete cylinder/cube crushing test lifecycle tracking, site store Goods Received Notes (GRN), and Non-Conformance Reports (NCR).

---

### 1. TECHNICAL STACK & ARCHITECTURE:
- **Framework**: Flutter 3.24+ (Dart 3.5+)
- **Architecture**: Offline-First Clean Architecture with local-first sync repository
- **State Management**: `flutter_bloc` (v8.1+)
- **Offline Database**: `isar` (v3.1+) or `hive_flutter` for storing un-synced DPRs, photos, and muster rolls
- **Network Sync Engine**: `workmanager` for background periodic synchronization with exponential backoff
- **Camera & Image Processing**: `camera`, `image` (for burning GPS and timestamp watermark directly into image pixels)
- **Location**: `geolocator` with mock-location / spoofing detection

---

### 2. CORE SCREENS & FIELD WORKFLOWS (100% EXHAUSTIVE):

#### Screen 1: Project Site Switcher & Daily Operations Dashboard
- Active Project selector (e.g. "Green Horizon Tower - Gulshan", "Lakeview Heights - Dhanmondi").
- Daily Status Widget: Today's weather (Sunny, Rainy, Heavy Storm), total laborers on-site, ongoing activities (e.g. "8th Floor Roof Slab Casting").
- Critical Alert Banners: "Cube Crushing Test Due Today (Day 28)", "Low Cement Stock Alert (<150 Bags)", "Pending NCR Closures (2)".
- Offline Sync Indicator: Floating badge displaying un-synced mutations (e.g., "3 Drafts Pending Sync").

#### Screen 2: Daily Progress Report (DPR) Site Diary
- Structural Hierarchy Selection: Tower -> Floor Level (e.g. Basement-2, Ground, 6th Floor) -> WBS Activity (Piling, Shuttering, Rod-binding, Casting, Brick Masonry, Plaster, Plumbing).
- Work Quantity Log: Concrete casting volume in CFT or cubic metres (m³), brickwork in sq ft, rod consumption in metric tons (MT).
- Work Narrative: Daily site diary entry describing achievements, structural inspections, contractor delays, or material shortages.
- Site Machinery Hours: Tower crane operating hours, concrete mixer machine, hoist, vibrator usage.

#### Screen 3: Anti-Tamper Watermarked Camera Module
- Custom camera interface ensuring photos are taken live on-site (disables gallery photo upload to prevent fraud).
- Image Processing Watermarking Pipeline:
  - Takes raw camera picture.
  - Fetches precise GPS coordinates (`latitude`, `longitude`, `accuracy`), altitude, and reverse-geocoded location.
  - Burns a high-contrast bottom watermark bar directly onto the photo bytes before saving:
    ```
    ┌────────────────────────────────────────────────────────┐
    │ 📍 Project: Green Horizon Tower | Floor: 8th Slab      │
    │ 📌 GPS: 23.7925° N, 90.4078° E (Acc: ±3m) | Elev: 12m  │
    │ 🕒 Date: 15-Oct-2026 11:42 AM BST | Engineer: Engr. Asif│
    └────────────────────────────────────────────────────────┘
    ```
- Saves locally in encrypted cache; queues for multipart background upload.

#### Screen 4: Subcontractor Labor Attendance (Daily Muster Roll)
- Grouped by Contractor / Subcontractor entity (e.g., "M/S Bismillah Construction - RCC Civil Contractor").
- Headcount by Trade:
  - Rod-binders (রড মিস্ত্রি / হেল্পার)
  - Masons (রাজ মিস্ত্রি / হেল্পার)
  - Shuttering Carpenters (কাঠ মিস্ত্রি)
  - Plumbers & Electricians (প্লাম্বার ও ইলেক্ট্রিশিয়ান)
  - Casual General Laborers (সাধারণ লেবার)
- Direct link to WBS activity for automated job-costing calculations in the ERP backend.

#### Screen 5: Concrete Casting & Cube/Cylinder Crushing Test Lifecycle
- Casting Event Logging: Mix ratio (e.g. 1:1.5:3 or Ready-Mix Class C25/C30), Batching plant name / Chalan No, Slump test reading (e.g. 100mm).
- Cylinder/Cube Batch Creation: Enters 3 or 6 sample IDs (e.g., `GHT-7FL-CUBE-01` to `06`).
- Automatic Schedule Generator & Local Push Notifications:
  - 🔔 **Day 7 Test**: 65-70% design strength check.
  - 🔔 **Day 14 Test**: Interim strength check.
  - 🔔 **Day 28 Test**: 100% design compressive strength (e.g. 3,500 - 4,000 PSI).
- Crushing Strength Entry Screen: Input actual failure load in kN/PSI; attaches lab test result certificate image; auto-evaluates `PASS` or `FAIL`.

#### Screen 6: Site Store Material Requisition (MRN) & Goods Received Note (GRN)
- Requisition Form (MRN): Request incoming cement, rod (500W deformed bar), sand (Sylhet sand FM 2.5), bricks, stone chips.
- GRN Receiver:
  - Physical inspection of supplier truck arrival.
  - Scans or photographs supplier Delivery Chalan.
  - Enters received quantity vs. chalan quantity; highlights discrepancies.
  - Quality checklist: Rod rust inspection, cement bag condition (no caking/lumps), sand silt percentage.
  - Submits GRN: Instantly updates site store inventory balance in the backend.

#### Screen 7: Safety Violations & Non-Conformance Report (NCR)
- Safety Audits: PPE checklist (Helmet, Safety Boots, Harness, Gloves).
- Non-Conformance Report (NCR) Logging:
  - Category: Structural Defect, Honeycombing, Cover Block Missing, Safety Hazard.
  - Severity: Low, Medium, High, Critical.
  - Photo documentation of defect.
  - Assigns subcontractor with rectification deadline (e.g., 24 hours).
  - Re-inspection and sign-off workflow once rectified.

---

### 3. REST API CONTRACTS:
- `GET /api/v1/construction/projects/{id}/dpr/schema` -> Fetches towers, floors, and activities for offline caching.
- `POST /api/v1/construction/dpr` -> Submits daily progress report with watermarked photos.
- `POST /api/v1/construction/labor-muster` -> Submits daily contractor manpower counts.
- `POST /api/v1/construction/concrete-tests` -> Registers new casting cube batch.
- `PUT /api/v1/construction/concrete-tests/{id}/results` -> Records Day 7/14/28 crushing test result.
- `POST /api/v1/inventory/site-grn` -> Creates Goods Received Note with supplier challan photo.
- `POST /api/v1/construction/ncr` -> Raises new quality or safety NCR.

---

### 4. DESIGN & OFFLINE RESILIENCE RULES:
- High-contrast outdoor visibility UI: High readability under bright sunlight on construction sites.
- Big touch targets (minimum 48dp) suitable for site engineers wearing safety gloves.
- Unbreakable Offline Sync: App never crashes on missing network; all actions queue in `isar` database and sync automatically when internet is detected.
```
