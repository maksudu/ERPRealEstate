# 🏢 TIER-1 ENTERPRISE REAL ESTATE & CONSTRUCTION ERP
## MASTER COPY-PASTE EXECUTION PLAYBOOK (BANGLADESH & INTERNATIONAL EDITION)

> **Goal**: 100% Production-Ready, Zero-Gap, International Tier-1 Enterprise Real Estate & Construction ERP.  
> **Standards Complied**: Bangladesh Labour Act 2006, NBR VAT Act 2012, Income Tax Act 2023, IFRS 15 (Revenue from Contracts with Customers), RAJUK/CDA/KDA/RDA Building Codes.  
> **Tech Stack**: Python 3.12 (FastAPI, SQLAlchemy, Redis, Celery), MySQL 8.0, Angular 19 (Signals, Standalone Components, Vanilla CSS / Tailwind Design Tokens).

---

## 📑 TABLE OF MASTER PROMPTS

- [PROMPT 01: Enterprise HRMS & Construction Site Labour Management](#prompt-01-enterprise-hrms--construction-site-labour-management)
- [PROMPT 02: CFO-Grade Accounts, Multi-Project Cost Centers & CWIP Engine](#prompt-02-cfo-grade-accounts-multi-project-cost-centers--cwip-engine)
- [PROMPT 03: Visual 2D Tower Stacking Plan & Dynamic Interactive Inventory](#prompt-03-visual-2d-tower-stacking-plan--dynamic-interactive-inventory)
- [PROMPT 04: Bangladesh NBR VAT (Mushak 6.3/6.5), TDS/VDS & Section 53FF AIT Engine](#prompt-04-bangladesh-nbr-vat-mushak-6365-tdsvds--section-53ff-ait-engine)
- [PROMPT 05: Land Bank, Khatian/Dag & Landowner JV (50:50 / 60:40) Ratio Sharing](#prompt-05-land-bank-khatiandag--landowner-jv-5050--6040-ratio-sharing)
- [PROMPT 06: Construction WBS, BOQ Hard Budget Locks, Site Diary (DPR) & RA Billing](#prompt-06-construction-wbs-boq-hard-budget-locks-site-diary-dpr--ra-billing)
- [PROMPT 07: Supply Chain & Procurement (PR → RFQ → Comparative Statement CS → PO → GRN → QC → Store Issue)](#prompt-07-supply-chain--procurement-pr--rfq--comparative-statement-cs--po--grn--qc--store-issue)
- [PROMPT 08: Multi-Tier Maker-Checker Approval Workflow & Dynamic Governance Engine](#prompt-08-multi-tier-maker-checker-approval-workflow--dynamic-governance-engine)
- [PROMPT 09: Omnichannel CRM, Sales Funnel, Lead Scoring & Escalated Discount Approvals](#prompt-09-omnichannel-crm-sales-funnel-lead-scoring--escalated-discount-approvals)
- [PROMPT 10: Smart Installments, Milestone Schedules, Money Receipts & Tripartite Bank Loan Ledger](#prompt-10-smart-installments-milestone-schedules-money-receipts--tripartite-bank-loan-ledger)
- [PROMPT 11: Handover, Digital Snag List, 12-Month DLP Warranty & Commercial Rental Leasing](#prompt-11-handover-digital-snag-list-12-month-dlp-warranty--commercial-rental-leasing)
- [PROMPT 12: Legal & Statutory Compliance Vault, Land Dispute Tracking & RAJUK/CDA Approvals](#prompt-12-legal--statutory-compliance-vault-land-dispute-tracking--rajukcda-approvals)
- [PROMPT 13: Executive Management BI Cockpit, Cash Runway & Project Profitability Forecasting](#prompt-13-executive-management-bi-cockpit-cash-runway--project-profitability-forecasting)
- [PROMPT 14: Customer Self-Service Portal & Flat Owner Transparency Mobile Web App](#prompt-14-customer-self-service-portal--flat-owner-transparency-mobile-web-app)
- [PROMPT 15: Global UI/UX Luxury Overhaul (Design Tokens, Dark/Light Luxury Themes, Glassmorphism)](#prompt-15-global-uiux-luxury-overhaul-design-tokens-darklight-luxury-themes-glassmorphism)

---

### PROMPT 01: Enterprise HRMS & Construction Site Labour Management
```markdown
ROLE: Principal HRMS Architect & Full-Stack Engineer.
TASK: Build a 100% production-ready, enterprise-grade HRMS & Workforce Management module for a Real Estate & Construction ERP compliant with the Bangladesh Labour Act 2006.

BACKEND SPECIFICATIONS (FastAPI + SQLAlchemy):
1. Dual Workforce Architecture:
   - Corporate/Head-Office Staff: Permanent/contractual, monthly payroll, KPI, sales incentives, provident fund.
   - Construction Site Workforce: Site engineers, supervisors, foremen, and daily/contractual labour (Muster Roll).
2. Database Tables:
   - `hr_departments`: id, code, name, head_of_dept_id, is_active
   - `hr_designations`: id, title, grade_level, department_id
   - `hr_employees`: id, employee_code, first_name, last_name, official_email, phone, nid_number, tin_number, joining_date, confirmation_date, probation_months, employment_type (PERMANENT, PROBATION, CONTRACTUAL, INTERN), status (ACTIVE, RESIGNED, TERMINATED), department_id, designation_id, reporting_to_id, bank_account_no, bank_name, routing_no.
   - `hr_site_labour_contractors`: id, company_name, trade_license, contact_person, phone, rate_card_json, tax_nid.
   - `hr_labour_muster_roll`: id, project_id, tower_id, muster_date, shift (DAY, NIGHT), contractor_id, skill_type (MASON, ROD_BINDER, CARPENTER, HELPER, PLUMBER, ELECTRICIAN), headcount, standard_hours, overtime_hours, hourly_rate, total_amount, site_engineer_id, approval_status (DRAFT, APPROVED).
   - `hr_attendance`: id, employee_id, punch_date, clock_in, clock_out, late_minutes, status (PRESENT, ABSENT, LEAVE, LATE, HOLIDAY), source (BIOMETRIC, GPS_MOBILE, MANUAL_OVERRIDE), geofence_lat, geofence_lng, remarks.
   - `hr_leave_applications`: id, employee_id, leave_type (CASUAL, SICK, EARNED, MATERNITY), start_date, end_date, total_days, reason, document_url, status (PENDING, APPROVED, REJECTED), approved_by_id.
   - `hr_payroll_runs`: id, month, year, project_id (NULL for corporate, set for site staff cost allocation), total_gross, total_deductions, total_net, disbursement_date, status (DRAFT, VERIFIED, APPROVED, DISBURSED).
   - `hr_payslips`: id, payroll_run_id, employee_id, basic_salary, house_rent, medical, conveyance, site_hazard_allowance, mobile_allowance, overtime_amount, sales_commission, festival_bonus, pf_deduction, tax_tds_deduction, advance_salary_deduction, loan_emi_deduction, net_payable.
3. Automated Calculation Engine:
   - Bangladesh Income Tax (TDS) automated monthly deduction based on projected annual salary slab.
   - Overtime: (Basic / 208) * 2 * Overtime Hours for technical site staff.
   - Provident Fund (PF): 8.33% employee contribution + 8.33% employer contribution.
   - Automatic Accounting Integration: On disbursement, auto-generate a double-entry Journal Voucher debiting "Project Labour/Salary Expense (Cost Center)" and crediting "Bank / Salary Payable".

FRONTEND SPECIFICATIONS (Angular 19 Standalone):
1. Location: `frontend/src/app/features/hrms/`
2. Routes:
   - `/hrms/dashboard`: Live attendance donut chart, department-wise headcount, today's late arrivals, birthday/probation alert cards.
   - `/hrms/employees`: Data table with search, filter by department/project, and "Add Employee" wizard.
   - `/hrms/muster-roll`: Site Labour Master Roll Grid for daily batch attendance and piece-rate calculation.
   - `/hrms/payroll`: Monthly payroll generation, approval workflow, and one-click bilingual PDF payslip generator.
   - `/hrms/attendance`: Calendar heatmap of punches, geofence site logs, and regularization requests.
3. Deliverables: Backend router registered in `main.py`, models, schemas, service, seed data with 20 real estate staff and 5 site labour contractors, and responsive Angular UI.
```

---

### PROMPT 02: CFO-Grade Accounts, Multi-Project Cost Centers & CWIP Engine
```markdown
ROLE: Lead Enterprise Financial Systems Architect (SAP/Oracle Financials Expert).
TASK: Build a Tier-1 Construction & Real Estate Financial Management Engine with multi-dimensional cost centers, CWIP, and IFRS-15 Revenue Recognition.

BACKEND SPECIFICATIONS (FastAPI + SQLAlchemy):
1. 5-Tier Hierarchical Chart of Accounts (COA):
   - Level 1: Assets, Liabilities, Equity, Revenue, Direct Project Cost, Administrative Expenses.
   - Level 2-4: Sub-groups (e.g., Current Assets -> Cash & Bank -> Escrow Accounts).
   - Level 5: Posting Ledger Accounts with Project & Cost-Center dimensions.
2. Tables:
   - `acc_chart_of_accounts`: id, account_code, account_name, parent_id, account_type, is_group, currency, is_reconciliation_account.
   - `acc_cost_centers`: id, code, name, project_id, tower_id, wbs_stage (SUBSTRUCTURE, SUPERSTRUCTURE, FINISHING, MEP).
   - `acc_fiscal_years`: id, year_name, start_date, end_date, is_closed.
   - `acc_vouchers`: id, voucher_no (Auto JV-2026-0001), voucher_type (JOURNAL, PAYMENT, RECEIPT, CONTRA, REVERSE), voucher_date, narration, is_posted, posted_by_id, created_by_id.
   - `acc_voucher_lines`: id, voucher_id, account_id, cost_center_id, project_id, debit_amount, credit_amount, cheque_no, cheque_date, bill_reference, line_narration.
   - `acc_pdc_vault`: id, cheque_no, bank_name, branch_name, drawer_name, cheque_date, amount, customer_id, project_id, flat_id, status (IN_VAULT, DEPOSITED, CLEARED, BOUNCED), bounce_reason, legal_notice_sent.
   - `acc_bank_reconciliations`: id, bank_account_id, statement_date, statement_balance, book_balance, difference, status.
3. Real Estate Specialized Accounting Logic:
   - CWIP (Construction Work in Progress): All site materials, contractor bills, and site wages are booked under:
     DEBIT: CWIP - [Project ID] - [Cost Center]
     CREDIT: Accounts Payable / Bank
   - IFRS 15 Revenue Recognition: Customer installment receipts are booked as Liability:
     DEBIT: Bank / Escrow Account
     CREDIT: Customer Advance Liability - Flat [Unit ID]
   - Handover/POC Recognition: Capitalize CWIP to Cost of Sales and realize Revenue upon customer possession:
     DEBIT: Customer Advance Liability & DEBIT: Cost of Goods Sold (Flats)
     CREDIT: Real Estate Sales Revenue & CREDIT: CWIP
4. Smart Bank Statement Reconciliation:
   - Endpoint to parse Bank CSV/Excel and match transactions against open vouchers by date range, amount, and reference.

FRONTEND SPECIFICATIONS (Angular 19 Standalone):
1. Location: `frontend/src/app/features/accounts/`
2. Views:
   - Tree-view Interactive Chart of Accounts with search and inline balance indicator.
   - Comprehensive Voucher Entry form with dynamic lines, debit/credit auto-balance verification, and project/cost-center selector.
   - Project-wise Real-time Trial Balance, Profit & Loss (Budgeted vs Actual Cost Variance), and Balance Sheet.
   - PDC Cheque Management Kanban (In Vault -> Deposited -> Cleared / Dishonored).
   - Bank Statement Reconciliation Wizard with auto-match highlight.
```

---

### PROMPT 03: Visual 2D Tower Stacking Plan & Dynamic Interactive Inventory
```markdown
ROLE: Principal UI/UX & Angular 19 Engineer.
TASK: Build an interactive, visual 2D Tower Stacking Plan & Unit Matrix that transforms property inventory from basic tables into an executive-level visual experience.

BUSINESS LOGIC & REQUIREMENTS:
1. Spatial Architecture:
   - Project -> Towers/Blocks -> Floors (Basement, Ground, Podium, Typical 1..20, Penthouse) -> Units (Apartments, Commercial, Shops, Parking).
2. Database Enhancements:
   - `inv_units`: id, tower_id, floor_number, unit_number (e.g., 5A), unit_type (APARTMENT, COMMERCIAL, DUPLEX, PENTHOUSE), gross_sft, net_carpet_sft, facing (SOUTH, NORTH_EAST, LAKE_VIEW, CORNER), bed_count, bath_count, balcony_count, base_price_per_sft, floor_rise_rate, facing_premium, total_base_price, status (AVAILABLE, RESERVED, BOOKED, SOLD, LANDOWNER_SHARE, BLOCKED), locked_by_user_id, locked_until_timestamp.
   - `inv_parking_slots`: id, project_id, basement_level, slot_number, slot_type (BASEMENT_1, BASEMENT_2, OPEN), assigned_unit_id, status.
3. Visual 2D Stacking Plan (Architectural Floor Grid):
   - A visual architectural elevation cross-section showing all floors stacked vertically.
   - On each floor, display unit tiles color-coded by status:
     * Green (#10B981): Available
     * Amber (#F59E0B): Under 15-Minute Reservation
     * Red (#EF4444): Sold / Executed Agreement
     * Blue (#3B82F6): Landowner Allocated Unit
     * Purple (#8B5CF6): Company Retained / Commercial Lease
     * Grey (#6B7280): Blocked / Not for Sale
4. Interactive Micro-Interactions:
   - Hover Card: Instant popup showing unit size, facing, bed/bath count, calculated price, and floor plan thumbnail.
   - Click Action: Opens a slide-over Unit Detail Drawer with:
     * High-res Floor Plan & 3D render gallery.
     * Dynamic Price Calculator: Base Price + Floor Rise Cost + Facing Premium + Car Parking + Utility Connection Fee - Max Allowable Discount.
     * "Instant Reserve" button with a 15-minute countdown lock via Redis/WebSocket to prevent double booking.
5. Unit Subdivision & Combination:
   - Ability to merge two adjacent units (e.g., 10A + 10B = Duplex) or split commercial floors into multiple shop allotments.
```

---

### PROMPT 04: Bangladesh NBR VAT (Mushak 6.3/6.5), TDS/VDS & Section 53FF AIT Engine
```markdown
ROLE: Bangladesh Tax, Regulatory & Enterprise Backend Specialist.
TASK: Implement complete NBR (National Board of Revenue) VAT & Tax compliance automation for Real Estate Developers.

BUSINESS LOGIC & REQUIREMENTS:
1. VAT & Withholding Automation (VAT Act 2012):
   - VDS (VAT Deducted at Source) on Procurement:
     * Automated deduction on Sand, Bricks, Tiles, Transport, Consultancy bills.
   - Mushak 6.3 Generation:
     * Automated bilingual PDF generation of official Mushak 6.3 Tax Invoice on every customer billing/milestone release.
   - Subcontractor Bill Mushak 6.5:
     * Official transfer and work bill documentation for construction sites.
2. TDS (Tax Deducted at Source under Income Tax Act 2023):
   - Automated deduction rules:
     * Contractor bills: 3% to 7% based on bill size.
     * Professional/Consultant fees: 10% to 12%.
     * Supplier supplies: 2% to 5%.
   - Automated Treasury Challan generation & Deduction Certificates (Form 54).
3. Section 53FF Advance Income Tax (AIT) on Flat & Land Registration:
   - Calculator based on Rajuk/Poura/City Corporation zones (e.g., Gulshan/Banani vs Uttara vs Purbachal rates per sft).
   - Generates the exact tax breakdown required before Sub-Registry execution.
4. Deliverables:
   - FastAPI endpoints: `/api/v1/tax/mushak-6-3/{invoice_id}`, `/api/v1/tax/tds-calculator`, `/api/v1/tax/ait-section-53ff`.
   - Angular UI in `features/tax/` with printable official NBR formatted challans.
```

---

### PROMPT 05: Land Bank, Khatian/Dag & Landowner JV (50:50 / 60:40) Ratio Sharing
```markdown
ROLE: Real Estate Legal & Land Management Specialist.
TASK: Build an advanced Land Acquisition, Mutation & Joint-Venture (JV) Developer-Landowner Sharing Module.

BUSINESS LOGIC & REQUIREMENTS:
1. Land Record Management:
   - Mouza, JL Number, Upazila/Thana, Sub-Registry Office.
   - Khatian Hierarchy: CS (Cadastral Survey), SA (State Acquisition), RS (Revisional Survey), City/BS (Bangladesh Survey).
   - Dag/Plot tracking with multi-unit conversion: Katha, Decimal, Bigha, and Square Feet.
   - Deed, Mutation Parcha, DCR, and Khajna (Land Development Tax) receipt upload with annual expiry alerts.
2. Joint Venture (JV) Ratio & Sharing Engine:
   - Configurable Sharing Ratio (e.g., 50% Developer : 50% Landowner or 60:40).
   - Automated Unit Allocation Matrix: Allocate specific flats, floors, and car parking spots to Landowner vs Developer.
   - Signing Money & Milestone Payments: Landowner advance payments, installment schedules, and adjustment against developer's share.
   - Power of Attorney (PoA) tracking with expiration and legal verification checklist.
3. Deliverables:
   - Database tables: `land_parcels`, `land_khatians`, `land_dags`, `land_owners`, `land_jv_agreements`, `land_jv_allocations`.
   - Angular 19 UI in `features/land/` with interactive unit allocation grid for landowners.
```

---

### PROMPT 06: Construction WBS, BOQ Hard Budget Locks, Site Diary (DPR) & RA Billing
```markdown
ROLE: Construction Management & Civil Engineering Tech Architect.
TASK: Implement a comprehensive Construction Engineering, BOQ & Contractor Running Account (RA) Billing Subsystem.

BUSINESS LOGIC & REQUIREMENTS:
1. Work Breakdown Structure (WBS) & Activity Master:
   - Multi-tier tree: Project -> Tower -> Phase (Substructure, Superstructure, Finishing) -> Activity (Piling, Mat Casting, Column, Brickwork, Plaster, Tiles).
   - Milestone tracking with Planned Start/End vs Actual Start/End and % completion.
2. Bill of Quantities (BOQ) with Dynamic Variance Control:
   - Item code, description, unit (CFT, RFT, SFT, Bag, Ton, Nos), estimated quantity, unit rate, total budget.
   - Hard Budget Lock: Site cannot requisition material exceeding 105% of BOQ quantity without an approved Variation Order (VO).
3. Daily Progress Report (DPR / Site Diary):
   - Daily logs: Weather conditions, work executed by floor/unit, machinery deployed, site photo uploads, safety incident logs.
4. Subcontractor RA Billing Engine:
   - Joint Measurement Sheet (JMS) entry verified by Site Engineer.
   - Automated Deductions:
     * Retention Money (typically 5% to 10% kept for 12 months DLP).
     * Mobilization Advance recovery.
     * Material consumed from developer store (Diesel, Cement, Steel recovery).
     * Income Tax (TDS) & VDS.
   - Generates Net Payable Contractor Bill with approval signature chain.
```

---

### PROMPT 07: Supply Chain & Procurement (PR → RFQ → Comparative Statement CS → PO → GRN → QC → Store Issue)
```markdown
ROLE: Supply Chain & Procurement Specialist.
TASK: Build an end-to-end procurement and site inventory workflow with 3-way matching and comparative statements.

BUSINESS LOGIC & REQUIREMENTS:
1. Workflow Cycle:
   - Material Requisition (MR) from Site Engineer -> Checked against BOQ remaining budget.
   - Request for Quotation (RFQ) sent to approved vendors.
   - Comparative Statement (CS): Dynamic side-by-side comparison of supplier quotes (Price, Payment terms, Brand/Grade, Delivery time) with lowest bidder highlight.
   - Purchase Order (PO): Multi-tier approved PO with delivery schedule.
   - Gate Entry & Goods Receipt Note (GRN): Physical count verification at site gate.
   - Quality Inspection (QC): Slump test, tensile strength test (MTR - Mill Test Report) verification before stock entry.
   - Material Issue Note (MIN): Materials issued directly against a specific Tower, Floor, and WBS code.
2. Store Stock & Valuation:
   - Central Warehouse and Multi-site store separation.
   - Real-time stock balance with Weighted Average / FIFO inventory valuation.
   - Inter-site stock transfer with dispatch and receipt acknowledgment.
```

---

### PROMPT 08: Multi-Tier Maker-Checker Approval Workflow & Dynamic Governance Engine
```markdown
ROLE: Enterprise Security & Governance Architect.
TASK: Build a dynamic, configurable Maker-Checker-Authorizer Approval Engine spanning all modules.

BUSINESS LOGIC & REQUIREMENTS:
1. Configurable Approval Chains:
   - Rules based on document type and financial threshold:
     * Discount Approval: 1% to 3% = Sales Manager; 3% to 7% = Head of Sales; > 7% = Managing Director.
     * Purchase Order: < 1 Lakh = Project Engineer; 1 to 10 Lakh = Procurement Head; > 10 Lakh = COO/MD.
     * Customer Booking Cancellation & Refund: Mandatory 3-tier approval (Accounts + Head of Sales + MD).
2. Features:
   - Multi-channel notification: Push notification in Web, Mobile, and Email with quick "Approve / Reject / Request Correction" buttons.
   - Field-Level Audit Trail: Complete timeline showing who created, who reviewed, timestamps, IP addresses, and comment logs.
```

---

### PROMPT 09: Omnichannel CRM, Sales Funnel, Lead Scoring & Escalated Discount Approvals
```markdown
ROLE: CRM & Sales Operations Architect.
TASK: Implement a comprehensive Real Estate Sales CRM with automated installment generation and digital agreements.

BUSINESS LOGIC & REQUIREMENTS:
1. Lead Ingestion & Distribution:
   - Facebook Lead Ads Webhook, Website Contact Form, and Walk-in visitor capture.
   - Auto-assignment round-robin to sales executives by project specialization.
   - Pipeline stages: New Lead -> Contacted -> Site Visit Scheduled -> Site Visit Completed -> Negotiation -> Token Booked -> Lost.
2. Sales Booking & Customer Profile:
   - Primary buyer + Joint-buyers + Nominee KYC (NID, Passport, Photos, E-TIN).
   - Pricing breakdown: Base price, parking slot selection, utility charges, documentation charges.
3. Automated Installment Schedule Generator:
   - Milestone-linked schedules (e.g., Booking: 10%, Down Payment: 15%, On Roof Casting 5th Floor: 10%, Handover: 10%).
   - Equal Monthly Installments (EMI) with custom grace periods.
   - Automated due-date calculation, SMS/WhatsApp alert dispatch, and late payment surcharge calculation.
```

---

### PROMPT 10: Smart Installments, Milestone Schedules, Money Receipts & Tripartite Bank Loan Ledger
```markdown
ROLE: Banking & Collection Systems Architect.
TASK: Build a high-precision collection and banking ledger module for installment tracking and home loan disbursements.

BUSINESS LOGIC & REQUIREMENTS:
1. Collection Management:
   - Multi-mode receipt: Cash, Cheque, Online Bank Transfer, BEFTN, RTGS, bKash/Nagad.
   - Auto-generated Money Receipt (MR) with QR code verification and SMS confirmation to customer.
   - Partial payment adjustment logic (first adjusts late fees, then oldest overdue installment).
2. Bank Home Loan (Tripartite) Tracking:
   - Tripartite Agreement between Buyer, Developer, and Financial Institution (DBH, IDLC, Standard Chartered, City Bank, etc.).
   - Tranche Disbursement Tracking: Bank sanction letter recording, developer NOC issuance, inspection completion, and tranche collection reconciliation.
```

---

### PROMPT 11: Handover, Digital Snag List, 12-Month DLP Warranty & Commercial Rental Leasing
```markdown
ROLE: Property Management & Facilities Architect.
TASK: Build a comprehensive Handover, Snagging, DLP (Defect Liability Period), and Rental Management Subsystem.

BUSINESS LOGIC & REQUIREMENTS:
1. Handover & Snagging Inspection:
   - Joint inspection by Customer & Project Engineer before possession.
   - Digital Snag List: Category (Civil, Paint, Plumbing, Electrical), location, photo attachment, defect description, assigned contractor, and fix status.
   - Possession Letter and Key Handover Certificate generation once all financial clearances are signed off.
2. Defect Liability Period (DLP) Warranty:
   - 12-month automated warranty tracking for structural, plumbing, and electrical defects with SLA resolution timers.
3. Commercial Space & Shop Rental/Lease Engine:
   - Tenant profile, lease agreement terms, security deposit tracking, monthly CAM (Common Area Maintenance) service charge billing, and utility sub-meter reading entries.
```

---

### PROMPT 12: Legal & Statutory Compliance Vault, Land Dispute Tracking & RAJUK/CDA Approvals
```markdown
ROLE: Corporate Legal & Compliance Specialist.
TASK: Build a statutory compliance and legal dispute tracker for real estate projects.

BUSINESS LOGIC & REQUIREMENTS:
1. Statutory Clearances & Permits:
   - RAJUK / CDA / KDA / RDA Building Plan Sanction tracking.
   - Environmental Clearance (DoE), Fire Service NOC, Civil Aviation clearance, WASA, and DESCO/DPDC sub-station approvals.
   - Approval conditions checklist, renewal calendar, and automated reminder alerts before expiration.
2. Dispute & Litigation Vault:
   - Case tracking: Court name, Case No, Section, Plaintiff, Defendant, Next hearing date, Advocate details, Interim stay orders.
   - Digital safe archive for certified copies of land titles, High Court petitions, and judgment summaries.
```

---

### PROMPT 13: Executive Management BI Cockpit, Cash Runway & Project Profitability Forecasting
```markdown
ROLE: Data Architect & Executive Dashboard Designer.
TASK: Build an executive BI Cockpit for Board Members, Managing Directors, and CFOs.

BUSINESS LOGIC & REQUIREMENTS:
1. Executive KPIs:
   - Portfolio Total Asset Value, Total Sold vs Unsold Inventory Value.
   - Net Cash Runway (Projected Cash Inflow from Installments vs Committed Material & Labour Liabilities for next 90/180 days).
   - Sales Velocity: Average days to sell a unit per project.
   - Construction Schedule Performance Index (SPI) & Cost Performance Index (CPI) based on Earned Value Management (EVM).
2. Visual Charts (ECharts / Chart.js):
   - Project-wise profitability comparisons.
   - Real-time heatmaps of overdue collections.
   - 1-click export to Board Presentation PDF and Excel audit workbooks.
```

---

### PROMPT 14: Customer Self-Service Portal & Flat Owner Transparency Mobile Web App
```markdown
ROLE: Customer Experience & Angular/Mobile Engineer.
TASK: Build a secure, transparent Customer Portal (`/portal/customer`) for flat owners.

BUSINESS LOGIC & REQUIREMENTS:
1. Customer Dashboard:
   - Live photo gallery of their building's construction progress updated weekly by site engineers.
   - Apartment specifications, allotted parking bay number, floor plan download.
2. Financial Transparency:
   - Complete ledger of payments made, downloadable Money Receipts (PDF).
   - Upcoming installment timeline with payment gateway integration for online payments.
3. Support & Service Requests:
   - Submit snag/maintenance tickets with photo attachments and track resolution status in real time.
```

---

### PROMPT 15: Global UI/UX Luxury Overhaul (Design Tokens, Dark/Light Luxury Themes, Glassmorphism)
```markdown
ROLE: Principal UI/UX Designer & CSS Architect.
TASK: Transform the entire ERP into a visually stunning, luxury-grade application that wows real estate clients at first glance.

DESIGN GUIDELINES & SPECIFICATIONS:
1. Visual Hierarchy:
   - Modern luxury palette: Deep Slate / Navy background (#0F172A), crisp typography (Inter / Outfit), Gold/Bronze accents (#D97706, #CA8A04) symbolizing real estate prestige.
   - Crisp High-Contrast Light Mode for accountants and site staff under bright sunlight.
2. Micro-Animations & Data Density:
   - Glassmorphism header cards with subtle backdrop blur.
   - Smooth skeleton loaders for all data grids.
   - Interactive badge chips with pulsing indicators for live locks and pending approvals.
   - Responsive layouts optimized for large 4K boardroom displays down to site tablets.
```
