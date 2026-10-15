# MASTER PROMPT: Flutter Customer Self-Service & Property Mobile App (`bd_realestate_customer_app`)

```markdown
### SYSTEM ROLE:
You are a Principal Flutter Mobile Architect and Customer Experience (CX) Designer for luxury real estate brands.

### PROJECT CONTEXT & GOAL:
Build `bd_realestate_customer_app` — an ultra-premium, bilingual (English & Bangla) Flutter 3.24+ mobile application for apartment and commercial space buyers in Bangladesh. The app provides homeowners with complete visibility into their property portfolio, live construction progress tracking with high-resolution photo galleries, a financial center with online installment payment via bKash/Nagad/Card gateways, official money receipt downloads, pre-handover snag reporting, and post-handover Defect Liability Period (DLP) maintenance service ticketing.

---

### 1. TECHNICAL STACK & ARCHITECTURE:
- **Framework**: Flutter 3.24+ (Dart 3.5+)
- **Architecture**: Clean Architecture with BLoC State Management
- **Payment Gateway Integration**: Direct SDK / WebView integration with Bangladesh Payment Gateways (bKash Checkout, Nagad, SSLCommerz, Shurjopay)
- **Document Vault**: `flutter_pdfview` for viewing Allotment Letters, Deeds, and Money Receipts
- **Media & Walkthrough**: `photo_view` for high-resolution site progress photos and 360-degree virtual tours
- **Push Notifications**: Firebase Cloud Messaging (FCM) for installment due reminders and construction milestone alerts

---

### 2. CORE SCREENS & CUSTOMER JOURNEY (100% EXHAUSTIVE):

#### Screen 1: Homeowner Dashboard & Property Portfolio
- Displays client's purchased units (e.g. "Apartment 7A | Green Horizon Tower, Gulshan-2").
- Multi-unit switcher for investors owning multiple flats, commercial spaces, or parking slots.
- Key Property Card:
  - Tower, Floor Level, Unit Number, Net Carpet Area (sq ft), Gross Saleable Area.
  - Facing: South-Facing Corner.
  - Allotted Parking Slot: Basement-1, Bay #B1-14.
  - Handover Status: Expected Handover: December 2027 (On Schedule).

#### Screen 2: Digital Document Vault
- Access and download legally verified documents anytime:
  - Official Allotment Letter (Signed & Sealed).
  - Registered Deed of Agreement (দলিল চুক্তিপত্র).
  - Approved Architectural Floor Plan & Electrical/Plumbing Blueprint.
  - RAJUK / Authority Approval Plan Copy.

#### Screen 3: Live Construction Progress & Milestone Tracker
- Interactive Milestone Progress Bar:
  - ✅ Soil Piling & Testing (100% Complete)
  - ✅ Basement & Ground Foundation (100% Complete)
  - 🔄 8th Floor RCC Slab Casting (In Progress - 70%)
  - ⏳ Brick Masonry & Plastering (Scheduled: Nov 2026)
  - ⏳ Interior Finishing, Tiles & Sanitary (Scheduled: May 2027)
  - ⏳ Handover & Utility Connection (Scheduled: Dec 2027)
- Monthly Photo Gallery: High-resolution watermarked progress photos uploaded by site engineers showing the building exterior, interior slab casting, and view from the client's specific floor.

#### Screen 4: Financial Center & Online Installment Payment
- Clear Financial Summary (in BDT):
  - Total Unit Price: ৳ ১,৪০,০০,০০০
  - Total Paid: ৳ ৬০,০০,০০০
  - Upcoming Due: ৳ ২,৫০,০০০ (Due: 15-Nov-2026)
  - Overdue Amount: ৳ ০ (All dues cleared)
- Installment Schedule Table:
  - Lists all past and future installments, booking money, down payments, and utility fees.
- 1-Click Pay Now Action:
  - Seamlessly launches payment gateway (bKash, Nagad, Visa, Mastercard, AMEX, Internet Banking).
  - Instantly verifies transaction and issues downloadable official Money Receipt (MR) with QR code.
- Download Annual Statement of Accounts (for customer's personal tax audit / NBR wealth statement).

#### Screen 5: Pre-Handover Digital Snagging & Inspection Tool
- Used during the joint pre-handover walkthrough between homeowner and developer site engineer.
- Customer logs any defects before accepting possession:
  - Category: Paint blemish, tile hollow sound, door lock alignment, plumbing drip, window glass scratch.
  - Captures photo with description and room location (e.g. "Master Bed Attached Bath").
- Real-time Rectification Tracker: Notifies homeowner when site team repairs the snag, accompanied by after-repair photos for final customer sign-off.

#### Screen 6: Post-Handover Helpdesk (Defect Liability Period - DLP)
- Active during the 12-month DLP warranty period post-handover.
- Submit maintenance service tickets:
  - Categories: Electrical, Plumbing, Civil, Lift/Generator, Waterproofing.
  - Priority: Normal, Urgent, Emergency.
  - Developer maintenance team is dispatched with SLA tracking.

#### Screen 7: Building Owners' Association (Kallyan Samity) Hub
- Notice Board: Building maintenance schedules, lift servicing dates, AGM meeting notices.
- Monthly Service Charge: View monthly maintenance bill (e.g. ৳ ৫,৫০০/month) and pay directly via app into the building association fund.

---

### 3. REST API CONTRACTS:
- `GET /api/v1/customer/properties` -> Returns customer's purchased units.
- `GET /api/v1/customer/properties/{id}/progress` -> Returns construction milestone timeline and monthly photo gallery.
- `GET /api/v1/customer/properties/{id}/ledger` -> Fetches installment schedule and paid receipts.
- `POST /api/v1/customer/payments/initiate` -> Initiates bKash/Nagad/SSLCommerz payment session.
- `POST /api/v1/customer/snags` -> Submits pre-handover defect item with photos.
- `POST /api/v1/customer/dlp/tickets` -> Submits post-handover maintenance ticket.

---

### 4. LUXURY DESIGN & BILINGUAL EXPERIENCE:
- Premium Real Estate Aesthetics: Elegant deep teal `#0F766E`, gold `#D97706`, and clean white surfaces.
- 1-Tap Language Toggle: Instant switch between English and Bangla across all screens and notifications.
```
