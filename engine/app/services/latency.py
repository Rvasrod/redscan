import asyncio
import platform
import subprocess
import time
from datetime import datetime, timezone

from app.core.logger import logger
from app.core.exceptions import LatencyError
from app.models.latency import LatencyMeasurement


class LatencyService:
    async def measure(self, target: str = "gateway") -> LatencyMeasurement:
        logger.info(f"Measuring latency to {target}")
        try:
            times = []
            for _ in range(5):
                elapsed = await self._ping(target)
                times.append(elapsed)
                await asyncio.sleep(0.2)

            if not times:
                raise LatencyError("No ping responses received")

            avg = sum(times) / len(times)
            min_t = min(times)
            max_t = max(times)
            jitter = max_t - min_t
            loss = ((5 - len(times)) / 5) * 100

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
