import asyncio
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logger import logger
from app.core.auth import APIKeyMiddleware


def _resolve_app_root() -> Path:
    if getattr(sys, 'frozen', False):
        return Path(sys._MEIPASS)
    return Path(__file__).parent


APP_ROOT = _resolve_app_root()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("NetSentinel engine starting up")
    logger.info(f"Allowed origins: {settings.allowed_origins}")

    if getattr(sys, 'frozen', False):
        logger.info(f"Running as frozen binary (PyInstaller) — root: {APP_ROOT}")

    nmap_available = _check_nmap()
    logger.info(f"nmap available: {nmap_available}")
    if settings.auth_enabled:
        logger.info("API key authentication is ENABLED")
    else:
        logger.info("API key authentication is disabled (set NETSENTINEL_API_KEY to enable)")

    yield
    logger.info("NetSentinel engine shutting down")


def _get_nmap_path():
    nmap_path = os.environ.get("NMAP_PATH")
    if nmap_path and os.path.isfile(os.path.join(nmap_path, "nmap.exe")):
        return (nmap_path,)
    return ()


def _check_nmap() -> bool:
    try:
        import nmap
        search = _get_nmap_path()
        nm = nmap.PortScanner(nmap_search_path=search) if search else nmap.PortScanner()
        nm.nmap_version()
        return True
    except Exception:
        return False


def get_nmap_status() -> dict:
    try:
        import nmap
        search = _get_nmap_path()
        nm = nmap.PortScanner(nmap_search_path=search) if search else nmap.PortScanner()
        version = nm.nmap_version()
        return {"available": True, "version": f"{version[0]}.{version[1]}"}
    except Exception as e:
        return {"available": False, "error": str(e)}


app = FastAPI(
    title="NetSentinel Engine",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(APIKeyMiddleware)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "service": "NetSentinel Engine",
        "version": "0.1.0",
        "docs": "/api/docs",
    }


@app.get("/api/v1/system/nmap")
async def nmap_check():
    return get_nmap_status()


if __name__ == "__main__":
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level=settings.log_level.lower(),
    )
