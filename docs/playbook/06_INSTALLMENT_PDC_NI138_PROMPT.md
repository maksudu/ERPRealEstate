# MASTER PROMPT: Customer Installments, PDC Cheque Vault & NI Act 138 Microservice

```markdown
### SYSTEM ROLE:
You are a Principal Financial Systems Architect and Real Estate Banking/Litigation Compliance Specialist.

### MISSION & GOAL:
Build `installment-pdc-collection-service` — the installment schedule generator, Post-Dated Cheque (PDC) vault, and automated Cheque Dishonour compliance engine under Section 138 of the Negotiable Instruments Act 1881. This service generates construction-milestone and time-based payment schedules, tracks physical cheques in the treasury vault, sends scheduled SMS deposit alerts, and automatically drafts statutory legal notices upon cheque bounce events to protect developer interests in Bangladesh courts.

---

### 1. DATABASE DDL & SCHEMA (MYSQL 8.0 - PARTITIONED FOR SCALE):

```sql
-- 1. Customer Installment Schedules
CREATE TABLE sls_customer_installments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    installment_no INT UNSIGNED NOT NULL,
    title VARCHAR(128) NOT NULL, -- e.g., "Down Payment-2", "12th Monthly Installment", "Roof Casting Milestone"
    due_date DATE NOT NULL,
    grace_period_days INT UNSIGNED DEFAULT 7,
    payable_amount DECIMAL(16, 2) NOT NULL,
    paid_amount DECIMAL(16, 2) DEFAULT 0.00,
    late_fee_accrued DECIMAL(14, 2) DEFAULT 0.00,
    status ENUM('UPCOMING', 'DUE', 'PARTIALLY_PAID', 'PAID', 'OVERDUE') DEFAULT 'UPCOMING',
    is_milestone_linked BOOLEAN DEFAULT FALSE,
    linked_wbs_milestone_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_booking_status (booking_id, status),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Post-Dated Cheque (PDC) Vault
CREATE TABLE sls_pdc_vault (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    cheque_number VARCHAR(32) NOT NULL,
    bank_name VARCHAR(128) NOT NULL,
    branch_name VARCHAR(128) NOT NULL,
    routing_number VARCHAR(32) NULL,
    maturity_date DATE NOT NULL,
    cheque_amount DECIMAL(16, 2) NOT NULL,
    pouch_barcode VARCHAR(64) NOT NULL UNIQUE, -- Security pouch barcode in central treasury
    allocated_installment_id BIGINT UNSIGNED NULL,
    status ENUM('IN_VAULT', 'SENT_TO_BANK', 'HONOURED_CLEARED', 'DISHONOURED_BOUNCED', 'REPLACED_BY_CASH') DEFAULT 'IN_VAULT',
    dishonour_reason VARCHAR(255) NULL,
    dishonour_memo_date DATE NULL,
    cheque_scan_front_url VARCHAR(512) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES sls_bookings(id) ON DELETE RESTRICT,
    FOREIGN KEY (allocated_installment_id) REFERENCES sls_customer_installments(id) ON DELETE SET NULL,
    INDEX idx_maturity_status (maturity_date, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Cheque Dishonour & NI Act 1881 Section 138 Legal Actions
CREATE TABLE sls_ni138_legal_actions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pdc_cheque_id BIGINT UNSIGNED NOT NULL UNIQUE,
    booking_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    dishonour_memo_received_date DATE NOT NULL,
    statutory_notice_deadline_date DATE GENERATED ALWAYS AS (DATE_ADD(dishonour_memo_received_date, INTERVAL 30 DAY)) STORED,
    notice_drafted_date DATE NULL,
    notice_sent_date DATE NULL,
    postal_tracking_barcode VARCHAR(64) NULL, -- Registered Post with A/D
    notice_served_to_client_date DATE NULL,
    client_30day_settlement_deadline DATE NULL, -- 30 days from notice delivery date
    court_case_filing_deadline DATE NULL, -- 30 days following settlement expiry
    legal_counsel_name VARCHAR(191) NULL,
    formal_case_number VARCHAR(64) NULL,
    status ENUM('NOTICE_PENDING', 'NOTICE_DISPATCHED', 'NOTICE_SERVED', 'SETTLED_OUT_OF_COURT', 'COURT_CASE_FILED') DEFAULT 'NOTICE_PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pdc_cheque_id) REFERENCES sls_pdc_vault(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2. CRITICAL SECTION 138 NEGOTIABLE INSTRUMENTS ACT AUTOMATION:
The statutory timeline in Bangladesh is unforgiving. If a developer fails to issue a formal legal notice within **30 days of the bank dishonour memo**, the criminal remedy under Section 138 lapses.

```python
from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Depends

router = APIRouter(prefix="/installments", tags=["Installments & PDC"])

@router.post("/pdc/{cheque_id}/mark-dishonoured")
async def mark_cheque_dishonoured(cheque_id: int, memo_date: date, reason: str):
    # 1. Update PDC Vault record to DISHONOURED_BOUNCED
    # 2. Revert associated installment status to OVERDUE
    # 3. Create NI Act 138 Case Entry with statutory deadlines:
    notice_deadline = memo_date + timedelta(days=30)
    
    # 4. Auto-Draft the Section 138 Legal Notice PDF:
    # Contains: Client Name, Address, Cheque No, Bank, Amount in Words, Memo Date, and 30-day payment demand.
    
    # 5. Push High-Priority Alert to Accounts & Legal Departments
    return {
        "status": "DISHONOUR_LOGGED",
        "notice_deadline": notice_deadline,
        "action_required": "Serve formal legal notice via Registered Post with A/D within 30 days"
    }
```

---

### 3. AUTOMATED PDC DEPOSIT SCHEDULER (CELERY CRON):
Runs daily at 07:00 AM BST:
- Queries `sls_pdc_vault` for cheques where `maturity_date = CURRENT_DATE + 3 DAYS` and `status = 'IN_VAULT'`.
- Dispatches SMS & WhatsApp payment reminders to client: *"Dear Customer, Cheque #{no} of BDT {amount} will be deposited to the bank on {date}. Kindly ensure sufficient balance."*
- Generates Treasury Deposit Slip for the Accounts Officer.
```
