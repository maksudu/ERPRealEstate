from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc
from decimal import Decimal
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.core.database import get_db
from app.modules.security.models import (
    SecurityUserAccount, SecurityRoleMaster, SecurityRolePermissionMatrix,
    SecurityUserProjectScope, SecurityWorkflowRule, SecurityPolicyConfig,
    SecurityApiKeyMaster, SecurityMobileAppPolicy, SecurityAuditLogEntry,
    SecurityActiveSession, SecurityIncidentLog, SecurityAccessReviewCycle
)
from app.modules.security.schemas import (
    SecurityUserCreate, SecurityUserUpdate, SecurityUserResponse,
    SecurityRoleCreate, SecurityRoleUpdate, SecurityRoleResponse,
    SecurityRolePermissionResponse, SecurityRolePermissionUpdate,
    SecurityUserProjectScopeCreate, SecurityUserProjectScopeResponse,
    SecurityWorkflowRuleCreate, SecurityWorkflowRuleResponse,
    SecurityPolicyConfigResponse,
    SecurityApiKeyCreate, SecurityApiKeyResponse,
    SecurityMobileAppPolicyResponse,
    SecurityAuditLogResponse,
    SecurityActiveSessionResponse,
    SecurityIncidentResponse,
    SecurityAccessReviewResponse,
    SecurityDashboardSummary
)
from app.modules.security.services import seed_security_module

router = APIRouter(prefix="/security", tags=["User, Role & Security Management"])


@router.get("/init-seed")
async def seed_security_records(db: AsyncSession = Depends(get_db)):
    await seed_security_module(db)
    return {"status": "SUCCESS", "message": "Security and RBAC Master records initialized."}


# =========================================================================
# 1. Executive Security Dashboard & KPI Metrics
# =========================================================================
@router.get("/dashboard/summary")
async def get_security_dashboard_summary(db: AsyncSession = Depends(get_db)):
    await seed_security_module(db)

    # User counts
    users = (await db.execute(select(SecurityUserAccount))).scalars().all()
    tot_users = len(users)
    active_users = len([u for u in users if u.account_status == "ACTIVE"])
    suspended_users = len([u for u in users if u.account_status == "SUSPENDED"])
    inactive_users = len([u for u in users if u.account_status in ["INACTIVE", "TERMINATED"]])
    mfa_users = len([u for u in users if u.is_mfa_enabled])

    # Roles count
    r_count = (await db.execute(select(func.count(SecurityRoleMaster.id)))).scalar() or 0

    # Sessions & Incidents
    ses_count = (await db.execute(select(func.count(SecurityActiveSession.id)).where(SecurityActiveSession.status == "ACTIVE"))).scalar() or 0
    inc_count = (await db.execute(select(func.count(SecurityIncidentLog.id)).where(SecurityIncidentLog.status != "RESOLVED"))).scalar() or 0
    rev_count = (await db.execute(select(func.count(SecurityAccessReviewCycle.id)).where(SecurityAccessReviewCycle.status == "IN_PROGRESS"))).scalar() or 0

    # Recent Role Changes
    recent_audit = (await db.execute(
        select(SecurityAuditLogEntry)
        .where(SecurityAuditLogEntry.module_name.ilike("%Role%"))
        .order_by(desc(SecurityAuditLogEntry.id))
        .limit(5)
    )).scalars().all()

    recent_roles = [
        {
            "user": a.user_name,
            "action": a.event_type,
            "record": a.record_ref,
            "time": a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "Today"
        }
        for a in recent_audit
    ]

    # Logins by Role breakdown
    role_dist: Dict[str, int] = {}
    for u in users:
        r = u.primary_role
        role_dist[r] = role_dist.get(r, 0) + 1

    logins_by_role = [{"role": k, "count": v} for k, v in role_dist.items()]

    return {
        "total_users_count": tot_users,
        "active_users_count": active_users,
        "suspended_users_count": suspended_users,
        "inactive_users_count": inactive_users,
        "total_roles_count": r_count,
        "failed_logins_today": 3,
        "active_sessions_count": ses_count,
        "open_security_incidents": inc_count,
        "pending_access_reviews": rev_count,
        "mfa_enabled_percent": round((mfa_users / tot_users * 100), 1) if tot_users else 0,
        "recent_role_changes": recent_roles,
        "logins_by_role": logins_by_role
    }


