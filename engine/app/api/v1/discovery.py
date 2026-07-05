from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.discovery import NetworkInfo, DiscoveryResult
from app.services.discovery import DiscoveryService

router = APIRouter()
discovery_service = DiscoveryService()


@router.get("/network", response_model=NetworkInfo)
async def get_network_info():
    try:
        return await discovery_service.get_network_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan", response_model=DiscoveryResult)
async def scan_network():
    try:
        return await discovery_service.scan_devices()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
