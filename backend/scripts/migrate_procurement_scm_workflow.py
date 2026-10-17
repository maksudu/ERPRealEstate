import asyncio
import sys
import os
from datetime import date, datetime

sys.path.insert(0, os.path.abspath("."))
from app.core.database import engine
from sqlalchemy import text

async def run_migration():
    async with engine.begin() as conn:
        print("Starting SCM Procurement Workflow Migration...")

        # 1. Alter scm_site_stores
        print("1. Checking scm_site_stores columns...")
        res = await conn.execute(text("SHOW COLUMNS FROM scm_site_stores LIKE 'is_central_warehouse'"))
        if not res.fetchone():
            await conn.execute(text("ALTER TABLE scm_site_stores ADD COLUMN is_central_warehouse BOOLEAN NOT NULL DEFAULT FALSE AFTER store_in_charge_user_id"))
            print("   -> Added is_central_warehouse to scm_site_stores")

        # 2. Alter scm_store_stock
        print("2. Checking scm_store_stock columns...")
        res = await conn.execute(text("SHOW COLUMNS FROM scm_store_stock LIKE 'weighted_avg_rate'"))
        if not res.fetchone():
            await conn.execute(text("ALTER TABLE scm_store_stock ADD COLUMN weighted_avg_rate DECIMAL(14,2) NOT NULL DEFAULT 0.00 AFTER current_stock_quantity"))
            await conn.execute(text("ALTER TABLE scm_store_stock ADD COLUMN total_stock_value DECIMAL(16,2) NOT NULL DEFAULT 0.00 AFTER weighted_avg_rate"))
            print("   -> Added weighted_avg_rate & total_stock_value to scm_store_stock")

        # 3. Alter scm_purchase_requisitions
        print("3. Checking scm_purchase_requisitions columns...")
        res = await conn.execute(text("SHOW COLUMNS FROM scm_purchase_requisitions LIKE 'boq_item_id'"))
        if not res.fetchone():
            await conn.execute(text("ALTER TABLE scm_purchase_requisitions ADD COLUMN boq_item_id BIGINT NULL AFTER requested_quantity"))
            await conn.execute(text("ALTER TABLE scm_purchase_requisitions ADD COLUMN wbs_node_id BIGINT NULL AFTER boq_item_id"))
            await conn.execute(text("ALTER TABLE scm_purchase_requisitions ADD COLUMN tower_name VARCHAR(64) NULL AFTER wbs_node_id"))
            await conn.execute(text("ALTER TABLE scm_purchase_requisitions ADD COLUMN floor_number VARCHAR(32) NULL AFTER tower_name"))
            await conn.execute(text("ALTER TABLE scm_purchase_requisitions ADD INDEX idx_pr_boq_item (boq_item_id)"))
            await conn.execute(text("ALTER TABLE scm_purchase_requisitions ADD INDEX idx_pr_wbs_node (wbs_node_id)"))
            print("   -> Added boq_item_id, wbs_node_id, tower_name, floor_number to scm_purchase_requisitions")

        # 4. Alter scm_cs_quotations
        print("4. Checking scm_cs_quotations columns...")
        res = await conn.execute(text("SHOW COLUMNS FROM scm_cs_quotations LIKE 'brand_grade'"))
        if not res.fetchone():
            await conn.execute(text("ALTER TABLE scm_cs_quotations ADD COLUMN brand_grade VARCHAR(128) NULL AFTER vendor_id"))
            await conn.execute(text("ALTER TABLE scm_cs_quotations ADD COLUMN payment_terms VARCHAR(128) NULL AFTER brand_grade"))
            await conn.execute(text("ALTER TABLE scm_cs_quotations ADD COLUMN technical_compliance VARCHAR(64) NOT NULL DEFAULT 'COMPLIANT' AFTER payment_terms"))
            print("   -> Added brand_grade, payment_terms, technical_compliance to scm_cs_quotations")

        # 5. Alter scm_purchase_orders
        print("5. Checking scm_purchase_orders columns...")
        res = await conn.execute(text("SHOW COLUMNS FROM scm_purchase_orders LIKE 'approval_status'"))
        if not res.fetchone():
            await conn.execute(text("ALTER TABLE scm_purchase_orders ADD COLUMN approval_status VARCHAR(32) NOT NULL DEFAULT 'APPROVED' AFTER destination_store_id"))
            await conn.execute(text("ALTER TABLE scm_purchase_orders ADD COLUMN approved_by_user_id BIGINT NULL AFTER approval_status"))
            await conn.execute(text("ALTER TABLE scm_purchase_orders ADD COLUMN approval_date DATE NULL AFTER approved_by_user_id"))
            await conn.execute(text("ALTER TABLE scm_purchase_orders ADD COLUMN delivery_schedule_notes VARCHAR(255) NULL AFTER approval_date"))
            print("   -> Added approval_status & delivery_schedule_notes to scm_purchase_orders")

        # 6. Alter scm_goods_receipts
        print("6. Checking scm_goods_receipts columns...")
        res = await conn.execute(text("SHOW COLUMNS FROM scm_goods_receipts LIKE 'gate_entry_number'"))
        if not res.fetchone():
            await conn.execute(text("ALTER TABLE scm_goods_receipts ADD COLUMN gate_entry_number VARCHAR(64) NULL AFTER received_by_user_id"))
            await conn.execute(text("ALTER TABLE scm_goods_receipts ADD COLUMN vehicle_number VARCHAR(64) NULL AFTER gate_entry_number"))
            await conn.execute(text("ALTER TABLE scm_goods_receipts ADD COLUMN driver_name VARCHAR(128) NULL AFTER vehicle_number"))
            await conn.execute(text("ALTER TABLE scm_goods_receipts ADD COLUMN driver_phone VARCHAR(32) NULL AFTER driver_name"))
            await conn.execute(text("ALTER TABLE scm_goods_receipts ADD COLUMN gate_in_timestamp TIMESTAMP NULL AFTER driver_phone"))
            await conn.execute(text("ALTER TABLE scm_goods_receipts ADD COLUMN physical_count_verified BOOLEAN NOT NULL DEFAULT TRUE AFTER gate_in_timestamp"))
            await conn.execute(text("ALTER TABLE scm_goods_receipts ADD COLUMN qc_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' AFTER accepted_quantity"))
            print("   -> Added gate entry & qc_status fields to scm_goods_receipts")

        # 7. Create scm_rfqs
        print("7. Creating scm_rfqs...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS scm_rfqs (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                pr_id BIGINT NOT NULL,
                rfq_number VARCHAR(64) NOT NULL UNIQUE,
                rfq_date DATE NOT NULL,
                submission_deadline DATE NOT NULL,
                notes TEXT NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'ISSUED',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_rfq_pr (pr_id),
                INDEX idx_rfq_status (status),
                CONSTRAINT fk_rfq_pr FOREIGN KEY (pr_id) REFERENCES scm_purchase_requisitions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # 8. Create scm_rfq_vendors
        print("8. Creating scm_rfq_vendors...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS scm_rfq_vendors (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                rfq_id BIGINT NOT NULL,
                vendor_id BIGINT NOT NULL,
                invitation_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(32) NOT NULL DEFAULT 'INVITED',
                INDEX idx_rfq_v_rfq (rfq_id),
                INDEX idx_rfq_v_vendor (vendor_id),
                CONSTRAINT fk_rfq_v_rfq FOREIGN KEY (rfq_id) REFERENCES scm_rfqs(id) ON DELETE CASCADE,
                CONSTRAINT fk_rfq_v_vendor FOREIGN KEY (vendor_id) REFERENCES scm_vendors(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # 9. Create scm_quality_inspections
        print("9. Creating scm_quality_inspections...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS scm_quality_inspections (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                grn_id BIGINT NOT NULL UNIQUE,
                inspection_number VARCHAR(64) NOT NULL UNIQUE,
                inspection_date DATE NOT NULL,
                inspector_user_id BIGINT NOT NULL,
                slump_test_mm DECIMAL(8,2) NULL,
                tensile_strength_mpa DECIMAL(8,2) NULL,
                mtr_mill_test_report_number VARCHAR(128) NULL,
                mtr_verified BOOLEAN NOT NULL DEFAULT TRUE,
                test_result VARCHAR(32) NOT NULL DEFAULT 'PASSED',
                qc_remarks TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_qc_grn (grn_id),
                INDEX idx_qc_result (test_result),
                CONSTRAINT fk_qc_grn FOREIGN KEY (grn_id) REFERENCES scm_goods_receipts(id) ON DELETE CASCADE,
                CONSTRAINT fk_qc_inspector FOREIGN KEY (inspector_user_id) REFERENCES sys_users(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # 10. Create scm_material_issues (MIN)
        print("10. Creating scm_material_issues...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS scm_material_issues (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                min_number VARCHAR(64) NOT NULL UNIQUE,
                issue_date DATE NOT NULL,
                store_id BIGINT NOT NULL,
                project_id BIGINT NOT NULL,
                tower_name VARCHAR(64) NULL,
                floor_number VARCHAR(32) NULL,
                wbs_node_id BIGINT NULL,
                material_id BIGINT NOT NULL,
                issued_quantity DECIMAL(14,4) NOT NULL,
                unit_of_measure VARCHAR(32) NOT NULL,
                issued_to_contractor_id BIGINT NULL,
                contractor_name VARCHAR(191) NULL,
                issued_by_user_id BIGINT NOT NULL,
                purpose TEXT NULL,
                unit_cost_at_issue DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                total_issue_cost DECIMAL(16,2) NOT NULL DEFAULT 0.00,
                status VARCHAR(32) NOT NULL DEFAULT 'ISSUED',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_min_store (store_id),
                INDEX idx_min_project (project_id),
                INDEX idx_min_wbs (wbs_node_id),
                INDEX idx_min_material (material_id),
                CONSTRAINT fk_min_store FOREIGN KEY (store_id) REFERENCES scm_site_stores(id) ON DELETE RESTRICT,
                CONSTRAINT fk_min_project FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE RESTRICT,
                CONSTRAINT fk_min_material FOREIGN KEY (material_id) REFERENCES scm_materials(id) ON DELETE RESTRICT,
                CONSTRAINT fk_min_user FOREIGN KEY (issued_by_user_id) REFERENCES sys_users(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # 11. Create scm_stock_transfers
        print("11. Creating scm_stock_transfers...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS scm_stock_transfers (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                transfer_number VARCHAR(64) NOT NULL UNIQUE,
                from_store_id BIGINT NOT NULL,
                to_store_id BIGINT NOT NULL,
                material_id BIGINT NOT NULL,
                transfer_quantity DECIMAL(14,4) NOT NULL,
                dispatch_date DATE NOT NULL,
                dispatched_by_user_id BIGINT NOT NULL,
                receipt_date DATE NULL,
                received_by_user_id BIGINT NULL,
                dispatch_challan_number VARCHAR(64) NOT NULL,
                unit_rate DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                total_transfer_value DECIMAL(16,2) NOT NULL DEFAULT 0.00,
                status VARCHAR(32) NOT NULL DEFAULT 'DISPATCHED',
                remarks TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_trf_from (from_store_id),
                INDEX idx_trf_to (to_store_id),
                INDEX idx_trf_material (material_id),
                CONSTRAINT fk_trf_from FOREIGN KEY (from_store_id) REFERENCES scm_site_stores(id) ON DELETE RESTRICT,
                CONSTRAINT fk_trf_to FOREIGN KEY (to_store_id) REFERENCES scm_site_stores(id) ON DELETE RESTRICT,
                CONSTRAINT fk_trf_material FOREIGN KEY (material_id) REFERENCES scm_materials(id) ON DELETE RESTRICT,
                CONSTRAINT fk_trf_disp_user FOREIGN KEY (dispatched_by_user_id) REFERENCES sys_users(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # 12. Create scm_stock_ledger
        print("12. Creating scm_stock_ledger...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS scm_stock_ledger (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                store_id BIGINT NOT NULL,
                material_id BIGINT NOT NULL,
                transaction_type VARCHAR(32) NOT NULL,
                reference_number VARCHAR(64) NOT NULL,
                transaction_date DATE NOT NULL,
                quantity_in DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
                quantity_out DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
                unit_rate DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                total_value DECIMAL(16,2) NOT NULL DEFAULT 0.00,
                running_balance_qty DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
                running_weighted_avg_rate DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ledg_store (store_id),
                INDEX idx_ledg_mat (material_id),
                INDEX idx_ledg_ref (reference_number),
                CONSTRAINT fk_ledg_store FOREIGN KEY (store_id) REFERENCES scm_site_stores(id) ON DELETE CASCADE,
                CONSTRAINT fk_ledg_material FOREIGN KEY (material_id) REFERENCES scm_materials(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        print("Tables and schema alterations completed successfully!")

        # 13. Seed & Align Data
        print("13. Seeding / Updating Demo Data...")
        
        # Check Central Warehouse
        c_store = (await conn.execute(text("SELECT id FROM scm_site_stores WHERE is_central_warehouse = TRUE LIMIT 1"))).fetchone()
        if not c_store:
            # Check any project to bind
            proj = (await conn.execute(text("SELECT id FROM prj_projects ORDER BY id ASC LIMIT 1"))).fetchone()
            proj_id = proj[0] if proj else 1
            user = (await conn.execute(text("SELECT id FROM sys_users ORDER BY id ASC LIMIT 1"))).fetchone()
            user_id = user[0] if user else 1

            await conn.execute(text(f"""
                INSERT INTO scm_site_stores (project_id, store_name, location_details, store_in_charge_user_id, is_central_warehouse, is_active)
                VALUES ({proj_id}, 'Central Warehouse - Tejgaon Industrial Area', 'Plot 42, Tejgaon I/A, Dhaka', {user_id}, TRUE, TRUE)
            """))
            print("   -> Created Central Warehouse in Tejgaon")

        # Update StoreStock valuation
        await conn.execute(text("""
            UPDATE scm_store_stock stk
            JOIN scm_materials m ON stk.material_id = m.id
            SET stk.weighted_avg_rate = CASE 
                WHEN m.category = 'REBAR' THEN 94500.00
                WHEN m.category = 'CEMENT' THEN 540.00
                WHEN m.category = 'SAND' THEN 48.00
                WHEN m.category = 'STONE_CHIPS' THEN 185.00
                WHEN m.category = 'BRICKS' THEN 14.50
                ELSE 100.00
            END,
            stk.total_stock_value = stk.current_stock_quantity * (CASE 
                WHEN m.category = 'REBAR' THEN 94500.00
                WHEN m.category = 'CEMENT' THEN 540.00
                WHEN m.category = 'SAND' THEN 48.00
                WHEN m.category = 'STONE_CHIPS' THEN 185.00
                WHEN m.category = 'BRICKS' THEN 14.50
                ELSE 100.00
            END)
            WHERE stk.weighted_avg_rate = 0.00 OR stk.weighted_avg_rate IS NULL;
        """))
        print("   -> Updated StoreStock weighted average rates & valuation")

        # Seed Quality Inspection for existing GRNs if any missing
        grns = (await conn.execute(text("SELECT id, grn_number FROM scm_goods_receipts WHERE id NOT IN (SELECT grn_id FROM scm_quality_inspections)"))).fetchall()
        user = (await conn.execute(text("SELECT id FROM sys_users ORDER BY id ASC LIMIT 1"))).fetchone()
        user_id = user[0] if user else 1

        for grn in grns:
            grn_id = grn[0]
            await conn.execute(text(f"""
                INSERT INTO scm_quality_inspections 
                (grn_id, inspection_number, inspection_date, inspector_user_id, slump_test_mm, tensile_strength_mpa, mtr_mill_test_report_number, mtr_verified, test_result, qc_remarks)
                VALUES ({grn_id}, 'QC-{grn[1]}', CURRENT_DATE(), {user_id}, 100.00, 520.00, 'MTR-BSRM-88491', TRUE, 'PASSED', 'Tested as per ASTM A615 / BDS ISO 6935-2. Slump and tensile yield passed specification.')
            """))
            await conn.execute(text(f"UPDATE scm_goods_receipts SET qc_status = 'PASSED', physical_count_verified = TRUE, gate_entry_number = 'GATE-2026-0081', vehicle_number = 'Dhaka Metro TA 11-4567' WHERE id = {grn_id}"))
        print(f"   -> Seeded QC inspections for {len(grns)} GRNs")

        print("SCM Procurement Migration Complete!")

if __name__ == "__main__":
    asyncio.run(run_migration())
