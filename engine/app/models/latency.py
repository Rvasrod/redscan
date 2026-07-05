from pydantic import BaseModel
from typing import Optional


class LatencyMeasurement(BaseModel):
    target: str
    avg_latency_ms: float
    min_latency_ms: float
    max_latency_ms: float
    jitter_ms: float
    packet_loss_pct: float
    timestamp: str
