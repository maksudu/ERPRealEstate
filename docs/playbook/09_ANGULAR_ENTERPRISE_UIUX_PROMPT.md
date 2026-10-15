# MASTER PROMPT: Angular 19+ Standalone Frontend Shell & Custom Design System

```markdown
### SYSTEM ROLE:
You are a Principal Frontend Architect and UI/UX Design System Specialist (Angular 19+, Signals, Tailwind CSS, Lucide Icons).

### MISSION & GOAL:
Build the production-ready Angular 19+ enterprise web application shell for the Bangladesh Real Estate ERP. The frontend must implement:
1. **Multi-Level Collapsible Sidebar with Nested Sub-menus** (Replacing messy tab clutter with structured, deep-linkable URLs).
2. **Unified Proportional Spacing (`p-6` / `gap-6`)**: Equal gap between Topbar, Sidebar, and the central workspace.
3. **Unified Center/Right Card Container (`rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm`)**: Houses the entire workspace view.
4. **Zero Hardcoded Dropdowns**: 100% of selects use `<app-searchable-select>` fetching from `/api/v1/lookups/{code}`.
5. **Searchable Select with Inline `+ Add New`**: Enables in-place creation of new lookup records from any form.
6. **Uniform Border & Radius Standard**: `border border-slate-200 dark:border-slate-800`, `rounded-xl` for cards, `rounded-lg` for form controls.

---

### 1. APPLICATION SHELL ARCHITECTURE (`src/app/layouts/admin-layout/`):

```html
<!-- admin-layout.component.html -->
<div class="flex h-screen w-screen overflow-hidden bg-[var(--color-bg-app)] font-sans text-slate-800 dark:text-slate-100 antialiased">
  
  <!-- Multi-Level Collapsible Sidebar -->
  <aside class="w-72 flex-shrink-0 bg-[var(--color-bg-sidebar)] text-slate-300 flex flex-col z-30 shadow-xl border-r border-slate-800">
    <!-- Brand Header -->
    <div class="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
      <div class="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-md">
        <i-lucide name="building-2" class="w-5 h-5"></i-lucide>
      </div>
      <div>
        <h1 class="text-sm font-bold tracking-tight text-white leading-none">REAL ESTATE ERP</h1>
        <p class="text-[10px] text-teal-400 font-medium tracking-wider uppercase mt-1">Bangladesh Edition</p>
      </div>
    </div>

    <!-- Navigation Scroll Area (Nested Sub-Menus) -->
    <div class="flex-1 overflow-y-auto px-4 py-4 space-y-1">
      <app-sidebar-nav></app-sidebar-nav>
    </div>

    <!-- User / Organization Footer -->
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

  <!-- Right Workspace Area with Unified Equal Gap (p-6 / gap-6) -->
  <div class="flex flex-1 flex-col overflow-hidden p-6 gap-6 min-w-0">
    
    <!-- Topbar: Global Project Selector, Search (Ctrl+K), Notifications -->
    <header class="h-16 flex-shrink-0 bg-[var(--color-bg-card)] border border-[var(--color-border-standard)] rounded-xl px-6 flex items-center justify-between shadow-sm">
      <app-topbar></app-topbar>
    </header>

    <!-- Unified Card Container (Houses the active routed component) -->
    <main class="flex-1 overflow-y-auto bg-[var(--color-bg-card)] border border-[var(--color-border-standard)] rounded-xl p-6 shadow-sm flex flex-col relative">
      <!-- Breadcrumb Bar -->
      <app-breadcrumb class="mb-4 flex-shrink-0"></app-breadcrumb>
      
      <!-- Component Viewport -->
      <div class="flex-1 min-w-0">
        <router-outlet></router-outlet>
      </div>
    </main>

  </div>
</div>
```

---

### 2. MULTI-LEVEL SIDEBAR NAVIGATION STRUCTURE:
Organize sidebar routes with collapsible submenus:
- 📊 **Dashboard & Executive BI** (`/dashboard`)
- 🏞️ **Land Bank & Joint Venture** (`/land`)
  - ├─ Land Bank Registry (`/land/bank`)
  - ├─ Mouza, JL & Dag Records (`/land/mouza-dag`)
  - ├─ Historic Surveys (CS/SA/RS/BS) (`/land/surveys`)
  - ├─ Joint Venture (JV) Agreements (`/land/jv-agreements`)
  - └─ Landowner Unit Share Matrix (`/land/landowner-shares`)
- 🏗️ **Project & Engineering** (`/projects`)
  - ├─ Projects & Towers (`/projects/list`)
  - ├─ Authority Clearances (RAJUK/CDA) (`/projects/authority-clearances`)
  - ├─ Bill of Quantities (BOQ) (`/projects/boq`)
  - └─ Structural Drawings DMS (`/projects/drawings`)
- 🏢 **Property Inventory** (`/inventory`)
  - ├─ Real-Time Unit Availability Grid (`/inventory/matrix`)
  - ├─ Rate Cards & Price Escalations (`/inventory/rate-cards`)
  - └─ Parking Bays Allocation (`/inventory/parking-bays`)
- 🤝 **CRM & Sales Pipeline** (`/crm`)
- 📑 **Booking & Agreements** (`/sales`)
- 💰 **Installment Schedules & PDC** (`/installments`)
- 🚧 **Construction & Site Diary** (`/construction`)
- 📦 **Procurement & Stores** (`/procurement`)
- 💵 **Accounts, VAT & Tax** (`/accounts`)
- 🔑 **Handover & Facility** (`/handover`)
- ⚙️ **System Lookups & Settings** (`/settings/lookups`)

---

### 3. COMPLETE IMPLEMENTATION OF SEARCHABLE SELECT WITH INLINE `+ ADD NEW`:
Ensure `<app-searchable-select>` is standalone, responsive, emits selection changes, and supports keyboard navigation. When `allowCreateNew="true"`, renders a dashed button at the bottom of the dropdown list that opens an in-place modal and auto-selects the newly created lookup item upon completion.
```
