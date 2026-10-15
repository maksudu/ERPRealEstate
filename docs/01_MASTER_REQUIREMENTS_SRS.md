# Real Estate ERP (Bangladesh Edition) - Master Software Requirements Specification (SRS)

## 1. Executive Summary & Domain Scope
This document specifies the complete, 100% exhaustive architectural and functional requirements for an enterprise-grade Real Estate ERP system built specifically for Bangladesh property development firms. It manages the entire lifecycle of real estate operations: Land Acquisition & Joint Venture (JV), Authority Clearances (RAJUK, CDA, KDA, RDA), Engineering, Estimation & BOQ, Construction & Site Supervision, Inventory & Unit Lifecycle, CRM & Sales Pipeline, Installment Schedules & PDC Cheque Vault, Procurement & Inventory, Double-Entry Accounting, Bangladesh VAT/TDS/VDS Compliance, Handover, Defect Liability, Owners Association, and Executive BI Reporting.

---

## 2. Complete Exhaustive Module Matrix (72 Functional Domains + 8 BD Extensions = 80 Total Modules)

### Group A: Land Acquisition, Joint Venture & Property Legal Management
1. **Landowner & Seller Directory**: Complete profiles of multiple land sellers, legal heirs, power of attorney (POA) holders, NID, TIN, bank accounts, and legal nominee tracking.
2. **Land Search & Proposal Pipeline**: Land evaluation proposals, location feasibility, prospective area metrics, acquisition offerings, and negotiation history logs.
3. **Mouza, JL, Khatian & Dag Engine**:
   - Multiple survey tracking across historic epochs: **CS (Cadastral Survey)**, **SA (State Acquisition)**, **RS (Revisional Survey)**, and **BS/BRS (Bangladesh Survey / City Survey)**.
   - Khatian wise ownership percentage, Dag (plot) boundary mapping, and JL (Jurisdiction List) number registry.
4. **Bangladesh Land Measurement & Conversion Engine**:
   - Dynamic conversion between: Decimal (শতাংশ), Katha (কাঠা), Bigha (বিঘা), Acre (একর), Square Feet (বর্গফুট), and Square Metres.
   - Configurable regional conversion ratio (e.g., standard 1 Katha = 720 sq ft, 1 Decimal = 435.6 sq ft, 1 Bigha = 20 Katha / 33.06 Decimal; with district-level overrides).
5. **Deed, Mutation & Ownership Verification**: Registered Deed (দলিল), Mutation Khatian (নামজারি খতিয়ান), DCR (Duplicate Carbon Receipt), and Land Development Tax (দাখিলা) tracking.
6. **Joint Venture (JV) & Landowner Share Allocation**:
   - Landowner vs. Developer ratio sharing (e.g., 50:50, 40:60, or complex unit-specific allocation).
   - Apartment, commercial space, floor, and parking allotment by owner tier.
   - Cash settlement, apartment share, and mixed settlement accounting.
7. **Land Valuation & Acquisition Costing**: Market price surveys, acquisition legal fees, broker fees, mutation expenses, and capitalized land cost.
8. **Legal Due Diligence & Encumbrance Register**: Vested property checks, mortgage status, court litigation, caveat/objection notices, and land acquisition (LA) clearance records.
9. **Land Payment Schedules & Settlements**: Installment disbursement to landowners, advance payments, milestone settlements, and tax deduction tracking.
10. **Land Registration & Sub-Registry Tracking**: Sub-registry office records, Stamp duty, Gain Tax (Section 53H/53FF), local government tax, and registration completion deed archive.

---

### Group B: Project Planning, Authority Approvals & Engineering Management
11. **Project Master & Feasibility Modeling**: Land acquisition cost, projected built-up area (FAR calculation), saleable area, expected revenue, break-even timeline, and IRR/ROI analysis.
12. **Project Land & Cost Center Hierarchy**: Multi-company, multi-branch, and multi-project hierarchical cost-center segregation.
13. **Building, Tower, Floor & Spatial Hierarchy**: Modular structure: Project -> Phase -> Tower/Building -> Floor -> Unit/Apartment + Parking Bays + Commercial Zones.
14. **Project Budgeting & Baseline Cost Control**: Civil, MEP, finishing, consultancy, approval, and administrative expense budget with revision controls.
15. **Project Milestone & WBS (Work Breakdown Structure)**: Foundation, Piling, Basement, Ground Slab, RCC Casting per floor, Brickwork, Plaster, Plumbing, Electrical, Tiles, and Handover milestones.
16. **Authority Clearances & Permit Workflow (RAJUK/CDA/KDA/RDA)**:
    - Land Use Clearance (LUC), Special Project Approval, Building Construction Committee (BCC) Approval.
    - Architectural plan approval, Structural vetting, Height clearance (Civil Aviation), Fire Safety NOC (FSCD), Environmental clearance (DoE), and Traffic clearance.
    - Permit validity alerts, condition tracking, and deviation records against approved plans.
