"""Service-level tests for PortScannerService with mocked nmap."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.port_scan import PortScanRequest
from app.services.port_scanner import PortScannerService


class TestPortScannerService:
    """Tests for PortScannerService with mocked nmap.PortScanner."""

    @pytest.mark.asyncio
    async def test_scan_returns_open_ports(self):
        mock_nm = MagicMock()
        mock_nm.scan.return_value = {
            "scan": {
                "10.0.0.1": {
                    "tcp": {
                        "22": {"state": "open", "name": "ssh", "version": ""},
                        "80": {"state": "open", "name": "http", "version": "nginx 1.24"},
                        "443": {"state": "closed", "name": "", "version": ""},
                    },
                    "udp": {},
                }
            }
        }

        with patch("app.services.port_scanner.nmap.PortScanner", return_value=mock_nm):
            service = PortScannerService()
            request = PortScanRequest(target_ip="10.0.0.1", ports="22,80,443", scan_type="tcp_syn")

            result = await service.scan(request)

        assert result.target_ip == "10.0.0.1"
        assert len(result.open_ports) == 2
        assert result.open_ports[0].port == 22
        assert result.open_ports[0].service == "ssh"
        assert result.open_ports[1].port == 80
        assert result.open_ports[1].service == "http"
        assert result.open_ports[1].version == "nginx 1.24"
        assert result.scan_type == "tcp_syn"
        assert result.total_scanned == 2
        assert 0 < result.scan_duration_ms < 60000

    @pytest.mark.asyncio
    async def test_scan_no_open_ports(self):
        mock_nm = MagicMock()
        mock_nm.scan.return_value = {
            "scan": {
                "10.0.0.1": {
                    "tcp": {
                        "22": {"state": "filtered", "name": "", "version": ""},
                        "80": {"state": "closed", "name": "", "version": ""},
                    },
                    "udp": {},
                }
            }
        }

        with patch("app.services.port_scanner.nmap.PortScanner", return_value=mock_nm):
            service = PortScannerService()
            request = PortScanRequest(target_ip="10.0.0.1", ports="22,80")

            result = await service.scan(request)

        assert result.target_ip == "10.0.0.1"
        assert len(result.open_ports) == 0
        assert result.total_scanned == 0

    @pytest.mark.asyncio
    async def test_scan_with_progress_callback(self):
        mock_nm = MagicMock()
        mock_nm.scan.return_value = {
            "scan": {
                "10.0.0.1": {
                    "tcp": {"22": {"state": "open", "name": "ssh", "version": ""}},
                    "udp": {},
                }
            }
        }

        callback = AsyncMock()

        with patch("app.services.port_scanner.nmap.PortScanner", return_value=mock_nm):
            service = PortScannerService()
            request = PortScanRequest(target_ip="10.0.0.1")

            result = await service.scan(request, progress_callback=callback)

        assert len(result.open_ports) == 1
        assert callback.await_count >= 2
        callback.assert_any_call("Initializing tcp_syn scan...")
        callback.assert_any_call("Parsing results...")

    @pytest.mark.asyncio
    async def test_scan_udp(self):
        mock_nm = MagicMock()
        mock_nm.scan.return_value = {
            "scan": {
                "10.0.0.1": {
                    "tcp": {},
                    "udp": {
                        "53": {"state": "open", "name": "domain", "version": ""},
                        "161": {"state": "open", "name": "snmp", "version": ""},
                    },
                }
            }
        }

        with patch("app.services.port_scanner.nmap.PortScanner", return_value=mock_nm):
            service = PortScannerService()
            request = PortScanRequest(target_ip="10.0.0.1", ports="53,161", scan_type="udp")

            result = await service.scan(request)

        assert len(result.open_ports) == 2
        assert result.open_ports[0].port == 53
        assert result.open_ports[0].service == "domain"
        assert result.open_ports[1].port == 161
        assert result.open_ports[1].service == "snmp"
        assert result.scan_type == "udp"

    @pytest.mark.asyncio
    async def test_scan_version_detection_upgrades_args(self):
        mock_nm = MagicMock()
        mock_nm.scan.return_value = {"scan": {"10.0.0.1": {"tcp": {}, "udp": {}}}}

        with patch("app.services.port_scanner.nmap.PortScanner", return_value=mock_nm):
            service = PortScannerService()
            request = PortScanRequest(
                target_ip="10.0.0.1",
                scan_type="tcp_syn",
                version_detection=True,
            )
            await service.scan(request)

        args_used = mock_nm.scan.call_args[1]
        assert "-sV" in args_used["arguments"]
        assert args_used["arguments"].startswith("-sS")

    @pytest.mark.asyncio
    async def test_scan_invalid_scan_type(self):
        from app.core.exceptions import PortScanError

        with patch("app.services.port_scanner.nmap.PortScanner", MagicMock()):
            service = PortScannerService()
            request = PortScanRequest(target_ip="10.0.0.1", scan_type="invalid_type")

            with pytest.raises(PortScanError, match="Invalid scan type"):
                await service.scan(request)

    def test_get_available_types(self):
        service = PortScannerService()
        types = service.get_available_types()
        assert "tcp_syn" in types
        assert "tcp_connect" in types
        assert "udp" in types
        assert len(types) >= 3

    def test_check_nmap_raises_when_not_found(self):
        import nmap
        from app.core.exceptions import NmapNotFoundError

        with patch("app.services.port_scanner.nmap.PortScanner", side_effect=nmap.PortScannerError("nmap not found")):
            service = PortScannerService()
            with pytest.raises(NmapNotFoundError, match="nmap is not installed"):
                service._check_nmap()
