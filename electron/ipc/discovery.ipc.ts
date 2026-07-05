import { randomUUID } from 'crypto';
import { IpcMain } from 'electron';
import { Database } from '../services/database';
import { PythonManager } from '../services/python-manager';
import { Logger } from '../services/logger';
import { httpRequest } from '../utils/http';
import { createEvent } from '../services/events';

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
    const database = db.getDb();
    const net = result.network;

    let existingNetwork = database.prepare(
      'SELECT id FROM networks WHERE ssid = ? AND gateway_ip = ?'
    ).get(net.ssid, net.gateway_ip) as { id: string } | undefined;

    const now = new Date().toISOString();
    let networkId: string;

    if (existingNetwork) {
      networkId = existingNetwork.id;
      database.prepare(
        'UPDATE networks SET last_seen = ?, interface_ip = ?, interface_mac = ?, interface_name = ?, subnet = ?, gateway_mac = ? WHERE id = ?'
      ).run(now, net.interface_ip, net.interface_mac, net.interface_name, net.subnet, net.gateway_mac, networkId);
    } else {
      networkId = randomUUID();
      database.prepare(
        `INSERT INTO networks (id, ssid, gateway_ip, gateway_mac, subnet, interface_name, interface_ip, interface_mac, first_seen, last_seen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(networkId, net.ssid, net.gateway_ip, net.gateway_mac, net.subnet, net.interface_name, net.interface_ip, net.interface_mac, now, now);
      createEvent(db, {
        networkId,
        type: 'network_new',
        severity: 'info',
        title: 'New network detected',
        description: `SSID: ${net.ssid} (${net.subnet})`,
      });
    }

    const snapshotId = randomUUID();
    database.prepare(
      `INSERT INTO snapshots (id, network_id, captured_at, device_count, data)
       VALUES (?, ?, ?, ?, ?)`
    ).run(snapshotId, networkId, now, result.device_count, JSON.stringify(result));

    const insertDevice = database.prepare(
      `INSERT INTO devices (id, snapshot_id, ip, mac, hostname, vendor, first_seen, last_seen, is_gateway)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

      const newIps = new Set<string>();
      for (const device of result.devices) {
        insertDevice.run(
          randomUUID(), snapshotId, device.ip, device.mac,
          device.hostname, device.vendor, device.first_seen, device.last_seen,
          device.is_gateway ? 1 : 0
        );
        newIps.add(device.ip);
      }

      const prevSnapshot = database.prepare(
        'SELECT data FROM snapshots WHERE network_id = ? AND id != ? ORDER BY captured_at DESC LIMIT 1'
      ).get(networkId, snapshotId) as { data: string } | undefined;

      if (prevSnapshot) {
        const prevData = JSON.parse(prevSnapshot.data);
        const prevIps: string[] = (prevData.devices ?? []).map((d: any) => d.ip);
        const prevIpSet = new Set<string>(prevIps);

        for (const ip of result.devices.map((d: any) => d.ip) as string[]) {
          if (!prevIpSet.has(ip)) {
            const device = result.devices.find((d: any) => d.ip === ip);
            createEvent(db, {
              networkId,
              snapshotId,
              type: 'device_new',
              severity: 'info',
              title: 'New device detected',
              description: `${device?.hostname ?? 'Unknown'} (${device?.ip ?? ip}) — ${device?.vendor ?? 'Unknown vendor'}`,
            });
          }
        }

        for (const ip of prevIps) {
          if (!newIps.has(ip)) {
            createEvent(db, {
              networkId,
              snapshotId: undefined,
              type: 'device_gone',
              severity: 'warning',
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