17. **Architectural & Engineering Drawings DMS**: CAD, PDF, Structural, MEP, and 3D architectural drawings with strict versioning and watermark controls.
18. **Project Progress Dashboard & Gantt Engine**: Baseline vs. Actual timeline tracking, delay reason register, and critical path analysis.
19. **Project-Wise Profit & Loss**: Revenue recognition, direct costs, allocated overheads, and gross/net margin reporting per project.
20. **Feasibility Scenario Testing**: Real-time sensitivity analysis for fluctuations in rod/cement prices or sales velocity.

---

### Group C: Property Inventory, Rate Cards & Spatial Allocation
21. **Comprehensive Inventory Catalog**: Apartments, Duplexes, Penthouses, Commercial Offices, Shops, Parking Slots, and Storage spaces.
22. **Spatial Hierarchy & Unit Setup**: Floor plans, net carpet area, gross saleable area, common area percentage, and balcony/terrace dimensions.
23. **Unit Orientation & Attribute Matrix**: North/South/East/West facing, lake view, corner plot, road frontage, floor height multipliers.
24. **Real-time Unit Availability State Machine**:
    - States: `Available` -> `On Hold (Temporary Lock with Auto-expiry)` -> `Booked` -> `Sold` -> `Registered` -> `Handed Over` -> `Landowner Share (Non-Saleable by Developer)`.
25. **Dynamic Rate Card & Floor/Facing-Based Pricing**: Base rate per sq ft, floor-level escalation (e.g., +50 BDT/sq ft per floor), facing premium, corner premium, and parking pricing.
26. **Parking & Utility Slot Allocation**: Dedicated basement/ground floor parking bay numbering, mechanical parking slots, and car charging provision.
27. **Unit Merge, Split & Area Adjustment**: Boundary adjustments between adjoining units, recalculation of saleable area, and legal allotment revisions.
28. **Digital Property Showcase Assets**: High-resolution image galleries, 3D render walkthroughs, floor plan blueprints, and brochure asset management.
29. **Real-time Inventory Locking & Anti-Collision Engine**: Distributed Redis lock preventing simultaneous booking by multiple sales representatives.

---

### Group D: CRM, Lead Automation & Customer Onboarding
30. **Omnichannel Lead Aggregator**: Auto-capture from Facebook Lead Ads API, Google Ads, Company Website, WhatsApp Business, Property Portals, and Walk-in visits.
31. **Intelligent Lead Scoring & Auto-Assignment**: Round-robin, project-specialization, or performance-based routing to sales representatives with strict SLA timeouts.
32. **Client Scheduling & Site Visit Tracker**: Site visit logistics, transport dispatch, client pickup, site engineer escort logs, and feedback capture.
33. **Customer KYC & Nominee Profile**: Dual-buyer, co-owners, legal nominees, NID/Passport, TIN certificate, photographs, and overseas representative (POA) verification.
34. **Customer Budget & Requirement Matcher**: Bedroom requirements, preferred location, facing, down payment budget, and monthly installment capacity analysis.
35. **Follow-up Matrix & Escalation Engine**: Call logs, meeting minutes, automatic WhatsApp/SMS notifications, and inactive lead reassignment.
36. **Broker & Channel Partner Network**: Third-party real estate broker registration, referral agreements, commission slabs, and attribution tracking.
37. **Sales Funnel & Velocity Analytics**: Conversion ratios across Pipeline stages: New Lead -> Qualified -> Site Visit -> Negotiation -> Booking -> Dropped.

---

### Group E: Booking, Sales Execution & Agreement Management
38. **Apartment Allotment & Booking Workflow**: Allotment letter generation, booking deposit capture, and initial reservation certificate.
39. **Down Payment & Booking Money Accounting**: Segregation of earnest money, booking money, and down payment tranches.
40. **Price Negotiation & Multi-Level Discount Approval**: Role-based discount authorization thresholds (Sales Manager: max 1%, Director: max 3%, Managing Director: >3%).
41. **Bilingual Sales Agreement & Deed Generation**: Automated English and Bangla Deed of Agreement generation with dynamic clause binding.
42. **Milestone-Based Installment Generator**: Automated generation of monthly, quarterly, or construction-progress-linked payment plans.
43. **Customer Sales Ledger & Statement of Accounts**: Real-time ledger reflecting total unit price, utility charges, parking, payments made, dues, and interest/late fees.
44. **Booking Cancellation & Refund Engine**: Policy-driven forfeiture calculation, deduction rules, management approval, inventory release, and installment refund schedule.
45. **Unit Transfer & Ownership Assignment**: Buyer-to-buyer transfer, assignment deed, transfer fee collection, and historical chain of buyers.
46. **Co-buyer & Nominee Management**: Legal ownership split percentages and succession documentation.
47. **Registration & Sub-Registry Handover Milestone**: NOC for registration, stamp duty receipt, sub-registry appointment, and original deed handover.

