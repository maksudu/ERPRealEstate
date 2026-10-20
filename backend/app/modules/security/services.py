from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal
from datetime import datetime, timedelta
from app.modules.security.models import (
    SecurityUserAccount, SecurityRoleMaster, SecurityRolePermissionMatrix,
    SecurityUserProjectScope, SecurityWorkflowRule, SecurityPolicyConfig,
    SecurityApiKeyMaster, SecurityMobileAppPolicy, SecurityAuditLogEntry,
    SecurityActiveSession, SecurityIncidentLog, SecurityAccessReviewCycle
)

DEFAULT_ROLES = [
    ("SUPER_ADMIN", "Super Administrator", "Executive", "System configuration and full administrative control", True),
    ("SYS_ADMIN", "System Administrator", "IT & Infrastructure", "Users, settings and technical administration", True),
    ("SEC_ADMIN", "Security Administrator", "Governance", "Roles, permissions, security policies and access reviews", True),
    ("MD", "Managing Director", "Board of Directors", "Executive dashboards and authorized corporate approvals", True),
    ("DIRECTOR", "Director", "Board of Directors", "Project oversight and delegated corporate approvals", False),
    ("GM", "General Manager", "Operations", "Department and cross-functional operational supervision", False),
    ("PROJECT_DIR", "Project Director", "Projects", "Assigned project performance and high-value approvals", False),
    ("PROJECT_MGR", "Project Manager", "Projects", "Project execution, site schedules and cost monitoring", False),
    ("LAND_MGR", "Land Manager", "Land Acquisition", "Land acquisition, ownership vetting and JV records", False),
    ("LEGAL_OFFICER", "Legal Officer", "Legal & Statutory", "Legal documents, deeds, vetting, agreements and compliance", False),
    ("SALES_MGR", "Sales Manager", "Sales & Marketing", "Sales team, pricing rules and booking discounts", False),
    ("SALES_EXEC", "Sales Executive", "Sales & Marketing", "Assigned leads, quotations and unit bookings", False),
    ("CRM_EXEC", "CRM Executive", "Customer Relations", "Leads, follow-ups and customer communications", False),
    ("FIN_MGR", "Finance Manager", "Finance & Accounts", "Accounting, statutory financial reports and approvals", False),
    ("ACCOUNTANT", "Accountant", "Finance & Accounts", "Vouchers, ledgers, reconciliations and tax Mushak", False),
    ("COLL_MGR", "Collection Manager", "Credit & Collection", "Customer dues, installments and collection monitoring", False),
    ("COLL_OFFICER", "Collection Officer", "Credit & Collection", "Assigned customers, receipts and MR submissions", False),
    ("PROC_MGR", "Procurement Manager", "Supply Chain", "Purchase requisitions, vendor bids and purchase orders", False),
    ("PURCHASE_OFFICER", "Purchase Officer", "Supply Chain", "Procurement transactions and supplier invoices", False),
    ("STORE_MGR", "Store Manager", "Inventory & Warehouse", "Warehouse inventory, stock issues, receipts and transfers", False),
    ("SITE_ENG", "Site Engineer", "Construction Operations", "Construction progress, daily site diary (DPR) and requisitions", False),
    ("QS_SURVEYOR", "Quantity Surveyor", "Cost Estimation", "BOQ, rebar measurements and contractor RA bills", False),
    ("HR_MGR", "HR Manager", "Human Resources", "Employee records, attendance, biometric roster and payroll", False),
    ("AUDITOR", "Auditor", "Internal Audit", "Authorized read-only financial, tax and operational records", True),
    ("CUSTOMER", "Customer", "External Portals", "Own flat booking, installment schedule and service requests", False),
    ("BROKER", "Broker", "External Portals", "Assigned referrals, lead status and commission payouts", False)
]

