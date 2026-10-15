# Enterprise Microservices Architecture & Distributed System Design

## 1. Architectural Philosophy & Topology
The Bangladesh Real Estate ERP is engineered as a resilient, domain-driven microservices architecture built with **Python FastAPI**, **Docker/Kubernetes**, **RabbitMQ/Kafka (Event Bus)**, **Redis (Cache & Distributed Locking)**, and **MySQL 8.0 Enterprise Clusters**.

```
                                  [ Client Layer ]
    ┌─────────────────────────┬───────────────────────────────┬────────────────────────┐
    │  Angular 19 Web App     │  6 Flutter Mobile Apps (PWA)  │  Public Web & Portals  │
    └───────────┬─────────────┴───────────────┬───────────────┴───────────┬────────────┘
                │                             │                           │
                └─────────────────────────────┼───────────────────────────┘
                                              ▼
                             ┌─────────────────────────────────┐
                             │   API Gateway & Reverse Proxy   │
                             │ (Traefik / Envoy / FastAPI Edge)│
                             │ - JWT Authentication Validation │
                             │ - Project-Scoped Authorization  │
                             │ - Rate Limiting & SSL Offload   │
                             │ - Dynamic Lookup Cache Router   │
                             └────────────────┬────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         [ Synchronous REST / gRPC ]                     [ Asynchronous Event Bus ]
         (Inter-Service Queries)                         (RabbitMQ / Apache Kafka)
                      │                                               │
      ┌───────────────┼───────────────┬───────────────┬───────────────┼───────────────┐
      ▼               ▼               ▼               ▼               ▼               ▼
┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
│ Service 1 │   │ Service 2 │   │ Service 3 │   │ Service 4 │   │ Service 5 │   │ Service 6 │
│  Auth &   │   │  Land &   │   │ Project & │   │   CRM &   │   │Sales, Unit│   │Installment│
│ Governance│   │  JV Mgmt  │   │Engineering│   │ Marketing │   │ & Booking │   │ & PDC     │
└─────┬─────┘   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
      │               │               │               │               │               │
      ▼               ▼               ▼               ▼               ▼               ▼
┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
│ Service 7 │   │ Service 8 │   │ Service 9 │   │Service 10 │   │Service 11 │   │Service 12 │
│ Site Ops &│   │Procurement│   │Finance &  │   │Handover & │   │ Dynamic   │   │Notification│
│Const-BOQ  │   │ & Stores  │   │  BD Tax   │   │ Facility  │   │ Lookups   │   │ & Worker  │
└─────┬─────┘   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
      │               │               │               │               │               │
      └───────────────┴───────────────┼───────────────┴───────────────┴───────────────┘
                                      ▼
                        [ Storage & Infrastructure ]
    ┌───────────────────────────┬───────────────────────────┬───────────────────────────┐
    │   MySQL Master Cluster    │   MySQL Read-Replicas     │  Redis Caching & Mutex    │
    │  (ACID Writes, Partition) │   (BI, Analytics, Read)   │  (Locking, Lookup Cache)  │
    ├───────────────────────────┼───────────────────────────┼───────────────────────────┤
    │ MinIO S3 Object Storage   │ Elasticsearch / Meilisearch│ Prometheus & Grafana      │
    │ (Encrypted Deeds & Files) │ (Global Full-Text Search) │ (APM, Logs & System Health│
    └───────────────────────────┴───────────────────────────┴───────────────────────────┘
```

---

## 2. Microservice Decomposition & Boundary Contexts

### Service 1: `auth-governance-service` (Port: 8001)
- **Responsibilities**:
  - Central OAuth2 / JWT authentication, token refresh, and password policies.
  - Multi-tenant Organization & Group hierarchy (Parent Company + Sister Concerns).
  - RBAC (Role-Based Access Control) + Project Scoped Permissions (e.g., User A is Project Director for Project X, but only viewer for Project Y).
  - Immutable Audit Logging: Captures every entity mutation (`actor_id`, `service`, `endpoint`, `payload_before`, `payload_after`, `ip`).

### Service 2: `land-jv-service` (Port: 8002)
- **Responsibilities**:
  - Land bank repository, proposals, and seller/heir directory.
  - Historical Mouza, JL, CS, SA, RS, BS survey records and dag boundaries.
  - Land area calculator with regional conversion parameters (Katha, Decimal, Bigha, Sq Ft).
  - Joint Venture (JV) ratio engine: Landowner vs. Developer allocation matrix.
  - Landowner payment schedule and Power of Attorney (POA) document management.

### Service 3: `project-engineering-service` (Port: 8003)
- **Responsibilities**:
  - Project spatial hierarchy: Project -> Phase -> Tower/Building -> Floor -> Unit/Commercial Space.
  - Authority clearances workflow (RAJUK / CDA / KDA / RDA / FSCD Fire Safety / DoE).
  - Engineering DMS: CAD, Structural, and MEP drawing versioning.
  - WBS (Work Breakdown Structure) milestone scheduling and baseline Gantt tracking.
  - Project feasibility analysis and FAR (Floor Area Ratio) calculation.

### Service 4: `crm-lead-service` (Port: 8004)
- **Responsibilities**:
  - Lead capture webhooks (Facebook Lead Ads, Web, WhatsApp Business, Walk-ins).
  - Round-robin lead routing and sales executive assignment with SLA timers.
  - Customer interaction logs, meeting scheduler, and site-visit transport dispatch.
  - Broker & channel partner network directory and referral attribution.

