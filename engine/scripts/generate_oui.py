"""Generate OUI database from nmap-mac-prefixes file."""
import re
import sys
from pathlib import Path


def main():
    src = Path(__file__).parent.parent.parent / "resources" / "nmap-mac-prefixes"
    dst = Path(__file__).parent.parent / "app" / "utils" / "oui.py"

    entries = {}
    with open(src, encoding="utf-8") as f:
        for line in f:
            m = re.match(r'^([0-9A-Fa-f]{6})\s+(.+)$', line)
            if m:
                prefix = m.group(1).upper()
                prefix_fmt = f"{prefix[:2]}:{prefix[2:4]}:{prefix[4:]}"
                vendor = m.group(2).strip().replace("'", "\\'")
                entries[prefix_fmt] = vendor

    with open(dst, "w", encoding="utf-8") as f:
        f.write('"""\n')
        f.write('Auto-generated OUI database from nmap-mac-prefixes.\n')
        f.write('"""\n\n')
        f.write('from typing import Optional\n\n\n')
        f.write('def lookup_vendor(mac: str) -> Optional[str]:\n')
        f.write('    if not mac or len(mac) < 8:\n')
        f.write('        return None\n')
        f.write('    prefix = mac[:8].upper()\n')
        f.write('    return _OUI_DATABASE.get(prefix)\n\n\n')
        f.write('_OUI_DATABASE: dict[str, str] = {\n')
        for prefix, vendor in sorted(entries.items()):
            f.write(f"    '{prefix}': '{vendor}',\n")
        f.write('}\n')

    print(f"Generated {len(entries)} OUI entries -> {dst}")


if __name__ == "__main__":
    main()
