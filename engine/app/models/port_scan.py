from pydantic import BaseModel
from typing import Optional


SCAN_TYPES = ["tcp_syn", "tcp_connect", "udp", "tcp_syn_version", "tcp_connect_version"]


class PortScanRequest(BaseModel):
    target_ip: str
    ports: Optional[str] = None
    scan_type: str = "tcp_syn"
    version_detection: bool = False


class PortInfo(BaseModel):
    port: int
    state: str = "open"
    service: Optional[str] = None
    version: Optional[str] = None


class PortScanResult(BaseModel):
    target_ip: str
    open_ports: list[PortInfo]
    total_scanned: int
    scan_duration_ms: float
    scan_type: str
