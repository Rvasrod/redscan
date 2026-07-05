import asyncio
import platform
import subprocess
import time
from typing import Optional

from app.core.logger import logger
from app.models.discovery import NetworkInfo, DiscoveredDevice, DiscoveryResult


class DiscoveryService:
    async def get_network_info(self) -> NetworkInfo:
        logger.info("Getting network info")
        try:
            return await self._detect_network_info()
        except Exception as e:
            logger.error(f"Failed to get network info: {e}")
            raise

    async def scan_devices(self) -> DiscoveryResult:
        logger.info("Starting network device discovery")
        start = time.time()
        try:
            devices = await self._arp_scan()
            duration = (time.time() - start) * 1000
            network = await self._detect_network_info()
            return DiscoveryResult(
                network=network,
                devices=devices,
                device_count=len(devices),
                scan_duration_ms=round(duration, 2),
            )
        except Exception as e:
            logger.error(f"Discovery scan failed: {e}")
            raise

    async def _detect_network_info(self) -> NetworkInfo:
        system = platform.system().lower()

        if system == "windows":
            return await self._get_windows_network_info()
        elif system in ("linux", "darwin"):
            return await self._get_unix_network_info()
        else:
            raise RuntimeError(f"Unsupported platform: {system}")

    async def _get_windows_network_info(self) -> NetworkInfo:
        try:
            result = subprocess.run(
                ["ipconfig", "/all"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            output = result.stdout
            return self._parse_windows_ipconfig(output)
        except subprocess.TimeoutExpired:
            raise RuntimeError("ipconfig timed out")
        except FileNotFoundError:
            raise RuntimeError("ipconfig not found")

    def _parse_windows_ipconfig(self, output: str) -> NetworkInfo:
        import re

        ssid = "Unknown"
        gateway_ip = ""
        interface_ip = ""
        interface_mac = ""
        subnet = ""
        interface_name = ""

        sections = re.split(r'\n(?=[^\s])', output)
        for section in sections:
            if "Wireless LAN adapter" in section or "Ethernet adapter" in section:
                lines = section.strip().split('\n')
                for line in lines:
                    line = line.strip()
                    if "IPv4 Address" in line:
                        match = re.search(r'(\d+\.\d+\.\d+\.\d+)', line)
                        if match:
                            interface_ip = match.group(1)
                    elif "Physical Address" in line:
                        match = re.search(r'([0-9A-Fa-f]{2}(?:[-:][0-9A-Fa-f]{2}){5})', line)
                        if match:
                            interface_mac = match.group(1)
                    elif "Subnet Mask" in line:
                        match = re.search(r'(\d+\.\d+\.\d+\.\d+)', line)
                        if match:
                            subnet = match.group(1)
                if "Wireless LAN adapter" in section:
                    match = re.search(r'Wireless LAN adapter (.+?):', section)
                    if match:
                        interface_name = match.group(1).strip()

        return NetworkInfo(
            ssid=ssid,
            gateway_ip=gateway_ip,
            gateway_mac=None,
            subnet=subnet,
            interface_name=interface_name,
            interface_ip=interface_ip,
            interface_mac=interface_mac,
        )

    async def _get_unix_network_info(self) -> NetworkInfo:
        raise NotImplementedError("Unix network detection not yet implemented")

    async def _arp_scan(self) -> list[DiscoveredDevice]:
        logger.info("Performing ARP scan")
        system = platform.system().lower()

        if system == "windows":
            return await self._windows_arp_scan()
        else:
            return await self._unix_arp_scan()

    async def _windows_arp_scan(self) -> list[DiscoveredDevice]:
        import re

        try:
            result = subprocess.run(
                ["arp", "-a"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            output = result.stdout
            devices = []
            for line in output.split('\n'):
                match = re.match(r'\s*(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F-]{17})\s+', line)
                if match:
                    ip = match.group(1)
                    mac = match.group(2).replace('-', ':').lower()
                    devices.append(DiscoveredDevice(
                        ip=ip,
                        mac=mac,
                        is_gateway=False,
                    ))
            return devices
        except subprocess.TimeoutExpired:
            raise RuntimeError("ARP scan timed out")
        except FileNotFoundError:
            raise RuntimeError("arp command not found")

    async def _unix_arp_scan(self) -> list[DiscoveredDevice]:
        raise NotImplementedError("Unix ARP scan not yet implemented")
