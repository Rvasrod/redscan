import { BaseRepository } from './base.repository';

export interface PortScanRow {
  id: string;
  snapshot_id: string;
  device_id: string;
  scan_type: string;
  started_at: string;
  completed_at: string | null;
  results: string;
  status: string;
}

export class PortScanRepository extends BaseRepository {
  insert(scan: {
    id: string; snapshot_id: string; device_id: string;
    scan_type: string; started_at: string; completed_at: string;
    results: string; status: string;
  }): void {
    this.database.prepare(
      `INSERT INTO port_scans (id, snapshot_id, device_id, scan_type, started_at, completed_at, results, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(scan.id, scan.snapshot_id, scan.device_id,
      scan.scan_type, scan.started_at, scan.completed_at,
      scan.results, scan.status);
  }
}
