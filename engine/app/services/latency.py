from datetime import datetime, timezone
from typing import Optional

from icmplib import async_ping

from app.core.logger import logger
from app.core.exceptions import LatencyError
from app.models.latency import LatencyMeasurement
from app.services.discovery import DiscoveryService


class LatencyService:
    def __init__(self, ping_count: int = 5):
        self.ping_count = ping_count
        self._discovery = DiscoveryService()

    async def _resolve_target(self, target: str) -> str:
        if target == "gateway":
            try:
                net = await self._discovery.get_network_info()
                if net.gateway_ip:
                    logger.info(f"Resolved target 'gateway' to {net.gateway_ip}")
                    return net.gateway_ip
            except Exception as e:
                logger.warning(f"Could not resolve 'gateway', using literal: {e}")
        return target

    async def measure(self, target: str = "gateway") -> LatencyMeasurement:
        resolved = await self._resolve_target(target)
        logger.info(f"Measuring latency to {target} (resolved: {resolved})")
        try:
            host = await async_ping(
                resolved,
                count=self.ping_count,
                interval=0.2,
                timeout=2,
                privileged=True,
            )

            if host.packets_received == 0:
                return LatencyMeasurement(
                    target=target,
                    avg_latency_ms=0,
                    min_latency_ms=0,
                    max_latency_ms=0,
                    jitter_ms=0,
                    packet_loss_pct=100.0,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )

            return LatencyMeasurement(
                target=target,
                avg_latency_ms=round(host.avg_rtt, 2),
                min_latency_ms=round(host.min_rtt, 2),
                max_latency_ms=round(host.max_rtt, 2),
                jitter_ms=round(host.jitter, 2),
                packet_loss_pct=round(host.packet_loss * 100, 1),
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
        except PermissionError as e:
            raise LatencyError(
                "Latency measurement requires administrator/root privileges. "
                "Run the application as administrator (Windows) or with sudo (Linux/macOS)."
            ) from e
        except Exception as e:
            raise LatencyError(f"Latency measurement failed: {e}") from e
