class NetSentinelError(Exception):
    """Base exception for all engine errors."""
    pass


class NmapNotFoundError(NetSentinelError):
    """Raised when nmap is not installed or not found in PATH."""
    pass


class PermissionDeniedError(NetSentinelError):
    """Raised when OS permissions are insufficient (e.g., no admin/root)."""
    pass


class ScanCancelledError(NetSentinelError):
    """Raised when the user cancels an active scan."""
    pass


class NetworkChangeError(NetSentinelError):
    """Raised when the network changes mid-operation."""
    pass


class DiscoveryError(NetSentinelError):
    """Raised when discovery fails."""
    pass


class PortScanError(NetSentinelError):
    """Raised when port scanning fails."""
    pass


class VulnerabilityError(NetSentinelError):
    """Raised when vulnerability detection fails."""
    pass


class LatencyError(NetSentinelError):
    """Raised when latency measurement fails."""
    pass
