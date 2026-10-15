# REAL ESTATE ERP (BANGLADESH EDITION) — MASTER COPY-PASTE EXECUTION PLAYBOOK

> **100% COMPLETE, ZERO-DOCKER, PRODUCTION-READY PROMPT SEQUENCE**  
> **How to use**: This document contains a step-by-step sequence of copy-pasteable prompts (`PROMPT 01` to `PROMPT 23`). You can copy each prompt one by one and paste it into your AI assistant or agent. Each prompt builds a self-contained, tested slice of the platform until the entire Web ERP and all 6 Flutter mobile applications are fully operational!

---

## 📋 SEQUENCE OF COPY-PASTE MASTER PROMPTS

- [PROMPT 01: Native Bare-Metal Environment & MySQL 8.0 High-Scale Setup](#prompt-01-native-bare-metal-environment--mysql-80-high-scale-setup)
- [PROMPT 02: Dynamic Lookup Subsystem (100% Zero Hardcoded Dropdowns)](#prompt-02-dynamic-lookup-subsystem-100-zero-hardcoded-dropdowns)
- [PROMPT 03: Core Backend Gateway, Multi-Tenant Auth & Project-Scoped RBAC](#prompt-03-core-backend-gateway-multi-tenant-auth--project-scoped-rbac)
- [PROMPT 04: Enterprise Angular 19 Shell, Multi-Level Sidebar & Reusable Components](#prompt-04-enterprise-angular-19-shell-multi-level-sidebar--reusable-components)
- [PROMPT 05: Land Bank, Historic Surveys (CS/SA/RS/BS), Mouza/Dag & Joint Venture (JV)](#prompt-05-land-bank-historic-surveys-cssarsbs-mouzadag--joint-venture-jv)
- [PROMPT 06: Project Spatial Modeling (Towers/Floors), RAJUK/CDA Permits & BOQ Master](#prompt-06-project-spatial-modeling-towersfloors-rajukcda-permits--boq-master)
- [PROMPT 07: Property Inventory, Dynamic Rate Cards & 15-Minute Redis Distributed Locking](#prompt-07-property-inventory-dynamic-rate-cards--15-minute-redis-distributed-locking)
- [PROMPT 08: Omnichannel CRM, Facebook Webhooks, Customer KYC & Nominee Profiles](#prompt-08-omnichannel-crm-facebook-webhooks-customer-kyc--nominee-profiles)
- [PROMPT 09: Sales Bookings, Multi-Level Discount Approvals & Bilingual Deed Generator](#prompt-09-sales-bookings-multi-level-discount-approvals--bilingual-deed-generator)
- [PROMPT 10: Installment Schedules, PDC Cheque Vault & NI Act 138 Dishonour Legal Engine](#prompt-10-installment-schedules-pdc-cheque-vault--ni-act-138-dishonour-legal-engine)
- [PROMPT 11: Construction Site Diary (DPR), Subcontractor Muster Roll & RA Billing](#prompt-11-construction-site-diary-dpr-subcontractor-muster-roll--ra-billing)
- [PROMPT 12: Quality Assurance, Concrete Cube Crushing Tests & Site Safety NCRs](#prompt-12-quality-assurance-concrete-cube-crushing-tests--site-safety-ncrs)
- [PROMPT 13: Procurement, Central/Site Store Stock, Comparative Statements (CS) & GRN](#prompt-13-procurement-centralsite-store-stock-comparative-statements-cs--grn)
- [PROMPT 14: Double-Entry General Ledger, Chart of Accounts & Bank/MFS Reconciliation](#prompt-14-double-entry-general-ledger-chart-of-accounts--bankmfs-reconciliation)
- [PROMPT 15: Bangladesh VAT (VAT Act 2012), Mushak 6.3, TDS/VDS & Sub-Registry AIT Calculator](#prompt-15-bangladesh-vat-vat-act-2012-mushak-63-tdsvds--sub-registry-ait-calculator)
- [PROMPT 16: Handover, Snagging, 12-Month DLP Warranty, Building Association & Commercial Leasing](#prompt-16-handover-snagging-12-month-dlp-warranty-building-association--commercial-leasing)
- [PROMPT 17: Mobile App 1 — Sales & CRM Mobile App (`bd_realestate_sales_app`)](#prompt-17-mobile-app-1--sales--crm-mobile-app-bd_realestate_sales_app)
- [PROMPT 18: Mobile App 2 — Site Engineer & Construction Operations App (`bd_realestate_site_app`)](#prompt-18-mobile-app-2--site-engineer--construction-operations-app-bd_realestate_site_app)
- [PROMPT 19: Mobile App 3 — Collection & Field Recovery App with Bluetooth Printing (`bd_realestate_collection_app`)](#prompt-19-mobile-app-3--collection--field-recovery-app-with-bluetooth-printing-bd_realestate_collection_app)
- [PROMPT 20: Mobile App 4 — Executive Management & BI Cockpit App (`bd_realestate_management_app`)](#prompt-20-mobile-app-4--executive-management--bi-cockpit-app-bd_realestate_management_app)
- [PROMPT 21: Mobile App 5 — HR, Attendance & Field Employee App (`bd_realestate_hr_app`)](#prompt-21-mobile-app-5--hr-attendance--field-employee-app-bd_realestate_hr_app)
- [PROMPT 22: Mobile App 6 — Customer Self-Service & Property App (`bd_realestate_customer_app`)](#prompt-22-mobile-app-6--customer-self-service--property-app-bd_realestate_customer_app)
- [PROMPT 23: Broker Commissions, Legal Cases, Plant Machinery & Legacy Excel Migration](#prompt-23-broker-commissions-legal-cases-plant-machinery--legacy-excel-migration)

---

### PROMPT 01: Native Bare-Metal Environment & MySQL 8.0 High-Scale Setup
```markdown
You are a Principal DevOps & Infrastructure Engineer.
TASK: Set up the bare-metal, native host environment for the Bangladesh Real Estate ERP without using Docker.

MANDATORY INSTRUCTIONS:
1. Configure native MySQL 8.0 on host port 3306 for 1 crore (10M+) record scalability:
   - innodb_buffer_pool_size = 4G (or 60% of host RAM)
   - max_connections = 1000
   - innodb_log_file_size = 512M
   - character-set-server = utf8mb4
   - collation-server = utf8mb4_unicode_ci
2. Create database `erp_realestate_db` with user `erp_user` and password `erp_secure_password`.
3. Set up Redis server on localhost port 6379 for caching and distributed locks.
4. Set up Python 3.12 virtual environment in directory `backend/`:
   - Initialize `venv`
   - Install dependencies: fastapi, uvicorn[standard], sqlalchemy, asyncmy, pydantic, pydantic-settings, redis, python-jose, passlib[bcrypt], weasyprint, reportlab.
5. Create `backend/app/core/config.py` and `backend/app/core/database.py` with SQLAlchemy async engine and connection pooling (pool_size=25, max_overflow=50, pool_recycle=1800).
6. Verify database connectivity with a simple `/health/db` endpoint.
```

---

### PROMPT 02: Dynamic Lookup Subsystem (100% Zero Hardcoded Dropdowns)
```markdown
You are a Senior Backend & Frontend Architect.
TASK: Implement the Dynamic Lookup Subsystem. No dropdown in the entire application may be hardcoded.

MANDATORY INSTRUCTIONS:
1. Create MySQL tables:
   - `sys_lookup_categories`: id, category_code (unique), category_name, description, is_active.
   - `sys_lookup_items`: id, category_id, item_code, item_name_en, item_name_bn, color_badge, sort_order, is_default, is_active.
2. Seed initial categories:
   - 'LAND_SURVEY_TYPE' (CS, SA, RS, BS/City Survey)
   - 'LAND_CLASS' (নাল, ভিটি, বাণিজ্যিক, নালজমি)
   - 'UNIT_FACING' (South-Facing, North, Lake-View, Corner-Plot)
   - 'UNIT_STATUS' (Available, On-Hold, Booked, Sold, Landowner-Share)
   - 'DEV_AUTHORITY' (RAJUK, CDA, KDA, RDA)
   - 'PAYMENT_MODE' (Cash, Cheque, Pay Order, bKash, Nagad, Bank Transfer)
3. Implement FastAPI endpoints:
   - `GET /api/v1/lookups/{category_code}`: Returns active items, cached in Redis with a 24-hour TTL.
   - `POST /api/v1/lookups/{category_code}/quick-create`: Creates an item dynamically from any form and returns it immediately.
4. Implement the Angular 19 reusable component `<app-searchable-select>`:
   - Takes `@Input() categoryCode`, `@Input() label`, `@Input() placeholder`, `@Input() allowCreateNew="true"`.
   - Search filter input to filter options on typing.
   - An inline dashed button `+ Add New [Label]` at the bottom of the dropdown list that opens an in-place modal, calls `quick-create`, and auto-selects the created item without leaving the page.
```

---

### PROMPT 03: Core Backend Gateway, Multi-Tenant Auth & Project-Scoped RBAC
```markdown
You are a Principal Security Architect.
TASK: Build the authentication, multi-company hierarchy, and project-scoped RBAC microservice.

MANDATORY INSTRUCTIONS:
1. Create database schema:
   - `sys_organizations`: id, organization_code, legal_name_en, legal_name_bn, tin_number, bin_vat_number, rehab_membership_number, parent_organization_id.
   - `sys_users`: id, organization_id, username, email, phone_number, hashed_password, full_name_en, full_name_bn, is_group_admin, is_active.
   - `sys_roles`: id, role_code, role_name.
   - `sys_user_project_assignments`: id, user_id, project_id, role_code, can_view_financials.
   - `sys_audit_trails`: id, user_id, ip_address, microservice_name, entity_name, entity_id, action_type, payload_before, payload_after, created_at. (Range partitioned by year for 2 crore+ records).
2. Implement JWT token authentication with OAuth2PasswordBearer and refresh token rotation.
3. Implement the FastAPI security dependency `require_project_scope`:
   - Inspects incoming header `X-Project-Id`.
   - Verifies if the user is assigned to that project; returns 403 Forbidden if not.
   - Group Admins bypass project restrictions.
4. Implement Audit Logging Middleware that automatically logs all mutations (POST, PUT, DELETE) to `sys_audit_trails`.
```

---

### PROMPT 04: Enterprise Angular 19 Shell, Multi-Level Sidebar & Reusable Components
```markdown
You are a Principal Frontend UI/UX Architect (Angular 19 Standalone, Signals, Tailwind CSS, Lucide Icons).
TASK: Build the production application shell, multi-level sidebar navigation, and reusable custom components.

MANDATORY INSTRUCTIONS:
1. Do NOT put modules into tabs. Build a Multi-Level Collapsible Sidebar with Nested Sub-menus.
2. In-Sidebar Quick Filter Box: Typing in the sidebar filters all menu items in real-time.
3. Enforce the Layout Standard:
   - Sidebar on the left (w-72 / 280px).
   - Equal proportional gap (`p-6` / `gap-6`) between Topbar, Sidebar, and the central workspace.
   - Center/Right workspace renders completely inside a single unified Card Container (`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6`).
   - Uniform border standard: `border border-slate-200 dark:border-slate-800`.
   - Uniform container radius: `rounded-xl` (12px); control radius: `rounded-lg` (8px).
4. Topbar Component:
   - Global Company & Project Switcher dropdown.
   - Global Search (`Ctrl + K` Command Palette).
   - Notification popover and User profile menu.
5. Create reusable standalone components:
   - `<app-input>`, `<app-textarea>`, `<app-button>`, `<app-data-table>` (with server-side pagination, multi-column search, column toggle, Excel export), `<app-modal>`, `<app-drawer>`, `<app-status-badge>`.
```

---

### PROMPT 05: Land Bank, Historic Surveys (CS/SA/RS/BS), Mouza/Dag & Joint Venture (JV)
```markdown
You are a Senior Real Estate Land Legal Systems Engineer.
TASK: Implement the Land Acquisition, Survey Records, and Joint Venture (JV) Engine (Modules 1, 25, 26, 27).

MANDATORY INSTRUCTIONS:
1. Create database schema:
   - `lnd_land_banks`: id, project_code, proposal_title, mouza_name, jl_number, total_area_katha, total_area_decimal, total_area_sqft, deal_type, status.
   - `lnd_landowners`: id, land_bank_id, owner_type, full_name_en, full_name_bn, nid_number, tin_number, phone_number, ownership_share_ratio, bank_details.
   - `lnd_survey_records`: id, land_bank_id, survey_type_id (CS, SA, RS, BS), khatian_number, recorded_tenant_name, dag_number, recorded_area_decimal, recorded_area_katha.
   - `lnd_jv_agreements`: id, land_bank_id, agreement_deed_no, landowner_share_percent, developer_share_percent, signing_money_total, tenure_months.
   - `lnd_jv_unit_allocations`: id, jv_agreement_id, unit_identifier, allocation_type ('LANDOWNER_UNIT', 'DEVELOPER_UNIT'), is_locked_for_sales.
2. Implement Bangladesh mathematical area conversion logic:
   - 1 Katha = 720 Sq Ft, 1 Decimal = 435.6 Sq Ft, 1 Bigha = 20 Katha = 14,400 Sq Ft, 1 Acre = 100 Decimal = 43,560 Sq Ft.
3. CRITICAL BUSINESS RULE:
   - Units allocated as `LANDOWNER_UNIT` are permanently locked with `is_locked_for_sales = true`. The sales booking engine must strictly reject any booking attempts for landowner units.
4. Implement endpoints for Land Proposal CRUD, Survey records logging, JV Agreement generation, and Deed Chain verification.
5. Build the Angular 19 frontend views: `/land/proposals`, `/land/surveys`, and `/land/jv-agreements`.
```

---

### PROMPT 06: Project Spatial Modeling (Towers/Floors), RAJUK/CDA Permits & BOQ Master
```markdown
You are a Principal Civil Engineering & Quantity Surveying Systems Specialist.
TASK: Implement Project Spatial Planning, Authority Clearances, and BOQ Estimation (Modules 2, 28, 29, 30, 31, 36).

MANDATORY INSTRUCTIONS:
1. Create database schema:
   - `prj_projects`: id, land_bank_id, project_code, project_name, development_authority_id (RAJUK/CDA/KDA), far_allocated, total_builtup_area_sqft, total_saleable_area_sqft, planned_handover_date, status.
   - `prj_towers`: id, project_id, tower_code, tower_name, basement_floors, residential_floors, total_lifts.
   - `prj_authority_clearances`: id, project_id, clearance_type_id (LUC, Building Plan, Fire NOC, Aviation Height, Environmental, WASA), application_memo_no, approved_memo_no, approval_date, expiry_date, status, document_url.
   - `prj_boq_items`: id, project_id, tower_id, wbs_phase_id, material_category_id (Rod 500W, Cement, Sand FM 2.5, Stone Chips, Bricks), unit_of_measure_id, estimated_quantity, estimated_unit_rate, total_estimated_cost, actual_consumed_quantity.
   - `prj_drawings`: id, project_id, drawing_category_id, drawing_number, revision_number (R0, R1...), is_approved_for_construction, file_url.
2. Implement FAR (Floor Area Ratio) calculation under Dhaka Building Construction Rules 2008.
3. Implement drawing revision logic: when a new revision is marked as Issued for Construction (IFC), auto-revoke approval on older revisions and trigger notification.
4. Build Angular 19 views: `/projects/list`, `/projects/clearances`, and `/projects/boq`.
```

---

### PROMPT 07: Property Inventory, Dynamic Rate Cards & 15-Minute Redis Distributed Locking
```markdown
You are a Real-Time Distributed Systems Architect (FastAPI, Redis, WebSockets).
TASK: Implement Property Inventory, Dynamic Pricing, and Distributed Unit Locking (Modules 3, 32).

MANDATORY INSTRUCTIONS:
1. Create database schema:
   - `inv_units`: id, project_id, tower_id, floor_number, unit_number, unit_type_id, facing_id, net_carpet_area_sqft, gross_saleable_area_sqft, base_rate_per_sqft, floor_escalation_rate, facing_premium_rate, effective_rate_per_sqft, total_unit_price, status_id (Available, On-Hold, Booked, Sold, Landowner-Share), is_landowner_share, current_locked_by_user_id, lock_expires_at.
   - `inv_parking_bays`: id, project_id, basement_level, bay_number, parking_type_id, price, is_allocated, allocated_to_unit_id.
2. Pricing Formula:
   $$\text{Total Price} = \text{Gross Sqft} \times (\text{Base Rate} + \text{Floor Escalation} + \text{Facing Premium})$$
3. Implement 15-Minute Distributed Mutex Locking:
   - `POST /api/v1/inventory/units/{id}/lock`: sets Redis key `unit:lock:{id}` with 15-minute TTL (`ex=900, nx=True`).
   - If already locked, returns 409 Conflict with remaining TTL.
   - Publishes event `UNIT_LOCKED` to Redis Pub/Sub.
4. Implement WebSocket endpoint `WS /api/v1/inventory/live-matrix`: broadcasts lock/unlock/booked events in real-time to all connected Angular and Flutter clients.
5. Build the Angular 19 visual unit matrix: color-coded grid with real-time countdown timer on locked units.
```

---

### PROMPT 08: Omnichannel CRM, Facebook Webhooks, Customer KYC & Nominee Profiles
```markdown
You are a Senior CRM & Lead Automation Engineer.
TASK: Implement the Omnichannel CRM, Lead Scoring, and Customer KYC Subsystem (Modules 4, 52).

MANDATORY INSTRUCTIONS:
1. Create database schema:
   - `crm_leads`: id, organization_id, lead_source_id (Facebook Ads, Web Form, WhatsApp, Walk-in, Broker), campaign_name, lead_name, primary_phone, email, interested_project_id, budget_range_min, budget_range_max, assigned_sales_rep_id, lead_stage (New, Contacted, Visited, Negotiation, Booked, Dropped).
   - `crm_customers`: id, customer_code, full_name_en, full_name_bn, father_husband_name, mother_name, nid_number, tin_number, primary_phone, email, present_address, permanent_address, is_nrb, profile_photo_url, nid_scan_front_url, nid_scan_back_url.
   - `crm_nominees`: id, customer_id, nominee_name, relationship, nid_number, share_percentage.
2. Implement Webhook receiver for Facebook Lead Ads API: automatically parses lead name, phone, and project interest, creates `crm_leads` record, and assigns to sales rep via round-robin.
3. Build lead follow-up call logger, site visit scheduler, and conversion reports.
4. Build Angular 19 views: `/crm/leads` (Kanban board) and `/crm/customers`.
```

---

### PROMPT 09: Sales Bookings, Multi-Level Discount Approvals & Bilingual Deed Generator
```markdown
You are a Real Estate Sales Execution & Legal Tech Specialist.
TASK: Implement Apartment Bookings, Multi-Level Discount Approvals, and Bilingual Agreement Generator (Modules 5, 33, 34).

MANDATORY INSTRUCTIONS:
1. Create database schema:
   - `sls_bookings`: id, booking_reference_no, project_id, unit_id, primary_customer_id, booking_date, final_contract_value, earnest_money_received, down_payment_total, discount_amount, discount_approval_status, status (Provisional, Agreement_Signed, Registration_Done, Cancelled, Transferred).
   - `sls_booking_cancellations`: id, booking_id, cancellation_reason, total_paid, forfeiture_deduction_amount, net_refund_amount, status.
   - `sls_unit_transfers`: id, booking_id, from_customer_id, to_customer_id, transfer_fee_bdt, transfer_date.
2. Enforce Multi-Level Discount Approval Matrix:
   - Discount $\le 1.0\%$: Sales Manager Approval.
   - $1.0\% < \text{Discount} \le 3.0\%$: Director Approval.
   - $\text{Discount} > 3.0\%$: Managing Director (MD) Biometric 1-Tap Mobile Approval.
3. Implement Bilingual Deed of Agreement PDF Generator using WeasyPrint:
   - Renders official English & Bangla contracts matching Sub-Registry statutory standards with dynamic clause binding.
4. Build Angular 19 views: `/sales/bookings`, `/sales/discounts`, and `/sales/cancellations`.
```

---

### PROMPT 10: Installment Schedules, PDC Cheque Vault & NI Act 138 Dishonour Legal Engine
```markdown
You are a Financial Systems Architect & Real Estate Banking/Litigation Compliance Specialist.
TASK: Implement Installments, PDC Vault, and Automated Section 138 Cheque Bounce Engine (Modules 8, 35).

MANDATORY INSTRUCTIONS:
1. Create database schema:
   - `sls_customer_installments`: id, booking_id, installment_no, title, due_date, grace_period_days, payable_amount, paid_amount, late_fee_accrued, status (Upcoming, Due, Paid, Overdue).
   - `sls_pdc_vault`: id, booking_id, customer_id, cheque_number, bank_name, branch_name, routing_number, maturity_date, cheque_amount, pouch_barcode, status (In_Vault, Sent_To_Bank, Honoured, Dishonoured_Bounced), dishonour_memo_date.
   - `sls_ni138_legal_actions`: id, pdc_cheque_id, dishonour_memo_received_date, statutory_notice_deadline_date, notice_served_to_client_date, client_30day_settlement_deadline, status (Notice_Pending, Notice_Served, Court_Case_Filed).
2. Implement Installment Schedule Generator: supports monthly, quarterly, and construction-milestone payment triggers.
3. Implement NI Act 1881 Section 138 Automation:
   - When cheque is marked Dishonoured, auto-calculate 30-day statutory notice deadline.
   - Auto-generate formal Section 138 Legal Notice PDF demanding payment within 30 days.
   - Track delivery via Registered Post with A/D and statutory 30-day settlement window before filing court case.
4. Implement daily Celery cron sending SMS reminders 3 days before PDC cheque maturity.
5. Build Angular 19 views: `/installments/schedules`, `/installments/pdc-vault`, and `/installments/ni138-actions`.
```

---

### PROMPT 11: Construction Site Diary (DPR), Subcontractor Muster Roll & RA Billing
```markdown
You are a Senior Construction Management Systems Engineer & Quantity Surveyor.
TASK: Implement Construction Operations, DPR Diary, and Contractor RA Billing (Modules 6, 37, 39).

MANDATORY INSTRUCTIONS:
1. Create database schema:
   - `con_dpr_reports`: id, project_id, tower_id, report_date, weather_condition_id, site_engineer_id, structural_activity_summary, concrete_casting_cft, steel_rod_consumed_mt, cement_consumed_bags, total_workers_onsite, status.
   - `con_labor_muster`: id, dpr_id, contractor_id, trade_category (Rod-binder, Mason, Carpenter, Plumber, Helper), worker_count, total_wage.
   - `con_work_orders`: id, project_id, contractor_id, work_order_no, contract_type, total_contract_value, retention_money_percent (standard 5.0%), defect_liability_months (12 months).
   - `con_ra_bills`: id, work_order_id, ra_bill_number, gross_work_certified_amount, retention_money_deducted, advance_recovery_deducted, tds_withheld_amount, vds_withheld_amount, net_payable_amount, status.
2. RA Bill Net Payable Formula:
   $$\text{Net Payable} = \text{Current Gross} - \text{Retention (5\%)} - \text{Advance Recovery} - \text{TDS (Sec 52)} - \text{VDS}$$
3. When RA Bill is approved, emit event to Accounts service to automatically create contractor liability journal voucher.
4. Build Angular 19 views: `/construction/dpr`, `/construction/labor-muster`, and `/construction/ra-bills`.
```

---

### PROMPT 12: Quality Assurance, Concrete Cube Crushing Tests & Site Safety NCRs
```markdown
You are a Quality Assurance & Site Safety Specialist.
TASK: Implement Concrete Cube Crushing Test Registers and Non-Conformance Reports (NCR) (Module 40).

MANDATORY INSTRUCTIONS:
1. Create database schema:
   - `con_concrete_cube_tests`: id, project_id, tower_id, structural_element, casting_date, design_compressive_strength_psi, concrete_grade, batching_plant_name, slump_test_mm, day7_testing_date, day7_strength_psi, day14_testing_date, day14_strength_psi, day28_testing_date, day28_strength_psi, test_verdict (Pending, Passed, Failed), lab_test_report_url.
   - `con_safety_ncrs`: id, project_id, ncr_number, category (Structural Defect, Honeycombing, Cover Missing, Safety Violation), severity (Low, Medium, High, Critical), photo_url, assigned_contractor_id, rectification_deadline, status (Open, Rectified, Verified_Closed).
2. Implement automated notification engine alerting site engineers on Day 7, Day 14, and Day 28 crushing tests.
3. Build Angular 19 views: `/construction/cube-tests` and `/construction/safety-ncr`.
```

---

### PROMPT 13: Procurement, Central/Site Store Stock, Comparative Statements (CS) & GRN
```markdown
You are a Supply Chain Management Specialist.
TASK: Implement Strategic Procurement, Site Stores, and 3-Way Invoice Matching (Modules 9, 38, 45, 47).

MANDATORY INSTRUCTIONS:
1. Create database schema:
   - `scm_site_stores`: id, project_id, store_name, store_in_charge_user_id.
   - `scm_store_stock`: id, store_id, material_id, current_stock_quantity, reorder_level.
   - `scm_purchase_requisitions`: id, project_id, pr_number, requested_by_user_id, status.
   - `scm_comparative_statements`: id, pr_id, cs_number, status, recommended_vendor_id.
   - `scm_purchase_orders`: id, po_number, vendor_id, total_po_amount, delivery_deadline, status.
   - `scm_goods_receipts`: id, po_id, grn_number, delivery_challan_number, challan_photo_url, received_by_user_id, status.
2. Implement 3-Way Matching: Verifies PO Quantity/Price vs. GRN Received Quantity vs. Supplier Invoice Amount before accounts approval.
3. Build Angular 19 views: `/procurement/stores`, `/procurement/comparative-statements`, and `/procurement/grn`.
```

---

### PROMPT 14: Double-Entry General Ledger, Chart of Accounts & Bank/MFS Reconciliation
```markdown
You are a Chartered Accountant (FCA) & Enterprise Financial Systems Architect.
TASK: Implement Double-Entry Accounts, Chart of Accounts, and General Ledger (Modules 7, 41, 44).

MANDATORY INSTRUCTIONS:
1. Create database schema:
   - `acc_chart_of_accounts`: id, organization_id, account_code, account_name_en, account_name_bn, account_type (Asset, Liability, Equity, Revenue, Expense), is_leaf_account.
   - `acc_vouchers`: id, organization_id, project_id, voucher_number, voucher_type (Journal, Cash_Payment, Cash_Receipt, Bank_Payment, Bank_Receipt, Contra), voucher_date, narration, total_debit_amount, total_credit_amount, status (Draft, Posted, Reversed).
   - `acc_journal_entries`: id, voucher_id, project_id, account_id, voucher_date, debit_amount, credit_amount, narration. (Range partitioned by year for 1 crore+ rows).
   - `acc_bank_reconciliation`: id, bank_account_id, statement_date, statement_balance, book_balance, difference_amount, is_reconciled.
2. Financial Safeguards:
   - Every posted voucher must strictly have $\sum \text{Debit} = \sum \text{Credit}$.
   - Zero hard deletions. Posted vouchers are corrected exclusively via Reversal Vouchers.
3. Build real-time reporting endpoints: Trial Balance, Project-wise P&L, Balance Sheet, Cash Flow.
4. Build Angular 19 views: `/accounts/coa`, `/accounts/vouchers`, and `/accounts/financial-reports`.
```

---

### PROMPT 15: Bangladesh VAT (VAT Act 2012), Mushak 6.3, TDS/VDS & Sub-Registry AIT Calculator
```markdown
You are an NBR Tax & VAT Compliance Specialist.
TASK: Implement Bangladesh VAT, TDS/VDS, and Sub-Registry Cost Calculators (Modules 14, 42).

MANDATORY INSTRUCTIONS:
1. Create database schema:
   - `acc_mushak_tax_invoices`: id, booking_id, mushak_challan_number, invoice_date, developer_bin_number, customer_tin_nid, apartment_sqft, taxable_amount, vat_rate_percent, vat_amount, total_amount_collected.
   - `acc_tds_deductions`: id, voucher_id, vendor_id, contractor_id, deduction_section (Sec 52, Sec 52C, Sec 53), gross_amount, tax_rate_percent, withheld_amount, challan_number.
2. Bangladesh VAT Rules (VAT Act 2012):
   - Residential $\le 1,600$ sq ft: 2.0% VAT.
   - Residential $> 1,600$ sq ft: 4.5% VAT.
   - Commercial properties: 7.5% - 15.0% VAT.
   - Auto-generate statutory **Mushak 6.3 Tax Invoice** PDF on every customer collection.
3. Sub-Registry Registration Fee & AIT Calculator:
   - Stamp Duty: 1.5%, Registration Fee: 1.0%, Local Govt Tax: 2.0% (City Corp).
   - Advance Income Tax (AIT) under Section 53FF of Income Tax Act 2023 (৳১,৫০০ - ৳৪,০০০ per sq metre).
4. Build Angular 19 views: `/accounts/vat-mushak`, `/accounts/tax-withholding`, and `/accounts/sub-registry-calc`.
```

---

### PROMPT 16: Handover, Snagging, 12-Month DLP Warranty, Building Association & Commercial Leasing
```markdown
You are a Property Operations & Facility Management Specialist.
TASK: Implement Handover, Snagging, Defect Liability, Owners Association & Leasing (Modules 10, 24, 48, 49, 50, 51).

MANDATORY INSTRUCTIONS:
1. Create database schema:
   - `hnd_handover_inspections`: id, booking_id, unit_id, inspection_date, site_engineer_id, all_financial_dues_cleared, possession_letter_number, possession_handover_date, status.
   - `hnd_dlp_tickets`: id, unit_id, ticket_category (Plumbing, Electrical, Tiles, Paint, Doors), issue_description, reported_date, rectification_deadline, status.
   - `hnd_owners_associations`: id, project_id, association_name, handover_date, sinking_fund_transferred_bdt, monthly_service_charge_per_flat.
   - `rnt_lease_agreements`: id, unit_id, tenant_name, tenant_nid, lease_start_date, lease_expiry_date, monthly_rent_bdt, security_deposit_bdt, rent_escalation_percent.
2. Build Possession Letter generator and Snagging ticket workflow.
3. Build Angular 19 views: `/handover/snagging`, `/handover/possession`, and `/handover/association`.
```

---

### PROMPT 17: Mobile App 1 — Sales & CRM Mobile App (`bd_realestate_sales_app`)
```markdown
You are a Principal Flutter Mobile Architect (Flutter 3.24+, BLoC, Clean Architecture).
TASK: Build the native mobile app `bd_realestate_sales_app` for real estate sales executives in Bangladesh.

MANDATORY INSTRUCTIONS:
1. Implement Interactive Flat Matrix:
   - Color-coded grid: 🟢 Available, 🟡 On Hold (15-min countdown timer), 🔴 Sold, 🟣 Landowner Share.
   - Tap unit to view carpet area, floor escalation (+৳৫০/sqft), facing premium, gross price in BDT.
2. Implement 15-Minute Distributed Unit Locking via `POST /api/v1/inventory/units/{id}/lock` with live WebSocket listener.
3. Implement BDT EMI & Installment Calculator: sliders for Down Payment (10-50%) and Tenure (12-60 months); generates BDT schedule PDF shareable to WhatsApp.
4. Implement Omnichannel Lead Manager: real-time push alerts on Facebook/Web leads; automatic call-log prompt after ending call.
5. Implement Booking Form: Client NID photo capture (front & back), nominee info, on-glass digital signature, instant provisional allotment letter generation.
```

---

### PROMPT 18: Mobile App 2 — Site Engineer & Construction Operations App (`bd_realestate_site_app`)
```markdown
You are a Construction Tech Flutter Architect.
TASK: Build the native mobile app `bd_realestate_site_app` for project site engineers and PMs in Bangladesh.

MANDATORY INSTRUCTIONS:
1. Implement Offline-First Architecture using local `isar` database; all DPRs and photos queue locally and sync automatically when internet is available.
2. Implement Anti-Tamper Watermarked Camera:
   - Disables gallery upload (must be live camera shot).
   - Burns GPS coordinates, Project Name, Floor Level, Date, and Timestamp directly into image pixels.
3. Implement Daily Progress Report (DPR): concrete casting volume (CFT), rod consumption (MT), and daily narrative.
4. Implement Subcontractor Labor Muster Roll: headcount by trade (Rod-binders, Masons, Carpenters, Plumbers, Helpers).
5. Implement Concrete Cube Crushing Test Tracker: logs casting mix and slump; auto push notifications on Day 7, Day 14, and Day 28 with lab report photo upload.
6. Implement Site Store GRN Receiver: scans delivery challan for incoming trucks.
```

---

### PROMPT 19: Mobile App 3 — Collection & Field Recovery App with Bluetooth Printing (`bd_realestate_collection_app`)
```markdown
You are a Fintech Integration & Flutter Mobile Architect.
TASK: Build the native mobile app `bd_realestate_collection_app` for recovery officers and field agents in Bangladesh.

MANDATORY INSTRUCTIONS:
1. Implement Route-Optimized Recovery Agenda: Google Maps view of clients with pending dues or bounced cheques sorted by proximity.
2. Implement On-the-Spot Collection: Cash, Cheque, Pay Order, or dynamic bKash/Nagad merchant QR code; client digital signature.
3. Implement Bluetooth ESC/POS Thermal Receipt Printing:
   - 1-Tap Bluetooth pairing with portable 58mm/80mm belt printers.
   - Prints official Money Receipt with logo, MR serial, amount in words, and QR verification code in <3 seconds.
4. Implement Post-Dated Cheque (PDC) Vault Intake: captures cheque photo, Cheque No, Bank, Branch, Amount, Maturity Date, and security pouch barcode.
5. Implement NI Act 1881 Section 138 Notice Delivery Logger: alerts when cheque bounces; officer photographs signed acknowledgement receipt (A/D) from client to start the statutory 30-day countdown.
```

---

### PROMPT 20: Mobile App 4 — Executive Management & BI Cockpit App (`bd_realestate_management_app`)
```markdown
You are an Enterprise BI & Mobile Security Specialist.
TASK: Build the native mobile app `bd_realestate_management_app` for Managing Directors (MD), Board Members, and CFOs.

MANDATORY INSTRUCTIONS:
1. Implement Strict Biometric Security Gate: mandatory Face ID / Fingerprint prompt on app cold start and before every financial approval.
2. Implement Executive BI Cockpit: real-time KPIs in BDT: Today's Sales, Month-to-date Collection, Total Overdue, Liquid Cash & Bank Balances, Unsold Inventory Valuation.
3. Implement Universal 1-Tap Biometric Approval Center:
   - Discounts exceeding salesperson limits (with margin impact).
   - Purchase Orders (POs) and Comparative Statements (CS).
   - Contractor Running Account (RA) bills and advance releases.
   - Customer booking cancellations and refund schedules.
4. Implement Construction S-Curve Radar: Planned baseline vs. actual construction milestone progress.
5. Implement 90-Day Cash Flow Forecast: projected collections vs. committed contractor liabilities and debt repayments.
```

---

### PROMPT 21: Mobile App 5 — HR, Attendance & Field Employee App (`bd_realestate_hr_app`)
```markdown
You are an HR Tech & Computer Vision Flutter Architect.
TASK: Build the native mobile app `bd_realestate_hr_app` for corporate staff, site engineers, and field executives.

MANDATORY INSTRUCTIONS:
1. Implement Geofenced Attendance with Anti-Spoofing:
   - Validates user GPS against a 50-metre boundary polygon of the Head Office or assigned Project Sites.
   - Blocks check-in if GPS spoofing emulator is detected (`position.isMocked == true`).
2. Implement Facial Liveness Verification: front camera prompts "Look at camera and blink"; verifies liveness using ML Kit before taking clock-in selfie.
3. Implement Leave Management: view balances (Casual, Sick, Earned); submit leaves with medical certificate upload.
4. Implement Encrypted Digital Payslip Vault: download password-protected PDF salary slips detailing Basic, House Rent, Allowances, PF, and TDS.
5. Implement Project Daily Timesheet: site engineers log daily hours worked per project for internal job-costing.
```

---

### PROMPT 22: Mobile App 6 — Customer Self-Service & Property App (`bd_realestate_customer_app`)
```markdown
You are a Customer Experience (CX) Flutter Architect.
TASK: Build the native mobile app `bd_realestate_customer_app` for apartment and commercial space buyers in Bangladesh.

MANDATORY INSTRUCTIONS:
1. Implement My Property Digital Portfolio: flat specs, tower, floor, allotted parking bay; download signed Allotment Letter, Deed of Agreement, and Architectural Blueprint.
2. Implement Live Construction Progress Tracker: milestone progress bar, high-resolution monthly site photo gallery, 360-degree virtual tour.
3. Implement Financial Center & Online Installment Payment: view paid amount, upcoming dues, overdue balance; pay installments online via bKash, Nagad, Visa, Mastercard with instant official Money Receipt download.
4. Implement Pre-Handover Snagging Tool: homeowner takes photos of paint scratches or tile defects; tracks real-time rectification by the site team.
5. Implement Post-Handover Helpdesk (DLP): 12-month DLP warranty service tickets (Plumbing, Electrical, Waterproofing) and Building Owners' Association (কল্যাণ সমিতি) notices.
```

---

### PROMPT 23: Broker Commissions, Legal Cases, Plant Machinery & Legacy Excel Migration
```markdown
You are a Senior Full-Stack ERP Engineer.
TASK: Implement Broker Commissions, Legal Litigation, Heavy Equipment Fleet, and Data Migration (Modules 22, 46, 55, 62, 72).

MANDATORY INSTRUCTIONS:
1. Create database schema:
   - `sls_brokers`: id, broker_code, agency_name, contact_person, phone_number, nid_number, tin_number, commission_slab_percent, bank_details.
   - `sls_broker_commissions`: id, broker_id, booking_id, total_unit_value, commission_percent, total_commission_amount, disbursed_amount, tds_withheld_amount (Sec 53 - 10%), status.
   - `leg_court_cases`: id, project_id, case_type (Title Suit, Injunction, NI Act 138), case_number, concerned_court, plaintiff, defendant, appointed_advocate, status.
   - `ast_machinery_assets`: id, asset_code, asset_name, category (Tower Crane, Mixer, Hoist, Generator), current_assigned_project_id, hourly_rate, status.
   - `mig_import_batches`: id, entity_type (Land, COA_Opening, Inventory, Installments), file_url, total_records, successful_records, failed_records.
2. Implement Broker Commission Release Rules: 40% on Down Payment, 40% on Ground Slab milestone, 20% on Registration Deed.
3. Implement Bulk Excel Importer for legacy data migration with per-line validation and transaction rollback on error.
4. Build Angular 19 views: `/brokers/commissions`, `/settings/legal-cases`, `/settings/equipment`, and `/settings/data-import`.
```
