import time
from typing import Optional

import nmap

from app.core.logger import logger
from app.core.exceptions import NmapNotFoundError, PortScanError
from app.models.port_scan import PortScanRequest, PortInfo, PortScanResult


class PortScannerService:
    async def scan(self, request: PortScanRequest) -> PortScanResult:
        logger.info(f"Starting port scan on {request.target_ip}")
        self._check_nmap()
        start = time.time()

        try:
            nm = nmap.PortScanner()
            ports_arg = request.ports or "1-1024"
            arguments = "-sS" if request.scan_type == "tcp" else "-sU"

            result = nm.scan(
                hosts=request.target_ip,
                ports=ports_arg,
                arguments=f"{arguments} -T4 --open",
            )

            duration = (time.time() - start) * 1000
            open_ports = []

            host_data = result.get("scan", {}).get(request.target_ip, {})
            for proto in host_data.get("tcp", {}):
                port_info = host_data["tcp"][proto]
                if port_info["state"] == "open":
                    open_ports.append(PortInfo(
                        port=int(proto),
                        state=port_info["state"],
                        service=port_info.get("name"),
                        version=port_info.get("version"),
                    ))

            return PortScanResult(
                target_ip=request.target_ip,
                open_ports=open_ports,
                total_scanned=len(open_ports),
                scan_duration_ms=round(duration, 2),
                scan_type=request.scan_type,
            )
        except nmap.PortScannerError as e:
            raise PortScanError(f"nmap scan failed: {e}") from e
        except Exception as e:
            raise PortScanError(f"Unexpected error during port scan: {e}") from e

    def _check_nmap(self):
        try:
            nmap.PortScanner()
        except nmap.PortScannerError as e:
            raise NmapNotFoundError(
                "nmap is not installed or not found in PATH. "
                "Install it from https://nmap.org/download.html"
            ) from e
