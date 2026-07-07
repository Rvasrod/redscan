import asyncio
import os
import time
from typing import Optional

import nmap

from app.core.logger import logger
from app.core.exceptions import NmapNotFoundError, PortScanError
from app.models.port_scan import PortScanRequest, PortInfo, PortScanResult, SCAN_TYPES


_SCAN_TYPE_ARGS: dict[str, str] = {
    "tcp_syn": "-sS -T4 --open",
    "tcp_connect": "-sT -T4 --open",
    "udp": "-sU -T4 --open",
    "tcp_syn_version": "-sS -sV -T4 --open",
    "tcp_connect_version": "-sT -sV -T4 --open",
}


def _get_nmap_search_path() -> tuple:
    nmap_path = os.environ.get("NMAP_PATH")
    if nmap_path:
        nmap_bin = os.path.join(nmap_path, "nmap.exe")
        if os.path.isfile(nmap_bin):
            logger.info(f"Using bundled nmap: {nmap_bin}")
            return (nmap_path,)
    return ()


class PortScannerService:
    async def scan(self, request: PortScanRequest, progress_callback=None) -> PortScanResult:
        logger.info(f"Starting {request.scan_type} scan on {request.target_ip}")
        start = time.time()

        if request.scan_type not in _SCAN_TYPE_ARGS:
            raise PortScanError(f"Invalid scan type: {request.scan_type}. Options: {', '.join(SCAN_TYPES)}")

        if progress_callback:
            await progress_callback(f"Initializing {request.scan_type} scan...")

        ports_arg = request.ports or "1-1024"
        base_args = _SCAN_TYPE_ARGS[request.scan_type]

        if request.version_detection and request.scan_type in ("tcp_syn", "tcp_connect", "udp"):
            base_args += " -sV"

        try:
            if progress_callback:
                await progress_callback(f"Scanning {request.target_ip}:{ports_arg}...")

            loop = asyncio.get_running_loop()
            nm = await loop.run_in_executor(
                None, lambda: nmap.PortScanner(nmap_search_path=_get_nmap_search_path())
            )
            result = await loop.run_in_executor(
                None, lambda: nm.scan(
                    hosts=request.target_ip,
                    ports=ports_arg,
                    arguments=base_args,
                )
            )

            duration = (time.time() - start) * 1000

            if progress_callback:
                await progress_callback("Parsing results...")

            open_ports: list[PortInfo] = []
            host_data = result.get("scan", {}).get(request.target_ip, {})

            for proto in ("tcp", "udp"):
                for port_str in host_data.get(proto, {}):
                    port_info = host_data[proto][port_str]
                    if port_info["state"] == "open":
                        open_ports.append(PortInfo(
                            port=int(port_str),
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

    def get_available_types(self) -> list[str]:
        return list(SCAN_TYPES)
