import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.modules.auth.models import Organization, Role, User, UserProjectAssignment

async def seed_auth():
    print("Starting Auth & Multi-Tenant Hierarchy Seeding...")
    async with AsyncSessionLocal() as session:
        # 1. Organization Hierarchy
        stmt_org = select(Organization).where(Organization.organization_code == "NAVANA_GROUP")
        res_org = await session.execute(stmt_org)
        parent_org = res_org.scalar_one_or_none()

        if not parent_org:
            parent_org = Organization(
                organization_code="NAVANA_GROUP",
                legal_name_en="Navana & Bay Real Estate Consortium Ltd.",
                legal_name_bn="নাভানা অ্যান্ড বে রিয়েল এস্টেট কনসোর্টিয়াম লি.",
                tin_number="123456789012",
                bin_vat_number="9876543210123",
                rehab_membership_number="REHAB-DHK-2011",
                is_active=True
            )
            session.add(parent_org)
            await session.flush()
            print(f"Created Parent Org: {parent_org.legal_name_en}")

        # Subsidiary Org
        stmt_sub = select(Organization).where(Organization.organization_code == "BAY_DEV")
        res_sub = await session.execute(stmt_sub)
        sub_org = res_sub.scalar_one_or_none()
        if not sub_org:
            sub_org = Organization(
                organization_code="BAY_DEV",
                legal_name_en="Bay Development & Construction Ltd.",
                legal_name_bn="বে ডেভেলপমেন্ট অ্যান্ড কনস্ট্রাকশন লি.",
                tin_number="888777666555",
                bin_vat_number="5554443332211",
                rehab_membership_number="REHAB-CTG-1044",
                parent_organization_id=parent_org.id,
                is_active=True
            )
            session.add(sub_org)
            await session.flush()
            print(f"Created Subsidiary Org: {sub_org.legal_name_en}")

        # 2. Roles
        roles_data = [
            ("GROUP_ADMIN", "Group Super Administrator", "Unrestricted group-wide access"),
            ("PROJECT_DIRECTOR", "Project Director", "Senior strategic director"),
            ("PROJECT_MANAGER", "Project Manager / In-Charge", "Project operations in-charge"),
            ("SALES_MANAGER", "Sales & Marketing Manager", "Customer CRM & unit sales"),
            ("ACCOUNTS_OFFICER", "Accounts & Finance Officer", "Ledgers, invoices & money receipts"),
            ("SITE_ENGINEER", "Civil Site Engineer", "Site QA/QC, progress & materials"),
        ]
        for code, name, desc in roles_data:
            stmt_role = select(Role).where(Role.role_code == code)
            r_res = await session.execute(stmt_role)
            role = r_res.scalar_one_or_none()
            if not role:
                role = Role(role_code=code, role_name=name, description=desc, is_active=True)
                session.add(role)

        await session.flush()
        print("Roles seeded.")

        # 3. Users
        # User 1: Group Admin
        stmt_admin = select(User).where(User.username == "admin")
        res_admin = await session.execute(stmt_admin)
        admin_user = res_admin.scalar_one_or_none()

        if not admin_user:
            admin_user = User(
                organization_id=parent_org.id,
                username="admin",
                email="admin@realestate-erp.bd",
                phone_number="+8801700000001",
                hashed_password=get_password_hash("AdminPassword123!"),
                full_name_en="Principal Administrator",
                full_name_bn="প্রধান প্রশাসক",
                is_group_admin=True,
                is_active=True
            )
            session.add(admin_user)
            await session.flush()
            print(f"Created Group Admin: {admin_user.username}")

        # User 2: Site Engineer (Project 101 only)
        stmt_eng = select(User).where(User.username == "engineer_kamal")
        res_eng = await session.execute(stmt_eng)
        eng_user = res_eng.scalar_one_or_none()

        if not eng_user:
            eng_user = User(
                organization_id=sub_org.id if sub_org else parent_org.id,
                username="engineer_kamal",
                email="kamal@realestate-erp.bd",
                phone_number="+8801700000002",
                hashed_password=get_password_hash("SitePassword123!"),
                full_name_en="Engr. Kamal Hossain",
                full_name_bn="প্রকৌ. কামাল হোসেন",
                is_group_admin=False,
                is_active=True
            )
            session.add(eng_user)
            await session.flush()
            print(f"Created Site Engineer: {eng_user.username}")

        # 4. Project Assignments
        # Admin assigned to Project 101 and 102
        for pid in [101, 102]:
            st = select(UserProjectAssignment).where(
                UserProjectAssignment.user_id == admin_user.id,
                UserProjectAssignment.project_id == pid
            )
            if not (await session.execute(st)).scalar_one_or_none():
                session.add(UserProjectAssignment(
                    user_id=admin_user.id,
                    project_id=pid,
                    role_code="GROUP_ADMIN",
                    can_view_financials=True
                ))

        # Engineer Kamal assigned ONLY to Project 101 (NO Financials)
        st_eng = select(UserProjectAssignment).where(
            UserProjectAssignment.user_id == eng_user.id,
            UserProjectAssignment.project_id == 101
        )
        if not (await session.execute(st_eng)).scalar_one_or_none():
            session.add(UserProjectAssignment(
                user_id=eng_user.id,
                project_id=101,
                role_code="SITE_ENGINEER",
                can_view_financials=False
            ))

        await session.commit()
    print("Auth & RBAC seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_auth())
