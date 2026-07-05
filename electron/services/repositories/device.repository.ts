import { BaseRepository } from './base.repository';

export interface DeviceRow {
  id: string;
  snapshot_id: string;
  ip: string;
  mac: string | null;
  hostname: string | null;
  vendor: string | null;
  first_seen: string;
  last_seen: string;
  is_gateway: number;
}

export class DeviceRepository extends BaseRepository {
  findBySnapshotId(snapshotId: string): DeviceRow[] {
    return this.database.prepare('SELECT * FROM devices WHERE snapshot_id = ?').all(snapshotId) as DeviceRow[];
  }

  findInSnapshot(snapshotId: string, ip: string): DeviceRow | undefined {
    return this.database.prepare(
      'SELECT id FROM devices WHERE snapshot_id = ? AND ip = ? LIMIT 1'
    ).get(snapshotId, ip) as DeviceRow | undefined;
  }

  insert(device: {
    id: string; snapshot_id: string; ip: string; mac?: string;
    hostname?: string; vendor?: string; first_seen: string;
    last_seen: string; is_gateway: number;
  }): void {
    this.database.prepare(
      `INSERT INTO devices (id, snapshot_id, ip, mac, hostname, vendor, first_seen, last_seen, is_gateway)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(device.id, device.snapshot_id, device.ip, device.mac ?? null,
      device.hostname ?? null, device.vendor ?? null,
      device.first_seen, device.last_seen, device.is_gateway);
  }
}
