# Prompt Engineering Playbook — Complete Master Execution System

## 1. System Vision & Architecture Hierarchy
This playbook serves as the **authoritative master execution blueprint** for the Bangladesh Real Estate ERP & Construction Lifecycle Management Platform. Every microservice, frontend domain, database layer, and mobile application is engineered with deterministic, copy-pasteable execution prompts designed for human engineers and autonomous AI agents.

```
                                  [ MASTER PROMPT REPOSITORY ]
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ▼                                      ▼                                      ▼
[ Backend Microservices Prompts ]      [ Angular 19 Frontend Prompts ]      [ 6 Flutter Mobile App Prompts ]
(docs/playbook/01 - 08)                (docs/playbook/09)                   (docs/mobile_prompts/01 - 06)
```

---

## 2. Directory of Specialized Execution Prompts

To guarantee zero missing requirements, each functional area has its own dedicated, exhaustive prompt file containing full database DDL, API contracts, business rules, and UI/UX component architectures:

### A. Backend Microservices Prompts (`docs/playbook/`):
| # | Prompt File | Scope & Technical Implementation |
| :---: | :--- | :--- |
| **01** | [**`01_BACKEND_AUTH_GATEWAY_PROMPT.md`**](playbook/01_BACKEND_AUTH_GATEWAY_PROMPT.md) | FastAPI Gateway, OAuth2/JWT token lifecycle, Multi-tenancy (Parent & Sister Concerns), Project-Scoped RBAC, and immutable audit logging. |
| **02** | [**`02_LAND_ACQUISITION_JV_PROMPT.md`**](playbook/02_LAND_ACQUISITION_JV_PROMPT.md) | Land Bank, Landowners & Legal Heirs, CS/SA/RS/BS historic survey khatian engine, Dag boundary mapping, Katha/Decimal conversion math, and JV landowner-developer unit allocation matrix. |
| **03** | [**`03_PROJECT_ENGINEERING_BOQ_PROMPT.md`**](playbook/03_PROJECT_ENGINEERING_BOQ_PROMPT.md) | Spatial hierarchy (Project -> Tower -> Floor), RAJUK/CDA/FSCD building approval clearance workflow, itemized BOQ master (RCC, 500W rod, cement, sand), and IFC drawing DMS with revision control. |
| **04** | [**`04_INVENTORY_PRICING_LOCKING_PROMPT.md`**](playbook/04_INVENTORY_PRICING_LOCKING_PROMPT.md) | Unit catalog (Apartments, Duplexes, Shops, Parking Bays), Dynamic Rate Card with floor escalation and facing premiums, **Redis distributed 15-minute unit locking engine**, and WebSockets live matrix. |
| **05** | [**`05_CRM_SALES_BOOKING_AGREEMENT_PROMPT.md`**](playbook/05_CRM_SALES_BOOKING_AGREEMENT_PROMPT.md) | Omnichannel lead capture (Facebook/Web), lead scoring, customer KYC, **multi-tier discount authorization matrix**, bilingual (Bangla/English) Deed of Agreement generation, and cancellation/transfer engine. |
| **06** | [**`06_INSTALLMENT_PDC_NI138_PROMPT.md`**](playbook/06_INSTALLMENT_PDC_NI138_PROMPT.md) | Milestone/EMI installment generator, Post-Dated Cheque (PDC) vault, scheduled SMS deposit alerts, and **automated Section 138 Negotiable Instruments Act (NI Act 1881) cheque bounce legal notice engine**. |
| **07** | [**`07_CONSTRUCTION_DPR_SITE_OPERATIONS_PROMPT.md`**](playbook/07_CONSTRUCTION_DPR_SITE_OPERATIONS_PROMPT.md) | Site diary Daily Progress Reports (DPR), subcontractor labor muster rolls, **Contractor Running Account (RA) billing with retention money deductions**, and concrete cube crushing tests (Day 7/14/28). |
| **08** | [**`08_ACCOUNTS_VAT_TAX_PROMPT.md`**](playbook/08_ACCOUNTS_VAT_TAX_PROMPT.md) | Double-entry Chart of Accounts (COA), multi-company General Ledger, Cash/Bank/MFS reconciliation, **Bangladesh VAT (VAT Act 2012) & Mushak 6.3 invoices**, TDS/VDS withholding, and Sub-Registry AIT (Sec 53FF & 53H) calculator. |

---

