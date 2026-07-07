import { BaseRepository } from './base.repository';

export interface SnapshotRow {
  id: string;
  network_id: string;
  captured_at: string;
  device_count: number;
  data: string;
}

export class SnapshotRepository extends BaseRepository {
  findByNetworkId(networkId: string): SnapshotRow[] {
    return this.database.prepare(
      'SELECT * FROM snapshots WHERE network_id = ? ORDER BY captured_at DESC'
    ).all(networkId) as SnapshotRow[];
  }

  findById(id: string): SnapshotRow | undefined {
    return this.database.prepare('SELECT * FROM snapshots WHERE id = ?').get(id) as SnapshotRow | undefined;
  }

  findPrevious(networkId: string, excludeId: string): SnapshotRow | undefined {
    return this.database.prepare(
      'SELECT data FROM snapshots WHERE network_id = ? AND id != ? ORDER BY captured_at DESC LIMIT 1'
    ).get(networkId, excludeId) as SnapshotRow | undefined;
  }

  findLatest(): SnapshotRow | undefined {
    return this.database.prepare(
      'SELECT * FROM snapshots ORDER BY captured_at DESC LIMIT 1'
    ).get() as SnapshotRow | undefined;
  }

  findByGatewayIp(gatewayIp: string): { id: string; network_id: string } | undefined {
    return this.database.prepare(
      `SELECT s.id, s.network_id FROM snapshots s
       JOIN networks n ON n.id = s.network_id
       WHERE n.gateway_ip = ?
       ORDER BY s.captured_at DESC LIMIT 1`
    ).get(gatewayIp) as { id: string; network_id: string } | undefined;
  }

  insert(snapshot: {
    id: string; network_id: string; captured_at: string; device_count: number; data: string;
  }): void {
    this.database.prepare(
      `INSERT INTO snapshots (id, network_id, captured_at, device_count, data)
       VALUES (?, ?, ?, ?, ?)`
    ).run(snapshot.id, snapshot.network_id, snapshot.captured_at, snapshot.device_count, snapshot.data);
  }
}
