import { randomUUID } from 'crypto';
import { IpcMain } from 'electron';
import { Database } from '../services/database';
import { PythonManager } from '../services/python-manager';
import { Logger } from '../services/logger';
import { httpRequest } from '../utils/http';
import { createEvent } from '../services/events';
import { SnapshotRepository, DeviceRepository, PortScanRepository, VulnerabilityRepository } from '../services/repositories';

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
    const snapshotRepo = new SnapshotRepository(db);
    const deviceRepo = new DeviceRepository(db);
    const portScanRepo = new PortScanRepository(db);
    const vulnRepo = new VulnerabilityRepository(db);
    const now = new Date().toISOString();

    const latestSnapshot = snapshotRepo.findByGatewayIp(result.target_ip);
    if (!latestSnapshot) {
      Logger.warn(`No snapshot found for ${result.target_ip}, skipping vuln persistence`);
      return;
    }

    const latestDevice = deviceRepo.findInSnapshot(latestSnapshot.id, result.target_ip);
    if (!latestDevice) {
      Logger.warn(`No device record for ${result.target_ip}, skipping vuln persistence`);
      return;
    }

    const portScanId = randomUUID();
    portScanRepo.insert({
      id: portScanId, snapshot_id: latestSnapshot.id, device_id: latestDevice.id,
      scan_type: 'vulnerability', started_at: now, completed_at: now,
      results: JSON.stringify(result), status: 'completed',
    });

    for (const vuln of result.vulnerabilities) {
      vulnRepo.insert({
        id: randomUUID(), port_scan_id: portScanId, port: vuln.port,
        service: vuln.service, cve_id: vuln.cve_id, severity: vuln.severity,
        description: vuln.description, recommendation: vuln.recommendation,
      });
    }

    if (result.vulnerabilities.length > 0) {
      const criticalOnes = result.vulnerabilities.filter((v: any) => v.severity === 'critical');
      const highOnes = result.vulnerabilities.filter((v: any) => v.severity === 'high');

      if (criticalOnes.length > 0) {
        createEvent(db, {
          networkId: latestSnapshot.network_id,
          type: 'vuln_critical', severity: 'critical',
          title: `Critical vulnerability found on ${result.target_ip}`,
          description: `${criticalOnes.length} critical CVE(s) found — ${criticalOnes.map((v: any) => v.cve_id).join(', ')}`,
        });
      }

      if (highOnes.length > 0) {
        createEvent(db, {
          networkId: latestSnapshot.network_id,
          type: 'vuln_critical', severity: 'warning',
          title: `High severity vulnerability found on ${result.target_ip}`,
          description: `${highOnes.length} high severity CVE(s) found`,
        });
      }
    }

    Logger.info(`Persisted ${result.total_found} vulns for ${result.target_ip} (scan ${portScanId})`);
  } catch (err) {
    Logger.error('Failed to persist vulnerability scan', err as Error);
  }
}

function persistPortScan(db: Database, result: any): void {
  try {
    const snapshotRepo = new SnapshotRepository(db);
    const deviceRepo = new DeviceRepository(db);
    const portScanRepo = new PortScanRepository(db);
    const now = new Date().toISOString();

    const latestSnapshot = snapshotRepo.findByGatewayIp(result.target_ip);
    if (!latestSnapshot) {
      Logger.warn(`No snapshot found for ${result.target_ip}, skipping persistence`);
      return;
    }

    const latestDevice = deviceRepo.findInSnapshot(latestSnapshot.id, result.target_ip);
    if (!latestDevice) {
      Logger.warn(`No device record for ${result.target_ip}, skipping persistence`);
      return;
    }

    const portScanId = randomUUID();
    portScanRepo.insert({
      id: portScanId, snapshot_id: latestSnapshot.id, device_id: latestDevice.id,
      scan_type: result.scan_type, started_at: now, completed_at: now,
      results: JSON.stringify(result), status: 'completed',
    });

    if (result.open_ports && result.open_ports.length > 0) {
      createEvent(db, {
        networkId: latestSnapshot.network_id,
        type: 'port_new', severity: 'info',
        title: `Open ports found on ${result.target_ip}`,
        description: `${result.open_ports.length} open port(s): ${result.open_ports.map((p: any) => `${p.port}/${p.protocol ?? 'tcp'}`).join(', ')}`,
      });
    }

    Logger.info(`Persisted port scan ${portScanId} for ${result.target_ip}`);
  } catch (err) {
    Logger.error('Failed to persist port scan', err as Error);
  }
}