---

### Group F: Construction, Site Engineering & BOQ Operations
48. **BOQ (Bill of Quantities) Master & Estimation**: Detailed itemization of RCC, deformed bar (rod/steel), Portland cement, sand, stone chips, bricks, tiles, paint, and MEP fixtures.
49. **Quantity Variation Orders (VO)**: Scope change requests, drawing revisions, additional quantity approvals, and rate analysis.
50. **Material Requisition & Issue Tracking**: Site engineer material requisition note (MRN), store validation, issue slips, and floor-wise consumption logging.
51. **Contractor & Subcontractor Directory**: Trade categorization (Piling, Civil, Electrical, Plumbing, Painting, Aluminum, Lift/Generator installer).
52. **Contractor Work Orders & Terms**: Unit-rate contracts, lump-sum contracts, milestone definitions, retention money policy, and safety conditions.
53. **Running Account (RA) Bills & Interim Certificates**: On-site measurement sheet validation, engineer certification, deduction of advances, and retention money holding.
54. **Daily Progress Report (DPR) & Site Diary**: Date-wise manpower attendance (Mason, Labor, Rod-binder), machinery hours, weather conditions, activity progress, and geo-tagged site photos.
55. **Labor Attendance & Daily Muster Roll**: Biometric/mobile attendance, casual labor muster roll, and weekly subcontractor wage clearing.
56. **Quality Assurance, Cube Testing & ITP**: Concrete slump tests, 7/14/28-day cylinder/cube crushing tests, laboratory reports, Non-Conformance Reports (NCR), and corrective actions.
57. **Site Safety, Incident Logs & BNBC Compliance**: PPE compliance, scaffold safety checklist, incident logging, and emergency drill records.

---

### Group G: Accounts, Financial Management & Banking
58. **Enterprise Chart of Accounts (COA)**: Multi-tiered COA with project, cost center, and company dimensions.
59. **General Ledger & Sub-Ledger Integration**: Automated real-time posting from Sales, Procurement, Payroll, and Construction.
60. **Accounts Payable & Receivable**: Vendor aging, customer installment aging, debit notes, credit notes, and automated overdue interest.
61. **Cash, Multi-Bank & Mobile Financial Service (MFS) Vault**: Petty cash registers, bank accounts, bKash/Nagad merchant accounts, and bank reconciliation statements (BRS).
62. **Voucher Management & Approval Workflow**: Debit Voucher, Credit Voucher, Journal Voucher, Contra Voucher with maker-checker-approver rules.
63. **Project-Wise Cash Flow & Cost Allocation**: Direct construction costs, indirect administration overheads, and project-wise fund allocation.
64. **Customer Advance & Revenue Recognition**: Revenue recognition based on percentage of completion (PoC) / IFRS 15 real estate standards.
65. **Term Loan, Overdraft & Project Financing**: Bank credit limits, interest accruals, quarterly EMI schedules, and hypothecation tracking.
66. **Statutory Financial Statements**: Real-time Trial Balance, Profit & Loss Statement, Balance Sheet, and Statement of Cash Flows.

---

### Group H: Installment Schedules, Collection & PDC Cheque Management
67. **Custom Installment Plan Engine**: Equal monthly installments (EMI), balloon payments, quarterly installments, and construction-linked milestone triggers.
68. **Automated Due-Date & Grace Period Engine**: Configurable grace periods (e.g., 7 days) and automated penalty/late-fee calculation.
69. **PDC (Post Dated Cheque) Vault & Clearing Engine**:
    - Cheque inventory: Cheque number, bank name, branch, routing number, clearing date, amount.
    - Deposit reminder alerts (T-3 days), realization confirmation, and bounce handling.
70. **Cheque Dishonour / Bounce & NI Act 138 Workflow**:
    - Auto-generation of Legal Notice under Section 138 of the Negotiable Instruments Act 1881.
    - Tracking notice delivery, 30-day statutory response window, and litigation filing transfer.
