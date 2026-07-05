from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.port_scan import PortScanRequest, PortScanResult
from app.services.port_scanner import PortScannerService

router = APIRouter()


@router.post("/ports", response_model=PortScanResult)
async def scan_ports(request: PortScanRequest):
    try:
        scanner = PortScannerService()
        return await scanner.scan(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
