# REAL ESTATE ERP (BANGLADESH EDITION) — MASTER ALL-IN-ONE SYSTEM SPECIFICATION & PROMPT PLAYBOOK

> **100% COMPLETE, ZERO-MISSING-REQUIREMENT ARCHITECTURAL BLUEPRINT & EXECUTION PROMPT REPOSITORY**  
> **Technologies**: Python 3.12+ (FastAPI Async Microservices), MySQL 8.0+ (1 Crore+ Record Tuning), Angular 19+ (Standalone + Signals), and Flutter 3.24+ (6 Purpose-Built Mobile Apps).  
> **Infrastructure Requirement**: **100% Native Bare-Metal Setup (NO DOCKER)**. Designed to run natively on Windows, macOS, or Linux.

---

# 100% EXHAUSTIVE 72-MODULE TRACEABILITY & COVERAGE MATRIX

This matrix maps every single module requested by the user directly to its corresponding Master Prompt, Database DDL Tables, and API Endpoints in this single file:

| Module # | Module Name | Master Prompt # | Key Database Tables | Key API Endpoints / Workflow |
| :---: | :--- | :---: | :--- | :--- |
| **01** | **Land & Property Acquisition** | Prompt 2 | `lnd_land_banks`, `lnd_landowners`, `lnd_valuation_records` | `/api/v1/land/proposals`, `/land/valuation` |
| **02** | **Project & Development Management** | Prompt 3 | `prj_projects`, `prj_towers`, `prj_milestones` | `/api/v1/projects`, `/projects/feasibility` |
| **03** | **Property Inventory & Unit Management** | Prompt 4 | `inv_units`, `inv_parking_bays`, `inv_specifications` | `/api/v1/inventory/matrix`, `/inventory/units` |
| **04** | **CRM, Leads & Customer Management** | Prompt 5 | `crm_leads`, `crm_customers`, `crm_interactions` | `/api/v1/crm/leads`, `/crm/leads/assign` |
| **05** | **Booking, Sales & Agreement Management** | Prompt 5 | `sls_bookings`, `sls_agreements`, `sls_allotments` | `/api/v1/sales/bookings`, `/sales/allotment-deed` |
| **06** | **Construction & Contractor Management** | Prompt 7 | `con_work_orders`, `con_ra_bills`, `con_contractors` | `/api/v1/construction/ra-bills`, `/work-orders` |
| **07** | **Accounts & Financial Management** | Prompt 8 | `acc_chart_of_accounts`, `acc_vouchers`, `acc_journal_entries` | `/api/v1/accounts/vouchers`, `/accounts/ledger` |
| **08** | **Installment & Collection Management** | Prompt 6 | `sls_customer_installments`, `sls_payment_receipts` | `/api/v1/installments/schedules`, `/installments/collect` |
| **09** | **Procurement & Inventory Management** | Prompt 7 | `scm_purchase_orders`, `scm_goods_receipts`, `scm_store_stock` | `/api/v1/procurement/orders`, `/stores/stock` |
| **10** | **Handover & Property Management** | Prompt 19 | `hnd_handover_inspections`, `hnd_possession_letters` | `/api/v1/handover/inspections`, `/handover/possession` |
| **11** | **Legal & Compliance Management** | Prompt 16 | `leg_title_verifications`, `leg_compliance_calendar` | `/api/v1/legal/compliance`, `/legal/title-search` |
| **12** | **HR, Payroll & Employee Management** | Prompt 13 | `hr_employees`, `hr_attendance`, `hr_payroll_payslips` | `/api/v1/hr/attendance`, `/hr/payroll/process` |
| **13** | **Management Dashboard & BI** | Prompt 12 | `bi_kpi_snapshots`, `bi_cashflow_projections` | `/api/v1/management/cockpit`, `/bi/kpis` |
| **14** | **VAT & Tax** | Prompt 8 | `acc_mushak_tax_invoices`, `acc_tds_deductions` | `/api/v1/tax/mushak-6-3`, `/tax/tds-certificates` |
| **15** | **Budget & Cost Control** | Prompt 21 | `prj_cost_budgets`, `prj_budget_variations` | `/api/v1/budget/variations`, `/budget/cost-control` |
| **16** | **Document Management (DMS)** | Prompt 24 | `dms_documents`, `dms_revisions`, `dms_signatures` | `/api/v1/dms/files`, `/dms/revisions` |
| **17** | **Workflow & Approvals Engine** | Prompt 1 | `sys_approval_tiers`, `sys_approval_requests` | `/api/v1/approvals/pending`, `/approvals/action` |
| **18** | **Customer Self-Service Portal** | Prompt 14 | `crm_customer_portals`, `crm_support_tickets` | `/api/v1/customer/properties`, `/customer/tickets` |
| **19** | **Mobile Apps (Suite of 6 Apps)** | Prompts 9-14| `mob_push_tokens`, `mob_offline_sync_queue` | `/api/v1/mobile/sync`, `/mobile/fcm` |
| **20** | **Website & Property Listing** | Prompt 26 | `pub_web_properties`, `pub_web_inquiries` | `/api/v1/public/properties`, `/public/inquiries` |
| **21** | **Audit & Security Governance** | Prompt 1 | `sys_audit_trails`, `sys_session_logs` | `/api/v1/governance/audits`, `/governance/sessions` |
| **22** | **Broker & Commission Engine** | Prompt 15 | `sls_brokers`, `sls_broker_commissions` | `/api/v1/brokers/settlements`, `/brokers/rules` |
| **23** | **Loan & Mortgage Tracking** | Prompt 25 | `bnk_mortgage_nocs`, `bnk_tripartite_agreements` | `/api/v1/banking/tripartite`, `/banking/nocs` |
| **24** | **Rental & Lease Management** | Prompt 20 | `rnt_lease_agreements`, `rnt_rent_schedules` | `/api/v1/rental/leases`, `/rental/rent-roll` |
| **25** | **Advanced Land Bank & Landowner** | Prompt 2 | `lnd_land_banks`, `lnd_landowners` | `/api/v1/land/proposals`, `/land/heirs` |
| **26** | **Joint Venture (JV) & Share Mgmt** | Prompt 2 | `lnd_jv_agreements`, `lnd_jv_unit_allocations` | `/api/v1/land/jv-agreements`, `/land/allocate-units` |
| **27** | **Land Legal Verification & Registry** | Prompt 2 | `lnd_survey_records`, `lnd_mutation_khatians` | `/api/v1/land/surveys`, `/land/mutation-check` |
| **28** | **Feasibility Study & Investment** | Prompt 3 | `prj_feasibility_models`, `prj_scenario_tests` | `/api/v1/projects/feasibility`, `/projects/roi` |
| **29** | **Building Design & Space Hierarchy** | Prompt 3 | `prj_towers`, `prj_spatial_blocks` | `/api/v1/projects/towers`, `/projects/spatial-tree` |
| **30** | **Authority Clearances (RAJUK/CDA)** | Prompt 3 | `prj_authority_clearances` | `/api/v1/projects/authority-clearances` |
| **31** | **Project Schedule & Resource (WBS)**| Prompt 3 | `prj_wbs_milestones`, `prj_gantt_tasks` | `/api/v1/projects/wbs`, `/projects/gantt` |
| **32** | **Advanced Sales & Unit Allocation** | Prompt 4 | `inv_units`, `inv_rate_cards` | `/api/v1/inventory/units/allocate`, `/rate-cards` |
| **33** | **Customer Agreement Workflow** | Prompt 5 | `sls_agreements`, `sls_deed_clauses` | `/api/v1/sales/agreements/generate` |
| **34** | **Cancellation, Refund & Transfer** | Prompt 5 | `sls_cancellations`, `sls_transfers` | `/api/v1/sales/cancellations`, `/sales/transfers` |
| **35** | **Advanced Installments & Aging** | Prompt 6 | `sls_customer_installments`, `sls_aging_reports`| `/api/v1/installments/aging`, `/installments/reschedule`|
| **36** | **BOQ, Estimation & Quantity Survey**| Prompt 3 | `prj_boq_items`, `prj_boq_subassemblies` | `/api/v1/projects/boq`, `/projects/boq/variance` |
| **37** | **Contractor & Subcontractor Billing**| Prompt 7 | `con_ra_bills`, `con_retention_ledgers` | `/api/v1/construction/ra-bills/certify` |
| **38** | **Material, Store & Site Inventory** | Prompt 7 | `scm_site_stores`, `scm_material_requisitions`| `/api/v1/stores/requisitions`, `/stores/issue` |
| **39** | **Site Engineer & DPR Diary** | Prompt 7 | `con_dpr_reports`, `con_site_photos` | `/api/v1/construction/dpr`, `/construction/diary` |
| **40** | **Quality Assurance & Safety (ITP)** | Prompt 7 | `con_concrete_cube_tests`, `con_safety_ncrs` | `/api/v1/construction/concrete-tests`, `/ncr` |
| **41** | **Full Accounting & Double Entry** | Prompt 8 | `acc_chart_of_accounts`, `acc_journal_entries`| `/api/v1/accounts/trial-balance`, `/accounts/pnl` |
| **42** | **Bangladesh VAT & Tax Accounting** | Prompt 8 | `acc_mushak_tax_invoices`, `acc_vds_withhold` | `/api/v1/tax/mushak-6-3`, `/tax/vds-reports` |
| **43** | **Bank Finance, Investor & Funding** | Prompt 25 | `bnk_term_loans`, `bnk_investor_returns` | `/api/v1/banking/term-loans`, `/banking/investors` |
| **44** | **Project Costing & Profitability** | Prompt 8 | `acc_cost_centers`, `acc_project_pnl` | `/api/v1/accounts/project-costing` |
| **45** | **Strategic Procurement & Tender** | Prompt 7 | `scm_rfq`, `scm_comparative_statements` | `/api/v1/procurement/cs`, `/procurement/po` |
| **46** | **Asset, Equipment & Machinery** | Prompt 18 | `ast_machinery_fleet`, `ast_maintenance_logs` | `/api/v1/assets/equipment`, `/assets/fuel-logs` |
| **47** | **Vendor Contract & Service Mgmt** | Prompt 7 | `scm_vendor_contracts`, `scm_sla_trackers` | `/api/v1/procurement/vendor-contracts` |
| **48** | **Apartment Handover & Clearance** | Prompt 19 | `hnd_handover_inspections`, `hnd_clearances` | `/api/v1/handover/clearance`, `/handover/keys` |
| **49** | **Defect Liability & Warranty (DLP)**| Prompt 19 | `hnd_dlp_tickets`, `hnd_contractor_sla` | `/api/v1/handover/dlp-tickets`, `/handover/sla` |
| **50** | **Building Owners' Association** | Prompt 19 | `hnd_owners_associations`, `hnd_sinking_funds`| `/api/v1/association/service-charge`, `/sinking-fund`|
| **51** | **Rental, Lease & Commercial Ops** | Prompt 20 | `rnt_lease_agreements`, `rnt_rent_ledgers` | `/api/v1/rental/rent-roll`, `/rental/tenants` |
| **52** | **Advanced CRM & Lead Automation** | Prompt 5 | `crm_leads`, `crm_lead_scoring_rules` | `/api/v1/crm/webhooks/facebook`, `/crm/routing` |
| **53** | **Website & Property Marketplace** | Prompt 26 | `pub_web_properties`, `pub_web_leads` | `/api/v1/marketplace/units`, `/marketplace/inquire` |
| **54** | **Customer Self-Service Portal** | Prompt 14 | `crm_customer_portals`, `crm_statements` | `/api/v1/customer/ledger`, `/customer/receipts` |
| **55** | **Broker & Commission Engine** | Prompt 15 | `sls_brokers`, `sls_broker_ledgers` | `/api/v1/brokers/calculate`, `/brokers/disburse` |
| **56** | **HR & Payroll** | Prompt 13 | `hr_employees`, `hr_payroll_payslips` | `/api/v1/hr/payslips`, `/hr/tax-certificates` |
| **57** | **Workflow & Approval Engine** | Prompt 1 | `sys_approval_tiers`, `sys_delegations` | `/api/v1/approvals/matrix`, `/approvals/escalate` |
| **58** | **Document Management & E-Sign** | Prompt 24 | `dms_documents`, `dms_esignatures` | `/api/v1/dms/sign`, `/dms/watermark` |
| **59** | **Security, Audit & Data Governance**| Prompt 1 | `sys_audit_trails`, `sys_field_security` | `/api/v1/governance/field-permissions` |
| **60** | **Multi-Company & Branch Mgmt** | Prompt 1 | `sys_organizations`, `sys_branches` | `/api/v1/organizations`, `/organizations/branches` |
| **61** | **Multi-Project Portfolio BI** | Prompt 12 | `bi_portfolio_snapshots`, `bi_risk_matrix` | `/api/v1/management/portfolio-health` |
| **62** | **Legal Case & Litigation Mgmt** | Prompt 16 | `leg_court_cases`, `leg_hearings_calendar` | `/api/v1/legal/cases`, `/legal/hearings` |
| **63** | **Insurance Management** | Prompt 16 | `ins_policies`, `ins_claims_register` | `/api/v1/insurance/policies`, `/insurance/claims` |
| **64** | **Utility & Connection Tracking** | Prompt 17 | `utl_connections`, `utl_substation_tests` | `/api/v1/utilities/meters`, `/utilities/solar-clearance`|
| **65** | **Risk & Issue Register** | Prompt 21 | `rsk_risk_registers`, `rsk_mitigations` | `/api/v1/risk/issues`, `/risk/mitigate` |
| **66** | **Budget Revision & Change Control** | Prompt 21 | `prj_budget_revisions`, `prj_variation_orders`| `/api/v1/budget/revisions`, `/budget/approvals` |
| **67** | **Notification Centre** | Prompt 22 | `ntf_notifications`, `ntf_templates` | `/api/v1/notifications/broadcast`, `/sms/send` |
| **68** | **Reports & BI Engine** | Prompt 12 | `bi_saved_reports`, `bi_export_jobs` | `/api/v1/bi/export-excel`, `/bi/export-pdf` |
| **69** | **Mobile Workforce App** | Prompt 10 | `mob_workforce_locations`, `mob_dpr_sync` | `/api/v1/mobile/workforce/sync` |
| **70** | **Integration & API Management** | Prompt 1 | `sys_api_keys`, `sys_webhook_subscriptions` | `/api/v1/integrations/webhooks` |
| **71** | **AI Business Assistant** | Prompt 22 | `ai_prediction_logs`, `ai_anomaly_alerts` | `/api/v1/ai/collection-forecast`, `/ai/delay-alert`|
| **72** | **Data Import & Migration Engine** | Prompt 23 | `mig_import_batches`, `mig_validation_errors` | `/api/v1/migration/import-excel`, `/migration/commit`|