71. **Bank Loan Financing & Tripartite Workflow**: Tracking bank approval letters, Tripartite Agreement between Buyer-Developer-Bank, NOC for Mortgage, and bank milestone disbursement checks.
72. **Automated Multi-Channel Payment Reminders**: Scheduled SMS, Email, and WhatsApp payment notifications with secure online payment links (bKash, Nagad, Card, Bank Gateway).

---

### Group I: Procurement, Store & Supply Chain
73. **Supplier & Vendor Master**: Vendor evaluation, trade license, TIN, BIN (VAT Registration), supply capacity, and bank details.
74. **Purchase Requisition (PR) & Purchase Order (PO)**: Multi-level PR approvals, PO issuance with terms, delivery schedules, and price locks.
75. **Comparative Statement (CS) Engine**: Multi-vendor quotation comparison (Rate, Payment terms, Quality, Brand) with recommended vendor highlight.
76. **Goods Received Note (GRN) & 3-Way Matching**: Verification against PO, physical inspection, delivery challan verification, and GRN posting.
77. **Central Warehouse & Project-Site Stores**: Multi-store stock balances, inter-project stock transfers, transit tracking, and minimum reorder level alerts.
78. **Material Wastage, Scrap & Consumption Variance**: Standard BOQ consumption vs. actual site consumption, scrap sales, and theft/damage write-offs.

---

### Group J: Handover, Maintenance & Defect Liability
79. **Apartment Handover Inspection & Snag List**: Joint customer-engineer pre-handover walkthrough, punch-list logging, rectification tracking, and final sign-off.
80. **Possession Letter & Utility Meter Allotment**: Formal possession certificate issuance, key handover, electricity meter (DPDC/DESCO) card, and WASA connection assignment.
81. **Defect Liability Period (DLP) & Warranty Tracking**: 12-month DLP lifecycle, civil/plumbing/electrical complaint management, SLA-based contractor dispatch, and warranty closure.
82. **Building Owners' Association (Kallyan Samity) Setup**: Transfer of common funds, sinking fund accounting, monthly service charge management, and lift/generator maintenance contracts.
83. **Retained & Commercial Property Leasing**: Rental agreements for company-owned retail/apartments, monthly rent roll, tenant security deposits, and maintenance deductions.

---

### Group K: Bangladesh VAT, Tax, Sub-Registry & Regulatory Engine
84. **Configurable Bangladesh VAT Engine (VAT Act 2012)**:
    - VAT on residential apartment sales (below 1,600 sq ft vs. above 1,600 sq ft).
    - VAT on commercial space sales.
    - Vendor VDS (VAT Deduction at Source) withholding rules and Mushak 6.3 Tax Invoice generation.
85. **TDS (Tax Deduction at Source) Engine**:
    - Supplier payments (Sec 52), Contractor bills (Sec 52), Land acquisition payments (Sec 52C), Broker commission (Sec 53).
    - Auto-generation of Tax Deduction Certificates (Challan / Certificate).
86. **Sub-Registry Registration Cost & AIT Estimator (Sec 53FF & 53H)**:
    - Real-time estimation of Stamp Duty (1.5%), Registration Fee (1%), Local Govt Tax (2-3%), Gain Tax / AIT under Section 53FF & 53H of the Income Tax Act 2023.
87. **Regulatory Compliance Calendar**: Tax filing deadlines, Mushak 9.1 submission reminders, trade license renewal, Fire Safety NOC renewal, and REHAB membership compliance.

---

## 3. High-Scale Non-Functional Requirements (1 Crore / 10M+ Data)
- **Database Engine**: MySQL 8.0+ Enterprise with InnoDB Engine.
- **Partitioning Strategy**: Range partitioning on date columns (`created_at` or `voucher_date`) for high-volume transactional tables (Journal Entries, Payment Receipts, Daily Progress Logs, Audit Trails).
- **High Concurrency & Low Latency**:
  - API response time < 150ms for standard CRUD.
  - Read-write splitting: Master node for mutations, Read Replicas for reporting and BI analytics.
  - Redis 7.0 for distributed session management, inventory mutex locking, and lookup dropdown caching.
- **Data Integrity & Immutability**:
  - Zero hard-deletions on financial or transactional tables (`is_deleted` soft-delete with immutable append-only journal tables).
  - Financial reversal vouchers instead of editing posted records.
- **Document Storage**: S3-compatible MinIO object storage with presigned URLs, AES-256 server-side encryption for deeds, drawings, and NID scans.
- **Audit & Governance**: Full audit log capturing `user_id`, `ip_address`, `timestamp`, `action`, `previous_state`, and `new_state` for every write operation.
