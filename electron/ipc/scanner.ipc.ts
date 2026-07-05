import { randomUUID } from 'crypto';
import { IpcMain } from 'electron';
import { Database } from '../services/database';
import { PythonManager } from '../services/python-manager';
import { Logger } from '../services/logger';
import { httpRequest } from '../utils/http';

export function registerScannerIpc(ipcMain: IpcMain, db: Database, pythonManager: PythonManager): void {
  ipcMain.handle('scanner:port-scan', async (_event, params: { targetIp: string; ports?: string; scanType?: string; versionDetection?: boolean }) => {
    try {
      const body = JSON.stringify({
        target_ip: params.targetIp,
        ports: params.ports,
        scan_type: params.scanType ?? 'tcp_syn',
        version_detection: params.versionDetection ?? false,
      });

      const data = await httpRequest(`http://127.0.0.1:${pythonManager.port}/api/v1/scan/ports`, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
      });

      const result = JSON.parse(data);
      persistPortScan(db, result);
      return { success: true, data: result };
    } catch (err) {
      Logger.error('Failed to run port scan', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('scanner:get-scan-types', async () => {
    try {
      const data = await httpRequest(`http://127.0.0.1:${pythonManager.port}/api/v1/scan/types`, { method: 'GET' });
      return { success: true, data: JSON.parse(data) };
    } catch (err) {
      Logger.error('Failed to get scan types', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('scanner:vulnerability-scan', async (_event, params: { targetIp: string; ports?: string }) => {
    try {
      const body = JSON.stringify({
        target_ip: params.targetIp,
        ports: params.ports,
      });

      const data = await httpRequest(`http://127.0.0.1:${pythonManager.port}/api/v1/scan/vulnerabilities`, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
      });

      const result = JSON.parse(data);
      persistVulnerabilityScan(db, result);
      return { success: true, data: result };
    } catch (err) {
      Logger.error('Failed to run vulnerability scan', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });
}

function persistVulnerabilityScan(db: Database, result: any): void {
  try {
    const database = db.getDb();
    const now = new Date().toISOString();

    const latestSnapshot = database.prepare(
      `SELECT s.id, s.network_id FROM snapshots s
       JOIN networks n ON n.id = s.network_id
       WHERE n.gateway_ip = ?
       ORDER BY s.captured_at DESC LIMIT 1`
    ).get(result.target_ip) as { id: string; network_id: string } | undefined;

    if (!latestSnapshot) {
      Logger.warn(`No snapshot found for ${result.target_ip}, skipping vuln persistence`);
      return;
    }

    const latestDevice = database.prepare(
      'SELECT id FROM devices WHERE snapshot_id = ? AND ip = ? LIMIT 1'
    ).get(latestSnapshot.id, result.target_ip) as { id: string } | undefined;

    if (!latestDevice) {
      Logger.warn(`No device record for ${result.target_ip}, skipping vuln persistence`);
      return;
    }

    const portScanId = randomUUID();
    database.prepare(
      `INSERT INTO port_scans (id, snapshot_id, device_id, scan_type, started_at, completed_at, results, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      portScanId, latestSnapshot.id, latestDevice.id,
      'vulnerability', now, now, JSON.stringify(result), 'completed',
    );

    const insertVuln = database.prepare(
      `INSERT INTO vulnerabilities (id, port_scan_id, port, service, cve_id, severity, description, recommendation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const vuln of result.vulnerabilities) {
      insertVuln.run(
        randomUUID(), portScanId, vuln.port, vuln.service,
        vuln.cve_id, vuln.severity, vuln.description, vuln.recommendation,
      );
    }

    Logger.info(`Persisted ${result.total_found} vulns for ${result.target_ip} (scan ${portScanId})`);
  } catch (err) {
    Logger.error('Failed to persist vulnerability scan', err as Error);
  }
}

function persistPortScan(db: Database, result: any): void {
  try {
    const database = db.getDb();
    const now = new Date().toISOString();

    const latestSnapshot = database.prepare(
      `SELECT s.id, s.network_id FROM snapshots s
       JOIN networks n ON n.id = s.network_id
       WHERE n.gateway_ip = ?
       ORDER BY s.captured_at DESC LIMIT 1`
    ).get(result.target_ip) as { id: string; network_id: string } | undefined;

    if (!latestSnapshot) {
      Logger.warn(`No snapshot found for ${result.target_ip}, skipping persistence`);
      return;
    }

    const latestDevice = database.prepare(
      'SELECT id FROM devices WHERE snapshot_id = ? AND ip = ? LIMIT 1'
    ).get(latestSnapshot.id, result.target_ip) as { id: string } | undefined;

    if (!latestDevice) {
      Logger.warn(`No device record for ${result.target_ip}, skipping persistence`);
      return;
    }

    const portScanId = randomUUID();
    database.prepare(
      `INSERT INTO port_scans (id, snapshot_id, device_id, scan_type, started_at, completed_at, results, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      portScanId, latestSnapshot.id, latestDevice.id,
      result.scan_type, now, now, JSON.stringify(result), 'completed',
    );

    Logger.info(`Persisted port scan ${portScanId} for ${result.target_ip}`);
  } catch (err) {
    Logger.error('Failed to persist port scan', err as Error);
  }
}
