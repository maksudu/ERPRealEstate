import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlalchemy import text
from app.core.database import engine

from sqlalchemy import inspect

CONTRACTOR_COLUMNS = [
    ("legal_business_name", "VARCHAR(255) NULL"),
    ("email", "VARCHAR(128) NULL"),
    ("secondary_phone", "VARCHAR(32) NULL"),
    ("office_address", "TEXT NULL"),
    ("city", "VARCHAR(64) NULL DEFAULT 'Dhaka'"),
    ("contractor_type", "VARCHAR(64) NOT NULL DEFAULT 'SUBCONTRACTOR'"),
    ("parent_contractor_id", "BIGINT NULL"),
    ("authorized_rep_name", "VARCHAR(128) NULL"),
    ("authorized_rep_designation", "VARCHAR(128) NULL"),
    ("authorized_rep_phone", "VARCHAR(32) NULL"),
    ("authorized_rep_nid", "VARCHAR(64) NULL"),
    ("trade_category", "VARCHAR(64) NOT NULL DEFAULT 'CIVIL_STRUCTURE'"),
    ("trade_license_number", "VARCHAR(64) NULL"),
    ("trade_license_expiry", "DATE NULL"),
    ("tax_circle", "VARCHAR(64) NULL"),
    ("bank_name", "VARCHAR(128) NULL"),
    ("bank_branch", "VARCHAR(128) NULL"),
    ("bank_account_name", "VARCHAR(191) NULL"),
    ("bank_account_number", "VARCHAR(64) NULL"),
    ("bank_routing_number", "VARCHAR(32) NULL"),
    ("payment_terms_days", "INT NOT NULL DEFAULT 30"),
    ("iso_certification", "VARCHAR(128) NULL"),
    ("license_grade", "VARCHAR(64) NULL DEFAULT 'GRADE_A'"),
    ("enlistment_category", "VARCHAR(64) NULL DEFAULT 'CATEGORY_1'"),
    ("insurance_policy_number", "VARCHAR(64) NULL"),
    ("insurance_expiry_date", "DATE NULL"),
    ("insurance_coverage_amount", "DECIMAL(14, 2) NOT NULL DEFAULT 0.00"),
    ("safety_compliant", "TINYINT(1) NOT NULL DEFAULT 1"),
    ("safety_officer_name", "VARCHAR(128) NULL"),
    ("safety_incident_count", "INT NOT NULL DEFAULT 0"),
    ("performance_rating", "DECIMAL(3, 2) NOT NULL DEFAULT 4.50"),
    ("past_projects_count", "INT NOT NULL DEFAULT 0"),
    ("experience_years", "INT NOT NULL DEFAULT 5"),
    ("manpower_capacity", "INT NOT NULL DEFAULT 50"),
    ("equipment_inventory", "TEXT NULL"),
    ("site_supervisor_name", "VARCHAR(128) NULL"),
    ("site_supervisor_phone", "VARCHAR(32) NULL"),
    ("scope_boundaries", "TEXT NULL"),
    ("duplicate_billing_protection", "TINYINT(1) NOT NULL DEFAULT 1"),
    ("contract_start_date", "DATE NULL"),
    ("contract_expiry_date", "DATE NULL"),
    ("onboarding_status", "VARCHAR(32) NOT NULL DEFAULT 'APPROVED'"),
    ("completion_status", "VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'"),
    ("has_active_disputes", "TINYINT(1) NOT NULL DEFAULT 0"),
    ("remarks", "TEXT NULL"),
    ("updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
]

UPGRADE_DDL = [

    # 2. Subcontract Rates Master
    """
    CREATE TABLE IF NOT EXISTS con_contractor_rates (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        contractor_id BIGINT NOT NULL,
        project_id BIGINT NULL,
        work_order_id BIGINT NULL,
        item_code VARCHAR(64) NOT NULL,
        trade_item_name VARCHAR(191) NOT NULL,
        specification TEXT NULL,
        unit_of_measure VARCHAR(32) NOT NULL DEFAULT 'SFT',
        approved_unit_rate DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        scope_boundary_definition TEXT NULL,
        effective_start_date DATE NOT NULL,
        effective_end_date DATE NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ccr_contractor (contractor_id),
        INDEX idx_ccr_project (project_id),
        INDEX idx_ccr_item_code (item_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    # 3. Subcontractor Disputes & Deductions
    """
    CREATE TABLE IF NOT EXISTS con_contractor_disputes (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        dispute_code VARCHAR(64) NOT NULL UNIQUE,
        contractor_id BIGINT NOT NULL,
        project_id BIGINT NOT NULL,
        work_order_id BIGINT NULL,
        dispute_category VARCHAR(64) NOT NULL DEFAULT 'MEASUREMENT_DISCREPANCY',
        dispute_title VARCHAR(191) NOT NULL,
        description TEXT NOT NULL,
        claimed_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        approved_deduction_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        retention_held_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
        resolution_notes TEXT NULL,
        raised_by_user_id BIGINT NOT NULL,
        raised_date DATE NOT NULL,
        resolved_date DATE NULL,
        resolved_by_user_id BIGINT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ccd_contractor (contractor_id),
        INDEX idx_ccd_project (project_id),
        INDEX idx_ccd_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
]

LOOKUP_CATEGORIES = [
    ("CONTRACTOR_TYPE", "Contractor Classification", "Main Contractor, Subcontractor, Specialized Trade or Labor Supplier"),
    ("CONTRACTOR_TRADE", "Construction Trade Category", "Specialized trade categories (Civil, Rod Binding, Shuttering, MEP, etc.)"),
    ("CONTRACTOR_ONBOARDING_STATUS", "Contractor Onboarding Status", "Onboarding workflow state per legal/procurement/finance guidelines"),
    ("CONTRACTOR_COMPLETION_STATUS", "Contractor Execution Status", "Active, Ongoing, Completed, Defect Liability, Terminated"),
    ("CONTRACTOR_LICENSE_GRADE", "Contractor License Grade", "Classification grades for statutory bidding and enlistment"),
    ("DISPUTE_CATEGORY", "Contractor Dispute Category", "Categories for site disputes, measurement, deductions, quality"),
    ("DISPUTE_STATUS", "Dispute Resolution Status", "Lifecycle status of contractor disputes and reconciliations")
]

LOOKUP_ITEMS = [
    # CONTRACTOR_TYPE
    ("CONTRACTOR_TYPE", "MAIN_CONTRACTOR", "Main Contractor", "Primary turnkey or EPC general contractor", 1),
    ("CONTRACTOR_TYPE", "SUBCONTRACTOR", "Trade Subcontractor", "Specialized subcontract entity tied to main contract or work order", 2),
    ("CONTRACTOR_TYPE", "SPECIALIZED_TRADE", "Specialized Contractor", "Deep piling, post-tensioning, HVAC, facade glazing", 3),
    ("CONTRACTOR_TYPE", "LABOR_SUPPLIER", "Labor Contractor", "Direct manpower and piece-rate labor supplier", 4),

    # CONTRACTOR_TRADE
    ("CONTRACTOR_TRADE", "CIVIL_STRUCTURE", "Civil & Structural Works", "Foundation, mat casting, column, beam and slab construction", 1),
    ("CONTRACTOR_TRADE", "SHUTTERING_CARPENTRY", "Shuttering & Formwork", "Plywood formwork, steel shuttering and staging", 2),
    ("CONTRACTOR_TRADE", "ROD_BINDING", "Rebar & Rod Binding", "Bar bending schedule (BBS) fabrication, placement and tying", 3),
    ("CONTRACTOR_TRADE", "BRICKWORK_MASONRY", "Brickwork & AAC Masonry", "Autoclaved Aerated Concrete and red clay brick walls", 4),
    ("CONTRACTOR_TRADE", "PLASTER_FINISHING", "Plastering & Skim Coat", "Internal sand-cement plaster and exterior weather plaster", 5),
    ("CONTRACTOR_TRADE", "PLUMBING_SANITARY", "Plumbing & Sanitary", "Water supply piping, drainage, sewage, sanitary fixtures", 6),
    ("CONTRACTOR_TRADE", "ELECTRICAL_MEP", "Electrical & Low Voltage", "Concealed conduit, DB board, cable pulling, earthing", 7),
    ("CONTRACTOR_TRADE", "TILES_MARBLE", "Tiles & Marble Fitting", "Vitrified floor tiles, wall cladding, granite counters", 8),
    ("CONTRACTOR_TRADE", "WATERPROOFING", "Waterproofing & Chemical Coating", "Basement membrane, water tank coating, rooftop screed", 9),
    ("CONTRACTOR_TRADE", "PAINTING_POLISH", "Painting & Polish", "Putty, primer, weather coat, enamel and duco finish", 10),
    ("CONTRACTOR_TRADE", "HVAC_VENTILATION", "HVAC & Ventilation", "Ducting, VRF indoor/outdoor units, basement exhaust", 11),

    # CONTRACTOR_ONBOARDING_STATUS
    ("CONTRACTOR_ONBOARDING_STATUS", "DRAFT", "Draft Application", "Initial registration submission", 1),
    ("CONTRACTOR_ONBOARDING_STATUS", "UNDER_REVIEW", "Under Review", "Legal, Tax and Procurement due diligence in progress", 2),
    ("CONTRACTOR_ONBOARDING_STATUS", "APPROVED", "Approved & Enlisted", "Fully verified and authorized for work order issuance", 3),
    ("CONTRACTOR_ONBOARDING_STATUS", "SUSPENDED", "Suspended", "Temporarily halted due to compliance or safety concerns", 4),
    ("CONTRACTOR_ONBOARDING_STATUS", "BLACKLISTED", "Blacklisted", "Permanently barred due to fraud, abandon or severe breach", 5),

    # CONTRACTOR_COMPLETION_STATUS
    ("CONTRACTOR_COMPLETION_STATUS", "ACTIVE", "Active On-Site", "Currently mobilized and deploying manpower on active sites", 1),
    ("CONTRACTOR_COMPLETION_STATUS", "ONGOING", "Ongoing Scope", "Executing contract packages within planned timeline", 2),
    ("CONTRACTOR_COMPLETION_STATUS", "COMPLETED", "Work Completed", "Substantial physical completion achieved", 3),
    ("CONTRACTOR_COMPLETION_STATUS", "DEFECT_LIABILITY", "Defect Liability Period", "12-month DLP warranty with retention money held", 4),
    ("CONTRACTOR_COMPLETION_STATUS", "TERMINATED", "Terminated", "Contract closed or terminated with final settlement", 5),

    # CONTRACTOR_LICENSE_GRADE
    ("CONTRACTOR_LICENSE_GRADE", "GRADE_A", "Grade A (Prime Tier)", "Authorized for high-rise > 20 storeys and mega basements", 1),
    ("CONTRACTOR_LICENSE_GRADE", "GRADE_B", "Grade B (Medium Tier)", "Authorized for residential towers up to 14 storeys", 2),
    ("CONTRACTOR_LICENSE_GRADE", "GRADE_C", "Grade C (Trade Tier)", "Authorized for localized trade and finishing packages", 3),
    ("CONTRACTOR_LICENSE_GRADE", "SPECIALIST_ENLISTED", "Specialist Enlisted", "Certified specialist for post-tensioning, piling, STP", 4),

    # DISPUTE_CATEGORY
    ("DISPUTE_CATEGORY", "MEASUREMENT_DISCREPANCY", "Measurement Discrepancy", "Dispute in joint measurement sheet (JMS) or RA bill quantities", 1),
    ("DISPUTE_CATEGORY", "QUALITY_DEFECT", "Quality & Workmanship Defect", "NCR failure, honeycombing, out-of-plumb walls", 2),
    ("DISPUTE_CATEGORY", "SCHEDULE_DELAY", "Schedule Delay & Liquidated Damages", "Failure to meet milestone schedule without force majeure", 3),
    ("DISPUTE_CATEGORY", "EXCESS_WASTAGE", "Excess Material Wastage", "Rebar/cement consumed beyond contract allowed 2.5% tolerance", 4),
    ("DISPUTE_CATEGORY", "SAFETY_VIOLATION", "Safety & Environmental Breach", "Failure to deploy PPE, unsafe scaffolding, repeated warnings", 5),
    ("DISPUTE_CATEGORY", "BILLING_OVERCHARGE", "Billing Overcharge / Duplicate", "Attempted billing for items covered under developer direct supply", 6),

    # DISPUTE_STATUS
    ("DISPUTE_STATUS", "OPEN", "Dispute Raised", "Dispute filed by site management or contractor", 1),
    ("DISPUTE_STATUS", "UNDER_MEDIATION", "Under Mediation", "Project Manager & Procurement reviewing claims and site records", 2),
    ("DISPUTE_STATUS", "RESOLVED", "Amicably Resolved", "Agreed without financial deduction or mutual consensus achieved", 3),
    ("DISPUTE_STATUS", "DEDUCTED", "Deducted from RA Bill", "Deduction enforced against next RA bill or retention fund", 4),
    ("DISPUTE_STATUS", "REJECTED", "Claim Rejected", "Claim dismissed after joint verification with engineering team", 5)
]

SEED_CONTRACTORS = [
    {
        "contractor_code": "CONT-2026-001",
        "company_name": "Bengal Structural Builders Ltd.",
        "legal_business_name": "Bengal Structural Builders Private Limited",
        "trade_specialization": "CIVIL_STRUCTURE",
        "trade_category": "CIVIL_STRUCTURE",
        "contractor_type": "MAIN_CONTRACTOR",
        "contact_person": "Engr. Kamal Hossain",
        "primary_phone": "+880 1711-200301",
        "secondary_phone": "+880 1819-200302",
        "email": "kamal@bengalbuilders.bd",
        "office_address": "Suite 8A, Navana Tower, Gulshan-1, Dhaka-1212",
        "city": "Dhaka",
        "authorized_rep_name": "Md. Rafiqul Islam",
        "authorized_rep_designation": "Managing Director",
        "authorized_rep_phone": "+880 1711-554433",
        "authorized_rep_nid": "19802692518000412",
        "tin_number": "142857912401",
        "bin_number": "002458912-0101",
        "trade_license_number": "TRAD/DNCC/041285/2024",
        "trade_license_expiry": "2027-06-30",
        "tax_circle": "Taxes Circle 54 (Gulshan), Dhaka",
        "bank_name": "Eastern Bank PLC",
        "bank_branch": "Gulshan Branch",
        "bank_account_name": "Bengal Structural Builders Pvt Ltd",
        "bank_account_number": "1041060089241",
        "bank_routing_number": "095261435",
        "payment_terms_days": 30,
        "iso_certification": "ISO 9001:2015 & OHSAS 18001",
        "license_grade": "GRADE_A",
        "enlistment_category": "CATEGORY_1",
        "insurance_policy_number": "PRG-CAR-2026-8812",
        "insurance_expiry_date": "2027-12-31",
        "insurance_coverage_amount": 50000000.00,
        "safety_compliant": 1,
        "safety_officer_name": "Engr. Tanvir Ahmed, CSP",
        "safety_incident_count": 0,
        "performance_rating": 4.85,
        "past_projects_count": 18,
        "experience_years": 16,
        "manpower_capacity": 220,
        "equipment_inventory": "2x Tower Cranes (Zoomlion 50T), 3x Concrete Pumps (Schwing Stetter), 4x Rebar Cutting & Bending Benches, 12x Passenger Hoists",
        "site_supervisor_name": "Md. Habibur Rahman",
        "site_supervisor_phone": "+880 1712-443322",
        "scope_boundaries": "Entire Substructure diaphragm wall, mat foundation, Tower A & B reinforced concrete superstructure up to Level 25. Responsibility boundary ends at bare concrete finish.",
        "duplicate_billing_protection": 1,
        "contract_start_date": "2025-06-01",
        "contract_expiry_date": "2027-12-31",
        "onboarding_status": "APPROVED",
        "completion_status": "ACTIVE",
        "has_active_disputes": 0,
        "remarks": "Tier-1 prime structural contractor with exemplary safety and quality audit record."
    },
    {
        "contractor_code": "CONT-2026-002",
        "company_name": "Apex Formwork & Shuttering Services",
        "legal_business_name": "Apex Modern Formwork & Scaffolding Enterprise",
        "trade_specialization": "SHUTTERING_CARPENTRY",
        "trade_category": "SHUTTERING_CARPENTRY",
        "contractor_type": "SUBCONTRACTOR",
        "contact_person": "Md. Sirajul Islam",
        "primary_phone": "+880 1812-400501",
        "secondary_phone": "+880 1914-400502",
        "email": "siraj@apexformwork.com",
        "office_address": "House 42, Road 11, Sector 4, Uttara, Dhaka-1230",
        "city": "Dhaka",
        "authorized_rep_name": "Md. Sirajul Islam",
        "authorized_rep_designation": "Proprietor",
        "authorized_rep_phone": "+880 1812-400501",
        "authorized_rep_nid": "19782692518000993",
        "tin_number": "284759102488",
        "bin_number": "003189421-0202",
        "trade_license_number": "TRAD/DNCC/089421/2025",
        "trade_license_expiry": "2027-06-30",
        "tax_circle": "Taxes Circle 31 (Uttara), Dhaka",
        "bank_name": "BRAC Bank PLC",
        "bank_branch": "Uttara Branch",
        "bank_account_name": "Apex Formwork & Scaffolding Ent.",
        "bank_account_number": "1501204899120001",
        "bank_routing_number": "060264188",
        "payment_terms_days": 15,
        "iso_certification": "ISO 9001:2015 Quality Shuttering",
        "license_grade": "GRADE_B",
        "enlistment_category": "CATEGORY_1",
        "insurance_policy_number": "NIC-WC-2026-3021",
        "insurance_expiry_date": "2027-05-31",
        "insurance_coverage_amount": 10000000.00,
        "safety_compliant": 1,
        "safety_officer_name": "Abdul Malek",
        "safety_incident_count": 0,
        "performance_rating": 4.60,
        "past_projects_count": 12,
        "experience_years": 11,
        "manpower_capacity": 85,
        "equipment_inventory": "DOKA formwork panels, Cuplock heavy scaffolding 120 tons, Peri props 4,000 pcs, high-speed shuttering de-nailers",
        "site_supervisor_name": "Md. Nasir Uddin",
        "site_supervisor_phone": "+880 1819-776655",
        "scope_boundaries": "Fabrication, erection, alignment, props staging, de-shuttering and panel repair for Tower A columns, beams and slabs. Strictly labor & formwork consumables only; steel rebar and concrete excluded.",
        "duplicate_billing_protection": 1,
        "contract_start_date": "2025-08-01",
        "contract_expiry_date": "2027-08-31",
        "onboarding_status": "APPROVED",
        "completion_status": "ONGOING",
        "has_active_disputes": 0,
        "remarks": "Subcontracted under Bengal Structural Builders for high-finish exposed concrete shuttering."
    },
    {
        "contractor_code": "CONT-2026-003",
        "company_name": "Delta Rebar Fabrication Works",
        "legal_business_name": "Delta Steel & Rebar Engineering Services",
        "trade_specialization": "ROD_BINDING",
        "trade_category": "ROD_BINDING",
        "contractor_type": "SUBCONTRACTOR",
        "contact_person": "Faruk Ahmed",
        "primary_phone": "+880 1715-600701",
        "secondary_phone": "+880 1612-600702",
        "email": "delta.rebar@gmail.com",
        "office_address": "Plot 18, Block B, Aftabnagar, Badda, Dhaka-1212",
        "city": "Dhaka",
        "authorized_rep_name": "Faruk Ahmed",
        "authorized_rep_designation": "Managing Partner",
        "authorized_rep_phone": "+880 1715-600701",
        "authorized_rep_nid": "19832692518000781",
        "tin_number": "410294819203",
        "bin_number": "001849204-0303",
        "trade_license_number": "TRAD/DSCC/031948/2024",
        "trade_license_expiry": "2027-06-30",
        "tax_circle": "Taxes Circle 19 (Badda), Dhaka",
        "bank_name": "City Bank PLC",
        "bank_branch": "Pragati Sarani Branch",
        "bank_account_name": "Delta Rebar Fabrication Works",
        "bank_account_number": "1102938475001",
        "bank_routing_number": "225261890",
        "payment_terms_days": 15,
        "iso_certification": "BBS Compliance Certified",
        "license_grade": "GRADE_B",
        "enlistment_category": "CATEGORY_2",
        "insurance_policy_number": "GIC-LAB-2026-1194",
        "insurance_expiry_date": "2026-12-31",
        "insurance_coverage_amount": 8000000.00,
        "safety_compliant": 1,
        "safety_officer_name": "Selim Reza",
        "safety_incident_count": 1,
        "performance_rating": 4.25,
        "past_projects_count": 9,
        "experience_years": 8,
        "manpower_capacity": 60,
        "equipment_inventory": "4x Automatic Rebar Cutters (up to 32mm 500W rebar), 3x Hydraulic Bending Machines, 8x Cordless Rebar Tiers",
        "site_supervisor_name": "Md. Alauddin",
        "site_supervisor_phone": "+880 1718-990011",
        "scope_boundaries": "Bar bending schedule (BBS) cutting, bending, lifting to floor and binding rebar in mat, columns, shear walls and slabs. Wastage tolerance capped at 2.50%. Over-wastage charged at BDT 95/kg.",
        "duplicate_billing_protection": 1,
        "contract_start_date": "2025-07-15",
        "contract_expiry_date": "2027-06-30",
        "onboarding_status": "APPROVED",
        "completion_status": "ACTIVE",
        "has_active_disputes": 1,
        "remarks": "Active dispute logged for BBS length variance on Floor 4 slab beam rebar."
    },
    {
        "contractor_code": "CONT-2026-004",
        "company_name": "Green MEP & Sanitary Solutions",
        "legal_business_name": "Green Building Electro-Mechanical & Sanitary Ltd.",
        "trade_specialization": "PLUMBING_SANITARY",
        "trade_category": "PLUMBING_SANITARY",
        "contractor_type": "SPECIALIZED_TRADE",
        "contact_person": "Engr. Rezaul Karim",
        "primary_phone": "+880 1911-800901",
        "secondary_phone": "+880 1713-800902",
        "email": "rezaul@greenmepbd.com",
        "office_address": "Level 4, City Center, Motijheel, Dhaka-1000",
        "city": "Dhaka",
        "authorized_rep_name": "Engr. Rezaul Karim",
        "authorized_rep_designation": "Chief Technical Director",
        "authorized_rep_phone": "+880 1911-800901",
        "authorized_rep_nid": "19752692518000334",
        "tin_number": "591827461902",
        "bin_number": "004928172-0404",
        "trade_license_number": "TRAD/DSCC/072918/2025",
        "trade_license_expiry": "2027-06-30",
        "tax_circle": "Taxes Circle 12 (Motijheel), Dhaka",
        "bank_name": "Mutual Trust Bank PLC",
        "bank_branch": "Motijheel Corporate Branch",
        "bank_account_name": "Green Building Electro-Mechanical Ltd",
        "bank_account_number": "0012021008741",
        "bank_routing_number": "145263120",
        "payment_terms_days": 30,
        "iso_certification": "ISO 14001:2015 & NFPA Certified",
        "license_grade": "GRADE_A",
        "enlistment_category": "CATEGORY_1",
        "insurance_policy_number": "DEL-MEP-2026-4482",
        "insurance_expiry_date": "2027-10-31",
        "insurance_coverage_amount": 25000000.00,
        "safety_compliant": 1,
        "safety_officer_name": "Engr. Anisur Rahman",
        "safety_incident_count": 0,
        "performance_rating": 4.90,
        "past_projects_count": 22,
        "experience_years": 14,
        "manpower_capacity": 75,
        "equipment_inventory": "PPR Welding sets, Hydrostatic pressure test rigs up to 25 bar, Core cutting drill rigs (Hilti DD 150), Pipe threading machines",
        "site_supervisor_name": "Md. Jahangir Alam",
        "site_supervisor_phone": "+880 1912-334455",
        "scope_boundaries": "Complete underground reservoir piping, rainwater harvesting, overhead tank plumbing, CPVC water supply lines and soil waste vertical stacks. Boundary connects to city water main at project gate.",
        "duplicate_billing_protection": 1,
        "contract_start_date": "2025-09-01",
        "contract_expiry_date": "2028-03-31",
        "onboarding_status": "APPROVED",
        "completion_status": "ACTIVE",
        "has_active_disputes": 0,
        "remarks": "Specialized MEP contractor with pristine leak-free pressure testing history."
    }
]

SEED_RATES = [
    # Bengal Structural Builders rates
    {
        "contractor_id": 1,
        "project_id": 1,
        "item_code": "RATE-CIV-001",
        "trade_item_name": "Cast-in-situ Ready-Mix Concrete Casting (Columns, Beams & Slabs)",
        "specification": "Laying, vibrating, curing and finishing of C30/37 ready-mix concrete for superstructure.",
        "unit_of_measure": "CFT",
        "approved_unit_rate": 28.50,
        "scope_boundary_definition": "Includes labor for casting, surface screeding, vibrating and continuous pond curing for 14 days. Concrete supplied by developer.",
        "effective_start_date": "2025-06-01",
        "effective_end_date": "2027-12-31",
        "is_active": 1
    },
    {
        "contractor_id": 1,
        "project_id": 1,
        "item_code": "RATE-CIV-002",
        "trade_item_name": "Substructure Mat Foundation Concrete Pouring",
        "specification": "Mass concrete pour with chilled water temperature control and thermocouple monitoring.",
        "unit_of_measure": "CFT",
        "approved_unit_rate": 32.00,
        "scope_boundary_definition": "Continuous 36-hour mass pour operation including ice slurry batching labor and vibrator gang.",
        "effective_start_date": "2025-06-01",
        "effective_end_date": "2026-06-30",
        "is_active": 1
    },
    # Apex Formwork rates
    {
        "contractor_id": 2,
        "project_id": 1,
        "item_code": "RATE-SHT-001",
        "trade_item_name": "Marine Plywood Shuttering for Slab & Beam Soffits",
        "specification": "18mm film-faced marine plywood on DOKA H20 timber beams with steel props.",
        "unit_of_measure": "SFT",
        "approved_unit_rate": 24.00,
        "scope_boundary_definition": "Includes shuttering oil application, prop staging, leveling and de-shuttering after 21 days.",
        "effective_start_date": "2025-08-01",
        "effective_end_date": "2027-08-31",
        "is_active": 1
    },
    {
        "contractor_id": 2,
        "project_id": 1,
        "item_code": "RATE-SHT-002",
        "trade_item_name": "Steel Panel Shuttering for Heavy Columns & Shear Walls",
        "specification": "Modular steel panel shuttering with tie rods and heavy alignment walers.",
        "unit_of_measure": "SFT",
        "approved_unit_rate": 28.00,
        "scope_boundary_definition": "Includes plumb verification, foam gasket seal at base, crane lifting brackets and de-shuttering.",
        "effective_start_date": "2025-08-01",
        "effective_end_date": "2027-08-31",
        "is_active": 1
    },
    # Delta Rebar rates
    {
        "contractor_id": 3,
        "project_id": 1,
        "item_code": "RATE-RBD-001",
        "trade_item_name": "500W High-Yield Rebar Cutting, Bending & Binding",
        "specification": "BBS compliant 8mm to 32mm deformed bar fabrication and wire tying.",
        "unit_of_measure": "KG",
        "approved_unit_rate": 4.80,
        "scope_boundary_definition": "Includes crane staging, rust cleaning, cover block placement (concrete/plastic) and binding wire.",
        "effective_start_date": "2025-07-15",
        "effective_end_date": "2027-06-30",
        "is_active": 1
    },
    # Green MEP rates
    {
        "contractor_id": 4,
        "project_id": 1,
        "item_code": "RATE-PLM-001",
        "trade_item_name": "PPR Hot/Cold Water Internal Concealed Piping",
        "specification": "PN20 PPR piping with thermal welding, tested to 15 bar for 24 hours.",
        "unit_of_measure": "RFT",
        "approved_unit_rate": 45.00,
        "scope_boundary_definition": "Chasing walls, pipe clamping, heat fusion jointing, hydraulic testing and mortar concealing.",
        "effective_start_date": "2025-09-01",
        "effective_end_date": "2028-03-31",
        "is_active": 1
    }
]

SEED_DISPUTES = [
    {
        "dispute_code": "DISP-2026-001",
        "contractor_id": 3,
        "project_id": 1,
        "dispute_category": "EXCESS_WASTAGE",
        "dispute_title": "Floor 4 Slab Rebar Offcut Wastage Exceeded 2.5% Tolerance",
        "description": "During verification of RA Bill #3 rebar reconciliation, Delta Rebar generated 4.12% cut piece scrap versus contractual 2.50% allowance. Net excess scrap amount equals 3,420 kg of 20mm rebar.",
        "claimed_amount": 324900.00,
        "approved_deduction_amount": 324900.00,
        "retention_held_amount": 162450.00,
        "status": "DEDUCTED",
        "resolution_notes": "Project Manager and Procurement confirmed excess scrap. Deducted BDT 324,900 from RA Bill #3 payment certificate with contractor representative signed acknowledgement.",
        "raised_by_user_id": 1,
        "raised_date": "2026-02-14",
        "resolved_date": "2026-02-22",
        "resolved_by_user_id": 1
    },
    {
        "dispute_code": "DISP-2026-002",
        "contractor_id": 2,
        "project_id": 1,
        "dispute_category": "MEASUREMENT_DISCREPANCY",
        "dispute_title": "Column Shuttering Deduction for Beam Intersections",
        "description": "Contractor billed gross column surface area without deducting 12 beam junction overlaps (184 sft). Developer QS team claimed duplicate measurement.",
        "claimed_amount": 5152.00,
        "approved_deduction_amount": 5152.00,
        "retention_held_amount": 0.00,
        "status": "RESOLVED",
        "resolution_notes": "Joint measurement re-survey completed on 2026-03-05. Intersection overlap deducted as per standard FIDIC/CESMM rules.",
        "raised_by_user_id": 1,
        "raised_date": "2026-03-01",
        "resolved_date": "2026-03-05",
        "resolved_by_user_id": 1
    }
]

async def run_upgrade():
    print("=== Upgrading Contractor & Subcontractor Management Tables & Lookups ===")
    async with engine.begin() as conn:
        # Check existing columns on con_contractors
        existing_cols = await conn.run_sync(lambda sync_conn: [c["name"] for c in inspect(sync_conn).get_columns("con_contractors")])
        for col_name, col_def in CONTRACTOR_COLUMNS:
            if col_name not in existing_cols:
                try:
                    await conn.execute(text(f"ALTER TABLE con_contractors ADD COLUMN {col_name} {col_def}"))
                    print(f"Added column {col_name} to con_contractors")
                except Exception as e:
                    print(f"Column notice for {col_name}: {e}")

        for ddl in UPGRADE_DDL:
            try:
                await conn.execute(text(ddl))
                print("DDL executed successfully.")
            except Exception as e:
                print(f"DDL notice (may already exist): {e}")

        # Seed Lookup Categories
        for code, name, desc in LOOKUP_CATEGORIES:
            await conn.execute(text("""
                INSERT INTO sys_lookup_categories (category_code, category_name, description, is_active)
                VALUES (:code, :name, :desc, 1)
                ON DUPLICATE KEY UPDATE category_name = :name, description = :desc
            """), {"code": code, "name": name, "desc": desc})

        # Seed Lookup Items
        for cat_code, item_code, item_name, desc, sort_ord in LOOKUP_ITEMS:
            # fetch category_id
            res = await conn.execute(text("SELECT id FROM sys_lookup_categories WHERE category_code = :c"), {"c": cat_code})
            row = res.fetchone()
            if row:
                cat_id = row[0]
                chk = await conn.execute(
                    text("SELECT id FROM sys_lookup_items WHERE category_id = :cid AND item_code = :icode"),
                    {"cid": cat_id, "icode": item_code}
                )
                if not chk.fetchone():
                    await conn.execute(text("""
                        INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, color_badge, sort_order, is_default, is_active)
                        VALUES (:cid, :icode, :iname, :iname, '#3B82F6', :sort_ord, 0, 1)
                    """), {"cid": cat_id, "icode": item_code, "iname": item_name, "sort_ord": sort_ord})

        # Seed Contractors
        for c in SEED_CONTRACTORS:
            check_res = await conn.execute(
                text("SELECT id FROM con_contractors WHERE contractor_code = :code"),
                {"code": c["contractor_code"]}
            )
            existing = check_res.fetchone()
            if not existing:
                await conn.execute(text("""
                    INSERT INTO con_contractors (
                        contractor_code, company_name, legal_business_name, trade_specialization, trade_category,
                        contractor_type, contact_person, primary_phone, secondary_phone, email, office_address, city,
                        authorized_rep_name, authorized_rep_designation, authorized_rep_phone, authorized_rep_nid,
                        tin_number, bin_number, trade_license_number, trade_license_expiry, tax_circle,
                        bank_name, bank_branch, bank_account_name, bank_account_number, bank_routing_number,
                        payment_terms_days, iso_certification, license_grade, enlistment_category,
                        insurance_policy_number, insurance_expiry_date, insurance_coverage_amount,
                        safety_compliant, safety_officer_name, safety_incident_count, performance_rating,
                        past_projects_count, experience_years, manpower_capacity, equipment_inventory,
                        site_supervisor_name, site_supervisor_phone, scope_boundaries, duplicate_billing_protection,
                        contract_start_date, contract_expiry_date, onboarding_status, completion_status,
                        has_active_disputes, remarks, is_active
                    ) VALUES (
                        :contractor_code, :company_name, :legal_business_name, :trade_specialization, :trade_category,
                        :contractor_type, :contact_person, :primary_phone, :secondary_phone, :email, :office_address, :city,
                        :authorized_rep_name, :authorized_rep_designation, :authorized_rep_phone, :authorized_rep_nid,
                        :tin_number, :bin_number, :trade_license_number, :trade_license_expiry, :tax_circle,
                        :bank_name, :bank_branch, :bank_account_name, :bank_account_number, :bank_routing_number,
                        :payment_terms_days, :iso_certification, :license_grade, :enlistment_category,
                        :insurance_policy_number, :insurance_expiry_date, :insurance_coverage_amount,
                        :safety_compliant, :safety_officer_name, :safety_incident_count, :performance_rating,
                        :past_projects_count, :experience_years, :manpower_capacity, :equipment_inventory,
                        :site_supervisor_name, :site_supervisor_phone, :scope_boundaries, :duplicate_billing_protection,
                        :contract_start_date, :contract_expiry_date, :onboarding_status, :completion_status,
                        :has_active_disputes, :remarks, 1
                    )
                """), c)
                print(f"Seeded contractor: {c['company_name']}")
            else:
                cid = existing[0]
                update_payload = dict(c)
                update_payload["cid"] = cid
                await conn.execute(text("""
                    UPDATE con_contractors SET
                        company_name = :company_name,
                        legal_business_name = :legal_business_name,
                        trade_specialization = :trade_specialization,
                        trade_category = :trade_category,
                        contractor_type = :contractor_type,
                        contact_person = :contact_person,
                        primary_phone = :primary_phone,
                        secondary_phone = :secondary_phone,
                        email = :email,
                        office_address = :office_address,
                        city = :city,
                        authorized_rep_name = :authorized_rep_name,
                        authorized_rep_designation = :authorized_rep_designation,
                        authorized_rep_phone = :authorized_rep_phone,
                        authorized_rep_nid = :authorized_rep_nid,
                        tin_number = :tin_number,
                        bin_number = :bin_number,
                        trade_license_number = :trade_license_number,
                        trade_license_expiry = :trade_license_expiry,
                        tax_circle = :tax_circle,
                        bank_name = :bank_name,
                        bank_branch = :bank_branch,
                        bank_account_name = :bank_account_name,
                        bank_account_number = :bank_account_number,
                        bank_routing_number = :bank_routing_number,
                        payment_terms_days = :payment_terms_days,
                        iso_certification = :iso_certification,
                        license_grade = :license_grade,
                        enlistment_category = :enlistment_category,
                        insurance_policy_number = :insurance_policy_number,
                        insurance_expiry_date = :insurance_expiry_date,
                        insurance_coverage_amount = :insurance_coverage_amount,
                        safety_compliant = :safety_compliant,
                        safety_officer_name = :safety_officer_name,
                        safety_incident_count = :safety_incident_count,
                        performance_rating = :performance_rating,
                        past_projects_count = :past_projects_count,
                        experience_years = :experience_years,
                        manpower_capacity = :manpower_capacity,
                        equipment_inventory = :equipment_inventory,
                        site_supervisor_name = :site_supervisor_name,
                        site_supervisor_phone = :site_supervisor_phone,
                        scope_boundaries = :scope_boundaries,
                        duplicate_billing_protection = :duplicate_billing_protection,
                        contract_start_date = :contract_start_date,
                        contract_expiry_date = :contract_expiry_date,
                        onboarding_status = :onboarding_status,
                        completion_status = :completion_status,
                        has_active_disputes = :has_active_disputes,
                        remarks = :remarks
                    WHERE id = :cid
                """), update_payload)
                print(f"Updated contractor: {c['company_name']}")

        # Link subcontractor 2 & 3 to main contractor 1 if parent_contractor_id is null
        await conn.execute(text("UPDATE con_contractors SET parent_contractor_id = 1 WHERE id IN (2, 3)"))

        # Seed Subcontract Rates
        for r in SEED_RATES:
            chk = await conn.execute(text("SELECT id FROM con_contractor_rates WHERE item_code = :c"), {"c": r["item_code"]})
            if not chk.fetchone():
                await conn.execute(text("""
                    INSERT INTO con_contractor_rates (
                        contractor_id, project_id, item_code, trade_item_name, specification,
                        unit_of_measure, approved_unit_rate, scope_boundary_definition,
                        effective_start_date, effective_end_date, is_active
                    ) VALUES (
                        :contractor_id, :project_id, :item_code, :trade_item_name, :specification,
                        :unit_of_measure, :approved_unit_rate, :scope_boundary_definition,
                        :effective_start_date, :effective_end_date, :is_active
                    )
                """), r)
                print(f"Seeded rate: {r['item_code']}")

        # Seed Subcontract Disputes
        for d in SEED_DISPUTES:
            chk = await conn.execute(text("SELECT id FROM con_contractor_disputes WHERE dispute_code = :c"), {"c": d["dispute_code"]})
            if not chk.fetchone():
                await conn.execute(text("""
                    INSERT INTO con_contractor_disputes (
                        dispute_code, contractor_id, project_id, dispute_category, dispute_title,
                        description, claimed_amount, approved_deduction_amount, retention_held_amount,
                        status, resolution_notes, raised_by_user_id, raised_date, resolved_date, resolved_by_user_id
                    ) VALUES (
                        :dispute_code, :contractor_id, :project_id, :dispute_category, :dispute_title,
                        :description, :claimed_amount, :approved_deduction_amount, :retention_held_amount,
                        :status, :resolution_notes, :raised_by_user_id, :raised_date, :resolved_date, :resolved_by_user_id
                    )
                """), d)
                print(f"Seeded dispute: {d['dispute_code']}")

    print("=== Contractor & Subcontractor Upgrade Complete ===")

if __name__ == "__main__":
    asyncio.run(run_upgrade())