### B. Enterprise Web Frontend Prompts (`docs/playbook/`):
| # | Prompt File | Scope & Technical Implementation |
| :---: | :--- | :--- |
| **09** | [**`09_ANGULAR_ENTERPRISE_UIUX_PROMPT.md`**](playbook/09_ANGULAR_ENTERPRISE_UIUX_PROMPT.md) | Angular 19+ standalone architecture with Signals, **Multi-level collapsible sidebar with nested sub-menus (No messy tabs)**, equal gap (`p-6` / `gap-6`) layout, unified Card Container, **zero hardcoded dropdowns**, and **Searchable Select with inline `+ Add New` button**. |

---

### C. 6 Flutter Mobile Applications Prompts (`docs/mobile_prompts/`):
| # | Prompt File | Scope & Device Hardware Features |
| :---: | :--- | :--- |
| **10** | [**`00_MOBILE_SUITE_MASTER_OVERVIEW.md`**](mobile_prompts/00_MOBILE_SUITE_MASTER_OVERVIEW.md) | Common mobile architecture, shared `bd_realestate_mobile_core` package, offline synchronization, and push notifications. |
| **11** | [**`01_SALES_APP_PROMPT.md`**](mobile_prompts/01_SALES_APP_PROMPT.md) | **Sales & CRM App**: Real-time visual flat availability matrix, 15-minute unit locking, BDT EMI calculator, WhatsApp PDF sharing, NID photo capture, and on-glass digital signature. |
| **12** | [**`02_SITE_APP_PROMPT.md`**](mobile_prompts/02_SITE_APP_PROMPT.md) | **Site Engineer App**: Offline-first (Isar DB), **anti-tamper camera burning GPS & timestamp directly into image bytes**, labor muster rolls, concrete cube test reminders, and site store GRN receiver. |
| **13** | [**`03_COLLECTION_APP_PROMPT.md`**](mobile_prompts/03_COLLECTION_APP_PROMPT.md) | **Collection & Recovery App**: Daily recovery agenda, Cash/Cheque/bKash collection, **Bluetooth ESC/POS thermal printer (58mm/80mm) integration**, PDC vault intake, and NI Act 138 notice delivery logger. |
| **14** | [**`04_MANAGEMENT_APP_PROMPT.md`**](mobile_prompts/04_MANAGEMENT_APP_PROMPT.md) | **Executive Management & BI App**: Biometric security gate (FaceID/Fingerprint), bird's-eye view cockpit, **universal 1-tap biometric approvals** (discounts, POs, contractor bills, refunds), and construction S-curve radar. |
| **15** | [**`05_HR_EMPLOYEE_APP_PROMPT.md`**](mobile_prompts/05_HR_EMPLOYEE_APP_PROMPT.md) | **HR & Employee App**: Geofenced mobile attendance with anti-mock GPS detection, facial liveness verification, leave applications, encrypted monthly payslip vault, and daily project timesheets. |
| **16** | [**`06_CUSTOMER_APP_PROMPT.md`**](mobile_prompts/06_CUSTOMER_APP_PROMPT.md) | **Customer Self-Service App**: Homeowner property portfolio, live construction photo timeline, online installment payment via bKash/Nagad/Cards, pre-handover snagging tool, and post-handover DLP tickets. |

---

## 3. Strict Compliance Matrix for All Execution Prompts

Every single prompt in this ecosystem enforces the following ten mandatory engineering standards:

1. **Zero Hardcoded Dropdowns**: All select menus across all 80 modules must query `/api/v1/lookups/{category_code}`.
2. **Searchable Dropdowns with Inline `+ Add New`**: Every dropdown has typeahead filtering and an inline dashed `+ Add New [Item]` button that creates the record on-the-fly without navigating away.
3. **100% Reusable Custom Components**: Zero ad-hoc styling; modular custom components for inputs, buttons, tables, cards, and modals.
4. **Global Theme & CSS Tokens**: Single source of truth for all colors (`--color-primary`, `--color-border-standard`, etc.) defined in `styles.css` and `tailwind.config.js`.
5. **Tailwind CSS & Lucide Icons**: Consistent, modern enterprise styling.
6. **Unified Spacing & Card Container**: Proportional equal gap (`p-6` / `gap-6`) between Topbar, Sidebar, and the central workspace. All center/right views render inside a sleek Card Container.
7. **100% Requirement Match**: Zero skipped modules or features across all 80 domains.
8. **Production-Ready Scalable Structure**: Clean Architecture / DDD, asynchronous SQLAlchemy 2.0 with MySQL 8.0, and Docker Compose orchestration.
9. **Uniform Border & Border Radius**: Standard `border border-slate-200 dark:border-slate-800`, `rounded-xl` for containers/modals, and `rounded-lg` for inputs/buttons.
10. **Direct Code & Spec Delivery**: Authoritative code and documentation files written directly into the workspace.
