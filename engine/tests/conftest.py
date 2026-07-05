import pytest


@pytest.fixture
def sample_network_info():
    return {
        "ssid": "TestNetwork",
        "gateway_ip": "192.168.1.1",
        "gateway_mac": "00:11:22:33:44:55",
        "subnet": "255.255.255.0",
        "interface_name": "eth0",
        "interface_ip": "192.168.1.100",
        "interface_mac": "aa:bb:cc:dd:ee:ff",
    }


@pytest.fixture
def sample_devices():
    return [
        {"ip": "192.168.1.1", "mac": "00:11:22:33:44:55", "is_gateway": True},
        {"ip": "192.168.1.101", "mac": "aa:11:22:33:44:55", "is_gateway": False},
        {"ip": "192.168.1.102", "mac": "bb:11:22:33:44:55", "is_gateway": False},
    ]
