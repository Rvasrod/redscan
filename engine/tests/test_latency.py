from app.models.latency import LatencyMeasurement


class TestLatencyModels:
    def test_latency_measurement_creation(self):
        m = LatencyMeasurement(
            target="192.168.1.1",
            avg_latency_ms=12.5,
            min_latency_ms=10.2,
            max_latency_ms=15.1,
            jitter_ms=4.9,
            packet_loss_pct=0.0,
            timestamp="2025-01-01T00:00:00Z",
        )
        assert m.target == "192.168.1.1"
        assert m.avg_latency_ms == 12.5
        assert m.jitter_ms == 4.9
        assert m.packet_loss_pct == 0.0

    def test_latency_measurement_100pct_loss(self):
        m = LatencyMeasurement(
            target="10.0.0.1",
            avg_latency_ms=0,
            min_latency_ms=0,
            max_latency_ms=0,
            jitter_ms=0,
            packet_loss_pct=100.0,
            timestamp="2025-01-01T00:00:00Z",
        )
        assert m.packet_loss_pct == 100.0
        assert m.avg_latency_ms == 0

    def test_latency_measurement_types(self):
        m = LatencyMeasurement(
            target="8.8.8.8",
            avg_latency_ms=20.0,
            min_latency_ms=18.5,
            max_latency_ms=22.0,
            jitter_ms=3.5,
            packet_loss_pct=0.0,
            timestamp="2025-06-15T12:30:00Z",
        )
        assert isinstance(m.avg_latency_ms, float)
        assert isinstance(m.jitter_ms, float)
        assert isinstance(m.packet_loss_pct, float)
        assert isinstance(m.timestamp, str)