### Service 5: `sales-booking-service` (Port: 8005)
- **Responsibilities**:
  - Real-time unit pricing engine (Base rate + Floor escalation + Facing premium + Parking).
  - Distributed Redis-backed unit locking engine (prevents concurrent bookings).
  - Apartment booking, earnest money collection, and allotment letter generation.
  - Multi-level discount approval workflow with threshold authorization.
  - Booking cancellations, deduction policies, and customer-to-customer ownership transfer.

### Service 6: `installment-pdc-collection-service` (Port: 8006)
- **Responsibilities**:
  - Milestone and time-based installment schedule generator.
  - PDC (Post Dated Cheque) Vault: tracking physical cheques, deposit reminders, and clearing.
  - Cheque dishonour & NI Act 1881 Section 138 automated legal notice dispatch.
  - Bank financing & Tripartite agreement tracking with Bank NOC issuance.
  - Automated collection demand letters, late-fee penalty engine, and SMS/WhatsApp payment links.

### Service 7: `construction-site-service` (Port: 8007)
- **Responsibilities**:
  - BOQ (Bill of Quantities) master, sub-assemblies, and rate analysis.
  - Daily Progress Report (DPR) site diary with geo-tagged photographic evidence.
  - Labor muster roll attendance and casual labor cost allocation.
  - Contractor Work Orders, Running Account (RA) bills, and retention money deductions.
  - Quality assurance: concrete cube/cylinder crushing test logs, slump tests, and NCRs.

### Service 8: `procurement-store-service` (Port: 8008)
- **Responsibilities**:
  - Central warehouse and project site store inventory.
  - Purchase Requisitions (PR), Requests for Quotation (RFQ), and Comparative Statements (CS).
  - Purchase Orders (PO), Goods Received Notes (GRN), and 3-way invoice matching.
  - Inter-project stock transfers, transit tracking, and material wastage/scrap reporting.

### Service 9: `finance-tax-service` (Port: 8009)
- **Responsibilities**:
  - Multi-company Chart of Accounts (COA) and double-entry General Ledger.
  - Automated journal voucher postings from upstream sales, billing, and procurement events.
  - Cash, multi-bank accounts, and bKash/Nagad MFS reconciliation (BRS).
  - Bangladesh VAT engine (residential <1,600 sq ft vs. >1,600 sq ft, commercial sales, Mushak 6.3).
  - Tax Deduction at Source (TDS/VDS) withholding rules and tax deduction certificates.
  - Financial reporting: Trial Balance, Profit & Loss, Balance Sheet, Cash Flow.

### Service 10: `handover-facility-service` (Port: 8010)
- **Responsibilities**:
  - Joint snag-list inspection and customer sign-off.
  - Possession letters, key handover, and utility meter allotment (DPDC/DESCO/WASA).
  - Defect Liability Period (DLP) 12-month maintenance service requests and contractor dispatch.
  - Building Owners' Association (Kallyan Samity) sinking fund and monthly service charge roll.

### Service 11: `dynamic-lookup-service` (Port: 8011) - *Critical User Requirement*
- **Responsibilities**:
  - Manages **100% of all system dropdowns** dynamically (Zero hardcoded dropdowns).
  - Serves hierarchical lookups (Categories -> Items -> Sub-items) with instant Redis caching.
  - Exposes instant `POST /api/v1/lookups/{category_code}/quick-create` to enable the frontend's inline `+ Add New` button directly from any form without navigating away.

### Service 12: `notification-worker-service` (Port: 8012)
- **Responsibilities**:
  - Celery/ARQ distributed workers connected to Redis queue.
  - Multi-channel delivery: SMS (Greenweb / Elitbuzz / Infobip BD gateways), WhatsApp Cloud API, SMTP Email, Mobile Push (Firebase Cloud Messaging).
  - Scheduled Cron jobs: Daily PDC cheque deposit reminders, overdue installment penalty recalculation, warranty expiry alerts.

---

## 3. Asynchronous Event-Driven Communication Matrix

When a domain event occurs in one service, it publishes a strongly typed JSON event to RabbitMQ/Kafka. Downstream services consume the event autonomously:

```
[ Sales Service ] ---> Publishes: "booking.confirmed"
                             │
       ┌─────────────────────┼─────────────────────┬─────────────────────┐
       ▼                     ▼                     ▼                     ▼
[ Unit Inventory ]   [ Installment Engine]  [ Finance Service ]   [ Notification ]
Locks unit status to Generates milestone   Posts Debit/Credit    Sends Welcome SMS
"Booked"             payment schedule      advance voucher       & WhatsApp receipt
```

### Core Domain Events:
1. `land.deal_finalized` -> Notifies Finance for Landowner Ledger & Legal for Sub-Registry workflow.
2. `unit.locked_temporary` -> Broadcasts via WebSockets to all active sales agents to disable unit card.
3. `booking.confirmed` -> Triggers Installment Schedule creation, Finance Advance booking, and SMS notice.
4. `cheque.dishonored` -> Triggers NI Act 138 Notice generation and marks customer ledger overdue.
5. `grn.approved` -> Updates Site Store Stock, triggers Accounts Payable voucher, updates BOQ consumption.
6. `ra_bill.certified` -> Creates Contractor Liability in Finance, holds retention money, clears advances.

---

## 4. Resilience, Scalability & DevOps Blueprint
- **Containerization**: Standard Dockerfile for each microservice with multi-stage Python 3.12-slim builds.
- **Service Mesh / Orchestration**: Kubernetes Deployment manifests with Horizontal Pod Autoscaler (HPA) targeting 70% CPU/Memory utilization.
- **Circuit Breaker Pattern**: Tenacity / PyBreaker to prevent cascading failures during inter-service REST queries.
- **Health Checks & Telemetry**: `/health/liveness` and `/health/readiness` probes, OpenTelemetry distributed tracing, and Prometheus metrics export.
