"""
Audit logging middleware — logs POST/PATCH/DELETE requests to audit_log table.
"""

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.dependencies import get_supabase_admin

logger = logging.getLogger("complianceos.audit")

AUDITED_METHODS = {"POST", "PATCH", "PUT", "DELETE"}

# Skip paths that shouldn't be audited (auth, health, docs)
SKIP_PREFIXES = ("/health", "/docs", "/redoc", "/openapi.json", "/auth")


class AuditLogMiddleware(BaseHTTPMiddleware):
    """Middleware that logs mutating API calls to the audit_log table."""

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method not in AUDITED_METHODS:
            return await call_next(request)

        path = request.url.path
        if any(path.startswith(prefix) for prefix in SKIP_PREFIXES):
            return await call_next(request)

        start_time = time.time()
        response = await call_next(request)
        duration_ms = int((time.time() - start_time) * 1000)

        # Try to extract user/company from request state (set by auth deps)
        user_id = None
        company_id = None

        # Attempt to read from authorization header for logging context
        auth_header = request.headers.get("authorization", "")
        api_key_header = request.headers.get("x-api-key", "")

        try:
            supabase = get_supabase_admin()
            supabase.table("audit_log").insert({
                "user_id": user_id,
                "company_id": company_id,
                "action": request.method,
                "resource": path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "ip_address": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent", "")[:255],
                "details": {
                    "query_params": dict(request.query_params),
                    "has_auth": bool(auth_header),
                    "has_api_key": bool(api_key_header),
                },
            }).execute()
        except Exception as e:
            # Never let audit logging break the actual request
            logger.warning(f"Audit log write failed: {e}")

        return response