DEFAULT_WORKFLOW_RULES = [
    ("Land Acquisition", "Land Officer", "Legal / Finance", "Managing Director", Decimal("5000000.00"), True),
    ("Project Budget", "Project Manager", "Finance Manager", "Project Director / MD", Decimal("10000000.00"), True),
    ("Purchase Order", "Purchase Officer", "Procurement Manager", "Managing Director", Decimal("2000000.00"), True),
    ("Sales Discount", "Sales Executive", "Sales Manager", "Managing Director", Decimal("500000.00"), True),
    ("Customer Refund", "Collection Officer", "Accountant / Finance Manager", "Authorized Approver", Decimal("300000.00"), True),
    ("Journal Voucher", "Accountant", "Senior Accountant", "Finance Manager", Decimal("1000000.00"), True),
    ("Payroll & Disbursement", "HR Officer", "HR Manager", "Finance Manager / MD", Decimal("2500000.00"), True),
    ("Asset Disposal", "Asset Officer", "Finance / Asset Manager", "Managing Director", Decimal("500000.00"), True)
]

DEFAULT_USERS = [
    ("USR-001", "superadmin", "admin@blueoceansbd.com", "Maksudul Hasan", "মাকসুদুল হাসান", "+8801711000001", "EMP-ADM-01", "Executive Management", "Managing Director", "Managing Director", "SUPER_ADMIN", "ACTIVE", ["SUPER_ADMIN", "MD"]),
    ("USR-002", "sysadmin", "sysadmin@blueoceansbd.com", "Tariqul Islam", "তারিকুল ইসলাম", "+8801711000002", "EMP-IT-01", "IT & Infrastructure", "System Administrator", "Managing Director", "SYS_ADMIN", "ACTIVE", ["SYS_ADMIN", "SEC_ADMIN"]),
    ("USR-003", "engr_kamal", "kamal@blueoceansbd.com", "Kamal Hossain", "কামাল হোসেন", "+8801711000003", "EMP-ENG-05", "Construction Operations", "Project Manager", "Project Director", "PROJECT_MGR", "ACTIVE", ["PROJECT_MGR", "SITE_ENG"]),
    ("USR-004", "fin_rahim", "rahim@blueoceansbd.com", "Abdur Rahim, FCA", "আব্দুর রহিম", "+8801711000004", "EMP-FIN-01", "Finance & Accounts", "Finance Manager", "Managing Director", "FIN_MGR", "ACTIVE", ["FIN_MGR"]),
    ("USR-005", "sales_farzana", "farzana@blueoceansbd.com", "Farzana Yasmin", "ফারজানা ইয়াসমিন", "+8801711000005", "EMP-SAL-02", "Sales & Marketing", "Sales Manager", "Director Sales", "SALES_MGR", "ACTIVE", ["SALES_MGR"]),
    ("USR-006", "audit_salim", "salim@blueoceansbd.com", "Salim Chowdhury", "সালিম চৌধুরী", "+8801711000006", "EMP-AUD-01", "Internal Audit", "Audit Lead", "Audit Committee", "AUDITOR", "ACTIVE", ["AUDITOR"])
]


