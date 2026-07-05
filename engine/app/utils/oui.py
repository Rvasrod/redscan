"""
OUI (Organizationally Unique Identifier) lookup for MAC addresses.

Uses an embedded OUI database to resolve MAC prefixes to vendor names.
"""

from typing import Optional

_OUI_DATABASE: dict[str, str] = {
    "00:00:0C": "Cisco Systems",
    "00:01:42": "Google",
    "00:03:93": "Apple",
    "00:05:69": "Hewlett-Packard",
    "00:0A:27": "Dell",
    "00:0A:95": "Intel",
    "00:0B:82": "Samsung Electronics",
    "00:0C:29": "VMware",
    "00:0E:07": "Xiaomi Communications",
    "00:0F:55": "Huawei Technologies",
    "00:10:18": "Sony",
    "00:10:60": "Netgear",
    "00:11:22": "Hon Hai Precision (Foxconn)",
    "00:12:17": "Linksys",
    "00:13:10": "TP-Link Technologies",
    "00:13:46": "D-Link",
    "00:14:BF": "Raspberry Pi Foundation",
    "00:15:5D": "Microsoft",
    "00:16:EA": "ASUSTek Computer",
    "00:17:C8": "Acer",
    "00:18:0A": "Belkin International",
    "00:1A:A0": "Broadcom",
    "00:1B:2F": "Roku",
    "00:1C:BF": "Nintendo",
    "00:1D:0F": "Cisco-Linksys",
    "00:1E:06": "Panasonic",
    "00:1F:3A": "Fuji Xerox",
    "00:20:ED": "IBM",
    "00:21:5A": "Motorola",
    "00:21:6A": "Zyxel Communications",
    "00:21:91": "LG Electronics",
    "00:22:19": "Texas Instruments",
    "00:22:3D": "Arris Group",
    "00:22:75": "Toshiba",
    "00:22:B0": "Canon",
    "00:23:0E": "Funai Electric",
    "00:23:14": "Mitsubishi Electric",
    "00:23:31": "Nokia",
    "00:23:8B": "Panasonic",
    "00:23:CD": "Seiko Epson",
    "00:24:1C": "Atheros Communications",
    "00:24:2C": "Renesas Technology",
    "00:24:81": "Yamaha",
    "00:24:A4": "Juniper Networks",
    "00:25:36": "Vizio",
    "00:25:9C": "Alcatel-Lucent",
    "00:25:D3": "Marvell Semiconductor",
    "00:26:08": "Fujitsu",
    "00:26:5E": "Askey Computer",
    "00:26:BB": "Avaya",
    "00:26:C6": "Cisco Systems",
    "00:27:01": "Bose",
    "00:27:10": "AzureWave Technologies",
    "00:28:F8": "Universal Global Scientific",
    "00:29:04": "HTC",
    "00:29:4A": "Compal Electronics",
    "00:29:61": "Netgear",
    "00:29:F5": "Wistron",
    "00:2A:5C": "Hitachi",
    "00:2A:6A": "Sagemcom",
    "00:2B:21": "Murata Manufacturing",
    "00:2B:6B": "Starbridge Networks",
    "00:2C:13": "Tatung",
    "00:2C:54": "Sierra Wireless",
    "00:2C:C8": "ZyXEL Communications",
    "00:2D:0E": "Shenzhen TCL New Technology",
    "00:2D:8F": "NEC",
    "00:2E:17": "Wistron",
    "00:2E:59": "Harman International",
    "00:2E:6F": "JVC Kenwood",
    "00:2F:4B": "Garmin International",
    "00:2F:A2": "Intel Corporate",
}


def lookup_vendor(mac: str) -> Optional[str]:
    if not mac or len(mac) < 8:
        return None

    prefix = mac[:8].upper()
    if prefix in _OUI_DATABASE:
        return _OUI_DATABASE[prefix]

    return None
