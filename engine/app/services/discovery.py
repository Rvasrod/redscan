import asyncio
import platform
import re
import socket
import subprocess
import time
from datetime import datetime, timezone
from typing import Optional

from app.core.logger import logger
from app.core.exceptions import DiscoveryError
from app.models.discovery import NetworkInfo, DiscoveredDevice, DiscoveryResult
from app.utils.oui import lookup_vendor
from app.utils.arp import arp_scan


class DiscoveryService:
    async def get_network_info(self) -> NetworkInfo:
        logger.info("Getting network info")
        try:
            return await self._detect_network_info()
        except Exception as e:
            logger.error(f"Failed to get network info: {e}")
            raise DiscoveryError(str(e))

    async def scan_devices(self, progress_callback=None) -> DiscoveryResult:
        logger.info("Starting network device discovery")
        start = time.time()
        try:
            if progress_callback:
                await progress_callback("Detecting network information...")
            network = await self._detect_network_info()

            if progress_callback:
                await progress_callback("Scanning ARP table...")
            subnet = self._calculate_subnet(network.interface_ip, network.subnet)
            raw_devices = await arp_scan(subnet) if subnet else await self._fallback_arp_scan()

            devices: list[DiscoveredDevice] = []
            now = datetime.now(timezone.utc).isoformat()
            total = len(raw_devices)
            for idx, d in enumerate(raw_devices):
                if progress_callback:
                    await progress_callback(f"Resolving device {idx + 1} of {total}...")
                hostname = await self._resolve_hostname(d["ip"])
                vendor = lookup_vendor(d.get("mac", "")) if d.get("mac") else None
                is_gw = d["ip"] == network.gateway_ip
                devices.append(DiscoveredDevice(
                    ip=d["ip"],
                    mac=d.get("mac"),
                    hostname=hostname,
                    vendor=vendor,
                    is_gateway=is_gw,
                    first_seen=now,
                    last_seen=now,
                ))

            devices.sort(key=lambda x: (not x.is_gateway, x.ip))
            duration = (time.time() - start) * 1000
            return DiscoveryResult(
                network=network,
                devices=devices,
                device_count=len(devices),
                scan_duration_ms=round(duration, 2),
            )
        except Exception as e:
            logger.error(f"Discovery scan failed: {e}")
            raise DiscoveryError(str(e))

    async def _detect_network_info(self) -> NetworkInfo:
        system = platform.system().lower()
        if system == "windows":
            return await self._get_windows_network_info()
        elif system in ("linux", "darwin"):
            return await self._get_unix_network_info()
        raise RuntimeError(f"Unsupported platform: {system}")

    async def _get_windows_network_info(self) -> NetworkInfo:
        ssid = await self._get_windows_ssid()
        interface_info = await self._get_windows_active_interface()
        gateway = await self._get_windows_gateway()

        return NetworkInfo(
            ssid=ssid,
            gateway_ip=gateway.get("ip", ""),
            gateway_mac=gateway.get("mac"),
            subnet=interface_info.get("subnet"),
            interface_name=interface_info.get("name"),
            interface_ip=interface_info.get("ip"),
            interface_mac=interface_info.get("mac"),
        )

    async def _get_windows_ssid(self) -> str:
        try:
            result = subprocess.run(
                ["netsh", "wlan", "show", "interfaces"],
                capture_output=True, text=True, timeout=10,
            )
            for line in result.stdout.split('\n'):
                line = line.strip()
                if ":" in line and ("SSID" in line or "ssid" in line) and "BSSID" not in line and "bssid" not in line:
                    parts = line.split(":", 1)
                    if len(parts) == 2:
                        ssid = parts[1].strip()
                        if ssid:
                            return ssid
        except (subprocess.TimeoutExpired, FileNotFoundError):
            logger.warning("Failed to get SSID via netsh")
        return "Unknown"

    async def _get_windows_active_interface(self) -> dict:
        try:
            result = subprocess.run(
                ["ipconfig", "/all"],
                capture_output=True, text=True, timeout=10,
            )
            return self._parse_windows_ipconfig(result.stdout)
        except (subprocess.TimeoutExpired, FileNotFoundError):
            raise DiscoveryError("ipconfig not found or timed out")

    def _parse_windows_ipconfig(self, output: str) -> dict:
        info: dict = {"ip": "", "mac": "", "subnet": "", "name": ""}
        sections = re.split(r'\n(?=[^\s])', output)
        for section in sections:
            if not section.strip():
                continue
            section_lower = section.lower()
            is_wireless = "inalámbrica" in section_lower or "wireless" in section_lower
            is_ethernet = "ethernet" in section_lower
            is_virtual = any(x in section_lower for x in ["vehernet", "virtual", "bluetooth", "virtualbox", "vmware", "pve", "hyper-v"])
            if not (is_wireless or (is_ethernet and not is_virtual)):
                continue
            has_ipv4 = False
            local_info: dict = {"ip": "", "mac": "", "subnet": "", "name": ""}
            lines = section.strip().split('\n')
            for line in lines:
                line = line.strip()
                if not local_info["ip"] and ":" in line:
                    m = re.search(r'(\d+\.\d+\.\d+\.\d+)', line)
                    if m:
                        local_info["ip"] = m.group(1)
                        has_ipv4 = True
                if not local_info["mac"] and ":" in line:
                    m = re.search(r'([0-9A-Fa-f]{2}(?:[-:][0-9A-Fa-f]{2}){5})', line)
                    if m:
                        local_info["mac"] = m.group(1).replace('-', ':').lower()
                if not local_info["subnet"] and ":" in line:
                    m = re.search(r'(\d+\.\d+\.\d+\.\d+)', line)
                    if m and m.group(1) != local_info["ip"]:
                        local_info["subnet"] = m.group(1)
            m = re.search(r'(?:adapter|Adaptador)\s+(.+?):', section, re.IGNORECASE)
            if m:
                local_info["name"] = m.group(1).strip()
            if has_ipv4 and local_info["ip"]:
                info = local_info
                break
        return info

    async def _get_windows_gateway(self) -> dict:
        try:
            result = subprocess.run(
                ["route", "print", "-4"],
                capture_output=True, text=True, timeout=10,
            )
            for line in result.stdout.split('\n'):
                if line.strip().startswith("0.0.0.0"):
                    parts = re.split(r'\s+', line.strip())
                    if len(parts) >= 3:
                        gw_ip = parts[2]
                        gw_mac = await self._resolve_mac_by_ip(gw_ip)
                        return {"ip": gw_ip, "mac": gw_mac}
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        try:
            result = subprocess.run(
                ["ipconfig"],
                capture_output=True, text=True, timeout=10,
            )
            for line in result.stdout.split('\n'):
                if re.search(r'(gateway|puerta|enlace|predeterminada)', line, re.IGNORECASE) and ":" in line:
                    m = re.search(r'(\d+\.\d+\.\d+\.\d+)', line)
                    if m:
                        gw_ip = m.group(1)
                        if gw_ip and gw_ip != "0.0.0.0":
                            gw_mac = await self._resolve_mac_by_ip(gw_ip)
                            return {"ip": gw_ip, "mac": gw_mac}
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        return {"ip": "", "mac": None}

    async def _resolve_mac_by_ip(self, ip: str) -> Optional[str]:
        try:
            result = subprocess.run(
                ["arp", "-a", ip],
                capture_output=True, text=True, timeout=5,
            )
            for line in result.stdout.split('\n'):
                m = re.match(r'\s*' + re.escape(ip) + r'\s+([0-9a-fA-F-]{17})', line)
                if m:
                    return m.group(1).replace('-', ':').lower()
        except Exception:
            pass
        return None

    async def _get_unix_network_info(self) -> NetworkInfo:
        system = platform.system().lower()
        if system == "darwin":
            return await self._get_macos_network_info()
        return await self._get_linux_network_info()

    async def _get_linux_network_info(self) -> NetworkInfo:
        ssid = "Unknown"
        gw_ip = ""
        gw_mac = None
        iface_name = ""
        iface_ip = ""
        iface_mac = ""
        subnet = ""

        try:
            r = subprocess.run(["ip", "route", "show", "default"], capture_output=True, text=True, timeout=5)
            for line in r.stdout.split('\n'):
                parts = line.split()
                if "default" in parts and len(parts) >= 5:
                    gw_ip = parts[2]
                    iface_name = parts[4]
                    break
        except Exception:
            pass

        try:
            r = subprocess.run(["ip", "-4", "addr", "show", iface_name], capture_output=True, text=True, timeout=5)
            for line in r.stdout.split('\n'):
                line = line.strip()
                if "inet " in line:
                    m = re.search(r'inet (\d+\.\d+\.\d+\.\d+)/(\d+)', line)
                    if m:
                        iface_ip = m.group(1)
                        cidr = int(m.group(2))
                        subnet = self._cidr_to_netmask(cidr)
                elif "link/ether" in line:
                    m = re.search(r'link/ether ([0-9a-f:]{17})', line)
                    if m:
                        iface_mac = m.group(1)
        except Exception:
            pass

        try:
            ssid = await self._get_linux_ssid()
        except Exception:
            pass

        if gw_ip:
            gw_mac = await self._resolve_mac_by_ip(gw_ip)

        return NetworkInfo(
            ssid=ssid, gateway_ip=gw_ip, gateway_mac=gw_mac,
            subnet=subnet, interface_name=iface_name,
            interface_ip=iface_ip, interface_mac=iface_mac,
        )

    async def _get_linux_ssid(self) -> str:
        for cmd in [
            ["nmcli", "-t", "-f", "ACTIVE,SSID", "dev", "wifi"],
            ["iwgetid", "-r"],
        ]:
            try:
                r = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                if r.returncode == 0 and r.stdout.strip():
                    if cmd[0] == "nmcli":
                        for line in r.stdout.split('\n'):
                            if line.startswith("yes:"):
                                return line.split(":", 1)[1].strip()
                    else:
                        return r.stdout.strip()
            except Exception:
                continue
        return "Unknown"

    async def _get_macos_network_info(self) -> NetworkInfo:
        ssid = "Unknown"
        gw_ip = ""
        iface_name = ""
        iface_ip = ""
        iface_mac = ""
        subnet = ""

        try:
            r = subprocess.run(["networksetup", "-getairportnetwork", "en0"], capture_output=True, text=True, timeout=5)
            m = re.search(r'Network:\s*(.+)', r.stdout)
            if m:
                ssid = m.group(1).strip()
        except Exception:
            pass

        try:
            r = subprocess.run(["route", "-n", "get", "default"], capture_output=True, text=True, timeout=5)
            for line in r.stdout.split('\n'):
                if "gateway:" in line:
                    parts = line.split(":", 1)
                    gw_ip = parts[1].strip()
                elif "interface:" in line:
                    parts = line.split(":", 1)
                    iface_name = parts[1].strip()
        except Exception:
            pass

        try:
            r = subprocess.run(["ifconfig", iface_name], capture_output=True, text=True, timeout=5)
            for line in r.stdout.split('\n'):
                line = line.strip()
                if "inet " in line:
                    m = re.search(r'inet (\d+\.\d+\.\d+\.\d+) netmask (0x[0-9a-f]+)', line)
                    if m:
                        iface_ip = m.group(1)
                        subnet = self._hex_netmask_to_dotted(m.group(2))
                elif "ether" in line:
                    m = re.search(r'ether ([0-9a-f:]{17})', line)
                    if m:
                        iface_mac = m.group(1)
        except Exception:
            pass

        return NetworkInfo(
            ssid=ssid, gateway_ip=gw_ip,
            subnet=subnet, interface_name=iface_name,
            interface_ip=iface_ip, interface_mac=iface_mac,
        )

    async def _resolve_hostname(self, ip: str) -> Optional[str]:
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: socket.gethostbyaddr(ip)[0]
            )
            if result:
                return result
        except (socket.herror, socket.gaierror):
            pass
        if platform.system().lower() == "windows":
            try:
                r = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: subprocess.run(
                        ["nbtstat", "-A", ip],
                        capture_output=True, text=True, timeout=5,
                    )
                )
                for line in r.stdout.split('\n'):
                    m = re.search(r'^\s+(\S+)\s+<00>\s+UNIQUE', line)
                    if m:
                        return m.group(1).strip()
            except Exception:
                pass
        return None

    async def _fallback_arp_scan(self) -> list[dict]:
        system = platform.system().lower()
        try:
            if system == "windows":
                result = subprocess.run(["arp", "-a"], capture_output=True, text=True, timeout=10)
                devices = []
                for line in result.stdout.split('\n'):
                    m = re.match(r'\s*(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F-]{17})\s+', line)
                    if m:
                        devices.append({"ip": m.group(1), "mac": m.group(2).replace('-', ':').lower()})
                return devices
            else:
                result = subprocess.run(["arp", "-n"], capture_output=True, text=True, timeout=10)
                devices = []
                for line in result.stdout.split('\n'):
                    m = re.match(r'[\w.]+ \((\d+\.\d+\.\d+\.\d+)\) at ([0-9a-fA-F:]{17})', line)
                    if m:
                        devices.append({"ip": m.group(1), "mac": m.group(2).lower()})
                return devices
        except Exception as e:
            logger.error(f"Fallback ARP scan failed: {e}")
            return []

    def _calculate_subnet(self, ip: Optional[str], netmask: Optional[str]) -> Optional[str]:
        if not ip or not netmask:
            return None
        try:
            ip_parts = [int(x) for x in ip.split('.')]
            mask_parts = [int(x) for x in netmask.split('.')]
            network = [ip_parts[i] & mask_parts[i] for i in range(4)]
            cidr = sum(bin(m).count('1') for m in mask_parts)
            return f"{'.'.join(str(x) for x in network)}/{cidr}"
        except (ValueError, IndexError):
            return None

    def _cidr_to_netmask(self, cidr: int) -> str:
        mask = (0xFFFFFFFF << (32 - cidr)) & 0xFFFFFFFF
        return f"{(mask >> 24) & 0xFF}.{(mask >> 16) & 0xFF}.{(mask >> 8) & 0xFF}.{mask & 0xFF}"

    def _hex_netmask_to_dotted(self, hex_mask: str) -> str:
        try:
            val = int(hex_mask, 16)
            return f"{(val >> 24) & 0xFF}.{(val >> 16) & 0xFF}.{(val >> 8) & 0xFF}.{val & 0xFF}"
        except ValueError:
            return ""
