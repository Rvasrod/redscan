from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings


class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if settings.auth_enabled:
            if request.url.path.startswith(("/api/docs", "/api/redoc", "/api/v1/health", "/api/v1/shutdown")):
                return await call_next(request)

            api_key = request.headers.get("X-API-Key")
            if not api_key or api_key != settings.api_key:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Missing or invalid API key. Provide X-API-Key header."},
                )

        return await call_next(request)
