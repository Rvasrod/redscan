import pytest
from app.models.port_scan import PortScanRequest, PortInfo, PortScanResult


class TestPortScanModels:
    def test_port_scan_request_defaults(self):
        req = PortScanRequest(target_ip="192.168.1.1")
        assert req.scan_type == "tcp"
        assert req.ports is None

    def test_port_scan_request_custom(self):
        req = PortScanRequest(
            target_ip="10.0.0.1",
            ports="22,80,443",
            scan_type="tcp",
        )
        assert req.ports == "22,80,443"

    def test_port_info_creation(self):
        port = PortInfo(port=80, state="open", service="http", version="nginx 1.24")
        assert port.port == 80
        assert port.state == "open"
        assert port.service == "http"

    def test_port_scan_result(self):
        ports = [
            PortInfo(port=22, state="open", service="ssh"),
            PortInfo(port=80, state="open", service="http"),
        ]
        result = PortScanResult(
            target_ip="10.0.0.1",
            open_ports=ports,
            total_scanned=2,
            scan_duration_ms=5000.0,
            scan_type="tcp",
        )
        assert result.total_scanned == 2
        assert len(result.open_ports) == 2
        assert result.scan_duration_ms == 5000.0
