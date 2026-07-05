from fastapi import APIRouter

from app.api.v1.system import router as system_router
from app.api.v1.discovery import router as discovery_router
from app.api.v1.port_scan import router as port_scan_router
from app.api.v1.vulnerability import router as vulnerability_router
from app.api.v1.latency import router as latency_router

api_router = APIRouter()

api_router.include_router(system_router, prefix="", tags=["system"])
api_router.include_router(discovery_router, prefix="/discovery", tags=["discovery"])
api_router.include_router(port_scan_router, prefix="/scan", tags=["scan"])
api_router.include_router(vulnerability_router, prefix="/scan", tags=["scan"])
api_router.include_router(latency_router, prefix="/latency", tags=["latency"])
