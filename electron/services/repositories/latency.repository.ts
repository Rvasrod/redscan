import { BaseRepository } from './base.repository';

export interface LatencyRow {
  id: string;
  network_id: string;
  timestamp: string;
  target: string;
  avg_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
  jitter_ms: number;
  packet_loss_pct: number;
}

export class LatencyRepository extends BaseRepository {
  insert(measurement: {
    id: string; network_id: string; timestamp: string; target: string;
    avg_latency_ms: number; min_latency_ms: number; max_latency_ms: number;
    jitter_ms: number; packet_loss_pct: number;
  }): void {
    this.database.prepare(
      `INSERT INTO latency_meas (id, network_id, timestamp, target, avg_latency_ms, min_latency_ms, max_latency_ms, jitter_ms, packet_loss_pct)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(measurement.id, measurement.network_id, measurement.timestamp,
      measurement.target, measurement.avg_latency_ms, measurement.min_latency_ms,
      measurement.max_latency_ms, measurement.jitter_ms, measurement.packet_loss_pct);
  }
}
