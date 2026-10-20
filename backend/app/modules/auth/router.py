from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from jose import JWTError

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    store_refresh_token,
    verify_stored_refresh_token,
    revoke_refresh_token,
    decode_token
)
from app.modules.auth.models import User, UserProjectAssignment, Organization
from app.modules.auth.schemas import (
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserProfileResponse,
    ProjectScopeContext
)
from app.modules.auth.dependencies import get_current_user, require_project_scope

router = APIRouter(prefix="/auth", tags=["Authentication & Multi-Tenant RBAC"])

@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticates system users across the multi-tenant real estate hierarchy.
    Generates access tokens and stores rotated refresh tokens in Redis.
    """
    identifier = payload.username.strip().lower()
    stmt = (
        select(User)
        .options(
            selectinload(User.organization),
            selectinload(User.project_assignments)
        )
        .where(
            or_(User.username == identifier, User.email == identifier),
            User.is_active == True
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Token payload metadata
    token_claims = {
        "sub": user.username,
        "user_id": user.id,
        "org_id": user.organization_id,
        "is_group_admin": user.is_group_admin
    }

    access_token = create_access_token(data=token_claims)
    refresh_token = create_refresh_token(data={"sub": user.username, "user_id": user.id})

    # Store in Redis with rotation support
    await store_refresh_token(user.id, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserProfileResponse.model_validate(user)
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh Token Rotation: Validates incoming refresh token, ensures it matches Redis,
    revokes it, and issues a fresh Access + Refresh token pair.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        decoded = decode_token(payload.refresh_token)
        username = decoded.get("sub")
        user_id = decoded.get("user_id")
        token_type = decoded.get("type")
        if not username or not user_id or token_type != "refresh":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Verify against Redis rotation store
    is_valid_in_redis = await verify_stored_refresh_token(user_id, payload.refresh_token)
    if not is_valid_in_redis:
        # Detected token reuse or stale token — revoke all
        await revoke_refresh_token(user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token already consumed or revoked. Please re-authenticate."
        )

    stmt = (
        select(User)
        .options(
            selectinload(User.organization),
            selectinload(User.project_assignments)
        )
        .where(User.id == user_id, User.is_active == True)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise credentials_exception

    # Generate new pair (rotation)
    token_claims = {
        "sub": user.username,
        "user_id": user.id,
        "org_id": user.organization_id,
        "is_group_admin": user.is_group_admin
    }
    new_access_token = create_access_token(data=token_claims)
    new_refresh_token = create_refresh_token(data={"sub": user.username, "user_id": user.id})

    await store_refresh_token(user.id, new_refresh_token)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserProfileResponse.model_validate(user)
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Returns currently authenticated user profile, organization info, and project assignments"""
    return UserProfileResponse.model_validate(current_user)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Revokes active refresh tokens from Redis store and marks active sessions as REVOKED"""
    await revoke_refresh_token(current_user.id)
    try:
        from app.modules.security.models import SecurityActiveSession
        from sqlalchemy import update
        await db.execute(
            update(SecurityActiveSession)
            .where(SecurityActiveSession.username == current_user.username, SecurityActiveSession.status == "ACTIVE")
            .values(status="REVOKED")
        )
        await db.commit()
    except Exception:
        pass
    return {"message": "Successfully logged out and session revoked."}


@router.post("/idle-logout", status_code=status.HTTP_200_OK)
async def idle_logout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Invalidates session on browser inactivity/idle timeout:
    1. Revokes refresh token in Redis.
    2. Marks active sessions for this user as EXPIRED in sec_active_sessions.
    3. Records an Audit Log for idle session termination.
    """
    await revoke_refresh_token(current_user.id)
    try:
        from app.modules.security.models import SecurityActiveSession
        from app.modules.auth.models import AuditTrail, AuditActionType
        from sqlalchemy import update

        await db.execute(
            update(SecurityActiveSession)
            .where(SecurityActiveSession.username == current_user.username, SecurityActiveSession.status == "ACTIVE")
            .values(status="EXPIRED")
        )

        audit = AuditTrail(
            user_id=current_user.id,
            ip_address="0.0.0.0",
            microservice_name="auth-service",
            entity_name="UserSession",
            entity_id=str(current_user.id),
            action_type=AuditActionType.CUSTOM,
            payload_before={"username": current_user.username, "status": "ACTIVE"},
            payload_after={"reason": "IDLE_TIMEOUT_AUTO_LOGOUT", "status": "EXPIRED"}
        )
        db.add(audit)
        await db.commit()
    except Exception:
        pass

    return {"message": "Session invalidated due to idle timeout.", "status": "EXPIRED"}


@router.get("/test-project-scope", response_model=ProjectScopeContext)
async def test_project_scope_endpoint(
    project_scope: ProjectScopeContext = Depends(require_project_scope)
):
    """
    VERIFICATION ENDPOINT FOR PROMPT 03:
    Exercises `require_project_scope` dependency:
    - Inspects incoming 'X-Project-Id' header.
    - Group Admins bypass restrictions.
    - Assigned users get project permissions (role_code, can_view_financials).
    - Unassigned users receive 403 Forbidden.
    """
    return project_scope
