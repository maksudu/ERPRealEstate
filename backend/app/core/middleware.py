import json
import asyncio
from typing import Optional, Dict, Any
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from jose import jwt

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.modules.auth.models import AuditTrail, AuditActionType

MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
EXCLUDED_PATHS = {"/health", "/docs", "/openapi.json", "/api/v1/auth/login", "/api/v1/auth/refresh"}

async def _record_audit_log(
    user_id: Optional[int],
    ip_address: Optional[str],
    microservice_name: str,
    entity_name: str,
    entity_id: Optional[str],
    action_type: str,
    payload_before: Optional[Dict[str, Any]],
    payload_after: Optional[Dict[str, Any]]
):
    """Asynchronous background worker that commits to partitioned `sys_audit_trails`"""
    try:
        async with AsyncSessionLocal() as session:
            # Map action type
            action_enum = AuditActionType.CUSTOM
            if action_type == "POST":
                action_enum = AuditActionType.CREATE
            elif action_type in ("PUT", "PATCH"):
                action_enum = AuditActionType.UPDATE
            elif action_type == "DELETE":
                action_enum = AuditActionType.DELETE

            audit_entry = AuditTrail(
                user_id=user_id,
                ip_address=ip_address,
                microservice_name=microservice_name,
                entity_name=entity_name,
                entity_id=entity_id,
                action_type=action_enum,
                payload_before=payload_before,
                payload_after=payload_after
            )
            session.add(audit_entry)
            await session.commit()
    except Exception as e:
        # Logging errors should never crash transactional requests
        print(f"[AuditMiddleware Error]: Failed to write audit trail: {e}")


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Only log mutating HTTP requests
        if request.method not in MUTATING_METHODS:
            return await call_next(request)

        # Check if path is excluded (e.g. login to prevent logging passwords)
        for excluded in EXCLUDED_PATHS:
            if request.url.path.startswith(excluded):
                return await call_next(request)

        # 1. Read request body and preserve stream for downstream handlers
        body_bytes = await request.body()
        async def receive():
            return {"type": "http.request", "body": body_bytes}
        request._receive = receive

        # 2. Extract User ID from JWT Token if available
        user_id: Optional[int] = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
            try:
                payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
                uid = payload.get("user_id")
                if uid:
                    user_id = int(uid)
            except Exception:
                pass

        # 3. Extract IP Address
        client_ip = request.headers.get("X-Forwarded-For")
        if client_ip:
            client_ip = client_ip.split(",")[0].strip()
        elif request.client:
            client_ip = request.client.host

        # 4. Extract Entity Name from Path (e.g. /api/v1/lookups/LAND_CLASS -> 'lookups')
        path_parts = [p for p in request.url.path.strip("/").split("/") if p]
        entity_name = "system"
        entity_id: Optional[str] = None
        if len(path_parts) >= 3 and path_parts[0] == "api":
            entity_name = path_parts[2] # e.g. lookups, parcels, sales
            if len(path_parts) >= 4:
                entity_id = path_parts[3]

        # 5. Parse and sanitize payload
        payload_after: Optional[Dict[str, Any]] = None
        if body_bytes:
            try:
                payload_after = json.loads(body_bytes.decode("utf-8"))
                # Sanitize sensitive fields if any
                if isinstance(payload_after, dict):
                    for sensitive in ("password", "hashed_password", "token", "secret"):
                        if sensitive in payload_after:
                            payload_after[sensitive] = "******"
            except Exception:
                payload_after = {"raw_size_bytes": len(body_bytes)}

        # 6. Execute downstream endpoint
        response = await call_next(request)

        # 7. Asynchronously trigger audit logging for successful mutations (2xx status codes)
        if 200 <= response.status_code < 300:
            asyncio.create_task(
                _record_audit_log(
                    user_id=user_id,
                    ip_address=client_ip,
                    microservice_name="erp-core-gateway",
                    entity_name=entity_name,
                    entity_id=entity_id,
                    action_type=request.method,
                    payload_before=None,
                    payload_after=payload_after
                )
            )

        return response
