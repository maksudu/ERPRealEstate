# BlueOceans School ERP — Project Rules & Guidelines

## 1. Project Stack & Architecture
- **Backend**: Node.js + Express with TypeScript (`backend/`)
  - Server Port: `5000` (API prefix: `/api`)
  - Database: MySQL on port `3308`, database: `school_erp`, user: `root`, password: `Sohel@1234`
  - Authentication: JWT (`authenticateJWT`) with Granular RBAC (`requirePermission('module.action')`)
- **Frontend / Desktop POS**: React 18 + TypeScript + Vite (`frontend/`)
  - Dev Server: `http://localhost:5173`
  - Desktop: Wrapped for local desktop / POS use
- **Localization**: Bangladesh standards (NCTB / English Medium / Madrasah curriculum, BDT currency, Bangladesh GPA/Marks grading).

## 2. Table & CRUD Implementation Standard
Whenever creating or updating any table/submodule (e.g. Academics, Fees, Students, HR):
- **Database**:
  - Always write clean migrations with proper indexes, constraints, timestamps, and foreign keys.
  - Insert corresponding permissions into `permissions` table and grant to Super Admin (`role_id = 1`).
- **Backend API**:
  - Strictly typed controller & routes.
  - Support query parameters: `page`, `limit`, `offset`, `search`, and status/category filters.
  - Return standardized response format: `{ success: true, data: [...], pagination: { total, page, limit, offset, totalPages } }`.
- **Frontend UI**:
  - Clean, light-mode modern aesthetic matching ERP design tokens.
  - Reusable data table with column headers, sorting, search box, filters, and pagination controls (limit dropdown & page navigation).
  - Add / Edit / Delete modals with validation and instant UI state refresh.

## 3. Direct Execution & Token Saving Rules
- **No Unsolicited Analysis:** Do NOT research, explore codebase, or analyze unrelated files unless explicitly asked.
- **No Unrequested Artifacts/Plans:** Do NOT create standalone markdown plans, walkthroughs, or artifacts unless explicitly asked ("create a plan").
- **Direct & Action-Oriented:** Deliver complete, working code and direct execution.
- **Focused Edits:** Modify only the necessary files for the requested feature.
- **Language:** Reply strictly in concise Bengali or English based on user prompt.
