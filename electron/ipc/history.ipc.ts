import { randomUUID } from 'crypto';
import { IpcMain } from 'electron';
import { Database } from '../services/database';
import { Logger } from '../services/logger';
import { NetworkRepository, SnapshotRepository, DeviceRepository, EventRepository } from '../services/repositories';

export function registerHistoryIpc(ipcMain: IpcMain, db: Database): void {
  ipcMain.handle('history:get-networks', async () => {
    try {
      const repo = new NetworkRepository(db);
      return { success: true, data: repo.findAll() };
    } catch (err) {
      Logger.error('Failed to get networks', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('history:get-snapshots', async (_event, networkId: string) => {
    try {
      const repo = new SnapshotRepository(db);
      return { success: true, data: repo.findByNetworkId(networkId) };
    } catch (err) {
      Logger.error('Failed to get snapshots', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('history:get-snapshot-detail', async (_event, snapshotId: string) => {
    try {
      const snapshotRepo = new SnapshotRepository(db);
      const deviceRepo = new DeviceRepository(db);
      const snapshot = snapshotRepo.findById(snapshotId);
      const devices = deviceRepo.findBySnapshotId(snapshotId);
      return { success: true, data: { snapshot, devices } };
    } catch (err) {
      Logger.error('Failed to get snapshot detail', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('history:get-events', async (_event, networkId: string) => {
    try {
      const repo = new EventRepository(db);
      return { success: true, data: repo.findByNetworkId(networkId) };
    } catch (err) {
      Logger.error('Failed to get events', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('history:compare', async (_event, snapshotIdA: string, snapshotIdB: string) => {
    try {
      const deviceRepo = new DeviceRepository(db);
      const snapshotRepo = new SnapshotRepository(db);
      const eventRepo = new EventRepository(db);
      const devicesA = deviceRepo.findBySnapshotId(snapshotIdA);
      const devicesB = deviceRepo.findBySnapshotId(snapshotIdB);

      const snapA = snapshotRepo.findById(snapshotIdA);
      const snapB = snapshotRepo.findById(snapshotIdB);
      const networkId = snapA?.network_id || '';

      const ipsA = new Set(devicesA.map(d => d.ip));
      const ipsB = new Set(devicesB.map(d => d.ip));

      const newDevices = devicesB.filter(d => !ipsA.has(d.ip));
      const removedDevices = devicesA.filter(d => !ipsB.has(d.ip));
      const commonDevices = devicesB.filter(d => ipsA.has(d.ip));

      const now = new Date().toISOString();

      for (const d of newDevices) {
        eventRepo.insert({
          id: randomUUID(), network_id: networkId, snapshot_id: snapshotIdB,
          type: 'device_new', severity: 'info',
          title: `New device detected: ${d.ip}`,
          description: `Device ${d.ip}${d.hostname ? ` (${d.hostname})` : ''} appeared on the network.`,
          created_at: now,
        });
      }

      for (const d of removedDevices) {
        eventRepo.insert({
          id: randomUUID(), network_id: networkId, snapshot_id: snapshotIdB,
          type: 'device_gone', severity: 'warning',
          title: `Device removed: ${d.ip}`,
          description: `Device ${d.ip}${d.hostname ? ` (${d.hostname})` : ''} is no longer on the network.`,
          created_at: now,
        });
      }

      return {
        success: true,
        data: { newDevices, removedDevices, commonDevices, totalBefore: devicesA.length, totalAfter: devicesB.length },
      };
    } catch (err) {
      Logger.error('Failed to compare snapshots', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });
}
