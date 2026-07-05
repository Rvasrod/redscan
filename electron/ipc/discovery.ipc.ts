import { randomUUID } from 'crypto';
import { IpcMain } from 'electron';
import { Database } from '../services/database';
import { PythonManager } from '../services/python-manager';
import { Logger } from '../services/logger';
import { httpRequest } from '../utils/http';
import { createEvent } from '../services/events';
import { NetworkRepository, SnapshotRepository, DeviceRepository } from '../services/repositories';

export function registerDiscoveryIpc(ipcMain: IpcMain, db: Database, pythonManager: PythonManager): void {
  ipcMain.handle('discovery:get-network-info', async () => {
    try {
      const data = await httpRequest(`http://127.0.0.1:${pythonManager.port}/api/v1/discovery/network`, { method: 'GET' });
      return { success: true, data: JSON.parse(data) };
    } catch (err) {
      Logger.error('Failed to get network info', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('discovery:scan', async () => {
    try {
      const raw = await httpRequest(`http://127.0.0.1:${pythonManager.port}/api/v1/discovery/scan`, { method: 'POST' });
      const result = JSON.parse(raw);
      persistSnapshot(db, result);
      return { success: true, data: result };
    } catch (err) {
      Logger.error('Failed to scan network', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });
}

function persistSnapshot(db: Database, result: any): void {
  try {
    const networkRepo = new NetworkRepository(db);
    const snapshotRepo = new SnapshotRepository(db);
    const deviceRepo = new DeviceRepository(db);
    const net = result.network;

    const existingNetwork = networkRepo.findBySsidAndGateway(net.ssid, net.gateway_ip);
    const now = new Date().toISOString();
    let networkId: string;

    if (existingNetwork) {
      networkId = existingNetwork.id;
      networkRepo.update(networkId, {
        last_seen: now, interface_ip: net.interface_ip,
        interface_mac: net.interface_mac, interface_name: net.interface_name,
        subnet: net.subnet, gateway_mac: net.gateway_mac,
      });
    } else {
      networkId = randomUUID();
      networkRepo.insert({
        id: networkId, ssid: net.ssid, gateway_ip: net.gateway_ip,
        gateway_mac: net.gateway_mac, subnet: net.subnet,
        interface_name: net.interface_name, interface_ip: net.interface_ip,
        interface_mac: net.interface_mac, first_seen: now, last_seen: now,
      });
      createEvent(db, {
        networkId,
        type: 'network_new',
        severity: 'info',
        title: 'New network detected',
        description: `SSID: ${net.ssid} (${net.subnet})`,
      });
    }

    const snapshotId = randomUUID();
    snapshotRepo.insert({
      id: snapshotId, network_id: networkId, captured_at: now,
      device_count: result.device_count, data: JSON.stringify(result),
    });

    const newIps = new Set<string>();
    for (const device of result.devices) {
      deviceRepo.insert({
        id: randomUUID(), snapshot_id: snapshotId, ip: device.ip, mac: device.mac,
        hostname: device.hostname, vendor: device.vendor,
        first_seen: device.first_seen, last_seen: device.last_seen,
        is_gateway: device.is_gateway ? 1 : 0,
      });
      newIps.add(device.ip);
    }

    const prevSnapshot = snapshotRepo.findPrevious(networkId, snapshotId);
    if (prevSnapshot) {
      const prevData = JSON.parse(prevSnapshot.data);
      const prevIps: string[] = (prevData.devices ?? []).map((d: any) => d.ip);
      const prevIpSet = new Set<string>(prevIps);

      for (const ip of result.devices.map((d: any) => d.ip) as string[]) {
        if (!prevIpSet.has(ip)) {
          const device = result.devices.find((d: any) => d.ip === ip);
          createEvent(db, {
            networkId, snapshotId,
            type: 'device_new', severity: 'info',
            title: 'New device detected',
            description: `${device?.hostname ?? 'Unknown'} (${device?.ip ?? ip}) — ${device?.vendor ?? 'Unknown vendor'}`,
          });
        }
      }

      for (const ip of prevIps) {
        if (!newIps.has(ip)) {
          createEvent(db, {
            networkId, snapshotId: undefined,
            type: 'device_gone', severity: 'warning',
            title: 'Device disappeared',
            description: `Device with IP ${ip} was not found in the last scan`,
          });
        }
      }
    }

    Logger.info(`Persisted snapshot ${snapshotId} for network ${networkId} (${result.device_count} devices)`);
  } catch (err) {
    Logger.error('Failed to persist discovery snapshot', err as Error);
  }
}
