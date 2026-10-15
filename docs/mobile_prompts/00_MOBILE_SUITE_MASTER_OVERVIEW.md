# Mobile Apps Suite — Master Prompt & Execution Guide

## 1. Overview of the 6 Enterprise Mobile Apps
The Real Estate ERP mobile ecosystem is divided into **six purpose-built Flutter 3.24+ applications**, ensuring zero feature overlap, lightweight APK sizes, strict role-based separation of concerns, and tailor-made workflows for each stakeholder group in Bangladesh.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        6 PURPOSE-BUILT FLUTTER MOBILE APPS                             │
├─────┬──────────────────────────┬───────────────────────┬───────────────────────────────┤
│ #   │ App Name                 │ Target Stakeholder    │ Primary Function              │
├─────┼──────────────────────────┼───────────────────────┼───────────────────────────────┤
│ 01  │ `bd_realestate_sales`     │ Sales Reps & Brokers  │ CRM, Flat Grid, Lock, Booking │
│ 02  │ `bd_realestate_site`      │ Site Engineers & PMs  │ DPR, Geo-Camera, Labor, Cube  │
│ 03  │ `bd_realestate_collection`│ Recovery Officers     │ Dues, Thermal Print, PDC, NI138│
│ 04  │ `bd_realestate_management`│ MD, CFO, Directors    │ BI Cockpit, 1-Tap Biometric OK│
│ 05  │ `bd_realestate_hr`        │ Corporate & Field Staff│ Geofence Face Check-in, Payslip│
│ 06  │ `bd_realestate_customer`  │ Homeowners & Buyers   │ Timeline, Online Pay, Snagging│
└─────┴──────────────────────────┴───────────────────────┴───────────────────────────────┘
```

---

## 2. Master Prompt Files Index

Each app has an exhaustive, production-grade prompt file that can be passed directly to an AI agent or mobile developer on any computer to generate the complete Flutter codebase:

1. 📱 [**01. Sales & CRM Mobile App Prompt**](01_SALES_APP_PROMPT.md)
   - Interactive visual unit matrix, distributed 15-minute unit locking, BDT EMI installment calculator, WhatsApp PDF sharing, NID photo capture, and on-glass digital signature.
2. 🏗️ [**02. Site Engineer & Construction Operations App Prompt**](02_SITE_APP_PROMPT.md)
   - Offline-first architecture (Isar DB), anti-tamper camera burning GPS & timestamp directly into image bytes, contractor labor muster roll, Day 7/14/28 concrete cube test tracking, and site store GRN challan scanner.
3. 💰 [**03. Collection & Field Recovery App Prompt**](03_COLLECTION_APP_PROMPT.md)
   - Route-optimized recovery agenda, on-the-spot Cash/Cheque/bKash/Nagad collection, **Bluetooth ESC/POS thermal printer (58mm/80mm) engine**, PDC vault intake, and statutory NI Act 1881 Section 138 legal notice delivery logger.
4. 📊 [**04. Executive Management & BI App Prompt**](04_MANAGEMENT_APP_PROMPT.md)
   - Strict biometric gate (Face ID/Fingerprint), bird's-eye view executive cockpit, **universal 1-tap biometric approval center** (discounts, POs, contractor bills, refunds), project S-curve radar, and 90-day cash flow forecast.
5. 👥 [**05. HR, Attendance & Employee Self-Service App Prompt**](05_HR_EMPLOYEE_APP_PROMPT.md)
   - Geofenced attendance with anti-mock GPS detection, facial liveness verification (blink detection), leave applications, encrypted monthly PDF payslip vault, and project timesheet job-costing.
6. 🔑 [**06. Customer Self-Service & Property App Prompt**](06_CUSTOMER_APP_PROMPT.md)
   - Homeowner property portfolio, live milestone timeline with high-resolution site progress galleries, online installment payments via bKash/Nagad/Cards, pre-handover snagging tool, and post-handover DLP warranty tickets.

---

## 3. Shared Mobile Architecture & Common Codebase (`core/`)

To maximize code reusability across all 6 mobile apps, they share a common Flutter package: `bd_realestate_mobile_core`:

```
bd_realestate_mobile_core/
├── lib/
│   ├── network/
│   │   ├── api_client.dart       # Dio instance with auto-refresh JWT interceptor
│   │   ├── error_handler.dart    # Standardized API error parser
│   │   └── network_info.dart     # Connectivity checker
│   ├── theme/
│   │   ├── app_colors.dart       # Unified Real Estate Teal & Amber Palette
│   │   ├── app_typography.dart   # Inter & Hind Siliguri (Bangla font support)
│   │   └── app_decorations.dart  # Uniform BorderRadius (16 for cards, 10 for controls)
│   ├── utils/
│   │   ├── bdt_currency_formatter.dart # Formats ৳ ১,২৫,০০,০০০ (Crore/Lakh standard)
│   │   ├── date_time_helper.dart       # Localized English & Bangla dates
│   │   └── geo_helper.dart             # Geofence polygon distance calculator
│   └── widgets/
│       ├── custom_text_field.dart      # Standardized input with border & error state
│       ├── custom_button.dart          # Primary, Secondary, Loading states
│       ├── status_chip.dart            # Consistent unit & transaction status badge
│       └── app_dialogs.dart            # Unified confirmation dialogs & bottom sheets
```

---

## 4. How to Execute These Prompts on Any PC
1. Select the required mobile application prompt (e.g. `docs/mobile_prompts/01_SALES_APP_PROMPT.md`).
2. Pass the prompt to your coding assistant or run with Flutter CLI:
   ```bash
   flutter create --org com.bdrealestate.erp --platforms android,ios bd_realestate_sales_app
   ```
3. Follow the clean architecture structure specified in the prompt file to generate BLoCs, Repositories, and Screens.
