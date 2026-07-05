from pydantic import BaseModel
from typing import Optional


class NetworkInfo(BaseModel):
    ssid: str
    gateway_ip: str
    gateway_mac: Optional[str] = None
    subnet: Optional[str] = None
    interface_name: Optional[str] = None
    interface_ip: Optional[str] = None
    interface_mac: Optional[str] = None


class DiscoveredDevice(BaseModel):
    ip: str
    mac: Optional[str] = None
    hostname: Optional[str] = None
    vendor: Optional[str] = None
    is_gateway: bool = False
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None


class DiscoveryResult(BaseModel):
    network: NetworkInfo
    devices: list[DiscoveredDevice]
    device_count: int
    scan_duration_ms: float
