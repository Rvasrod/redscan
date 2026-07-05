"""
Wrapper around python-nmap for port scanning and vulnerability detection.
"""

from typing import Optional

import nmap

from app.core.exceptions import NmapNotFoundError


def get_scanner() -> nmap.PortScanner:
    try:
        return nmap.PortScanner()
    except nmap.PortScannerError as e:
        raise NmapNotFoundError(
            "nmap is not installed or not found in PATH. "
            "Install it from https://nmap.org/download.html"
        ) from e


def scan_ports(
    target: str,
    ports: str = "1-1024",
    arguments: str = "-sS -T4 --open",
) -> dict:
    nm = get_scanner()
    result = nm.scan(hosts=target, ports=ports, arguments=arguments)
    return result


def scan_vulnerabilities(
    target: str,
    arguments: str = "-sV --script vuln -T4",
) -> dict:
    nm = get_scanner()
    result = nm.scan(hosts=target, arguments=arguments)
    return result
