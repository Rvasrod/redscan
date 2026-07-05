"""
ARP utilities for network discovery.

Uses scapy for ARP requests when available, falls back to system arp table.
"""

import asyncio
import platform
import subprocess
from typing import Optional

from app.core.logger import logger


def is_scapy_available() -> bool:
    try:
        import scapy  # noqa: F401
        return True
    except ImportError:
        return False


async def arp_scan(subnet: str) -> list[dict]:
    if is_scapy_available():
        return await _scapy_arp_scan(subnet)
    logger.warning("scapy not available, falling back to system ARP table")
    return await _system_arp_table()


async def _scapy_arp_scan(subnet: str) -> list[dict]:
    try:
        from scapy.all import ARP, Ether, srp

        loop = asyncio.get_event_loop()

        def _scan():
            arp = ARP(pdst=subnet)
            ether = Ether(dst="ff:ff:ff:ff:ff:ff")
            packet = ether / arp
            result = srp(packet, timeout=3, verbose=0)[0]
            devices = []
            for sent, received in result:
                devices.append({
                    "ip": received.psrc,
                    "mac": received.hwsrc,
                })
            return devices

        devices = await loop.run_in_executor(None, _scan)
        return devices
    except Exception as e:
        logger.error(f"Scapy ARP scan failed: {e}")
        return []


async def _system_arp_table() -> list[dict]:
    system = platform.system().lower()
    try:
        if system == "windows":
            result = subprocess.run(
                ["arp", "-a"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            return _parse_windows_arp(result.stdout)
        else:
            result = subprocess.run(
                ["arp", "-n"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            return _parse_unix_arp(result.stdout)
    except Exception as e:
        logger.error(f"System ARP table query failed: {e}")
        return []


def _parse_windows_arp(output: str) -> list[dict]:
    import re
    devices = []
    for line in output.split('\n'):
        match = re.match(r'\s*(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F-]{17})\s+', line)
        if match:
            devices.append({
                "ip": match.group(1),
                "mac": match.group(2).replace('-', ':').lower(),
            })
    return devices


def _parse_unix_arp(output: str) -> list[dict]:
    import re
    devices = []
    for line in output.split('\n'):
        match = re.match(
            r'[\w.]+ \((\d+\.\d+\.\d+\.\d+)\) at ([0-9a-fA-F:]{17})',
            line
        )
        if match:
            devices.append({
                "ip": match.group(1),
                "mac": match.group(2).lower(),
            })
    return devices
