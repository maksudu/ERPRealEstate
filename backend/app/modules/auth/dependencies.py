from fastapi import Depends, HTTPException, Header, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional
from jose import JWTError

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token
from app.modules.auth.models import User, UserProjectAssignment, Organization
from app.modules.auth.schemas import ProjectScopeContext

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        if username is None or token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    stmt = (
        select(User)
        .options(
            selectinload(User.organization),
            selectinload(User.project_assignments)
        )
        .where(User.username == username, User.is_active == True)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception
    return user


async def require_group_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_group_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Group Admin privilege required."
        )
    return current_user


async def require_project_scope(
    x_project_id: Optional[str] = Header(None, alias="X-Project-Id", description="Active Project Scope Identifier"),
    current_user: User = Depends(get_current_user)
) -> ProjectScopeContext:
    """
    CRITICAL SECURITY DEPENDENCY (PROMPT 03):
    1. Inspects the incoming 'X-Project-Id' HTTP header.
    2. Group Admins automatically bypass project restriction with full financial visibility.
    3. Regular users must have an active assignment record in `sys_user_project_assignments`.
    4. Rejects with 403 Forbidden if the user is not assigned to the requested project.
    """
    if not x_project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header 'X-Project-Id' is required for project-scoped operations."
        )

    try:
        project_id = int(x_project_id.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header 'X-Project-Id' must be a valid integer ID."
        )

    # 1. Group Admins bypass all project-level restrictions
    if current_user.is_group_admin:
        return ProjectScopeContext(
            user_id=current_user.id,
            username=current_user.username,
            project_id=project_id,
            role_code="GROUP_ADMIN",
            can_view_financials=True,
            is_group_admin=True
        )

    # 2. Check user's assigned projects
    assignment = next(
        (a for a in current_user.project_assignments if a.project_id == project_id),
        None
    )

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: You are not assigned to project ID {project_id}."
        )

    return ProjectScopeContext(
        user_id=current_user.id,
        username=current_user.username,
        project_id=project_id,
        role_code=assignment.role_code,
        can_view_financials=assignment.can_view_financials,
        is_group_admin=False
    )
