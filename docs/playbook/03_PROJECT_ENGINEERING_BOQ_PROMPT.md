# MASTER PROMPT: Project Planning, Authority Clearances & BOQ Estimation Microservice

```markdown
### SYSTEM ROLE:
You are a Principal Software Architect and Senior Civil Engineering Systems Specialist (Structural & Quantity Surveying).

### MISSION & GOAL:
Build `project-engineering-service` — the central project planning, spatial modeling, authority approval tracking (RAJUK/CDA/KDA), and Bill of Quantities (BOQ) microservice for the Bangladesh Real Estate ERP. This service models the spatial hierarchy (Project -> Tower -> Floor -> Unit), tracks development permits and NOC clearances, manages AutoCAD/structural drawing revisions, establishes Work Breakdown Structures (WBS), and manages itemized BOQ estimations with variance controls against actual site consumption.

---

### 1. COMPLETE DATABASE DDL & SCHEMA (MYSQL 8.0):

```sql
-- 1. Project Master
CREATE TABLE prj_projects (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id INT UNSIGNED NOT NULL,
    land_bank_id BIGINT UNSIGNED NOT NULL UNIQUE,
    project_code VARCHAR(32) NOT NULL UNIQUE,
    project_name VARCHAR(191) NOT NULL,
    project_type_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: PROJECT_TYPE (RESIDENTIAL, COMMERCIAL, MIXED_USE, CONDOMINIUM)
    development_authority_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: DEV_AUTHORITY (RAJUK, CDA, KDA, RDA, CITY_CORP)
    land_area_katha DECIMAL(10, 4) NOT NULL,
    far_allocated DECIMAL(6, 3) NOT NULL, -- Floor Area Ratio (FAR) under Dhaka Building Construction Rules 2008
    total_builtup_area_sqft DECIMAL(14, 2) NOT NULL,
    total_saleable_area_sqft DECIMAL(14, 2) NOT NULL,
    total_towers INT UNSIGNED NOT NULL DEFAULT 1,
    total_floors INT UNSIGNED NOT NULL,
    total_units INT UNSIGNED NOT NULL,
    planned_start_date DATE NOT NULL,
    planned_handover_date DATE NOT NULL,
    actual_handover_date DATE NULL,
    status ENUM('PLANNING', 'APPROVAL_STAGE', 'CONSTRUCTION_ONGOING', 'FINISHING', 'HANDED_OVER', 'ON_HOLD') DEFAULT 'PLANNING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Building Towers & Spatial Blocks
CREATE TABLE prj_towers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    tower_code VARCHAR(32) NOT NULL,
    tower_name VARCHAR(128) NOT NULL,
    basement_floors INT UNSIGNED DEFAULT 1,
    podium_floors INT UNSIGNED DEFAULT 0,
    residential_floors INT UNSIGNED NOT NULL,
    total_lifts INT UNSIGNED DEFAULT 2,
    has_substation_bay BOOLEAN DEFAULT TRUE,
    has_generator_room BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE CASCADE,
    UNIQUE KEY uq_proj_tower (project_id, tower_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Development Authority Permits & Clearances (RAJUK / CDA / FSCD / DoE)
CREATE TABLE prj_authority_clearances (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    clearance_type_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: CLEARANCE_TYPE (RAJUK_LUC, RAJUK_PLAN_APPROVAL, FIRE_NOC, CIVIL_AVIATION_HEIGHT, DOE_ENVIRONMENTAL, WASA_SEWERAGE, DESCO_SUBSTATION)
    application_memo_no VARCHAR(64) NOT NULL,
    submission_date DATE NOT NULL,
    approved_memo_no VARCHAR(64) NULL,
    approval_date DATE NULL,
    expiry_date DATE NULL,
    approved_max_height_metres DECIMAL(8, 2) NULL,
    approved_stories INT UNSIGNED NULL,
    statutory_fees_paid DECIMAL(14, 2) DEFAULT 0.00,
    status ENUM('APPLICATION_SUBMITTED', 'INSPECTION_PENDING', 'OBJECTION_RAISED', 'APPROVED', 'EXPIRED', 'REJECTED') DEFAULT 'APPLICATION_SUBMITTED',
    document_attachment_url VARCHAR(512) NULL,
    conditions_and_remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE CASCADE,
    INDEX idx_proj_clearance (project_id, clearance_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bill of Quantities (BOQ) Master & Structural Estimation
CREATE TABLE prj_boq_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    tower_id BIGINT UNSIGNED NULL,
    wbs_phase_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: WBS_PHASE (SUB_STRUCTURE_PILING, BASEMENT_RCC, SUPER_STRUCTURE_RCC, BRICKWORK, FINISHING_TILES, MEP_PLUMBING)
    item_code VARCHAR(32) NOT NULL,
    item_description TEXT NOT NULL,
    material_category_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: MATERIAL_CATEGORY (DEFORMED_BAR_ROD, CEMENT, SAND_FM15, SAND_FM25, STONE_CHIPS, BRICKS, CERAMIC_TILES)
    unit_of_measure_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: UOM (MT, BAGS, CFT, SQFT, NUMBERS)
    estimated_quantity DECIMAL(14, 4) NOT NULL,
    estimated_unit_rate DECIMAL(12, 2) NOT NULL,
    total_estimated_cost DECIMAL(16, 2) GENERATED ALWAYS AS (estimated_quantity * estimated_unit_rate) STORED,
    actual_consumed_quantity DECIMAL(14, 4) DEFAULT 0.0000,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE CASCADE,
    FOREIGN KEY (tower_id) REFERENCES prj_towers(id) ON DELETE SET NULL,
    INDEX idx_proj_material (project_id, material_category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Engineering Drawings DMS & Version Control
CREATE TABLE prj_drawings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    drawing_category_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: DRAWING_CAT (ARCHITECTURAL, STRUCTURAL, ELECTRICAL, PLUMBING_MEP, FIRE_FIGHTING)
    drawing_number VARCHAR(64) NOT NULL,
    drawing_title VARCHAR(191) NOT NULL,
    revision_number VARCHAR(16) NOT NULL DEFAULT 'R0', -- R0, R1, R2...
    is_approved_for_construction BOOLEAN DEFAULT FALSE, -- IFC (Issued for Construction)
    consultant_firm_name VARCHAR(191) NULL,
    lead_architect_engineer VARCHAR(191) NULL,
    file_storage_url VARCHAR(512) NOT NULL,
    dwg_cad_file_url VARCHAR(512) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE CASCADE,
    UNIQUE KEY uq_proj_drawing_rev (project_id, drawing_number, revision_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2. CORE REST API CONTRACTS:
- `POST /api/v1/projects` -> Registers new project linked to acquired land bank.
- `POST /api/v1/projects/{id}/towers` -> Creates building towers, basement counts, and floor levels.
- `POST /api/v1/projects/{id}/authority-clearances` -> Logs RAJUK/CDA/FSCD approval progress, expiry dates, and conditions.
- `GET /api/v1/projects/{id}/boq` -> Returns full itemized BOQ with estimated vs actual consumption variances.
- `POST /api/v1/projects/{id}/boq` -> Imports itemized BOQ from Excel or manual entry.
- `POST /api/v1/projects/{id}/drawings` -> Uploads revision of structural/architectural drawing (PDF/DWG).
- `PUT /api/v1/projects/drawings/{id}/issue-for-construction` -> Marks drawing as IFC (Issued For Construction) with digital watermark.

---

### 3. CRITICAL BUSINESS LOGIC:
1. **RAJUK Building Construction Rules 2008 FAR Calculation**:
   $$\text{FAR} = \frac{\text{Total Built-up Floor Area}}{\text{Total Land Area}}$$
   The service must validate that `total_builtup_area_sqft / (land_area_katha * 720)` does not exceed the maximum allowed FAR for the road width.
2. **IFC Drawing Invalidation**: When a new revision (e.g. `R2`) of a structural drawing is marked as `IFC`, the system automatically revokes the `is_approved_for_construction` flag on previous revisions (`R1`, `R0`) and dispatches a push notification to all site engineers.
```
