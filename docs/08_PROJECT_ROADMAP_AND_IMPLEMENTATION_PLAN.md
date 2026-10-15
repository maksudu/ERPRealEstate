# Production Roadmap, Implementation Plan & Setup Guide

## 1. Phased Production Implementation Roadmap

To deliver an 80-module ERP with 6 Flutter mobile apps without scope creep or integration failures, development is partitioned into **6 sequential production milestones**:

```
[ Phase 1: Core Foundation & Master Data ] ───► [ Phase 2: Commercial Sales & PDC Engine ]
                     │                                                │
                     ▼                                                ▼
[ Phase 3: Construction & Site Operations ] ──► [ Phase 4: Accounts, VAT & Statutory Tax ]
                     │                                                │
                     ▼                                                ▼
[ Phase 5: Handover, DLP & Customer Portal ] ──► [ Phase 6: 6 Flutter Apps & Enterprise BI ]
```

---

## 2. Milestone Sprint Breakdown

### Phase 1: Core Foundation & Master Data (Sprints 1 - 2)
- Microservices Docker environment & reverse proxy setup.
- MySQL 8.0 clusters with partitioning and connection pooling.
- **Dynamic Lookup Service**: Category and items master (100% dynamic dropdowns).
- **Angular 19 Shell**: Layout container, equal-gap header/sidebar, and unified card workspace.
- **Custom Reusable Components**: `<app-searchable-select>`, `<app-data-table>`, `<app-input>`, `<app-button>`.
- **Land Bank & Survey Module**: CS/SA/RS/BS records, Dag mapping, Katha/Decimal converter, and Joint Venture (JV) allocation matrix.

### Phase 2: Commercial Sales, Booking & Installment Engine (Sprints 3 - 4)
- **Spatial Inventory Master**: Towers, floors, apartments, commercial shops, and parking bays.
- Dynamic rate cards, facing/floor escalations, and real-time Redis unit locking.
- CRM lead aggregation (Facebook/Web hooks), lead scoring, and site visit logs.
- Allotment workflow, booking deposit capture, and bilingual agreement generation.
- **Installment & PDC Cheque Vault**: Milestone schedules, deposit reminders, and NI Act 138 bounce workflow.

### Phase 3: Construction, BOQ & Site Operations (Sprints 5 - 6)
- BOQ master, structural itemization (rod, cement, sand), and variation orders.
- Daily Progress Report (DPR) site diary with geo-tagged photographic evidence.
- Labor muster roll and subcontractor trade attendance.
- Contractor Running Account (RA) bills, retention money, and engineer measurement certification.
- Central warehouse & project site store inventory, MRN, and GRN 3-way matching.

### Phase 4: Double-Entry Accounts, VAT & Tax Compliance (Sprints 7 - 8)
- Multi-company Chart of Accounts (COA) and automated General Ledger voucher posting.
- Cash, multi-bank accounts, and bKash/Nagad MFS reconciliation (BRS).
- Bangladesh VAT engine (residential <1,600 sq ft vs. >1,600 sq ft, Mushak 6.3 tax invoices).
- TDS/VDS withholding rules and tax deduction certificate generator.
- Sub-Registry registration fee & AIT (Sec 53FF & 53H) estimator.
- Trial Balance, Profit & Loss, Balance Sheet, and Project Costing reports.

### Phase 5: Handover, DLP, Facilities & Approvals (Sprints 9 - 10)
- RAJUK / CDA / KDA / RDA approval stages, permit validity tracking, and drawing DMS.
- Pre-handover joint inspection and digital snag list sign-off.
- Possession letter, utility meter allotment (DPDC/DESCO/WASA), and key handover.
- 12-month Defect Liability Period (DLP) ticket routing and contractor warranty resolution.
- Building Owners' Association (Kallyan Samity) sinking fund and monthly service charge rolls.

### Phase 6: 6 Flutter Mobile Apps & Executive BI Cockpit (Sprints 11 - 12)
- Build and compile:
  1. `bd_realestate_sales_app`
  2. `bd_realestate_site_app`
  3. `bd_realestate_collection_app`
  4. `bd_realestate_management_app`
  5. `bd_realestate_hr_app`
  6. `bd_realestate_customer_app`
- Executive BI Cockpit: Daily sales, total collections, project expenditure, cash in hand, and inventory valuation.
- Security penetration testing, end-to-end load testing, and production deployment.

---

## 3. Local Development & Multi-PC Setup Guide

### System Prerequisites:
- **Node.js**: v20.x LTS or higher
- **Angular CLI**: v19.x (`npm install -g @angular/cli`)
- **Python**: 3.12+ with `pip` and virtual environment support (`uv` or `venv`)
- **MySQL**: 8.0+ Community or Enterprise Server
- **Redis**: 7.0+
- **Flutter SDK**: 3.24+ (for mobile app compilation)
- **Docker & Docker Compose**: (Optional, for containerized multi-service launch)

### 1-Click Multi-Service Docker Compose Setup (`docker-compose.yml`):
Run the entire microservices mesh, database, cache, and message queue with a single command:
```bash
docker compose up -d
```
All services auto-initialize their schemas, register with the reverse proxy, and seed default dynamic lookup categories.
