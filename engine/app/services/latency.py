import asyncio
import platform
import subprocess
import time
from datetime import datetime, timezone
from typing import Optional

from app.core.logger import logger
from app.core.exceptions import LatencyError
from app.models.latency import LatencyMeasurement


class LatencyService:
    def __init__(self, ping_count: int = 5):
        self.ping_count = ping_count

    async def measure(self, target: str = "gateway") -> LatencyMeasurement:
        logger.info(f"Measuring latency to {target}")
        try:
            times: list[float] = []
            failed = 0

            for i in range(self.ping_count):
                try:
                    elapsed = await self._ping(target)
                    times.append(elapsed)
                except LatencyError:
                    failed += 1
                    logger.debug(f"Ping {i + 1}/{self.ping_count} to {target} failed")
                if i < self.ping_count - 1:
                    await asyncio.sleep(0.2)

            total = self.ping_count
            loss = (failed / total) * 100

            if not times:
                return LatencyMeasurement(
                    target=target,
                    avg_latency_ms=0,
                    min_latency_ms=0,
                    max_latency_ms=0,
                    jitter_ms=0,
                    packet_loss_pct=100.0,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )

            avg = sum(times) / len(times)
            min_t = min(times)
            max_t = max(times)
            jitter = max_t - min_t

            return LatencyMeasurement(
                target=target,
                avg_latency_ms=round(avg, 2),
                min_latency_ms=round(min_t, 2),
                max_latency_ms=round(max_t, 2),
                jitter_ms=round(jitter, 2),
                packet_loss_pct=round(loss, 1),
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
        except Exception as e:
            raise LatencyError(f"Latency measurement failed: {e}") from e

    async def _ping(self, target: str) -> float:
        system = platform.system().lower()
        if system == "windows":
            cmd = ["ping", "-n", "1", "-w", "2000", target]
        else:
            cmd = ["ping", "-c", "1", "-W", "2", target]

        start = time.time()
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await proc.communicate()
            if proc.returncode == 0:
                return (time.time() - start) * 1000
            raise LatencyError(f"Ping to {target} failed")
        except FileNotFoundError:
            raise LatencyError("ping command not found")