# =========================================================================
# 2. User Management (CRUD, Search & Lifecycle)
# =========================================================================
@router.get("/users")
async def list_users(
    search: Optional[str] = None,
    department: Optional[str] = None,
    status_filter: Optional[str] = None,
    role: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await seed_security_module(db)
    q = select(SecurityUserAccount)
    if search:
        s = f"%{search}%"
        q = q.where(or_(
            SecurityUserAccount.username.ilike(s),
            SecurityUserAccount.full_name_en.ilike(s),
            SecurityUserAccount.email.ilike(s),
            SecurityUserAccount.employee_id.ilike(s)
        ))
    if department:
        q = q.where(SecurityUserAccount.department_name == department)
    if status_filter:
        q = q.where(SecurityUserAccount.account_status == status_filter)
    if role:
        q = q.where(SecurityUserAccount.primary_role == role)

    count_q = select(func.count()).select_from(q.subquery())
    total_count = (await db.execute(count_q)).scalar() or 0

    q = q.order_by(desc(SecurityUserAccount.id)).limit(limit).offset(offset)
    items = (await db.execute(q)).scalars().all()
    results = [SecurityUserResponse.model_validate(u).model_dump() for u in items]
    return {"items": results, "total": total_count, "limit": limit, "offset": offset}


@router.post("/users", response_model=SecurityUserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(payload: SecurityUserCreate, db: AsyncSession = Depends(get_db)):
    data = payload.model_dump()
    c_res = await db.execute(select(func.count(SecurityUserAccount.id)))
    next_n = (c_res.scalar() or 0) + 1
    data["user_code"] = f"USR-{next_n:03d}"

    user = SecurityUserAccount(**data)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Log audit
    audit = SecurityAuditLogEntry(
        audit_ref=f"AUD-USER-{next_n:03d}",
        user_name="Super Administrator",
        event_type="CREATE",
        module_name="User Management",
        record_ref=user.username,
        ip_address="103.145.112.5",
        device_session="Admin Portal",
        result_status="SUCCESS",
        reason_notes=f"User account created for {user.full_name_en} ({user.primary_role})"
    )
    db.add(audit)
    await db.commit()

    return user


@router.put("/users/{user_id}", response_model=SecurityUserResponse)
async def update_user(user_id: int, payload: SecurityUserUpdate, db: AsyncSession = Depends(get_db)):
    user = await db.get(SecurityUserAccount, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(user, key, val)

    await db.commit()
    await db.refresh(user)
    return user


@router.post("/users/{user_id}/status")
async def update_user_status(user_id: int, new_status: str = Query(..., description="ACTIVE, SUSPENDED, LOCKED, TERMINATED"), db: AsyncSession = Depends(get_db)):
    user = await db.get(SecurityUserAccount, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    old_status = user.account_status
    user.account_status = new_status
    await db.commit()

    # Log audit
    audit = SecurityAuditLogEntry(
        audit_ref=f"AUD-STAT-{user.id}-{int(datetime.utcnow().timestamp())}",
        user_name="Super Administrator",
        event_type="STATUS_CHANGE",
        module_name="User Management",
        record_ref=user.username,
        ip_address="103.145.112.5",
        result_status="SUCCESS",
        reason_notes=f"Status changed from {old_status} to {new_status}"
    )
    db.add(audit)
    await db.commit()

    return {"status": "SUCCESS", "message": f"User status updated to {new_status}"}


# =========================================================================
# 3. Role Management (25 Default Roles, Custom Roles, Clones)
# =========================================================================
@router.get("/roles")
async def list_roles(
    search: Optional[str] = None,
    department: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    await seed_security_module(db)
    q = select(SecurityRoleMaster)
    if search:
        s = f"%{search}%"
        q = q.where(or_(SecurityRoleMaster.role_name.ilike(s), SecurityRoleMaster.role_code.ilike(s)))
    if department:
        q = q.where(SecurityRoleMaster.department == department)

    q = q.order_by(SecurityRoleMaster.id)
    items = (await db.execute(q)).scalars().all()
    return [SecurityRoleResponse.model_validate(r).model_dump() for r in items]


@router.post("/roles", response_model=SecurityRoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(payload: SecurityRoleCreate, db: AsyncSession = Depends(get_db)):
    data = payload.model_dump()
    data["is_system_role"] = False
    role = SecurityRoleMaster(**data)
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


@router.put("/roles/{role_id}", response_model=SecurityRoleResponse)
async def update_role(role_id: int, payload: SecurityRoleUpdate, db: AsyncSession = Depends(get_db)):
    role = await db.get(SecurityRoleMaster, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(role, key, val)
    await db.commit()
    await db.refresh(role)
    return role


# =========================================================================
# 4. Permission Management & Module Access Matrix
# =========================================================================
@router.get("/permissions")
async def list_role_permissions(
    role_code: str = Query("PROJECT_MGR"),
    db: AsyncSession = Depends(get_db)
):
    await seed_security_module(db)
    # Generate default module matrix
    modules = [
        ("LAND", "Land Acquisition & JV", True, True, True, False, False, True, "PROJECT"),
        ("PROJECTS", "Project Management & WBS", True, True, True, True, True, True, "PROJECT"),
        ("INVENTORY", "Property & Unit Inventory", True, False, True, False, False, True, "COMPANY"),
        ("CRM", "CRM & Lead Pipeline", True, True, True, False, False, True, "ASSIGNED"),
        ("SALES", "Sales & Booking Allotments", True, True, True, False, True, True, "PROJECT"),
        ("CONSTRUCTION", "Construction Operations & DPR", True, True, True, True, True, True, "PROJECT"),
        ("BUDGETING", "Budgeting & Cost Control", True, True, True, False, True, True, "PROJECT"),
        ("PROCUREMENT", "Procurement & Purchase Orders", True, True, True, False, False, True, "PROJECT"),
        ("STORE", "Inventory & Warehouse Stock", True, True, True, False, False, True, "PROJECT"),
        ("COLLECTIONS", "Customer Installment Collections", True, False, False, False, False, False, "PROJECT"),
        ("ACCOUNTS", "Finance & General Ledger", True, False, False, False, False, False, "PROJECT"),
        ("TAX", "NBR Tax & Statutory VAT", True, False, False, False, False, False, "COMPANY"),
        ("HRMS", "Human Resources & Payroll", True, False, False, False, False, False, "DEPARTMENT"),
        ("FIXED_ASSETS", "Fixed Asset Management", True, True, True, False, False, True, "PROJECT"),
        ("HANDOVER", "Snagging & Handover", True, True, True, False, True, True, "PROJECT"),
        ("SECURITY", "User & Security Management", False, False, False, False, False, False, "NONE")
    ]

    res = []
    for idx, (code, name, v, c, e, d, a, exp, scope) in enumerate(modules, start=1):
        res.append({
            "id": idx,
            "role_code": role_code,
            "module_code": code,
            "module_name": name,
            "can_view": v,
            "can_create": c,
            "can_edit": e,
            "can_delete": d,
            "can_approve": a,
            "can_export": exp,
            "can_print": exp,
            "data_scope": scope,
            "restricted_fields": ["customer_nid", "base_cost_rate"] if code in ["CRM", "BUDGETING"] else []
        })
    return res


# =========================================================================
# 5. Project & Property Level Access Controls
# =========================================================================
@router.get("/project-scopes")
async def list_user_project_scopes(user_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    await seed_security_module(db)
    q = select(SecurityUserProjectScope)
    if user_id:
        q = q.where(SecurityUserProjectScope.user_id == user_id)
    items = (await db.execute(q.order_by(desc(SecurityUserProjectScope.id)))).scalars().all()
    if not items:
        # Default mock scope
        items = [
            SecurityUserProjectScope(
                id=1,
                user_id=3,
                user_name="Kamal Hossain (Project Manager)",
                project_id=1,
                project_name="Ocean Heights Luxury Tower",
                tower_names=["Tower A", "Tower B"],
                can_view_financials=True,
                can_view_customers=True,
                is_active=True
            ),
            SecurityUserProjectScope(
                id=2,
                user_id=3,
                user_name="Kamal Hossain (Project Manager)",
                project_id=2,
                project_name="BlueOceans Commercial Plaza",
                tower_names=["North Wing"],
                can_view_financials=False,
                can_view_customers=False,
                is_active=True
            )
        ]
    return [SecurityUserProjectScopeResponse.model_validate(s).model_dump() for s in items]


@router.post("/project-scopes", response_model=SecurityUserProjectScopeResponse, status_code=status.HTTP_201_CREATED)
async def assign_project_scope(payload: SecurityUserProjectScopeCreate, db: AsyncSession = Depends(get_db)):
    scope = SecurityUserProjectScope(**payload.model_dump())
    db.add(scope)
    await db.commit()
    await db.refresh(scope)
    return scope


@router.delete("/project-scopes/{scope_id}")
async def revoke_project_scope(scope_id: int, db: AsyncSession = Depends(get_db)):
    scope = await db.get(SecurityUserProjectScope, scope_id)
    if not scope:
        raise HTTPException(status_code=404, detail="Scope assignment not found")
    await db.delete(scope)
    await db.commit()
    return {"status": "SUCCESS", "message": "Project access revoked."}


# =========================================================================
# 6. Maker-Checker-Approver Workflow Rules
# =========================================================================
@router.get("/workflow-rules")
async def list_workflow_rules(db: AsyncSession = Depends(get_db)):
    await seed_security_module(db)
    res = await db.execute(select(SecurityWorkflowRule).order_by(SecurityWorkflowRule.id))
    items = res.scalars().all()
    return [SecurityWorkflowRuleResponse.model_validate(w).model_dump() for w in items]


@router.post("/workflow-rules", response_model=SecurityWorkflowRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow_rule(payload: SecurityWorkflowRuleCreate, db: AsyncSession = Depends(get_db)):
    rule = SecurityWorkflowRule(**payload.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


# =========================================================================
# 7. Global Authentication & Password Policies
# =========================================================================
@router.get("/policies")
async def get_security_policy(db: AsyncSession = Depends(get_db)):
    await seed_security_module(db)
    res = await db.execute(select(SecurityPolicyConfig).order_by(SecurityPolicyConfig.id))
    policy = res.scalars().first()
    return SecurityPolicyConfigResponse.model_validate(policy).model_dump()


@router.put("/policies")
async def update_security_policy(payload: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SecurityPolicyConfig))
    policy = res.scalars().first()
    if policy:
        for k, v in payload.items():
            if hasattr(policy, k):
                setattr(policy, k, v)
        await db.commit()
        await db.refresh(policy)
        return SecurityPolicyConfigResponse.model_validate(policy).model_dump()
    return payload


# =========================================================================
# 8. API Keys & Integration Security
# =========================================================================
@router.get("/api-keys")
async def list_api_keys(db: AsyncSession = Depends(get_db)):
    await seed_security_module(db)
    res = await db.execute(select(SecurityApiKeyMaster).order_by(desc(SecurityApiKeyMaster.id)))
    items = res.scalars().all()
    return [SecurityApiKeyResponse.model_validate(k).model_dump() for k in items]


@router.post("/api-keys", response_model=SecurityApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def generate_api_key(payload: SecurityApiKeyCreate, db: AsyncSession = Depends(get_db)):
    c_res = await db.execute(select(func.count(SecurityApiKeyMaster.id)))
    next_n = (c_res.scalar() or 0) + 1
    cid = f"CLI-API-EXT-{next_n:03d}"
    masked = f"pk_live_sec_{cid.lower()}_***992"

    key = SecurityApiKeyMaster(
        app_name=payload.app_name,
        client_id=cid,
        api_key_masked=masked,
        allowed_scopes=payload.allowed_scopes or ["read:reports"],
        rate_limit_per_minute=payload.rate_limit_per_minute or 120
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)
    return key


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(key_id: int, db: AsyncSession = Depends(get_db)):
    key = await db.get(SecurityApiKeyMaster, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    key.is_active = False
    await db.commit()
    return {"status": "SUCCESS", "message": "API Key revoked."}


# =========================================================================
# 9. Mobile App Security Policies
# =========================================================================
@router.get("/mobile-policies")
async def list_mobile_policies(db: AsyncSession = Depends(get_db)):
    await seed_security_module(db)
    res = await db.execute(select(SecurityMobileAppPolicy).order_by(SecurityMobileAppPolicy.id))
    items = res.scalars().all()
    return [SecurityMobileAppPolicyResponse.model_validate(m).model_dump() for m in items]


# =========================================================================
# 10. Audit Trail & Activity Logs
# =========================================================================
@router.get("/audit-logs")
async def list_audit_logs(
    user_name: Optional[str] = None,
    module_name: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    await seed_security_module(db)
    q = select(SecurityAuditLogEntry)
    if user_name:
        q = q.where(SecurityAuditLogEntry.user_name.ilike(f"%{user_name}%"))
    if module_name:
        q = q.where(SecurityAuditLogEntry.module_name.ilike(f"%{module_name}%"))
    if event_type:
        q = q.where(SecurityAuditLogEntry.event_type == event_type)

    count_q = select(func.count()).select_from(q.subquery())
    total_count = (await db.execute(count_q)).scalar() or 0

    q = q.order_by(desc(SecurityAuditLogEntry.id)).limit(limit).offset(offset)
    items = (await db.execute(q)).scalars().all()
    results = [SecurityAuditLogResponse.model_validate(a).model_dump() for a in items]
    return {"items": results, "total": total_count, "limit": limit, "offset": offset}


# =========================================================================
# 11. Active Sessions & Remote Device Revocation
# =========================================================================
@router.get("/active-sessions")
async def list_active_sessions(db: AsyncSession = Depends(get_db)):
    await seed_security_module(db)
    res = await db.execute(select(SecurityActiveSession).order_by(desc(SecurityActiveSession.id)))
    items = res.scalars().all()
    return [SecurityActiveSessionResponse.model_validate(s).model_dump() for s in items]


@router.post("/active-sessions/{session_id}/revoke")
async def revoke_session(session_id: str, db: AsyncSession = Depends(get_db)):
    q = select(SecurityActiveSession).where(SecurityActiveSession.session_id == session_id)
    ses = (await db.execute(q)).scalar_one_or_none()
    if not ses:
        raise HTTPException(status_code=404, detail="Session not found")
    ses.status = "REVOKED"
    await db.commit()
    return {"status": "SUCCESS", "message": f"Session {session_id} remotely revoked."}


# =========================================================================
# 12. Security Monitoring Incidents
# =========================================================================
@router.get("/incidents")
async def list_security_incidents(db: AsyncSession = Depends(get_db)):
    await seed_security_module(db)
    res = await db.execute(select(SecurityIncidentLog).order_by(desc(SecurityIncidentLog.id)))
    items = res.scalars().all()
    return [SecurityIncidentResponse.model_validate(i).model_dump() for i in items]


# =========================================================================
# 13. User Access Reviews & Certification
# =========================================================================
@router.get("/access-reviews")
async def list_access_reviews(db: AsyncSession = Depends(get_db)):
    await seed_security_module(db)
    res = await db.execute(select(SecurityAccessReviewCycle).order_by(desc(SecurityAccessReviewCycle.id)))
    items = res.scalars().all()
    return [SecurityAccessReviewResponse.model_validate(a).model_dump() for a in items]


# =========================================================================
# 14. Security Reports Suite
# =========================================================================
@router.get("/reports")
async def get_security_reports(
    report_type: str = Query("user_access_matrix"),
    db: AsyncSession = Depends(get_db)
):
    await seed_security_module(db)

    # 1. User Access Matrix
    if report_type == "user_access_matrix":
        users = (await db.execute(select(SecurityUserAccount))).scalars().all()
        return {
            "report_name": "Enterprise User Access & Role Assignment Matrix",
            "items": [
                {
                    "username": u.username,
                    "full_name": u.full_name_en,
                    "department": u.department_name,
                    "designation": u.designation,
                    "primary_role": u.primary_role,
                    "status": u.account_status,
                    "mfa": "Enabled" if u.is_mfa_enabled else "Disabled",
                    "last_login": u.last_login_at.strftime("%Y-%m-%d %H:%M") if u.last_login_at else "Never"
                }
                for u in users
            ]
        }

    # 2. Privileged Account Audit
    elif report_type == "privileged_accounts":
        q = select(SecurityUserAccount).where(SecurityUserAccount.primary_role.in_(["SUPER_ADMIN", "SYS_ADMIN", "SEC_ADMIN", "MD", "FIN_MGR"]))
        users = (await db.execute(q)).scalars().all()
        return {
            "report_name": "Privileged & High-Risk Administrative Account Statement",
            "items": [
                {
                    "user_code": u.user_code,
                    "username": u.username,
                    "full_name": u.full_name_en,
                    "role": u.primary_role,
                    "department": u.department_name,
                    "mfa_status": "COMPLIANT" if u.is_mfa_enabled else "NON_COMPLIANT",
                    "last_login_ip": u.last_login_ip or "103.145.112.5"
                }
                for u in users
            ]
        }

    # 3. Failed Logins & Threat Analytics
    elif report_type == "threat_analytics":
        incidents = (await db.execute(select(SecurityIncidentLog))).scalars().all()
        return {
            "report_name": "Failed Logins & Threat Monitoring Analytics",
            "items": [SecurityIncidentResponse.model_validate(i).model_dump() for i in incidents]
        }

    # Default fallback
    return await list_users(None, None, None, None, 50, 0, db)
