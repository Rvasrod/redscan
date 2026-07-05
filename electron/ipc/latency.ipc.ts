import { randomUUID } from 'crypto';
import { IpcMain } from 'electron';
import { Database } from '../services/database';
import { Logger } from '../services/logger';
import { httpRequest } from '../utils/http';
import { createEvent } from '../services/events';
import { NetworkRepository, LatencyRepository } from '../services/repositories';

export function registerLatencyIpc(ipcMain: IpcMain, db: Database, pythonManager: { port: number }): void {
  ipcMain.handle('latency:measure', async (_event, params: { target?: string }) => {
    try {
      const target = params.target ?? 'gateway';
      const data = await httpRequest(`http://127.0.0.1:${pythonManager.port}/api/v1/latency/measure?target=${encodeURIComponent(target)}`, {
        method: 'POST',
      });
      const result = JSON.parse(data);
      persistLatency(db, result);
      return { success: true, data: result };
    } catch (err) {
      Logger.error('Failed to measure latency', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });
}

function persistLatency(db: Database, measurement: any): void {
  try {
    const networkRepo = new NetworkRepository(db);
    const latencyRepo = new LatencyRepository(db);

    const latestNetwork = networkRepo.findLatest();
    if (!latestNetwork) {
      Logger.warn('No network found for latency persistence');
      return;
    }

    latencyRepo.insert({
      id: randomUUID(), network_id: latestNetwork.id, timestamp: measurement.timestamp,
      target: measurement.target, avg_latency_ms: measurement.avg_latency_ms,
      min_latency_ms: measurement.min_latency_ms, max_latency_ms: measurement.max_latency_ms,
      jitter_ms: measurement.jitter_ms, packet_loss_pct: measurement.packet_loss_pct,
    });

    if (measurement.avg_latency_ms > 150) {
      createEvent(db, {
        networkId: latestNetwork.id,
        type: 'latency_high', severity: 'warning',
        title: `High latency detected (${Math.round(measurement.avg_latency_ms)}ms)`,
        description: `Target: ${measurement.target} — Avg: ${measurement.avg_latency_ms.toFixed(1)}ms, Jitter: ${measurement.jitter_ms.toFixed(1)}ms, Loss: ${measurement.packet_loss_pct.toFixed(1)}%`,
      });
    }

    if (measurement.packet_loss_pct > 5) {
      createEvent(db, {
        networkId: latestNetwork.id,
        type: 'latency_high', severity: 'critical',
        title: `Packet loss detected (${measurement.packet_loss_pct.toFixed(1)}%)`,
        description: `Target: ${measurement.target} — ${measurement.packet_loss_pct.toFixed(1)}% packet loss`,
      });
    }

    Logger.debug(`Persisted latency measurement for ${measurement.target}`);
  } catch (err) {
    Logger.error('Failed to persist latency measurement', err as Error);
  }
}
