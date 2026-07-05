import pytest
from app.models.discovery import NetworkInfo, DiscoveredDevice, DiscoveryResult


class TestDiscoveryModels:
    def test_network_info_creation(self, sample_network_info):
        info = NetworkInfo(**sample_network_info)
        assert info.ssid == "TestNetwork"
        assert info.gateway_ip == "192.168.1.1"
        assert info.interface_mac == "aa:bb:cc:dd:ee:ff"

    def test_network_info_optional_fields(self):
        info = NetworkInfo(ssid="Test", gateway_ip="10.0.0.1")
        assert info.subnet is None
        assert info.interface_mac is None

    def test_discovered_device_defaults(self):
        device = DiscoveredDevice(ip="10.0.0.5")
        assert device.is_gateway is False
        assert device.mac is None
        assert device.vendor is None

    def test_discovery_result_creation(self, sample_devices, sample_network_info):
        network = NetworkInfo(**sample_network_info)
        devices = [DiscoveredDevice(**d) for d in sample_devices]
        result = DiscoveryResult(
            network=network,
            devices=devices,
            device_count=len(devices),
            scan_duration_ms=150.5,
        )
        assert result.device_count == 3
        assert result.scan_duration_ms == 150.5
        assert result.network.ssid == "TestNetwork"
