import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine, Base
import app.modules.auth.models  # Ensure models are registered

PROCUREMENT_PERMISSIONS = [
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_DASHBOARD_VIEW",
        "permission_name": "View Procurement & Inventory Dashboard",
        "description": "View KPI counters, PO spending analytics, pending approvals, and low stock alerts"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_VENDOR_MANAGE",
        "permission_name": "Supplier & Vendor Management",
        "description": "Register, evaluate, approve, suspend suppliers, and monitor trade license expiry"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_MATERIAL_MANAGE",
        "permission_name": "Material & Item Master Management",
        "description": "Create and manage material codes, specifications, categories, and unit conversions"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_PR_CREATE",
        "permission_name": "Create Purchase Requisitions",
        "description": "Initiate material requisitions against project WBS and BOQ budget allocations"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_PR_APPROVE",
        "permission_name": "Approve Purchase Requisitions",
        "description": "Department and budget authority review and sign-off on material requisitions"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_RFQ_MANAGE",
        "permission_name": "RFQ & Comparative Statement",
        "description": "Issue RFQs to enlisted vendors, input quotations, and evaluate commercial CS"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_PO_CREATE",
        "permission_name": "Create Purchase Orders",
        "description": "Draft purchase orders against approved requisitions and awarded quotations"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_PO_APPROVE",
        "permission_name": "Multi-Tier PO Approval",
        "description": "Authorize purchase orders based on financial delegated authority limits"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_GRN_RECEIVE",
        "permission_name": "Goods Receipt Note (GRN) & Gate Entry",
        "description": "Record physical challan arrival, vehicle gate entry, count verification and unloading"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_QC_INSPECT",
        "permission_name": "Quality Inspection & Testing",
        "description": "Perform material quality control tests (tensile, slump, moisture), accept or reject batches"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_STOCK_MANAGE",
        "permission_name": "Warehouse & Site Stock Management",
        "description": "Manage central and site stores, bin/rack locations, batches, and reorder levels"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_MIN_ISSUE",
        "permission_name": "Material Issue Note & Consumption",
        "description": "Issue materials to site engineers/contractors, record returns, wastage and BOQ consumption"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_TRANSFER_MANAGE",
        "permission_name": "Stock Transfers & Adjustments",
        "description": "Execute warehouse-to-site transfers, in-transit tracking, and cycle-count stock adjustments"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_PLANNING_MANAGE",
        "permission_name": "Material Planning & Reorder Replenishment",
        "description": "Monitor safety stocks, lead-time planning, and automated purchase replenishment indents"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_VALUATION_VIEW",
        "permission_name": "Perpetual Valuation & Inventory Ledger",
        "description": "View AVCO/FIFO/Standard costing valuations, store ledgers, and GL reconciliation"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_BILL_MATCH",
        "permission_name": "Supplier 3-Way Match & Reconcile",
        "description": "Perform three-way matching (PO vs GRN vs Supplier Invoice) and manage variances"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_BILL_PAY",
        "permission_name": "Accounts Payable Disbursement & Vouchers",
        "description": "Disburse payments, issue bank payment vouchers, and manage supplier debit notes"
    },
    {
        "module_code": "PROCUREMENT",
        "permission_code": "PROC_AUDIT_VIEW",
        "permission_name": "Procurement Audit Trail & Reports",
        "description": "Access full immutable audit trail, historical price trends, and vendor scorecards"
    }
]

