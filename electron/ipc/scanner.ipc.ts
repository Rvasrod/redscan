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
        timeout: 300000,
      });

      const result = JSON.parse(data);
      persistPortScan(db, result);
      return { success: true, data: result };
    } catch (err) {
      Logger.error('Failed to run port scan', err as Error);
      const msg = (err as Error).message;
      const detailMatch = msg.match(/"detail":"([^"]+)"/);
      return { success: false, error: detailMatch ? detailMatch[1] : msg };
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

function findSnapshotAndDevice(snapshotRepo: SnapshotRepository, deviceRepo: DeviceRepository, targetIp: string): { snapshot: { id: string; network_id: string }; device: { id: string } } | null {
  const latestSnapshot = snapshotRepo.findLatest();
  if (!latestSnapshot) {
    Logger.warn(`No snapshots found, skipping persistence for ${targetIp}`);
    return null;
  }

  const deviceInLatest = deviceRepo.findInSnapshot(latestSnapshot.id, targetIp);
  if (deviceInLatest) {
    return { snapshot: { id: latestSnapshot.id, network_id: latestSnapshot.network_id }, device: deviceInLatest };
  }

  const byGateway = snapshotRepo.findByGatewayIp(targetIp);
  if (byGateway && byGateway.id !== latestSnapshot.id) {
    const deviceInGateway = deviceRepo.findInSnapshot(byGateway.id, targetIp);
    if (deviceInGateway) {
      return { snapshot: byGateway, device: deviceInGateway };
    }
  }

  Logger.warn(`No device record for ${targetIp}, skipping persistence`);
  return null;
}

function persistVulnerabilityScan(db: Database, result: any): void {
  try {
    const snapshotRepo = new SnapshotRepository(db);
    const deviceRepo = new DeviceRepository(db);
    const portScanRepo = new PortScanRepository(db);
    const vulnRepo = new VulnerabilityRepository(db);
    const now = new Date().toISOString();

    const found = findSnapshotAndDevice(snapshotRepo, deviceRepo, result.target_ip);
    if (!found) return;

    const portScanId = randomUUID();
    portScanRepo.insert({
      id: portScanId, snapshot_id: found.snapshot.id, device_id: found.device.id,
      scan_type: 'vulnerability', started_at: now, completed_at: now,
      results: JSON.stringify(result), status: 'completed',
    });

    if (result.vulnerabilities && result.vulnerabilities.length > 0) {
      for (const vuln of result.vulnerabilities) {
        vulnRepo.insert({
          id: randomUUID(), port_scan_id: portScanId, port: vuln.port,
          service: vuln.service, cve_id: vuln.cve_id, severity: vuln.severity,
          description: vuln.description, recommendation: vuln.recommendation,
        });
      }

      const criticalOnes = result.vulnerabilities.filter((v: any) => v.severity === 'critical');
      const highOnes = result.vulnerabilities.filter((v: any) => v.severity === 'high');

      if (criticalOnes.length > 0) {
        createEvent(db, {
          networkId: found.snapshot.network_id,
          type: 'vuln_critical', severity: 'critical',
          title: `Critical vulnerability found on ${result.target_ip}`,
          description: `${criticalOnes.length} critical CVE(s) found — ${criticalOnes.map((v: any) => v.cve_id).join(', ')}`,
        });
      }

      if (highOnes.length > 0) {
        createEvent(db, {
          networkId: found.snapshot.network_id,
          type: 'vuln_high', severity: 'warning',
          title: `High severity vulnerability found on ${result.target_ip}`,
          description: `${highOnes.length} high severity CVE(s) found`,
        });
      }
    }

    Logger.info(`Persisted ${result.vulnerabilities?.length ?? 0} vulns for ${result.target_ip} (scan ${portScanId})`);
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

    const found = findSnapshotAndDevice(snapshotRepo, deviceRepo, result.target_ip);
    if (!found) return;

    const portScanId = randomUUID();
    portScanRepo.insert({
      id: portScanId, snapshot_id: found.snapshot.id, device_id: found.device.id,
      scan_type: result.scan_type, started_at: now, completed_at: now,
      results: JSON.stringify(result), status: 'completed',
    });

    if (result.open_ports && result.open_ports.length > 0) {
      createEvent(db, {
        networkId: found.snapshot.network_id,
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
