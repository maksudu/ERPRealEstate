# MASTER PROMPT: Flutter Executive Management & BI Mobile App (`bd_realestate_management_app`)

```markdown
### SYSTEM ROLE:
You are a Principal Flutter Mobile Architect and Enterprise Business Intelligence (BI) Specialist.

### PROJECT CONTEXT & GOAL:
Build `bd_realestate_management_app` — an ultra-secure, biometric-gated Flutter 3.24+ application for company owners, Managing Directors (MD), Board Members, Chief Financial Officers (CFO), and Chief Engineers in Bangladesh. The app provides a high-level executive cockpit, real-time sales vs. collection velocity, universal 1-tap biometric approvals (discounts, POs, contractor RA bills, refunds), project S-curve progress tracking, 90-day cash flow forecasting, and critical emergency incident alerts.

---

### 1. TECHNICAL STACK & SECURITY SPECIFICATIONS:
- **Framework**: Flutter 3.24+ (Dart 3.5+)
- **Architecture**: Clean Architecture with Reactive State Caching
- **State Management**: `flutter_bloc` (v8.1+)
- **Biometric Security**: `local_auth` (Strict Biometric Gate: Face ID / Fingerprint mandatory on app open and before every financial approval)
- **Data Visualization**: `fl_chart` (Interactive S-Curves, Sales Funnels, Cashflow Bar Charts, Donut Charts for Inventory)
- **Push Alerts**: `firebase_messaging` (High-priority silent & alert push notifications)

---

### 2. CORE SCREENS & EXECUTIVE WORKFLOWS (100% EXHAUSTIVE):

#### Screen 1: Biometric App Lock & Group Entity Selector
- Hardware-backed biometric prompt on cold start and when returning from background.
- Multi-Company Entity Selector: View metrics for the consolidated Group or switch between sister concerns (e.g. "ABC Holdings Ltd", "ABC Builders Ltd", "ABC Lands Ltd").

#### Screen 2: Executive BI Cockpit (Bird's Eye View)
- Top KPI Summary Cards (Real-Time BDT Formatting):
  - 📈 **Today's Sales**: ৳ ১.৪ কোটি (Month: ৳ ১৮.৫ কোটি | Target: ৳ ২৫ কোটি)
  - 💰 **Today's Collections**: ৳ ৭২.৫ লাখ (Month: ৳ ১২.৪ কোটি)
  - ⚠️ **Total Customer Overdue**: ৳ ৬.৮ কোটি (Aging: 45 Days)
  - 🏦 **Liquid Cash & Bank Balance**: ৳ ৯.২ কোটি (Across 8 Bank Accounts)
  - 🏗️ **Unsold Inventory Valuation**: ৳ ১২০ কোটি (Across 6 Active Projects)
- Interactive Charts:
  - Monthly Sales vs. Collection Trend (Dual bar chart).
  - Project-wise Revenue Contribution (Pie / Donut chart).
  - Quick Toggle: Filter metrics by Day, Week, Month, Quarter, Fiscal Year.

#### Screen 3: Universal 1-Tap Biometric Approval Center
- Centralized inbox consolidating pending approvals across all enterprise modules.
- Tabs with badge counters:
  1. **Discounts & Price Overrides (3)**:
     - Shows: Flat No, Base Price, Salesperson requested discount (e.g., 5% / ৳ ৬,০০,০০০), Sales Manager comment, and Impact on Project Profit Margin.
     - 1-Tap Slide to Approve with FaceID / Fingerprint authorization.
  2. **Procurement Purchase Orders & CS (4)**:
     - Shows: Supplier Name, Material (e.g. 100 MT 500W Rod @ ৳ ৯৮,০০০/MT), Comparative Statement summary, Total PO Value.
     - Tap to view attached PDF Comparative Statement.
  3. **Contractor Running Account (RA) Bills (2)**:
     - Shows: Contractor Name, Project, Gross Certified Work, Less Retention (5%), Less Advance Recovery, Net Payable.
  4. **Customer Cancellations & Refunds (1)**:
     - Shows: Customer Name, Unit, Total Paid, Forfeiture Deduction according to agreement terms, Net Refund Amount, Proposed installment payout schedule.
  5. **High-Value Journal Vouchers (2)**:
     - Debit/Credit accounts, project cost center, narration.

#### Screen 4: Project Progress & Construction S-Curve Radar
- Project Health List: Displays all running projects with health status badges (🟢 On Schedule, 🟡 Minor Delay, 🔴 Critical Delay).
- Deep Dive Project View:
  - Planned Baseline S-Curve vs. Actual Construction Progress percentage.
  - Current Milestone: (e.g., "7th Floor Slab Casting - 4 Days Behind Schedule").
  - Primary Delay Cause: (e.g., "Heavy rain & supply chain delay on stone chips").
  - Tap to view latest high-resolution watermarked site photos submitted by Site Engineers.

#### Screen 5: 90-Day Cash Flow Forecast & Solvency Radar
- Forecasted Inflows (Upcoming Installments + Projected New Bookings + Bank Loan Disbursements) vs. Forecasted Outflows (Committed POs + Subcontractor RA Bills + Debt Servicing + Payroll).
- Sinking Fund & Loan Covenant Tracker: Warns executive if projected cash balance dips below the company's minimum liquidity threshold.

#### Screen 6: Emergency Incident & Dispute Broadcast Center
- Real-time notification channel for high-severity site safety incidents (e.g., fall accidents, fire alarm triggers) or legal notices (e.g., court stay orders, RAJUK inspection notices).
- 1-Tap conference call launcher with Project Director and Legal Counsel.

---

### 3. REST API CONTRACTS:
- `GET /api/v1/management/cockpit` -> Returns consolidated high-level KPI metrics.
- `GET /api/v1/management/approvals/pending` -> Lists all pending approvals grouped by category.
- `POST /api/v1/management/approvals/{id}/action` -> Submits `APPROVE` or `REJECT` with biometric auth token and executive remarks.
- `GET /api/v1/management/projects/{id}/s-curve` -> Returns planned vs actual progress coordinates.
- `GET /api/v1/management/cashflow/forecast` -> Returns 90-day projected inflows vs outflows.

---

### 4. DESIGN & EXECUTIVE UI RULES:
- Ultra-premium dark/light theme with slate and gold accents (`#0F172A`, `#D97706`).
- Zero clutter: Information density optimized for quick executive decision-making.
- Instant response: Metrics cached in local state and updated in background via WebSockets.
```
