# MASTER PROMPT: Flutter Installment Collection & Field Recovery App (`bd_realestate_collection_app`)

```markdown
### SYSTEM ROLE:
You are a Principal Flutter Mobile Architect and Fintech Integration Specialist.

### PROJECT CONTEXT & GOAL:
Build `bd_realestate_collection_app` — a high-security, field-ready Flutter 3.24+ application for real estate recovery officers, collection executives, and accounts field agents in Bangladesh. The app manages daily field collection routes, accepts on-the-spot payments (Cash, Cheque, Pay Order, MFS), prints official thermal money receipts on portable Bluetooth ESC/POS belt printers, logs Post Dated Cheques (PDC), manages Cheque Dishonour actions under the Negotiable Instruments Act (NI Act 1881, Section 138), and records Promise-to-Pay (PTP) commitments.

---

### 1. TECHNICAL STACK & DEVICE HARDWARE INTEGRATIONS:
- **Framework**: Flutter 3.24+ (Dart 3.5+)
- **Architecture**: Clean Architecture with Offline Transaction Buffer
- **State Management**: `flutter_bloc` (v8.1+)
- **Bluetooth Thermal Printing**: `flutter_pos_printer_platform` or `blue_thermal_printer` (ESC/POS 58mm / 80mm mobile receipt printers)
- **Barcode & QR Scanning**: `mobile_scanner` (for scanning PDC cheque pouches, client ID cards, and payment receipts)
- **Digital Signature**: `signature` canvas
- **Maps & Geolocation**: `google_maps_flutter`, `geolocator` (for optimized daily field recovery routes)

---

### 2. CORE SCREENS & COLLECTION WORKFLOWS (100% EXHAUSTIVE):

#### Screen 1: Collection Executive Daily Agenda & Route Map
- Daily KPI Header: Target Collection Today (e.g. ৳ ১৫,০০,০০০), Collected Amount (৳ ৮,৫০,০০০), Pending Visits (5).
- Priority Client List: Sorted by severity (Due in 3 days, Overdue 30+ days, Bounced Cheque NI Act Alert).
- Interactive Map View: Pins clients with pending collections on Google Maps with optimal driving route navigation.

#### Screen 2: Client Installment Profile & Ledger Card
- Client Info: Name, Phone (1-Tap Call/WhatsApp), Flat No, Tower, Project Name.
- Financial Breakdown:
  - Total Apartment Price: ৳ ১,২৫,০০,০০০
  - Total Paid to Date: ৳ ৬০,০০,০০০
  - Current Due Installment: ৳ ২,৫০,০০০ (Due Date: 10-Oct-2026)
  - Overdue Penalty / Late Fee: ৳ ৭,৫০০ (15 Days Overdue)
- Historical Installment Table: Green (Paid), Red (Overdue), Grey (Upcoming).

#### Screen 3: On-the-Spot Payment Collection Workflow
- Payment Method Selection:
  - 💵 **Cash**: Enters notes received, currency denomination counter.
  - 🏦 **Cheque / Pay Order**: Captures photo of cheque, MICR band, Bank Name, Branch, Cheque No, Amount, and Date.
  - 📱 **bKash / Nagad / Rocket (MFS)**: Generates dynamic merchant QR code on the phone screen with exact amount and booking ID; client scans to pay; officer verifies TrxID.
- Payment Allocation: Option to allocate payment to: Installment, Overdue Late Fee, or Advance.
- Digital Signature: Client signs directly on the touch screen confirming payment submission.

#### Screen 4: ESC/POS Portable Bluetooth Thermal Receipt Printing
- Instant discovery and 1-tap pairing with portable 58mm / 80mm Bluetooth thermal belt printers.
- Formats ESC/POS receipt payload with:
  - Developer Group Logo (Monochrome bitmap)
  - Money Receipt (MR) Serial Number & Timestamp
  - Client Name, Phone, Project, Flat No
  - Amount in Words (e.g., "Two Lakh Fifty Thousand Taka Only")
  - Payment Mode (Cash/Cheque/bKash TrxID)
  - QR Code containing receipt validation URL (scannable by client to verify authenticity on developer website).
- Prints physical receipt on the spot in <3 seconds.
- Automatically triggers backend SMS & WhatsApp notification to the client with the digital receipt link.

#### Screen 5: Post-Dated Cheque (PDC) Vault Intake
- Used when a client hands over a batch of future installment cheques (e.g., 12 post-dated cheques).
- Batch Logging Screen:
  - Takes photo of each cheque.
  - Auto-captures Cheque Number, Bank, Branch, Amount, and Maturity Date.
  - Scans barcode of tamper-evident security envelope pouch used to transport cheques to company treasury.
  - Generates official PDC Acknowledgement Slip.

#### Screen 6: Cheque Dishonour (NI Act 1881, Section 138) Action Center
- Real-time alert when a deposited cheque is returned/bounced by the bank.
- Details: Cheque No, Dishonour Memo Date, Bank Return Reason (e.g., "Insufficient Funds", "Drawer Signature Differs").
- Legal Notice Service Workflow:
  - Officer is dispatched to physically serve the formal Statutory 30-Day Legal Notice.
  - Photographs signed acknowledgement copy (A/D receipt) from the client.
  - System logs exact delivery timestamp to trigger the statutory 30-day countdown timer for legal compliance before court filing.

#### Screen 7: Promise-to-Pay (PTP) & Reschedule Request
- If client cannot pay immediately:
  - Officer logs committed payment date (PTP Date), promised amount, and client hardship reason.
  - Automatically schedules follow-up reminder in collection officer's calendar.
  - If client requests installment restructuring (e.g. increase tenure by 12 months), submits request directly to Accounts Manager for approval.

---

### 3. REST API CONTRACTS:
- `GET /api/v1/collection/agenda` -> Returns assigned client dues with geo-coordinates.
- `GET /api/v1/collection/clients/{id}/ledger` -> Fetches real-time customer installment ledger.
- `POST /api/v1/collection/receipts` -> Posts collection transaction; returns MR number and QR payload.
- `POST /api/v1/collection/pdc-batch` -> Logs batch of collected post-dated cheques.
- `POST /api/v1/collection/ni138-notice-delivery` -> Submits photo proof of legal notice delivery.
- `POST /api/v1/collection/ptp` -> Records Promise-to-Pay commitment.

---

### 4. AUDITABILITY & SECURITY:
- Real-time GPS coordinate logging on every receipt issuance (proves officer was physically present at client location).
- Offline Money Receipts get a unique temporary cryptographic token; reconciled immediately upon reconnection.
```
