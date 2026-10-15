# Real Estate ERP System — Bangladesh (Enterprise Edition)

> **Production-Ready, High-Scale Real Estate ERP & Construction Lifecycle Management System for Bangladesh.**  
> Built with **Angular 19+ (Standalone + Signals)**, **Python FastAPI (Async Microservices)**, **MySQL 8.0 (1 Crore+ Record Optimization)**, and **Flutter (6 Purpose-Built Mobile Apps)**.

---

## 📑 Master Architectural & Specification Documents

All requirements, prompts, database schemas, and microservice definitions are meticulously documented in the `/docs` directory so that **any developer or AI agent on any PC can build, extend, and deploy the entire system**:

| Document | Description & Key Focus |
| :--- | :--- |
| 📘 [**01. Master Requirements SRS**](docs/01_MASTER_REQUIREMENTS_SRS.md) | **100% complete specification of all 72 modules + 8 Bangladesh-specific extensions** (Land Bank, Joint Venture, CS/SA/RS/BS, RAJUK, PDC Vault, NI Act 138, BOQ, VAT/TDS/VDS, etc.). |
| 🏛️ [**02. Microservices Architecture**](docs/02_MICROSERVICES_ARCHITECTURE.md) | Distributed system topology: API Gateway, 12 Domain Microservices, RabbitMQ/Kafka Event Bus, Redis Mutex locking, and MinIO S3 object storage. |
| 🗄️ [**03. MySQL 1 Crore Data Optimization**](docs/03_MYSQL_1CR_DATA_OPTIMIZATION_AND_SCHEMA.md) | High-scale database engineering: **Zero hardcoded dropdowns**, range partitioning, composite covering indexes, full-text search, and ProxySQL read-write splitting. |
| 🎨 [**04. UI/UX Design System & Components**](docs/04_UIUX_DESIGN_SYSTEM_AND_COMPONENTS.md) | Angular 19 design system, Tailwind tokens, unified borders & `rounded-xl` radius, and full source code for the **Searchable Dynamic Select with inline `+ Add New` button**. |
| 📱 [**05. Flutter Mobile Apps Suite**](docs/05_FLUTTER_MOBILE_APPS_SUITE.md) | Complete specifications for **all 6 Flutter mobile applications**: Sales App, Site App, Collection App, Management App, HR App, and Customer App. |
| 🤖 [**06. Prompt Engineering Playbook**](docs/06_PROMPT_ENGINEERING_PLAYBOOK.md) | Deterministic, copy-pasteable execution prompts for autonomous agents or developers to build any microservice, component, or mobile app step-by-step. |
| ⚖️ [**07. Bangladesh Compliance & Legal Engine**](docs/07_BANGLADESH_COMPLIANCE_AND_LEGAL_ENGINE.md) | Mathematical formulas for Katha/Decimal/Bigha, Sub-Registry Fees & AIT Sec 53FF/53H, Mushak 6.3 VAT, and NI Act 1881 Sec 138 cheque bounce workflow. |
| 🚀 [**08. Roadmap & Phased Implementation Plan**](docs/08_PROJECT_ROADMAP_AND_IMPLEMENTATION_PLAN.md) | 12-Sprint production roadmap, local multi-PC development setup guide, and release criteria. |

---

## 🎯 Verification of All 10 User Requirements

| # | User Requirement | Implementation & Architectural Standard |
| :---: | :--- | :--- |
| **1** | **No hardcoded dropdowns** | 100% of all dropdowns are dynamic, driven by `sys_lookup_categories` and `sys_lookup_items` with a central management GUI in system settings. |
| **2** | **Searchable dropdowns with inline `+ Add New`** | `<app-searchable-select>` features typeahead instant filtering and an inline dashed `+ Add New [Item]` button that opens an in-place modal, posts to the backend, and selects the new item without leaving the form. |
| **3** | **100% Reusable Custom Components** | Modular Angular standalone components for Input, Textarea, Select, Button, Data Table (server-side pagination/filtering), Modal, Drawer, and Status Badges. |
| **4** | **Global Theme & CSS Tokens** | All palettes, active states, and surface shades are centralized via CSS custom variables (`--color-primary`, `--color-border-standard`, etc.) in `styles.css`. |
| **5** | **Tailwind CSS & Icon Package** | Tailored Tailwind CSS palette with Lucide vector iconography. |
| **6** | **Equal Gap & Unified Card Workspace** | Proportional equal gap (`p-6` / `gap-6`) between Topbar, Sidebar, and the central workspace. All center/right pages render inside a sleek, unified Card Container. |
| **7** | **100% Requirement Match** | All 72 modules + 8 Bangladesh-specific extensions are covered across SRS and database schemas with zero missing features. |
| **8** | **Production-Ready Scalable Structure** | Clean Architecture / Domain-Driven Design (DDD) in FastAPI with asynchronous SQLAlchemy 2.0 and Docker Compose orchestration. |
| **9** | **Uniform Border & Border Radius** | Strict consistency across the entire ERP: uniform `border border-slate-200 dark:border-slate-800`, `rounded-xl` for containers/modals, and `rounded-lg` for inputs/buttons. |
| **10** | **Manual & Code Verification** | No browser subagent verification; clean, tested code and authoritative documentation files authored directly into the workspace. |

---

## ⚡ 1-Click Multi-Service Local Launch

To run the entire ERP ecosystem (MySQL 8.0, Redis 7.0, RabbitMQ, MinIO, and Core API Gateway) on any PC:

```bash
# 1. Start all containerized infrastructure
docker compose up -d

# 2. Check running services
docker compose ps

# 3. Access Core API Swagger Documentation
# URL: http://localhost:8000/docs
```