async def seed_security_module(db: AsyncSession):
    """Initializes standard security seed records if table is empty"""
    # 1. Seed Roles
    r_res = await db.execute(select(func.count(SecurityRoleMaster.id)))
    if (r_res.scalar() or 0) == 0:
        for code, name, dept, desc, is_sys in DEFAULT_ROLES:
            role = SecurityRoleMaster(
                role_code=code,
                role_name=name,
                department=dept,
                description=desc,
                is_system_role=is_sys,
                assigned_users_count=3 if code in ["SUPER_ADMIN", "PROJECT_MGR"] else 1
            )
            db.add(role)
        await db.commit()

    # 2. Seed Users
    u_res = await db.execute(select(func.count(SecurityUserAccount.id)))
    if (u_res.scalar() or 0) == 0:
        for code, uname, email, fen, fbn, phone, empid, dept, desig, rep, role, status, roles in DEFAULT_USERS:
            user = SecurityUserAccount(
                user_code=code,
                username=uname,
                email=email,
                full_name_en=fen,
                full_name_bn=fbn,
                phone_number=phone,
                employee_id=empid,
                department_name=dept,
                designation=desig,
                reporting_manager=rep,
                primary_role=role,
                account_status=status,
                assigned_roles=roles,
                is_mfa_enabled=True if role in ["SUPER_ADMIN", "FIN_MGR"] else False,
                last_login_at=datetime.utcnow() - timedelta(hours=2),
                last_login_ip="103.145.112.5"
            )
            db.add(user)
        await db.commit()

    # 3. Seed Workflow Rules
    w_res = await db.execute(select(func.count(SecurityWorkflowRule.id)))
    if (w_res.scalar() or 0) == 0:
        for mod, maker, checker, approver, limit, self_prev in DEFAULT_WORKFLOW_RULES:
            rule = SecurityWorkflowRule(
                module_name=mod,
                maker_role=maker,
                checker_role=checker,
                approver_role=approver,
                threshold_limit_bdt=limit,
                prevent_self_approval=self_prev,
                is_active=True
            )
            db.add(rule)
        await db.commit()

    # 4. Seed Global Policy
    p_res = await db.execute(select(func.count(SecurityPolicyConfig.id)))
    if (p_res.scalar() or 0) == 0:
        policy = SecurityPolicyConfig(
            policy_name="Standard Real Estate ERP Security Policy (Bangladesh NCSA)",
            min_password_length=8,
            require_special_char=True,
            require_numbers=True,
            require_uppercase=True,
            max_failed_attempts=5,
            lockout_duration_minutes=30,
            session_idle_timeout_minutes=60,
            enforce_mfa_roles=["SUPER_ADMIN", "FIN_MGR", "MD"],
            ip_allowlist_enabled=False,
            allowed_ip_ranges="103.145.0.0/16, 192.168.1.0/24"
        )
        db.add(policy)
        await db.commit()

    # 5. Seed Mobile Policies
    m_res = await db.execute(select(func.count(SecurityMobileAppPolicy.id)))
    if (m_res.scalar() or 0) == 0:
        mobile_apps = [
            ("Sales & Lead Management App", "2.4.0", True, True, True),
            ("Site Engineer & DPR App", "3.1.2", True, False, False),
            ("Collection & Payment App", "2.0.1", False, True, True),
            ("Management Executive Cockpit", "1.9.5", False, True, True)
        ]
        for app, ver, cache, bio, restr in mobile_apps:
            mob = SecurityMobileAppPolicy(
                app_name=app,
                min_supported_version=ver,
                allow_offline_cache=cache,
                require_biometrics=bio,
                restrict_document_download=restr
            )
            db.add(mob)
        await db.commit()

    # 6. Seed API Keys
    k_res = await db.execute(select(func.count(SecurityApiKeyMaster.id)))
    if (k_res.scalar() or 0) == 0:
        keys = [
            ("Payment Gateway bKash/Nagad", "CLI-PAY-BKASH-881", "pk_live_bkash_***9941", ["write:payments", "read:collections"], 300),
            ("SMS Gateway Infobip", "CLI-SMS-INFO-102", "sk_live_sms_***4412", ["send:sms", "read:delivery"], 600),
            ("Biometric ZKTeco Sync", "CLI-BIO-ZK-559", "sk_bio_zk_***1120", ["push:attendance_logs"], 120)
        ]
        for app, cid, key, scopes, rlimit in keys:
            k = SecurityApiKeyMaster(
                app_name=app,
                client_id=cid,
                api_key_masked=key,
                allowed_scopes=scopes,
                rate_limit_per_minute=rlimit
            )
            db.add(k)
        await db.commit()

    # 7. Seed Active Sessions
    s_res = await db.execute(select(func.count(SecurityActiveSession.id)))
    if (s_res.scalar() or 0) == 0:
        sessions = [
            ("SES-99412-A", "superadmin", "Dell XPS 15 (Windows 11)", "Chrome 128.0", "103.145.112.5", "Dhaka Head Office"),
            ("SES-99412-B", "engr_kamal", "Samsung Galaxy S24 Ultra", "Mobile App v3.1", "119.30.38.12", "Purbachal Project Site"),
            ("SES-99412-C", "fin_rahim", "MacBook Pro M3", "Safari 17.5", "103.145.112.9", "Dhaka Head Office"),
            ("SES-99412-D", "sales_farzana", "HP EliteBook 840", "Edge 127.0", "103.145.112.18", "Gulshan Sales Suite")
        ]
        for sid, uname, dev, browser, ip, loc in sessions:
            ses = SecurityActiveSession(
                session_id=sid,
                username=uname,
                device_name=dev,
                browser=browser,
                ip_address=ip,
                location=loc,
                status="ACTIVE",
                login_at=datetime.utcnow() - timedelta(minutes=45)
            )
            db.add(ses)
        await db.commit()

    # 8. Seed Audit Logs
    a_res = await db.execute(select(func.count(SecurityAuditLogEntry.id)))
    if (a_res.scalar() or 0) == 0:
        logs = [
            ("AUD-2025-001", "superadmin", "LOGIN", "Security Management", "SES-99412-A", "103.145.112.5", "Web Portal", "SUCCESS", "MFA verified with Authenticator App"),
            ("AUD-2025-002", "superadmin", "UPDATE", "Role Management", "ROLE-FIN_MGR", "103.145.112.5", "Web Portal", "SUCCESS", "Modified approval limit threshold to ৳10,00,000"),
            ("AUD-2025-003", "engr_kamal", "APPROVE", "Construction Operations", "DPR-2025-881", "119.30.38.12", "Site App", "SUCCESS", "Signed concrete casting inspection log"),
            ("AUD-2025-004", "sales_farzana", "EXPORT", "Sales & Booking", "RPT-LEAD-Q3", "103.145.112.18", "Web Portal", "SUCCESS", "Authorized export of Gulshan leads report (NID Masked)"),
            ("AUD-2025-005", "anonymous", "LOGIN_FAILED", "Authentication", "USER-UNKNOWN", "185.220.101.5", "Unknown Linux", "FAILED", "Repeated bad password attempts - IP flagged")
        ]
        for ref, uname, ev, mod, rref, ip, dev, res, notes in logs:
            l = SecurityAuditLogEntry(
                audit_ref=ref,
                user_name=uname,
                event_type=ev,
                module_name=mod,
                record_ref=rref,
                ip_address=ip,
                device_session=dev,
                result_status=res,
                reason_notes=notes
            )
            db.add(l)
        await db.commit()

    # 9. Seed Security Incident
    i_res = await db.execute(select(func.count(SecurityIncidentLog.id)))
    if (i_res.scalar() or 0) == 0:
        incidents = [
            ("SEC-INC-01", "HIGH", "FAILED_LOGIN_SPIKE", "185.220.101.5", "admin", "5 consecutive failed login attempts detected from foreign IP address", "UNDER_INVESTIGATION"),
            ("SEC-INC-02", "LOW", "SESSION_CONCURRENT", "103.145.112.5", "engr_kamal", "User logged in simultaneously from mobile app and desktop browser", "RESOLVED")
        ]
        for code, sev, itype, ip, user, desc, stat in incidents:
            inc = SecurityIncidentLog(
                incident_code=code,
                severity=sev,
                incident_type=itype,
                source_ip=ip,
                affected_user=user,
                description=desc,
                status=stat
            )
            db.add(inc)
        await db.commit()

    # 10. Seed Access Reviews
    ar_res = await db.execute(select(func.count(SecurityAccessReviewCycle.id)))
    if (ar_res.scalar() or 0) == 0:
        reviews = [
            ("REV-2025-Q1", "Q1 Privileged Account Certification", "Finance & IT", "Maksudul Hasan (Audit Lead)", 15, 14, 1, "COMPLETED"),
            ("REV-2025-Q2", "Mid-Year Departmental Access Review", "Sales & Procurement", "Tariqul Islam (Security Lead)", 28, 28, 0, "COMPLETED")
        ]
        for rcode, cname, dept, rname, tot, cert, revk, stat in reviews:
            arc = SecurityAccessReviewCycle(
                review_code=rcode,
                cycle_name=cname,
                department=dept,
                reviewer_name=rname,
                total_users_reviewed=tot,
                certified_count=cert,
                revoked_count=revk,
                status=stat
            )
            db.add(arc)
        await db.commit()