NEW_ROLES = [
    {
        "role_code": "CHIEF_PROCUREMENT_OFFICER",
        "role_name": "Chief Procurement Officer / HOD",
        "description": "Executive head of supply chain, procurement tenders, and commercial contracting"
    },
    {
        "role_code": "PROCUREMENT_OFFICER",
        "role_name": "Procurement & Purchase Officer",
        "description": "Requisition review, vendor quotation CS, and purchase order drafting"
    },
    {
        "role_code": "STOREKEEPER",
        "role_name": "Storekeeper & Warehouse Officer",
        "description": "Physical receipt, warehouse binning, MIN issue, and stock transfer management"
    },
    {
        "role_code": "QA_QC_ENGINEER",
        "role_name": "QA/QC Materials Inspection Engineer",
        "description": "Quality inspection certificates, lab tests, batch approvals and rejections"
    },
    {
        "role_code": "INVENTORY_AUDITOR",
        "role_name": "Inventory & Costing Auditor",
        "description": "Cycle counting, stock adjustment audit, and valuation ledger reconciliation"
    }
]

async def seed_permissions():
    print("Connecting to database engine...")
    async with engine.begin() as conn:
        # 1. Create tables if not existing
        print("Verifying sys_permissions and sys_role_permissions tables...")
        await conn.run_sync(Base.metadata.create_all)

        # 2. Seed sys_roles
        for role in NEW_ROLES:
            existing = await conn.execute(
                text("SELECT id FROM sys_roles WHERE role_code = :code"),
                {"code": role["role_code"]}
            )
            if not existing.fetchone():
                await conn.execute(
                    text("""
                        INSERT INTO sys_roles (role_code, role_name, description, is_active, created_at)
                        VALUES (:role_code, :role_name, :description, 1, NOW())
                    """),
                    role
                )
                print(f"  + Added role: {role['role_code']} ({role['role_name']})")
            else:
                print(f"  ✓ Role exists: {role['role_code']}")

        # 3. Seed sys_permissions
        perm_id_map = {}
        for perm in PROCUREMENT_PERMISSIONS:
            existing = await conn.execute(
                text("SELECT id FROM sys_permissions WHERE permission_code = :code"),
                {"code": perm["permission_code"]}
            )
            row = existing.fetchone()
            if not row:
                res = await conn.execute(
                    text("""
                        INSERT INTO sys_permissions (module_code, permission_code, permission_name, description, is_active, created_at)
                        VALUES (:module_code, :permission_code, :permission_name, :description, 1, NOW())
                    """),
                    perm
                )
                perm_id = res.lastrowid
                print(f"  + Added permission: {perm['permission_code']}")
            else:
                perm_id = row[0]
                print(f"  [OK] Permission exists: {perm['permission_code']}")
            perm_id_map[perm["permission_code"]] = perm_id

        # 4. Fetch all relevant roles
        roles_res = await conn.execute(
            text("SELECT id, role_code FROM sys_roles WHERE role_code IN ('GROUP_ADMIN', 'CHIEF_PROCUREMENT_OFFICER', 'PROCUREMENT_OFFICER', 'STOREKEEPER', 'QA_QC_ENGINEER', 'INVENTORY_AUDITOR', 'SITE_ENGINEER', 'ACCOUNTS_OFFICER')")
        )
        role_map = {r[1]: r[0] for r in roles_res.fetchall()}

        # 5. Grant Full Permissions to GROUP_ADMIN and CHIEF_PROCUREMENT_OFFICER
        admin_roles = ["GROUP_ADMIN", "CHIEF_PROCUREMENT_OFFICER"]
        for rcode in admin_roles:
            rid = role_map.get(rcode)
            if not rid:
                continue
            for pcode, pid in perm_id_map.items():
                rp_exist = await conn.execute(
                    text("SELECT id FROM sys_role_permissions WHERE role_id = :rid AND permission_id = :pid"),
                    {"rid": rid, "pid": pid}
                )
                if not rp_exist.fetchone():
                    await conn.execute(
                        text("""
                            INSERT INTO sys_role_permissions (role_id, permission_id, can_create, can_read, can_update, can_delete, can_approve, created_at)
                            VALUES (:rid, :pid, 1, 1, 1, 1, 1, NOW())
                        """),
                        {"rid": rid, "pid": pid}
                    )
            print(f"  * Granted FULL UNRESTRICTED PERMISSIONS (18/18) to {rcode}")

        # 6. Grant Role-Specific operational permissions
        operational_grants = {
            "PROCUREMENT_OFFICER": [
                "PROC_DASHBOARD_VIEW", "PROC_VENDOR_MANAGE", "PROC_MATERIAL_MANAGE",
                "PROC_PR_CREATE", "PROC_PR_APPROVE", "PROC_RFQ_MANAGE",
                "PROC_PO_CREATE", "PROC_PLANNING_MANAGE", "PROC_BILL_MATCH", "PROC_AUDIT_VIEW"
            ],
            "STOREKEEPER": [
                "PROC_DASHBOARD_VIEW", "PROC_MATERIAL_MANAGE", "PROC_GRN_RECEIVE",
                "PROC_STOCK_MANAGE", "PROC_MIN_ISSUE", "PROC_TRANSFER_MANAGE", "PROC_AUDIT_VIEW"
            ],
            "QA_QC_ENGINEER": [
                "PROC_DASHBOARD_VIEW", "PROC_QC_INSPECT", "PROC_GRN_RECEIVE", "PROC_AUDIT_VIEW"
            ],
            "ACCOUNTS_OFFICER": [
                "PROC_DASHBOARD_VIEW", "PROC_VALUATION_VIEW", "PROC_BILL_MATCH", "PROC_BILL_PAY", "PROC_AUDIT_VIEW"
            ],
            "SITE_ENGINEER": [
                "PROC_DASHBOARD_VIEW", "PROC_PR_CREATE", "PROC_MIN_ISSUE", "PROC_GRN_RECEIVE"
            ],
            "INVENTORY_AUDITOR": [
                "PROC_DASHBOARD_VIEW", "PROC_STOCK_MANAGE", "PROC_TRANSFER_MANAGE", "PROC_VALUATION_VIEW", "PROC_AUDIT_VIEW"
            ]
        }

        for rcode, p_list in operational_grants.items():
            rid = role_map.get(rcode)
            if not rid:
                continue
            for pcode in p_list:
                pid = perm_id_map.get(pcode)
                if not pid:
                    continue
                rp_exist = await conn.execute(
                    text("SELECT id FROM sys_role_permissions WHERE role_id = :rid AND permission_id = :pid"),
                    {"rid": rid, "pid": pid}
                )
                if not rp_exist.fetchone():
                    await conn.execute(
                        text("""
                            INSERT INTO sys_role_permissions (role_id, permission_id, can_create, can_read, can_update, can_delete, can_approve, created_at)
                            VALUES (:rid, :pid, 1, 1, 1, 0, 1, NOW())
                        """),
                        {"rid": rid, "pid": pid}
                    )
            print(f"  [OK] Granted {len(p_list)} role permissions to {rcode}")

        # 7. Grant Project assignments in sys_user_project_assignments
        users = await conn.execute(text("SELECT id, username FROM sys_users"))
        user_list = users.fetchall()
        for u in user_list:
            uid = u[0]
            uname = u[1]
            role_to_assign = "GROUP_ADMIN" if uname == "admin" else ("SITE_ENGINEER" if "engineer" in uname else "PROCUREMENT_OFFICER")
            for pid in [101, 102]:
                exist = await conn.execute(
                    text("SELECT id FROM sys_user_project_assignments WHERE user_id = :uid AND project_id = :pid"),
                    {"uid": uid, "pid": pid}
                )
                if not exist.fetchone():
                    await conn.execute(
                        text("""
                            INSERT INTO sys_user_project_assignments (user_id, project_id, role_code, can_view_financials, created_at)
                            VALUES (:uid, :pid, :role_code, 1, NOW())
                        """),
                        {"uid": uid, "pid": pid, "role_code": role_to_assign}
                    )
        print("  [OK] User project assignments updated for all projects with full financial visibility.")

    print("\n[SUCCESS] Module 9 Procurement & Inventory full permissions successfully seeded in MySQL database.")

if __name__ == "__main__":
    asyncio.run(seed_permissions())