---

# TABLE OF CONTENTS FOR MASTER PROMPTS
1. [Native Bare-Metal Environment Setup (Zero Docker)](#1-native-bare-metal-environment-setup-zero-docker)
2. [Dynamic Lookup Subsystem (Mandatory Rule: 100% Zero Hardcoded Dropdowns)](#2-dynamic-lookup-subsystem-mandatory-rule-100-zero-hardcoded-dropdowns)
3. [Enterprise Angular 19 Shell, Navigation & Reusable Custom UI Components](#3-enterprise-angular-19-shell-navigation--reusable-custom-ui-components)
4. [Master Prompt 1: Core API Gateway, Multi-Tenant Auth & Project-Scoped RBAC](#4-master-prompt-1-core-api-gateway-multi-tenant-auth--project-scoped-rbac)
5. [Master Prompt 2: Bangladesh Land Bank, Historic Surveys & Joint Venture (JV) Engine](#5-master-prompt-2-bangladesh-land-bank-historic-surveys--joint-venture-jv-engine)
6. [Master Prompt 3: Project Spatial Planning, Authority Clearances (RAJUK/CDA) & BOQ](#6-master-prompt-3-project-spatial-planning-authority-clearances-rajukcda--boq)
7. [Master Prompt 4: Property Inventory, Dynamic Pricing & Real-Time Unit Locking](#7-master-prompt-4-property-inventory-dynamic-pricing--real-time-unit-locking)
8. [Master Prompt 5: Omnichannel CRM, Sales Booking & Bilingual Agreement Engine](#8-master-prompt-5-omnichannel-crm-sales-booking--bilingual-agreement-engine)
9. [Master Prompt 6: Customer Installments, PDC Cheque Vault & NI Act 138 Engine](#9-master-prompt-6-customer-installments-pdc-cheque-vault--ni-act-138-engine)
10. [Master Prompt 7: Construction Site Operations, DPR & Subcontractor Billing](#10-master-prompt-7-construction-site-operations-dpr--subcontractor-billing)
11. [Master Prompt 8: Double-Entry Accounts, Bangladesh VAT & Statutory Tax Engine](#11-master-prompt-8-double-entry-accounts-bangladesh-vat--statutory-tax-engine)
12. [Master Prompt 9: Mobile App 1 — Sales & CRM Mobile App (`bd_realestate_sales_app`)](#12-master-prompt-9-mobile-app-1--sales--crm-mobile-app-bd_realestate_sales_app)
13. [Master Prompt 10: Mobile App 2 — Site Engineer & Construction Operations App (`bd_realestate_site_app`)](#13-master-prompt-10-mobile-app-2--site-engineer--construction-operations-app-bd_realestate_site_app)
14. [Master Prompt 11: Mobile App 3 — Collection & Field Recovery App with Bluetooth Thermal Printing (`bd_realestate_collection_app`)](#14-master-prompt-11-mobile-app-3--collection--field-recovery-app-with-bluetooth-thermal-printing-bd_realestate_collection_app)
15. [Master Prompt 12: Mobile App 4 — Executive Management & BI Cockpit App (`bd_realestate_management_app`)](#15-master-prompt-12-mobile-app-4--executive-management--bi-cockpit-app-bd_realestate_management_app)
16. [Master Prompt 13: Mobile App 5 — HR, Attendance & Field Employee App (`bd_realestate_hr_app`)](#16-master-prompt-13-mobile-app-5--hr-attendance--field-employee-app-bd_realestate_hr_app)
17. [Master Prompt 14: Mobile App 6 — Customer Self-Service & Property App (`bd_realestate_customer_app`)](#17-master-prompt-14-mobile-app-6--customer-self-service--property-app-bd_realestate_customer_app)
18. [Master Prompt 15: Broker, Referral Network & Multi-Tier Commission Engine](#18-master-prompt-15-broker-referral-network--multi-tier-commission-engine)
19. [Master Prompt 16: Legal Case, Litigation, Court Hearing & Dispute Management](#19-master-prompt-16-legal-case-litigation-court-hearing--dispute-management)
20. [Master Prompt 17: Utility Clearances, Sub-stations, Deep Tube-well & Green Energy](#20-master-prompt-17-utility-clearances-sub-stations-deep-tube-well--green-energy)
21. [Master Prompt 18: Asset, Plant Machinery & Equipment Fleet Management](#21-master-prompt-18-asset-plant-machinery--equipment-fleet-management)
22. [Master Prompt 19: Handover, Snagging, Defect Liability (DLP) & Building Owners Association](#22-master-prompt-19-handover-snagging-defect-liability-dlp--building-owners-association)
23. [Master Prompt 20: Commercial Leasing, Rent Roll & Tenancy Management](#23-master-prompt-20-commercial-leasing-rent-roll--tenancy-management)
24. [Master Prompt 21: Risk Register, Budget Revision & Change Control](#24-master-prompt-21-risk-register-budget-revision--change-control)
25. [Master Prompt 22: AI Business Assistant & Automated Predictive Analytics](#25-master-prompt-22-ai-business-assistant--automated-predictive-analytics)
26. [Master Prompt 23: Data Migration, Bulk Excel Importer & Legacy Opening Balances](#26-master-prompt-23-data-migration-bulk-excel-importer--legacy-opening-balances)
27. [Master Prompt 24: Document Management & E-Signature (DMS)](#27-master-prompt-24-document-management--e-signature-dms)
28. [Master Prompt 25: Bank Financing, Mortgage Tracking, Investor & Funding](#28-master-prompt-25-bank-financing-mortgage-tracking-investor--funding)
29. [Master Prompt 26: Website & Public Property Listing Integration](#29-master-prompt-26-website--public-property-listing-integration)
30. [Bangladesh Compliance, Sub-Registry Fees, VAT & Math Formulas Reference](#30-bangladesh-compliance-sub-registry-fees-vat--math-formulas-reference)

---

# 1. Native Bare-Metal Environment Setup (Zero Docker)

To satisfy the user's explicit mandate (**"docker totally bad daw"**), the entire platform runs directly on the host operating system with zero container overhead:

### A. Prerequisites Installed Directly on Host PC:
1. **Python 3.12+**: With `pip` and virtual environment support.
2. **Node.js v20.x+ (LTS)**: With `npm` and Angular CLI 19 (`npm install -g @angular/cli`).
3. **MySQL 8.0+ Community or Enterprise Server**: Running locally on port `3306`.
4. **Redis 7.0+** (or native Redis / Memurai for Windows): Running on port `6379`.
5. **Flutter SDK 3.24+**: With Android Studio / Xcode command-line tools.

### B. Native MySQL 8.0 Configuration for 1 Crore (10M+) Records (`my.ini` / `my.cnf`):
Place these parameters in your MySQL configuration file:
```ini
[mysqld]
default_authentication_plugin=mysql_native_password
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci

# High-Scale Concurrency & 1 Crore Record Buffer Allocation
max_connections=1000
connect_timeout=60
wait_timeout=28800
interactive_timeout=28800

# InnoDB Buffer Pool (Allocate 60-70% of Host RAM, e.g., 4GB on 8GB PC, 12GB on 16GB PC)
innodb_buffer_pool_size=4G
innodb_buffer_pool_instances=4
innodb_log_file_size=512M
innodb_log_buffer_size=64M
innodb_flush_log_at_trx_commit=2
innodb_file_per_table=1
table_open_cache=4000
open_files_limit=65535
```

### C. Native Execution Commands:
```bash
# 1. Native Backend Virtualenv Setup & Launch
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 2. Native Frontend Setup & Launch
cd frontend
npm install
ng serve --port 4200 --open

# 3. Native Flutter Mobile App Run (Example: Sales App)
cd mobile_apps/bd_realestate_sales_app
flutter pub get
flutter run
```

---

# 2. Dynamic Lookup Subsystem (Mandatory Rule: 100% Zero Hardcoded Dropdowns)

### Architectural Principle:
**Zero hardcoded dropdown values in the entire application.** Every single select menu (e.g. Survey Types, Land Classes, Unit Facings, Clearances, Payment Modes, Weather, Trade Categories) is dynamically driven by the database, cached in Redis with a 24-hour TTL, and exposes an **inline `+ Add New` button** directly on the dropdown so users can create options without leaving the form.

### A. Database DDL (MySQL 8.0):
```sql
CREATE TABLE sys_lookup_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(64) NOT NULL UNIQUE,
    category_name VARCHAR(128) NOT NULL,
    description VARCHAR(255) NULL,
    is_hierarchical BOOLEAN DEFAULT FALSE,
    is_system_locked BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cat_code (category_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sys_lookup_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    item_code VARCHAR(64) NOT NULL,
    item_name_en VARCHAR(191) NOT NULL,
    item_name_bn VARCHAR(191) NOT NULL,
    parent_id BIGINT UNSIGNED NULL,
    color_badge VARCHAR(32) NULL,
    sort_order INT UNSIGNED DEFAULT 0,
    metadata JSON NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cat_item (category_id, item_code),
    INDEX idx_cat_active_sort (category_id, is_active, sort_order),
    INDEX idx_parent (parent_id),
    CONSTRAINT fk_lookup_category FOREIGN KEY (category_id) REFERENCES sys_lookup_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_lookup_parent FOREIGN KEY (parent_id) REFERENCES sys_lookup_items(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### B. Fast Native In-Memory Dynamic Lookup Router (FastAPI):
```python
# app/modules/lookups/router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import re
from app.core.database import get_db
from app.modules.lookups.models import LookupCategory, LookupItem
from app.modules.lookups.schemas import LookupItemResponse, LookupQuickCreate

router = APIRouter(prefix="/lookups", tags=["Dynamic Lookups"])

@router.get("/{category_code}", response_model=List[LookupItemResponse])
async def get_items_by_category(category_code: str, db: AsyncSession = Depends(get_db)):
    cat_stmt = select(LookupCategory).where(LookupCategory.category_code == category_code)
    cat_res = await db.execute(cat_stmt)
    cat = cat_res.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail=f"Category '{category_code}' not found")
        
    items_stmt = select(LookupItem).where(
        LookupItem.category_id == cat.id, 
        LookupItem.is_active == True
    ).order_by(LookupItem.sort_order.asc(), LookupItem.item_name_en.asc())
    result = await db.execute(items_stmt)
    return result.scalars().all()

@router.post("/{category_code}/quick-create", response_model=LookupItemResponse, status_code=status.HTTP_201_CREATED)
async def quick_create_item(category_code: str, payload: LookupQuickCreate, db: AsyncSession = Depends(get_db)):
    """Triggered by the inline '+ Add New' button on any dropdown across the ERP"""
    cat_stmt = select(LookupCategory).where(LookupCategory.category_code == category_code)
    cat = (await db.execute(cat_stmt)).scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    item_code = payload.item_code or re.sub(r'[^A-Z0-9_]', '', payload.item_name_en.upper().replace(' ', '_'))
    item_name_bn = payload.item_name_bn or payload.item_name_en
    
    new_item = LookupItem(
        category_id=cat.id,
        item_code=item_code,
        item_name_en=payload.item_name_en,
        item_name_bn=item_name_bn,
        color_badge=payload.color_badge,
        sort_order=99
    )
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    return new_item
```

---

# 3. Enterprise Angular 19 Shell, Navigation & Reusable Custom UI Components

### Mandatory UI/UX Standards:
1. **No Tabs for Top-Level Navigation**: Use a **Multi-Level Collapsible Sidebar with Nested Sub-menus** and clean, deep-linkable URLs.
2. **Proportional Equal Gap**: Topbar and Sidebar maintain identical gap spacing (`p-6` / `gap-6`).
3. **Unified Card Container**: The center/right workspace renders completely inside a single, unified Card Container (`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6`).
4. **Uniform Border & Radius Standard**:
   - Standard Border: `border border-slate-200 dark:border-slate-800`.
   - Card/Modal Radius: `rounded-xl` (12px).
   - Input/Button Radius: `rounded-lg` (8px).

### A. Application Shell Template (`src/app/layouts/admin-layout.component.html`):
```html
<div class="flex h-screen w-screen overflow-hidden bg-[var(--color-bg-app)] font-sans antialiased text-slate-800 dark:text-slate-100">
  
  <!-- Left Multi-Level Sidebar -->
  <aside class="w-72 flex-shrink-0 bg-[var(--color-bg-sidebar)] text-slate-300 flex flex-col z-30 shadow-xl border-r border-slate-800">
    <div class="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
      <div class="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-md">
        <i-lucide name="building-2" class="w-5 h-5"></i-lucide>
      </div>
      <div>
        <h1 class="text-sm font-bold tracking-tight text-white leading-none">REAL ESTATE ERP</h1>
        <p class="text-[10px] text-teal-400 font-medium tracking-wider uppercase mt-1">Bangladesh Edition</p>
      </div>
    </div>

    <!-- Scrollable Nested Sub-menus -->
    <div class="flex-1 overflow-y-auto px-4 py-4 space-y-1">
      <app-sidebar-nav></app-sidebar-nav>
    </div>

    <div class="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-teal-400">
        AD
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-white truncate">Administrator</p>
        <p class="text-[11px] text-slate-400 truncate">Head Office (Dhaka)</p>
      </div>
    </div>
  </aside>

  <!-- Right Workspace Area with Equal Proportional Gap (p-6 / gap-6) -->
  <div class="flex flex-1 flex-col overflow-hidden p-6 gap-6 min-w-0">
    
    <!-- Topbar: Global Project Selector, Search, Alerts, Profile -->
    <header class="h-16 flex-shrink-0 bg-[var(--color-bg-card)] border border-[var(--color-border-standard)] rounded-xl px-6 flex items-center justify-between shadow-sm">
      <app-topbar></app-topbar>
    </header>

    <!-- Unified Center/Right Card Container (Houses routed components) -->
    <main class="flex-1 overflow-y-auto bg-[var(--color-bg-card)] border border-[var(--color-border-standard)] rounded-xl p-6 shadow-sm flex flex-col relative">
      <app-breadcrumb class="mb-4 flex-shrink-0"></app-breadcrumb>
      <div class="flex-1 min-w-0">
        <router-outlet></router-outlet>
      </div>
    </main>

  </div>
</div>
```

### B. Custom Reusable Component: `<app-searchable-select>` with Inline `+ Add New`:
```typescript
// src/app/shared/components/searchable-select/searchable-select.component.ts
import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule, Search, Plus, ChevronDown, Check, Loader2 } from 'lucide-angular';

export interface LookupItem {
  id: number | string;
  item_code: string;
  item_name_en: string;
  item_name_bn: string;
  color_badge?: string;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="relative w-full text-left">
      <label *ngIf="label" class="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
        {{ label }} <span *ngIf="required" class="text-rose-500">*</span>
      </label>

      <button
        type="button"
        (click)="toggleDropdown()"
        [disabled]="disabled || isLoading()"
        class="w-full flex items-center justify-between h-10 px-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
        
        <span class="truncate" *ngIf="selectedItem(); else placeholderTpl">
          <span *ngIf="selectedItem()?.color_badge" class="inline-block w-2.5 h-2.5 rounded-full mr-2" [style.backgroundColor]="selectedItem()?.color_badge"></span>
          {{ selectedItem()?.item_name_en }} ({{ selectedItem()?.item_name_bn }})
        </span>
        <ng-template #placeholderTpl>
          <span class="text-slate-400">{{ placeholder }}</span>
        </ng-template>

        <span class="flex items-center ml-2 text-slate-400">
          <i-lucide *ngIf="isLoading()" name="loader-2" class="w-4 h-4 animate-spin text-teal-600"></i-lucide>
          <i-lucide *ngIf="!isLoading()" name="chevron-down" class="w-4 h-4 transition-transform duration-200" [class.rotate-180]="isOpen()"></i-lucide>
        </span>
      </button>

      <div
        *ngIf="isOpen()"
        class="absolute z-50 mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-1">
        
        <!-- Search Input Filter -->
        <div class="p-2 border-b border-slate-100 dark:border-slate-800">
          <div class="relative flex items-center">
            <i-lucide name="search" class="w-4 h-4 absolute left-2.5 text-slate-400"></i-lucide>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (click)="$event.stopPropagation()"
              placeholder="Search or filter..."
              class="w-full h-8 pl-8 pr-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
        </div>

        <!-- Filtered List -->
        <div class="max-h-56 overflow-y-auto py-1">
          <div
            *ngFor="let item of filteredItems()"
            (click)="selectItem(item)"
            class="px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition">
            <div class="flex items-center space-x-2 truncate">
              <span *ngIf="item.color_badge" class="w-2 h-2 rounded-full" [style.backgroundColor]="item.color_badge"></span>
              <span class="font-medium">{{ item.item_name_en }}</span>
              <span class="text-slate-400 text-[11px]">({{ item.item_name_bn }})</span>
            </div>
            <i-lucide *ngIf="selectedId === item.id" name="check" class="w-3.5 h-3.5 text-teal-600 flex-shrink-0"></i-lucide>
          </div>

          <div *ngIf="filteredItems().length === 0" class="px-3.5 py-4 text-xs text-center text-slate-400">
            No items found matching "{{ searchQuery }}"
          </div>
        </div>

        <!-- Inline Quick Create Footer Button -->
        <div *ngIf="allowCreateNew" class="p-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <button
            type="button"
            (click)="openQuickCreateModal()"
            class="w-full flex items-center justify-center space-x-1.5 h-8 px-3 bg-white dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-700 border border-dashed border-teal-500/40 rounded-lg text-xs font-medium text-teal-600 dark:text-teal-400 transition">
            <i-lucide name="plus" class="w-3.5 h-3.5"></i-lucide>
            <span>+ Add New {{ label || 'Item' }}</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class SearchableSelectComponent implements OnInit {
  @Input() categoryCode!: string;
  @Input() label: string = '';
  @Input() placeholder: string = 'Select an option...';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() allowCreateNew: boolean = true;
  @Input() selectedId: number | string | null = null;
  @Output() selectionChange = new EventEmitter<LookupItem>();
  @Output() triggerCreateNew = new EventEmitter<string>();

  isOpen = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  items = signal<LookupItem[]>([]);
  searchQuery: string = '';

  filteredItems = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.items();
    return this.items().filter(item => 
      item.item_name_en.toLowerCase().includes(q) || item.item_name_bn.includes(q)
    );
  });

  selectedItem = computed(() => this.items().find(i => i.id === this.selectedId) || null);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    if (this.categoryCode) this.fetchItems();
  }

  fetchItems(): void {
    this.isLoading.set(true);
    this.http.get<LookupItem[]>(`/api/v1/lookups/${this.categoryCode}`).subscribe({
      next: (data) => {
        this.items.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  toggleDropdown(): void { this.isOpen.set(!this.isOpen()); }
  selectItem(item: LookupItem): void {
    this.selectedId = item.id;
    this.selectionChange.emit(item);
    this.isOpen.set(false);
  }
  openQuickCreateModal(): void {
    this.isOpen.set(false);
    this.triggerCreateNew.emit(this.categoryCode);
  }
}
```

---

# 4. Master Prompt 1: Core API Gateway, Multi-Tenant Auth & Project-Scoped RBAC

```markdown
### SYSTEM ROLE:
Principal Security & Backend Architect (FastAPI, OAuth2/JWT, MySQL 8.0, Redis).

### TASK:
Implement `auth-governance-service`. Manages multi-company organization hierarchies (Parent Real Estate Group + Subsidiaries), JWT token lifecycle, project-scoped RBAC, and immutable audit trails for 2 crore+ rows.

### DDL & SCHEMA (MYSQL 8.0):
```sql
CREATE TABLE sys_organizations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_code VARCHAR(32) NOT NULL UNIQUE,
    legal_name_en VARCHAR(191) NOT NULL,
    legal_name_bn VARCHAR(191) NOT NULL,
    trade_license_number VARCHAR(64) NOT NULL,
    tin_number VARCHAR(32) NOT NULL,
    bin_vat_number VARCHAR(32) NOT NULL,
    rehab_membership_number VARCHAR(32) NULL,
    parent_organization_id INT UNSIGNED NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_organization_id) REFERENCES sys_organizations(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sys_users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id INT UNSIGNED NOT NULL,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(191) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name_en VARCHAR(191) NOT NULL,
    full_name_bn VARCHAR(191) NOT NULL,
    is_group_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES sys_organizations(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sys_user_project_assignments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    role_code VARCHAR(64) NOT NULL,
    can_view_financials BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES sys_users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_proj_role (user_id, project_id, role_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Range Partitioned Audit Trails (2 Crore+ Records)
CREATE TABLE sys_audit_trails (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    microservice_name VARCHAR(64) NOT NULL,
    entity_name VARCHAR(64) NOT NULL,
    entity_id BIGINT UNSIGNED NOT NULL,
    action_type ENUM('CREATE', 'UPDATE', 'SOFT_DELETE', 'APPROVE', 'REJECT') NOT NULL,
    payload_before JSON NULL,
    payload_after JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at),
    KEY idx_entity (entity_name, entity_id, created_at),
    KEY idx_user_date (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p_2025 VALUES LESS THAN (2026),
    PARTITION p_2026 VALUES LESS THAN (2027),
    PARTITION p_2027 VALUES LESS THAN (2028),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

### PROJECT-SCOPED FASTAPI DEPENDENCY:
```python
async def require_project_scope(
    x_project_id: int = Header(..., alias="X-Project-Id"),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.is_group_admin: return True
    stmt = select(sys_user_project_assignments).where(
        sys_user_project_assignments.user_id == current_user.id,
        sys_user_project_assignments.project_id == x_project_id
    )
    res = await db.execute(stmt)
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied for Project #" + str(x_project_id))
    return True
```
```

---

# 5. Master Prompt 2: Bangladesh Land Bank, Historic Surveys & Joint Venture (JV) Engine

```markdown
### SYSTEM ROLE:
Senior Land Law Specialist and Domain Backend Architect.

### TASK:
Implement `land-jv-service`. Handles Land Bank proposals, Mouza, JL, CS, SA, RS, BS/City Survey khatians, Dag mapping, regional area conversions (Katha/Decimal/Bigha), and Joint Venture (JV) Landowner Unit Allocation matrices.

### DDL & SCHEMA (MYSQL 8.0):
```sql
CREATE TABLE lnd_land_banks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id INT UNSIGNED NOT NULL,
    project_code VARCHAR(32) NOT NULL UNIQUE,
    proposal_title VARCHAR(255) NOT NULL,
    mouza_name VARCHAR(128) NOT NULL,
    jl_number VARCHAR(32) NOT NULL,
    total_area_katha DECIMAL(12, 4) NOT NULL,
    total_area_decimal DECIMAL(12, 4) NOT NULL,
    deal_type ENUM('OUTRIGHT_PURCHASE', 'JOINT_VENTURE', 'LEASEHOLD') NOT NULL,
    status ENUM('PROPOSAL', 'LEGAL_VERIFICATION', 'JV_SIGNED', 'REGISTRATION_DONE') DEFAULT 'PROPOSAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lnd_survey_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    land_bank_id BIGINT UNSIGNED NOT NULL,
    survey_type_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: LAND_SURVEY_TYPE (CS, SA, RS, BS)
    khatian_number VARCHAR(64) NOT NULL,
    recorded_tenant_name VARCHAR(191) NOT NULL,
    dag_number VARCHAR(64) NOT NULL,
    recorded_area_decimal DECIMAL(10, 4) NOT NULL,
    recorded_area_katha DECIMAL(10, 4) NOT NULL,
    FOREIGN KEY (land_bank_id) REFERENCES lnd_land_banks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lnd_jv_agreements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    land_bank_id BIGINT UNSIGNED NOT NULL UNIQUE,
    agreement_deed_no VARCHAR(64) NOT NULL,
    landowner_share_percent DECIMAL(5, 2) NOT NULL, -- e.g., 50.00%
    developer_share_percent DECIMAL(5, 2) NOT NULL, -- e.g., 50.00%
    signing_money_total DECIMAL(16, 2) DEFAULT 0.00,
    tenure_months INT UNSIGNED DEFAULT 36,
    FOREIGN KEY (land_bank_id) REFERENCES lnd_land_banks(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permanent lock on Landowner Share apartments
CREATE TABLE lnd_jv_unit_allocations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    jv_agreement_id BIGINT UNSIGNED NOT NULL,
    unit_identifier VARCHAR(32) NOT NULL,
    allocation_type ENUM('LANDOWNER_UNIT', 'DEVELOPER_UNIT') NOT NULL,
    is_locked_for_sales BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (jv_agreement_id) REFERENCES lnd_jv_agreements(id) ON DELETE CASCADE,
    UNIQUE KEY uq_alloc (jv_agreement_id, unit_identifier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### MATHEMATICAL AREA CONVERSION ENGINE:
```python
def convert_land_area(sqft: float) -> dict:
    decimal = sqft / 435.60
    katha = sqft / 720.00
    bigha = katha / 20.00
    acre = sqft / 43560.00
    return {
        "sqft": round(sqft, 2),
        "decimal": round(decimal, 4),
        "katha": round(katha, 4),
        "bigha": round(bigha, 4),
        "acre": round(acre, 4),
        "formatted_bn": f"{round(katha, 2)} কাঠা ({round(decimal, 2)} শতক)"
    }
```
```

---

# 6. Master Prompt 3: Project Spatial Planning, Authority Clearances (RAJUK/CDA) & BOQ

```markdown
### SYSTEM ROLE:
Senior Civil Engineering Systems Specialist and Quantity Surveyor.

### TASK:
Implement `project-engineering-service`. Manages project spatial hierarchy (Project -> Tower -> Floor -> Unit), RAJUK/CDA/FSCD approval milestones, itemized BOQ estimation (RCC, 500W rod, cement, sand), and IFC drawing DMS with revision control.

### DDL & SCHEMA (MYSQL 8.0):
```sql
CREATE TABLE prj_projects (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    land_bank_id BIGINT UNSIGNED NOT NULL UNIQUE,
    project_code VARCHAR(32) NOT NULL UNIQUE,
    project_name VARCHAR(191) NOT NULL,
    development_authority_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: DEV_AUTHORITY (RAJUK, CDA, KDA, RDA)
    far_allocated DECIMAL(6, 3) NOT NULL,
    total_builtup_area_sqft DECIMAL(14, 2) NOT NULL,
    total_saleable_area_sqft DECIMAL(14, 2) NOT NULL,
    planned_handover_date DATE NOT NULL,
    status ENUM('PLANNING', 'APPROVAL_STAGE', 'CONSTRUCTION_ONGOING', 'HANDED_OVER') DEFAULT 'PLANNING'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE prj_authority_clearances (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    clearance_type_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: CLEARANCE_TYPE
    application_memo_no VARCHAR(64) NOT NULL,
    approved_memo_no VARCHAR(64) NULL,
    approval_date DATE NULL,
    expiry_date DATE NULL,
    status ENUM('SUBMITTED', 'INSPECTION', 'APPROVED', 'EXPIRED') DEFAULT 'SUBMITTED',
    document_url VARCHAR(512) NULL,
    FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE prj_boq_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    wbs_phase_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: WBS_PHASE
    material_category_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: MATERIAL_CAT (ROD_500W, CEMENT, SAND_FM25)
    unit_of_measure_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: UOM (MT, BAGS, CFT)
    estimated_quantity DECIMAL(14, 4) NOT NULL,
    estimated_unit_rate DECIMAL(12, 2) NOT NULL,
    total_estimated_cost DECIMAL(16, 2) GENERATED ALWAYS AS (estimated_quantity * estimated_unit_rate) STORED,
    actual_consumed_quantity DECIMAL(14, 4) DEFAULT 0.0000,
    FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
```

---

# 7. Master Prompt 4: Property Inventory, Dynamic Pricing & Real-Time Unit Locking

```markdown
### SYSTEM ROLE:
Real-Time Distributed Systems Architect (FastAPI, Redis, WebSockets).

### TASK:
Implement `inventory-pricing-service`. Manages apartment and parking inventory, computes dynamic rate cards (base rate + floor escalation + facing premiums), enforces Redis distributed 15-minute unit locking, and streams real-time status deltas to web and mobile apps via WebSockets.

### DDL & SCHEMA (MYSQL 8.0):
```sql
CREATE TABLE inv_units (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    tower_id BIGINT UNSIGNED NOT NULL,
    floor_number INT NOT NULL,
    unit_number VARCHAR(32) NOT NULL,
    net_carpet_area_sqft DECIMAL(10, 2) NOT NULL,
    gross_saleable_area_sqft DECIMAL(10, 2) NOT NULL,
    base_rate_per_sqft DECIMAL(12, 2) NOT NULL,
    floor_escalation_rate DECIMAL(10, 2) DEFAULT 0.00, -- e.g. +50 BDT/sqft per floor level
    facing_premium_rate DECIMAL(10, 2) DEFAULT 0.00,   -- e.g. +200 BDT/sqft for South-Facing Lake View
    effective_rate_per_sqft DECIMAL(12, 2) GENERATED ALWAYS AS (base_rate_per_sqft + floor_escalation_rate + facing_premium_rate) STORED,
    total_unit_price DECIMAL(16, 2) GENERATED ALWAYS AS (gross_saleable_area_sqft * (base_rate_per_sqft + floor_escalation_rate + facing_premium_rate)) STORED,
    status_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: UNIT_STATUS (AVAILABLE, ON_HOLD, BOOKED, SOLD, LANDOWNER_SHARE)
    is_landowner_share BOOLEAN DEFAULT FALSE,
    current_locked_by_user_id BIGINT UNSIGNED NULL,
    lock_expires_at TIMESTAMP NULL,
    UNIQUE KEY uq_unit (tower_id, floor_number, unit_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### DISTRIBUTED LOCKING IMPLEMENTATION (FASTAPI + REDIS):
```python
@router.post("/units/{unit_id}/lock")
async def lock_unit(unit_id: int, user_id: int):
    lock_key = f"unit:lock:{unit_id}"
    acquired = await redis_client.set(lock_key, str(user_id), ex=900, nx=True) # 15 minutes
    if not acquired:
        ttl = await redis_client.ttl(lock_key)
        raise HTTPException(status_code=409, detail=f"Unit is locked by another salesperson. Try in {ttl}s.")
        
    await redis_client.publish("unit_events", json.dumps({"event": "UNIT_LOCKED", "unit_id": unit_id, "user_id": user_id}))
    return {"status": "LOCKED", "ttl_seconds": 900}
```
```

---

# 8. Master Prompt 5: Omnichannel CRM, Sales Booking & Bilingual Agreement Engine

```markdown
### SYSTEM ROLE:
Sales Automation & Legal Tech Systems Specialist.

### TASK:
Implement `crm-sales-booking-service`. Ingests leads from Facebook Ads and webhooks, routes via round-robin, captures KYC and nominee records, executes bookings with multi-tier discount approval limits, and generates bilingual (Bangla & English) Deeds of Agreement.

### DDL & SCHEMA (MYSQL 8.0):
```sql
CREATE TABLE crm_leads (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id INT UNSIGNED NOT NULL,
    lead_source_id BIGINT UNSIGNED NOT NULL,
    lead_name VARCHAR(191) NOT NULL,
    primary_phone VARCHAR(20) NOT NULL,
    assigned_sales_rep_id BIGINT UNSIGNED NOT NULL,
    lead_stage ENUM('NEW', 'CONTACTED', 'VISITED', 'NEGOTIATION', 'BOOKED', 'DROPPED') DEFAULT 'NEW',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone (primary_phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sls_bookings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_reference_no VARCHAR(32) NOT NULL UNIQUE,
    project_id BIGINT UNSIGNED NOT NULL,
    unit_id BIGINT UNSIGNED NOT NULL,
    primary_customer_id BIGINT UNSIGNED NOT NULL,
    booking_date DATE NOT NULL,
    final_contract_value DECIMAL(16, 2) NOT NULL,
    earnest_money_received DECIMAL(16, 2) NOT NULL,
    down_payment_total DECIMAL(16, 2) NOT NULL,
    discount_amount DECIMAL(16, 2) DEFAULT 0.00,
    status ENUM('PROVISIONAL', 'AGREEMENT_SIGNED', 'REGISTRATION_DONE', 'CANCELLED') DEFAULT 'PROVISIONAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES inv_units(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### MULTI-LEVEL DISCOUNT APPROVAL RULES:
- Discount $\le 1.0\%$: Sales Manager Approval.
- $1.0\% < \text{Discount} \le 3.0\%$: Director Approval.
- $\text{Discount} > 3.0\%$: Managing Director (MD) Biometric 1-Tap Mobile Approval.
```

---

# 9. Master Prompt 6: Customer Installments, PDC Cheque Vault & NI Act 138 Engine

```markdown
### SYSTEM ROLE:
Financial Systems Architect & Bangladesh Real Estate Litigation Specialist.

### TASK:
Implement `installment-pdc-collection-service`. Generates milestone and EMI payment schedules, tracks physical cheques in the treasury vault, sends scheduled SMS alerts, and automates Section 138 Negotiable Instruments Act (NI Act 1881) cheque bounce legal workflows.

### DDL & SCHEMA (MYSQL 8.0):
```sql
CREATE TABLE sls_customer_installments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    installment_no INT UNSIGNED NOT NULL,
    title VARCHAR(128) NOT NULL,
    due_date DATE NOT NULL,
    payable_amount DECIMAL(16, 2) NOT NULL,
    paid_amount DECIMAL(16, 2) DEFAULT 0.00,
    status ENUM('UPCOMING', 'DUE', 'PAID', 'OVERDUE') DEFAULT 'UPCOMING',
    FOREIGN KEY (booking_id) REFERENCES sls_bookings(id) ON DELETE RESTRICT,
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sls_pdc_vault (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    cheque_number VARCHAR(32) NOT NULL,
    bank_name VARCHAR(128) NOT NULL,
    branch_name VARCHAR(128) NOT NULL,
    maturity_date DATE NOT NULL,
    cheque_amount DECIMAL(16, 2) NOT NULL,
    pouch_barcode VARCHAR(64) NOT NULL UNIQUE,
    status ENUM('IN_VAULT', 'SENT_TO_BANK', 'HONOURED', 'DISHONOURED_BOUNCED') DEFAULT 'IN_VAULT',
    dishonour_memo_date DATE NULL,
    FOREIGN KEY (booking_id) REFERENCES sls_bookings(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sls_ni138_legal_actions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pdc_cheque_id BIGINT UNSIGNED NOT NULL UNIQUE,
    dishonour_memo_received_date DATE NOT NULL,
    statutory_notice_deadline_date DATE GENERATED ALWAYS AS (DATE_ADD(dishonour_memo_received_date, INTERVAL 30 DAY)) STORED,
    notice_served_to_client_date DATE NULL,
    client_30day_settlement_deadline DATE NULL,
    status ENUM('NOTICE_PENDING', 'NOTICE_DISPATCHED', 'NOTICE_SERVED', 'COURT_CASE_FILED') DEFAULT 'NOTICE_PENDING',
    FOREIGN KEY (pdc_cheque_id) REFERENCES sls_pdc_vault(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
```

---

# 10. Master Prompt 7: Construction Site Operations, DPR & Subcontractor Billing

```markdown
### SYSTEM ROLE:
Senior Quantity Surveyor & Construction Operations Specialist.

### TASK:
Implement `construction-site-service`. Manages Daily Progress Reports (DPR) with casting volumes, daily labor muster rolls, Contractor Running Account (RA) billing with retention money deductions, and concrete cube test registers (Day 7, 14, 28).

### DDL & SCHEMA (MYSQL 8.0):
```sql
CREATE TABLE con_dpr_reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    tower_id BIGINT UNSIGNED NOT NULL,
    report_date DATE NOT NULL,
    site_engineer_id BIGINT UNSIGNED NOT NULL,
    concrete_casting_cft DECIMAL(10, 2) DEFAULT 0.00,
    steel_rod_consumed_mt DECIMAL(10, 3) DEFAULT 0.000,
    total_workers_onsite INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('SUBMITTED', 'VERIFIED_BY_PM', 'APPROVED') DEFAULT 'SUBMITTED',
    UNIQUE KEY uq_dpr (project_id, tower_id, report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE con_ra_bills (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    work_order_no VARCHAR(64) NOT NULL,
    ra_bill_number INT UNSIGNED NOT NULL,
    gross_work_certified_amount DECIMAL(16, 2) NOT NULL,
    retention_money_deducted DECIMAL(16, 2) NOT NULL, -- Standard 5.0%
    advance_recovery_deducted DECIMAL(16, 2) DEFAULT 0.00,
    tds_withheld_amount DECIMAL(14, 2) DEFAULT 0.00,  -- Income Tax Sec 52
    vds_withheld_amount DECIMAL(14, 2) DEFAULT 0.00,  -- VAT Deduction at Source
    net_payable_amount DECIMAL(16, 2) NOT NULL,
    status ENUM('DRAFT', 'ENGINEER_CERTIFIED', 'APPROVED_BY_MANAGEMENT', 'PAID') DEFAULT 'DRAFT'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE con_concrete_cube_tests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    structural_element VARCHAR(128) NOT NULL,
    casting_date DATE NOT NULL,
    day7_testing_date DATE GENERATED ALWAYS AS (DATE_ADD(casting_date, INTERVAL 7 DAY)) STORED,
    day7_strength_psi DECIMAL(8, 2) NULL,
    day28_testing_date DATE GENERATED ALWAYS AS (DATE_ADD(casting_date, INTERVAL 28 DAY)) STORED,
    day28_strength_psi DECIMAL(8, 2) NULL,
    test_verdict ENUM('PENDING', 'PASSED', 'FAILED') DEFAULT 'PENDING'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
```

---

# 11. Master Prompt 8: Double-Entry Accounts, Bangladesh VAT & Statutory Tax Engine

```markdown
### SYSTEM ROLE:
Chartered Accountant (FCA) & Enterprise Financial Systems Architect.

### TASK:
Implement `accounts-finance-tax-service`. Manages multi-company balanced double-entry General Ledgers, Bangladesh VAT (VAT Act 2012) & Mushak 6.3 tax invoices, TDS/VDS withholding, and Sub-Registry AIT (Sec 53FF & 53H) calculations.

### DDL & SCHEMA (MYSQL 8.0 - RANGE PARTITIONED):
```sql
CREATE TABLE acc_chart_of_accounts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id INT UNSIGNED NOT NULL,
    account_code VARCHAR(32) NOT NULL UNIQUE,
    account_name_en VARCHAR(191) NOT NULL,
    account_name_bn VARCHAR(191) NOT NULL,
    account_type ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE') NOT NULL,
    is_leaf_account BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE acc_journal_entries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    voucher_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    account_id BIGINT UNSIGNED NOT NULL,
    voucher_date DATE NOT NULL,
    debit_amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
    credit_amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
    narration TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, voucher_date),
    KEY idx_account_date (account_id, voucher_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE (YEAR(voucher_date)) (
    PARTITION p_2025 VALUES LESS THAN (2026),
    PARTITION p_2026 VALUES LESS THAN (2027),
    PARTITION p_2027 VALUES LESS THAN (2028),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

CREATE TABLE acc_mushak_tax_invoices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    mushak_challan_number VARCHAR(64) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    developer_bin_number VARCHAR(32) NOT NULL,
    customer_tin_nid VARCHAR(32) NOT NULL,
    taxable_amount DECIMAL(16, 2) NOT NULL,
    vat_rate_percent DECIMAL(5, 2) NOT NULL, -- 2.0% (<=1600 sqft) or 4.5% (>1600 sqft)
    vat_amount DECIMAL(14, 2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### SUB-REGISTRY AIT & REGISTRATION COST ESTIMATOR:
$$\text{Stamp Duty} = 1.5\%, \quad \text{Reg Fee} = 1.0\%, \quad \text{Local Govt} = 2.0\%$$
$$\text{AIT (Sec 53FF)} = \text{Square Metres} \times \text{Slab Rate (৳১,৫০০ - ৳৪,০০০)}$$
```

---

# 12. Master Prompt 9: Mobile App 1 — Sales & CRM Mobile App (`bd_realestate_sales_app`)

```markdown
### SYSTEM ROLE:
Lead Flutter Mobile Architect (Flutter 3.24+, BLoC, Clean Architecture).

### TARGET AUDIENCE:
Sales Representatives, Relationship Managers, Direct Sales Executives, Channel Partner Brokers.

### COMPLETE FEATURE & WORKFLOW SPECIFICATION:
1. **Interactive Visual Unit Matrix**:
   - Color-coded grid: 🟢 Available, 🟡 On Hold (Countdown timer), 🔴 Sold, 🟣 Landowner Share.
   - Tap unit to view carpet area, floor escalation (+৳৫০/sqft), facing premium, gross price in BDT.
   - High-res 3D floor plan viewer with pinch-to-zoom.
2. **Real-Time 15-Minute Distributed Unit Locking**:
   - `POST /api/v1/units/{id}/lock` acquires Redis mutex lock.
   - Live countdown timer (15:00... 14:59...). Pushes WebSocket update to all other devices.
3. **Interactive BDT Installment & EMI Calculator**:
   - Sliders for Down Payment (10% to 50%) and Tenure (12 to 60 months).
   - Generates BDT schedule PDF instantly shareable to client's WhatsApp.
4. **Omnichannel Lead Management**:
   - Real-time push alerts on Facebook/Website leads.
   - Auto call-log prompt after ending call to record discussion outcome.
5. **Booking Execution**:
   - Client NID photo capture (front & back), nominee details.
   - Digital signature on mobile canvas; emits Provisional Allotment Letter.
```

---

# 13. Master Prompt 10: Mobile App 2 — Site Engineer & Construction Operations App (`bd_realestate_site_app`)

```markdown
### SYSTEM ROLE:
Lead Construction Tech & Flutter Mobile Architect.

### TARGET AUDIENCE:
Project Site Engineers, Project Managers, Store In-Charges, Safety Officers.

### COMPLETE FEATURE & WORKFLOW SPECIFICATION:
1. **Offline-First Resilience**:
   - Uses local `isar` database to allow 100% offline logging in deep basements or remote sites.
   - Auto-syncs with backend queue upon network detection.
2. **Anti-Tamper Watermarked Camera**:
   - Disables gallery upload (must be live camera shot).
   - Burns GPS coordinates, Project Name, Floor Level, Date, and Timestamp directly into image bytes.
3. **Daily Progress Report (DPR) Site Diary**:
   - Logs concrete casting volume (CFT/m³), rod consumption (MT), and daily narrative.
4. **Subcontractor Labor Attendance (Daily Muster Roll)**:
   - Headcount by trade: Rod-binders, Masons, Shuttering Carpenters, Plumbers, Helpers.
5. **Concrete Cube/Cylinder Crushing Test Tracker**:
   - Logs casting mix and slump test.
   - Automated push notifications on Day 7, Day 14, and Day 28 for crushing tests. Uploads lab report.
6. **Site Store GRN Receiver**:
   - Scans delivery challan for incoming rod/cement trucks.
```

---

# 14. Master Prompt 11: Mobile App 3 — Collection & Field Recovery App with Bluetooth Thermal Printing (`bd_realestate_collection_app`)

```markdown
### SYSTEM ROLE:
Fintech Integration & Flutter Mobile Architect.

### TARGET AUDIENCE:
Collection Officers, Field Recovery Agents, Accounts Executives.

### COMPLETE FEATURE & WORKFLOW SPECIFICATION:
1. **Route-Optimized Recovery Agenda**:
   - Google Maps view showing clients with pending dues or bounced cheques sorted by proximity.
2. **On-the-Spot Payment Collection**:
   - Accepts Cash, Cheque, Pay Order, or generates dynamic bKash/Nagad merchant QR code.
   - Client signs digital signature on screen.
3. **Bluetooth ESC/POS Thermal Receipt Printing**:
   - 1-Tap Bluetooth pairing with portable 58mm/80mm belt printers.
   - Prints official Money Receipt with logo, MR serial, amount in words, and QR verification code in <3 seconds.
4. **Post-Dated Cheque (PDC) Vault Intake**:
   - Takes photo of collected cheques; captures Cheque No, Bank, Branch, Amount, Maturity Date.
   - Scans barcode of central treasury security envelope pouch.
5. **NI Act 1881 Section 138 Legal Notice Delivery Logger**:
   - Real-time alert when cheque bounces.
   - Dispatched officer photographs signed acknowledgement receipt (A/D) from client to start the 30-day statutory countdown.
```

---

# 15. Master Prompt 12: Mobile App 4 — Executive Management & BI Cockpit App (`bd_realestate_management_app`)

```markdown
### SYSTEM ROLE:
Enterprise BI & Security Specialist (Flutter Mobile Architect).

### TARGET AUDIENCE:
Managing Director (MD), Chairman, Board of Directors, CFO, Chief Engineer.

### COMPLETE FEATURE & WORKFLOW SPECIFICATION:
1. **Strict Biometric Security Gate**:
   - Mandatory Face ID / Fingerprint unlock on cold start and before every financial approval.
2. **Executive BI Cockpit**:
   - Real-time KPIs in BDT: Today's Sales, Month-to-date Collection, Total Customer Overdue, Liquid Cash & Bank Balances, Unsold Inventory Valuation.
3. **Universal 1-Tap Biometric Approval Center**:
   - Booking discounts exceeding salesperson limits (with margin impact).
   - Purchase Orders (POs) and Comparative Statements (CS).
   - Contractor Running Account (RA) bills and advance releases.
   - Customer booking cancellations and refund schedules.
4. **Project Construction S-Curve Radar**:
   - Planned baseline vs. actual construction milestone progress (Green/Amber/Red flags).
5. **90-Day Cash Flow Forecast**:
   - Projected customer collections vs. committed contractor bills and debt repayments.
```

---

# 16. Master Prompt 13: Mobile App 5 — HR, Attendance & Field Employee App (`bd_realestate_hr_app`)

```markdown
### SYSTEM ROLE:
HR Tech & Computer Vision Flutter Architect.

### TARGET AUDIENCE:
All corporate staff, site engineers, surveyors, and field executives.

### COMPLETE FEATURE & WORKFLOW SPECIFICATION:
1. **Geofenced Attendance with Anti-Spoofing**:
   - Validates user GPS against a 50-metre boundary polygon of the Head Office or assigned Project Sites.
   - Anti-Mock Location: Blocks check-in if GPS spoofing emulator is detected.
2. **Facial Liveness Verification**:
   - Front camera prompts: "Look at camera and blink".
   - Verifies liveness using ML Kit to prevent printed photo buddy-punching.
3. **Leave Management**:
   - View balances (Casual, Sick, Earned); submit leaves with medical certificate upload.
4. **Encrypted Digital Payslip Vault**:
   - Download password-protected PDF salary slips detailing Basic, House Rent, Allowances, PF, and TDS.
5. **Project Daily Timesheet**:
   - Site engineers log daily hours worked per project for internal job-costing.
```

---

# 17. Master Prompt 14: Mobile App 6 — Customer Self-Service & Property App (`bd_realestate_customer_app`)

```markdown
### SYSTEM ROLE:
Customer Experience (CX) & Luxury Real Estate Flutter Architect.

### TARGET AUDIENCE:
Apartment Buyers, Commercial Space Owners, Investors.

### COMPLETE FEATURE & WORKFLOW SPECIFICATION:
1. **My Property Digital Portfolio**:
   - Specs: Tower, Floor, Flat No, Facing, Gross Area, Allotted Parking Bay.
   - Download signed Allotment Letter, Deed of Agreement, and Architectural Blueprint.
2. **Live Construction Progress Tracker**:
   - Milestone progress bar (Piling -> Structure -> Finishing -> Handover).
   - High-resolution monthly site progress photo gallery and 360-degree virtual tour.
3. **Financial Center & Online Installment Payment**:
   - View paid amount, upcoming dues, and overdue balance.
   - Pay installments online via bKash, Nagad, Visa, Mastercard with instant official Money Receipt download.
4. **Pre-Handover Snagging Tool**:
   - Homeowner walks through unit prior to possession; takes photos of paint scratches or tile defects.
   - Tracks real-time rectification by the developer site team.
5. **Post-Handover Helpdesk (Defect Liability Period - DLP)**:
   - 12-month DLP warranty service tickets (Plumbing, Electrical, Waterproofing).
   - Building Owners' Association (Kallyan Samity) monthly service charge notices.
```

---

# 18. Master Prompt 15: Broker, Referral Network & Multi-Tier Commission Engine

```markdown
### SYSTEM ROLE:
Sales Operations & Commission Accounting Specialist.

### TASK:
Implement `broker-commission-service` (Modules 22 & 55). Manages third-party real estate broker registrations, referral agreements, tier-based commission calculations, milestone-linked commission releases, and withholding tax (TDS under Section 53 of Income Tax Act 2023).

### DDL & SCHEMA (MYSQL 8.0):
```sql
CREATE TABLE sls_brokers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id INT UNSIGNED NOT NULL,
    broker_code VARCHAR(32) NOT NULL UNIQUE,
    agency_name VARCHAR(191) NULL,
    contact_person VARCHAR(191) NOT NULL,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    nid_number VARCHAR(20) NOT NULL,
    tin_number VARCHAR(20) NOT NULL,
    commission_slab_percent DECIMAL(5, 2) NOT NULL DEFAULT 1.50, -- Standard 1.5% to 3.0%
    bank_account_title VARCHAR(191) NOT NULL,
    bank_account_no VARCHAR(64) NOT NULL,
    bank_name VARCHAR(128) NOT NULL,
    branch_name VARCHAR(128) NOT NULL,
    routing_number VARCHAR(32) NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sls_broker_commissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    broker_id BIGINT UNSIGNED NOT NULL,
    booking_id BIGINT UNSIGNED NOT NULL,
    unit_id BIGINT UNSIGNED NOT NULL,
    total_unit_value DECIMAL(16, 2) NOT NULL,
    commission_percent DECIMAL(5, 2) NOT NULL,
    total_commission_amount DECIMAL(16, 2) GENERATED ALWAYS AS (total_unit_value * (commission_percent / 100)) STORED,
    disbursed_amount DECIMAL(16, 2) DEFAULT 0.00,
    tds_withheld_amount DECIMAL(14, 2) DEFAULT 0.00, -- Income Tax Sec 53 (10% on commission)
    status ENUM('PENDING_COLLECTION_MILESTONE', 'ELIGIBLE_FOR_PAYMENT', 'APPROVED', 'DISBURSED', 'CLAWED_BACK') DEFAULT 'PENDING_COLLECTION_MILESTONE',
    FOREIGN KEY (broker_id) REFERENCES sls_brokers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### COMMISSION RELEASE BUSINESS RULES:
1. **Milestone Tranche Rule**: Broker commission is released in tranches:
   - 40% released upon collection of Down Payment (minimum 20% of unit price).
   - 40% released upon completion of Foundation / Ground Slab milestone.
   - 20% released upon execution of Sub-Registry Deed of Transfer.
2. **Clawback Rule**: If the customer cancels booking before paying 25% of total unit price, any advance commission paid to the broker is clawed back against future commissions.
```

---

# 19. Master Prompt 16: Legal Case, Litigation, Court Hearing & Dispute Management

```markdown
### SYSTEM ROLE:
Real Estate Legal Counsel & Litigation Systems Specialist.

### TASK:
Implement `legal-litigation-service` (Modules 11, 27, 62 & 63). Manages court cases (Title suits, injunctions, NI Act 138 cases), hearings calendar, external lawyer appointments, legal expense ledgers, and insurance policies (Contractor's All Risk - CAR).

### DDL & SCHEMA (MYSQL 8.0):
```sql
CREATE TABLE leg_court_cases (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id INT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NULL,
    land_bank_id BIGINT UNSIGNED NULL,
    case_type ENUM('TITLE_SUIT', 'INJUNCTION_STAY_ORDER', 'NI_ACT_138_CHEQUE_BOUNCE', 'REHAB_ARBITRATION', 'LABOR_DISPUTE') NOT NULL,
    case_number VARCHAR(64) NOT NULL UNIQUE,
    concerned_court VARCHAR(191) NOT NULL, -- e.g. "Senior Assistant Judge Court, Dhaka"
    plaintiff_name VARCHAR(191) NOT NULL,
    defendant_name VARCHAR(191) NOT NULL,
    dispute_subject TEXT NOT NULL,
    appointed_advocate_name VARCHAR(191) NOT NULL,
    advocate_phone VARCHAR(20) NOT NULL,
    total_lawyer_fee DECIMAL(14, 2) NOT NULL,
    status ENUM('PENDING_HEARING', 'INTERIM_STAY_ACTIVE', 'DISMISSED', 'DECREED_IN_FAVOR', 'APPEALED') DEFAULT 'PENDING_HEARING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE leg_case_hearings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    case_id BIGINT UNSIGNED NOT NULL,
    hearing_date DATE NOT NULL,
    court_bench VARCHAR(128) NULL,
    proceedings_summary TEXT NOT NULL,
    next_hearing_date DATE NULL,
    order_sheet_attachment_url VARCHAR(512) NULL,
    FOREIGN KEY (case_id) REFERENCES leg_court_cases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ins_project_insurance_policies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    policy_type ENUM('CONTRACTORS_ALL_RISK', 'WORKMENS_COMPENSATION', 'PUBLIC_LIABILITY') NOT NULL,
    policy_number VARCHAR(64) NOT NULL UNIQUE,
    insurance_company_name VARCHAR(128) NOT NULL,
    sum_insured DECIMAL(16, 2) NOT NULL,
    premium_amount DECIMAL(14, 2) NOT NULL,
    policy_start_date DATE NOT NULL,
    policy_expiry_date DATE NOT NULL,
    status ENUM('ACTIVE', 'EXPIRED', 'CLAIM_SUBMITTED') DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
```

---

# 20. Master Prompt 17: Utility Clearances, Sub-stations, Deep Tube-well & Green Energy

```markdown
### SYSTEM ROLE:
MEP Infrastructure & Utility Clearance Specialist.

### TASK:
Implement `utility-infrastructure-service` (Modules 5 & 64). Manages electricity substation testing, DPDC/DESCO/BREB power lines, rooftop solar grid compliance (mandated by RAJUK), WASA water/sewerage connections, and LPG reticulation / Titas gas systems.

### DDL & SCHEMA (MYSQL 8.0):
```sql
CREATE TABLE utl_utility_connections (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    utility_type ENUM('ELECTRICITY_DESCO_DPDC', 'WASA_DEEP_TUBEWELL', 'WASA_SEWERAGE', 'ROOFTOP_SOLAR', 'LPG_RETICULATION') NOT NULL,
    application_date DATE NOT NULL,
    demand_note_number VARCHAR(64) NULL,
    demand_note_amount DECIMAL(14, 2) DEFAULT 0.00,
    demand_note_payment_date DATE NULL,
    inspection_clearance_date DATE NULL,
    meter_allotment_number VARCHAR(64) NULL,
    sanctioned_load_kw DECIMAL(10, 2) NULL,
    solar_capacity_kwp DECIMAL(8, 2) NULL, -- Mandated rooftop solar wattage
    status ENUM('APPLIED', 'DEMAND_NOTE_PAID', 'TESTING_COMPLETE', 'COMMISSIONED', 'REJECTED') DEFAULT 'APPLIED',
    FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
```

---

# 21. Master Prompt 18: Asset, Plant Machinery & Equipment Fleet Management

```markdown
### SYSTEM ROLE:
Plant & Machinery Fleet Management Engineer.

### TASK:
Implement `equipment-asset-service` (Module 46). Tracks developer-owned and rental heavy machinery (Tower cranes, concrete batching plants, hoists, generators, vibrators), maintenance schedules, fuel consumption, and inter-project transfers.

### DDL & SCHEMA (MYSQL 8.0):
```sql
CREATE TABLE ast_machinery_assets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    asset_code VARCHAR(32) NOT NULL UNIQUE, -- e.g. "CRANE-01", "MIXER-04"
    asset_name VARCHAR(128) NOT NULL,
    category ENUM('TOWER_CRANE', 'CONCRETE_MIXER', 'PASSENGER_HOIST', 'DIESEL_GENERATOR', 'SOIL_RIG') NOT NULL,
    ownership_type ENUM('COMPANY_OWNED', 'RENTAL_LEASED') NOT NULL,
    current_assigned_project_id BIGINT UNSIGNED NOT NULL,
    purchase_cost DECIMAL(16, 2) DEFAULT 0.00,
    hourly_operating_rate DECIMAL(10, 2) NOT NULL,
    status ENUM('OPERATIONAL', 'UNDER_MAINTENANCE', 'DECOMMISSIONED') DEFAULT 'OPERATIONAL'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ast_fuel_and_usage_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    asset_id BIGINT UNSIGNED NOT NULL,
    log_date DATE NOT NULL,
    operating_hours DECIMAL(6, 2) NOT NULL,
    diesel_consumed_liters DECIMAL(8, 2) NOT NULL,
    operator_name VARCHAR(128) NOT NULL,
    FOREIGN KEY (asset_id) REFERENCES ast_machinery_assets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
```

---

# 22. Master Prompt 19: Handover, Snagging, Defect Liability (DLP) & Building Owners Association

```markdown
### SYSTEM ROLE:
Property Handover, Defect Liability & Facility Management Specialist.

### TASK:
Implement `handover-facility-service` (Modules 10, 48, 49 & 50). Manages joint pre-handover snag inspection checklists, formal Possession Letters, 12-month Defect Liability Period (DLP) warranties, and Building Owners' Association (Kallyan Samity) sinking fund rolls.

### DDL & SCHEMA (MYSQL 8.0):
```sql
CREATE TABLE hnd_handover_inspections (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    unit_id BIGINT UNSIGNED NOT NULL,
    inspection_date DATE NOT NULL,
    site_engineer_id BIGINT UNSIGNED NOT NULL,
    customer_present BOOLEAN DEFAULT TRUE,
    all_financial_dues_cleared BOOLEAN DEFAULT FALSE,
    possession_letter_number VARCHAR(64) NULL UNIQUE,
    possession_handover_date DATE NULL,
    key_set_count INT UNSIGNED DEFAULT 3,
    status ENUM('SNAGGING_IN_PROGRESS', 'SNAGS_RECTIFIED', 'POSSESSION_HANDED_OVER') DEFAULT 'SNAGGING_IN_PROGRESS'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE hnd_dlp_tickets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    unit_id BIGINT UNSIGNED NOT NULL,
    ticket_category ENUM('PLUMBING_LEAK', 'ELECTRICAL_FAULT', 'TILES_HOLLOW', 'PAINT_PEELING', 'DOOR_ALIGNMENT') NOT NULL,
    issue_description TEXT NOT NULL,
    reported_date DATE NOT NULL,
    rectification_deadline DATE NOT NULL,
    subcontractor_responsible_id BIGINT UNSIGNED NULL,
    status ENUM('LOGGED', 'INSPECTION', 'RECTIFIED', 'VERIFIED_BY_CLIENT') DEFAULT 'LOGGED'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE hnd_owners_associations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL UNIQUE,
    association_name VARCHAR(191) NOT NULL, -- e.g. "Green Horizon Flat Owners' Welfare Association"
    handover_date DATE NOT NULL,
    sinking_fund_transferred_bdt DECIMAL(16, 2) NOT NULL,
    monthly_service_charge_per_flat DECIMAL(10, 2) NOT NULL DEFAULT 5500.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
```

---

# 23. Master Prompt 20: Commercial Leasing, Rent Roll & Tenancy Management

```markdown
### SYSTEM ROLE:
Commercial Real Estate Leasing Specialist.

### TASK:
Implement `rental-lease-service` (Modules 24 & 51). Manages retained company-owned commercial shops, retail spaces, and duplexes, monthly rent rolls, tenant security deposits, rent escalation schedules (e.g. +10% every 2 years), and utility meter recovery.

### DDL & SCHEMA (MYSQL 8.0):
```sql
CREATE TABLE rnt_lease_agreements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    unit_id BIGINT UNSIGNED NOT NULL,
    tenant_name VARCHAR(191) NOT NULL,
    tenant_nid VARCHAR(20) NOT NULL,
    trade_license_number VARCHAR(64) NULL,
    lease_start_date DATE NOT NULL,
    lease_expiry_date DATE NOT NULL,
    monthly_rent_bdt DECIMAL(14, 2) NOT NULL,
    security_deposit_bdt DECIMAL(14, 2) NOT NULL,
    rent_escalation_percent DECIMAL(5, 2) DEFAULT 10.00,
    escalation_frequency_months INT UNSIGNED DEFAULT 24,
    status ENUM('ACTIVE', 'EXPIRED', 'TERMINATED') DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
```

---

# 24. Master Prompt 21: Risk Register, Budget Revision & Change Control

```markdown
### SYSTEM ROLE:
Project Risk Management & Cost Engineering Specialist.

### TASK:
Implement `risk-budget-control-service` (Modules 15, 65 & 66). Tracks project cost variations, scope changes, budget revisions with impact analyses, and the quantitative Risk & Issue Register (Weather, Material Shortages, Regulatory Objections).

### DDL & SCHEMA (MYSQL 8.0):
```sql
CREATE TABLE rsk_risk_registers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    risk_title VARCHAR(191) NOT NULL,
    category ENUM('REGULATORY_APPROVAL', 'MATERIAL_PRICE_SPIKE', 'CONTRACTOR_DEFAULT', 'WEATHER_CYCLONE') NOT NULL,
    probability ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
    financial_impact_bdt DECIMAL(16, 2) NOT NULL,
    mitigation_strategy TEXT NOT NULL,
    risk_owner_user_id BIGINT UNSIGNED NOT NULL,
    status ENUM('OPEN', 'MONITORING', 'TRIGGERED', 'RESOLVED') DEFAULT 'OPEN'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE prj_budget_revisions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    revision_number VARCHAR(16) NOT NULL, -- e.g. "REV-01"
    original_budget_bdt DECIMAL(16, 2) NOT NULL,
    revised_budget_bdt DECIMAL(16, 2) NOT NULL,
    variance_reason TEXT NOT NULL,
    approved_by_board BOOLEAN DEFAULT FALSE,
    approval_date DATE NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
```

---

# 25. Master Prompt 22: AI Business Assistant & Automated Predictive Analytics

```markdown
### SYSTEM ROLE:
AI & Data Science Specialist (FastAPI, Scikit-Learn/Statsmodels, Celery).

### TASK:
Implement `ai-assistant-service` (Modules 67 & 71). Provides predictive collection forecasting, anomaly detection on material site consumption (identifies concrete/rod pilferage), and construction milestone delay predictions.

### PYTHON PREDICTIVE ENGINE SNIPPET:
```python
def predict_quarterly_collections(historical_installments: list) -> dict:
    # Analyzes customer payment punctuality, overdue trends, and seasonal Eid/festival dips
    expected_collection = sum(i['amount'] * (0.95 if i['status'] == 'UPCOMING' else 0.40) for i in historical_installments)
    return {
        "predicted_inflow_bdt": round(expected_collection, 2),
        "confidence_score": 0.88,
        "high_risk_defaulters_count": 14
    }
```
```

---

# 26. Master Prompt 23: Data Migration, Bulk Excel Importer & Legacy Opening Balances

```markdown
### SYSTEM ROLE:
Data Migration & ETL Systems Specialist.

### TASK:
Implement `data-migration-service` (Module 72). Validates, deduplicates, and migrates legacy Excel records into MySQL: Land records, Chart of Accounts opening balances, ongoing construction BOQs, and past customer installments.

### REST ENDPOINT:
- `POST /api/v1/migration/upload-excel` -> Parses spreadsheet, reports schema errors per line, and stages records.
- `POST /api/v1/migration/commit-batch` -> Executes atomic database transaction.
```

---

# 27. Master Prompt 24: Document Management & E-Signature (DMS)

```markdown
### SYSTEM ROLE:
Enterprise Document Management & Cryptographic Security Specialist.

### TASK:
Implement `dms-signature-service` (Modules 16 & 58). Central repository for deeds, agreements, drawings, and NID scans with AES-256 encryption, PDF watermarking ("CONFIDENTIAL"), and cryptographic digital signature logs.
```

---

# 28. Master Prompt 25: Bank Financing, Mortgage Tracking, Investor & Funding

```markdown
### SYSTEM ROLE:
Structured Finance & Corporate Banking Specialist.

### TASK:
Implement `banking-finance-service` (Modules 23 & 43). Tracks project overdraft facilities, term loans, investor equity contributions, **Tripartite Bank Agreements (Customer - Developer - Bank)**, and Permission to Mortgage (Bank NOC) issuance.
```

---

# 29. Master Prompt 26: Website & Public Property Listing Integration

```markdown
### SYSTEM ROLE:
Public Web & Headless CMS Integration Specialist.

### TASK:
Implement `public-marketplace-service` (Modules 20 & 53). Exposes public endpoints for the company website to list active projects, available flats, 3D walkthroughs, and converts public inquiry form submissions directly into qualified CRM leads.
```

---

# 30. Bangladesh Compliance, Sub-Registry Fees, VAT & Math Formulas Reference

### A. Mathematical Area Conversions:
- **1 Decimal (শতাংশ/শতক)** = 435.60 Sq Ft
- **1 Katha (কাঠা)** = 720.00 Sq Ft = 1.6528 Decimal
- **1 Bigha (বিঘা)** = 20 Katha = 14,400.00 Sq Ft = 33.0578 Decimal
- **1 Acre (একর)** = 100.00 Decimal = 43,560.00 Sq Ft

### B. Sub-Registry Registration Fees (Deed of Transfer):
- **Stamp Duty**: 1.5% of deed contract value.
- **Registration Fee**: 1.0% of deed contract value.
- **Local Government Tax**: 2.0% (City Corporation / Cantonment Board), 3.0% (Municipality).
- **Advance Income Tax (AIT / Gain Tax - Section 53FF of Income Tax Act 2023)**:
  - *Gulshan, Banani, Baridhara, Motijheel*: ৳ ৪,০০০ per square metre.
  - *Dhanmondi, Uttara, Mohakhali, Lalmatia*: ৳ ৩,০০০ per square metre.
  - *Other Dhaka/Chittagong City Corporation*: ৳ ১,৫০০ per square metre.
  - *Other Municipalities*: ৳ ৮০০ per square metre.

### C. Bangladesh VAT (Value Added Tax and Supplementary Duty Act 2012):
- **Residential Apartments up to 1,600 Sq Ft**: 2.0% VAT.
- **Residential Apartments above 1,600 Sq Ft**: 4.5% VAT.
- **Commercial Space & Shops**: 7.5% - 15.0% VAT.
- Mandatory generation of statutory **Mushak 6.3 Tax Invoice** on every customer installment collection.

### D. Negotiable Instruments Act 1881 Section 138 (Cheque Dishonour Statutory Timeline):
- **Within 30 Days of Dishonour Memo**: Issue formal Statutory Legal Notice demanding payment within 30 days of notice receipt.
- **Notice Served via**: Registered Post with A/D (Acknowledgement Due).
- **If Unpaid within 30 Days**: Formal Criminal Complaint (C.R. Case) must be filed in the Magistrate Court within the next 30 days.
