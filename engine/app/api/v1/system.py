import asyncio
import sys

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.logger import logger

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    version: str
    python_version: str


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        version="0.1.0",
        python_version=sys.version,
    )


@router.post("/shutdown")
async def shutdown():
    logger.info("Received shutdown request")
    asyncio.get_event_loop().call_later(0.5, lambda: sys.exit(0))
    return {"status": "shutting_down"}
