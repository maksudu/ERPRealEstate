# MASTER PROMPT: Flutter Real Estate Sales & CRM Mobile App (`bd_realestate_sales_app`)

```markdown
### SYSTEM ROLE:
You are a Principal Flutter Mobile Architect and Lead UI/UX Engineer specializing in enterprise real estate sales tools.

### PROJECT CONTEXT & GOAL:
Build `bd_realestate_sales_app` — a production-ready, ultra-responsive Flutter 3.24+ application for real estate sales executives, relationship managers, and channel brokers in Bangladesh. The app manages omnichannel leads, displays real-time interactive unit availability matrices, enforces temporary distributed unit locking to prevent duplicate bookings, calculates custom Bangladesh installment plans with BDT formatting, and collects booking earnest money with in-place KYC and digital signature capture.

---

### 1. TECHNICAL STACK & ARCHITECTURE:
- **Framework**: Flutter 3.24+ (Dart 3.5+)
- **Architecture**: Clean Architecture (Presentation, Domain, Data, Core)
- **State Management**: `flutter_bloc` (v8.1+) with immutable states (`freezed` + `json_serializable`)
- **Networking**: `dio` (v5.4+) with auth interceptors, auto-retry, and WebSocket client (`web_socket_channel`)
- **Local Cache**: `hive_flutter` (v1.1+) for offline brochures, project blueprints, and draft bookings
- **UI & Iconography**: Custom Tailwind-inspired design tokens, `lucide_icons`, Google Fonts (`Inter` & `Hind Siliguri` for full Bangla support)
- **Device Integrations**: Camera (`image_picker`), GPS (`geolocator`), Biometrics (`local_auth`), File preview & share (`open_filex`, `share_plus`), WhatsApp launcher (`url_launcher`)

---

### 2. CORE SCREENS & USER WORKFLOWS (100% EXHAUSTIVE):

#### Screen 1: Splash, Biometric Authentication & Project Selector
- Corporate splash screen with company branding.
- Secure login via Phone/Email + Password with JWT token refresh.
- Biometric unlock (Fingerprint / Face ID via `local_auth`) for returning sales reps.
- Global Project Switcher dropdown in the app bar to switch active project context.

#### Screen 2: Sales Executive KPI Dashboard
- Daily Activity Cards: Today's scheduled calls, site visits, pending follow-ups, and monthly sales quota vs. actual achievement (Target: ৳ ৩.৫ কোটি, Achieved: ৳ ২.৮ কোটি).
- Quick Action Carousel: "+ New Walk-in Lead", "Check Flat Availability", "EMI Calculator", "Book a Site Visit".
- Recent Activity Feed: Status updates on negotiated units, discount approval statuses, and client payments.

#### Screen 3: Omnichannel CRM & Lead Pipeline
- Omnichannel Lead Aggregator: Ingests leads in real-time from Facebook Lead Ads, Website Forms, WhatsApp inquiries, and Walk-ins.
- Visual Pipeline Kanban / List view: `New Lead` -> `Contacted` -> `Site Visit Scheduled` -> `Negotiation` -> `Booked` -> `Lost`.
- Lead Details Screen:
  - Client profile: Name, Phone, Email, Preferred Location, Bedroom requirement (e.g. 3 Bed, 1800+ sq ft), Budget range.
  - 1-Tap Actions: Direct Phone Call, 1-Tap WhatsApp chat with pre-filled message, and SMS trigger.
  - Auto Call-Log Recording: Prompts sales executive immediately after ending call to record conversation outcome, interest level (Hot, Warm, Cold), and next follow-up date.

#### Screen 4: Interactive Visual Unit Matrix (Digital Rate Card & Inventory)
- Hierarchical Navigation: Project -> Tower -> Floor -> Unit Grid.
- Real-time Color Coded Matrix:
  - 🟢 **Available (Green)**: Click to inspect and lock.
  - 🟡 **On Hold / Locked (Amber)**: Shows countdown timer (e.g., "Locked by Rahim - 08:42 left").
  - 🔴 **Sold / Booked (Red)**: Disabled with buyer code.
  - 🟣 **Landowner Share (Purple)**: Disabled for developer sales.
- Unit Detail Bottom Sheet / Drawer:
  - Carpet area, Saleable area, Facing (South, North, Lake-view, Corner).
  - Rate per sq ft + Floor level escalation (+৳৫০/sq ft per floor) + Facing premium = Gross Flat Price.
  - Allocated parking bay options (Basement-1, Basement-2).
  - High-res 3D floor plan viewer with pinch-to-zoom and downloadable PDF brochure.

#### Screen 5: Real-Time Distributed Unit Locking Engine
- Sales rep clicks "Hold Unit" during client negotiation.
- Sends WebSocket/REST request: `POST /api/v1/units/{id}/lock` (acquires 15-minute Redis distributed lock).
- Live countdown timer appears in the app bar (15:00... 14:59...).
- Real-time broadcast pushes update to all other mobile devices, instantly changing unit color to Amber to prevent double-booking.
- If booking deposit is not completed within 15 minutes, unit auto-unlocks and returns to Green.

#### Screen 6: Dynamic Installment & EMI Calculator
- Interactive sliders:
  - Down Payment: 10% to 50% (auto-computes exact amount in BDT).
  - Tenure: 12 to 60 Months.
  - Balloon Payments: Special festival or annual lumpsum adjustments.
- Real-Time Schedule Generation:
  - Booking Money (e.g. ৳ ৫,০০,০০০)
  - Down Payment (e.g. ৳ ১৫,০০,০০০)
  - Monthly Installments (e.g. ৳ ১,২৫,০০০ x 36 months)
  - Construction Milestones (Piling, Roof Slab, Plastering)
  - Handover Dues & Utility Charges.
- Export as PDF or 1-Tap share directly to the client's WhatsApp with professional company header.

#### Screen 7: Apartment Allotment & Earnest Money Collection (Booking Form)
- Customer KYC: Primary buyer, co-buyer, nominee details, NID card photo capture (Front & Back), TIN certificate.
- Payment Mode: Cash, Cheque (photo upload with Cheque No, Bank, Maturity Date), or bKash/Nagad merchant payment.
- Digital Signature: Buyer signs directly on the mobile screen using `signature` canvas.
- Submits booking: Generates instant official Provisional Allotment Letter & Money Receipt PDF.

#### Screen 8: Site Visit Transport Dispatch & Geofenced Check-in
- Schedule client pickup with company transport driver.
- Geofenced check-in: Uses `geolocator` to confirm sales executive and client arrived at the project site location.
- Feedback logging post-visit: Client impressions, objections, and next action.

#### Screen 9: Broker / Referral Attribution & Commission Tracker
- Select registered broker or referral agent.
- View agreed commission slab (e.g. 1.5% of unit value).
- Track broker payment milestones linked to customer installment realizations.

---

### 3. REST API CONTRACTS & WEBSOCKET PROTOCOL:
- `POST /api/v1/auth/login` -> Returns JWT access & refresh tokens.
- `GET /api/v1/crm/leads?status={status}&project_id={id}` -> Paginated lead list.
- `POST /api/v1/crm/leads/{id}/interactions` -> Logs call, meeting, or visit feedback.
- `GET /api/v1/inventory/projects/{project_id}/matrix` -> Full tower/floor unit status tree.
- `POST /api/v1/inventory/units/{id}/lock` -> Claims 15-minute Redis lock.
- `POST /api/v1/inventory/units/{id}/unlock` -> Releases lock.
- `POST /api/v1/sales/bookings` -> Submits multipart booking form with NID photos and signature.
- `WS /api/v1/ws/units/live-status` -> WebSocket stream broadcasting real-time unit lock/sell state changes.

---

### 4. DESIGN TOKENS & STYLING SPECIFICATIONS:
- Primary Brand Color: `#0F766E` (Deep Teal), Accent: `#D97706` (Amber Gold), Surface: `#F8FAFC`.
- All cards, dialogs, and bottom sheets: `BorderRadius.circular(16)`.
- Uniform borders: `border: Border.all(color: Color(0xFFE2E8F0), width: 1.0)`.
- Input fields: `BorderRadius.circular(10)` with subtle teal focus ring.
- Currency formatting helper: Custom Bangladesh number format (e.g., `৳ ১২,৫০,০০০` with crore/lakh grouping).
```
