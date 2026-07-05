from pydantic import BaseModel
from typing import Optional


class PortScanRequest(BaseModel):
    target_ip: str
    ports: Optional[str] = None
    scan_type: str = "tcp"


class PortInfo(BaseModel):
    port: int
    state: str
    service: Optional[str] = None
    version: Optional[str] = None


class PortScanResult(BaseModel):
    target_ip: str
    open_ports: list[PortInfo]
    total_scanned: int
    scan_duration_ms: float
    scan_type: str
