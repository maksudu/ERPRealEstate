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


class AuditLoggingMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "")
        if method not in MUTATING_METHODS:
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        for excluded in EXCLUDED_PATHS:
            if path.startswith(excluded):
                await self.app(scope, receive, send)
                return

        body_chunks = []
        async def custom_receive():
            message = await receive()
            if message["type"] == "http.request":
                body = message.get("body", b"")
                if body:
                    body_chunks.append(body)
            return message

        status_code = [200]
        async def custom_send(message):
            if message["type"] == "http.response.start":
                status_code[0] = message.get("status", 200)
            await send(message)

        await self.app(scope, custom_receive, custom_send)

        if 200 <= status_code[0] < 300:
            headers = dict(scope.get("headers", []))
            auth_header = headers.get(b"authorization", b"").decode("latin-1")
            user_id: Optional[int] = None
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]
                try:
                    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
                    uid = payload.get("user_id")
                    if uid:
                        user_id = int(uid)
                except Exception:
                    pass

            forwarded = headers.get(b"x-forwarded-for", b"").decode("latin-1")
            client_ip = forwarded.split(",")[0].strip() if forwarded else (scope.get("client")[0] if scope.get("client") else None)

            path_parts = [p for p in path.strip("/").split("/") if p]
            entity_name = "system"
            entity_id: Optional[str] = None
            if len(path_parts) >= 3 and path_parts[0] == "api":
                entity_name = path_parts[2]
                if len(path_parts) >= 4:
                    entity_id = path_parts[3]

            payload_after: Optional[Dict[str, Any]] = None
            if body_chunks:
                try:
                    full_body = b"".join(body_chunks)
                    payload_after = json.loads(full_body.decode("utf-8"))
                    if isinstance(payload_after, dict):
                        for sensitive in ("password", "hashed_password", "token", "secret"):
                            if sensitive in payload_after:
                                payload_after[sensitive] = "******"
                except Exception:
                    payload_after = None

            asyncio.create_task(
                _record_audit_log(
                    user_id=user_id,
                    ip_address=client_ip,
                    microservice_name="erp-core-gateway",
                    entity_name=entity_name,
                    entity_id=entity_id,
                    action_type=method,
                    payload_before=None,
                    payload_after=payload_after
                )
            )
