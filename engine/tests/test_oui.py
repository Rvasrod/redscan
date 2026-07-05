import pytest
from app.utils.oui import lookup_vendor


class TestOuiLookup:
    def test_known_cisco(self):
        vendor = lookup_vendor("00:00:0c:12:34:56")
        assert vendor == "Cisco Systems"

    def test_known_apple(self):
        vendor = lookup_vendor("00:03:93:ab:cd:ef")
        assert vendor == "Apple"

    def test_known_vmware(self):
        vendor = lookup_vendor("00:0c:29:12:34:56")
        assert vendor == "VMware"

    def test_unknown_prefix(self):
        vendor = lookup_vendor("ff:ff:ff:12:34:56")
        assert vendor is None

    def test_empty_mac(self):
        vendor = lookup_vendor("")
        assert vendor is None

    def test_none_mac(self):
        vendor = lookup_vendor(None)
        assert vendor is None
