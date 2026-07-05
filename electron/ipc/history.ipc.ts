import { randomUUID } from 'crypto';
import { IpcMain } from 'electron';
import { Database } from '../services/database';
import { Logger } from '../services/logger';

export function registerHistoryIpc(ipcMain: IpcMain, db: Database): void {
  ipcMain.handle('history:get-networks', async () => {
    try {
      const networks = db.getDb().prepare('SELECT * FROM networks ORDER BY last_seen DESC').all();
      return { success: true, data: networks };
    } catch (err) {
      Logger.error('Failed to get networks', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('history:get-snapshots', async (_event, networkId: string) => {
    try {
      const snapshots = db.getDb()
        .prepare('SELECT * FROM snapshots WHERE network_id = ? ORDER BY captured_at DESC')
        .all(networkId);
      return { success: true, data: snapshots };
    } catch (err) {
      Logger.error('Failed to get snapshots', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('history:get-snapshot-detail', async (_event, snapshotId: string) => {
    try {
      const snapshot = db.getDb().prepare('SELECT * FROM snapshots WHERE id = ?').get(snapshotId);
      const devices = db.getDb().prepare('SELECT * FROM devices WHERE snapshot_id = ?').all(snapshotId);
      return { success: true, data: { snapshot, devices } };
    } catch (err) {
      Logger.error('Failed to get snapshot detail', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('history:get-events', async (_event, networkId: string) => {
    try {
      const events = db.getDb()
        .prepare('SELECT * FROM events WHERE network_id = ? ORDER BY created_at DESC LIMIT 50')
        .all(networkId);
      return { success: true, data: events };
    } catch (err) {
      Logger.error('Failed to get events', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('history:compare', async (_event, snapshotIdA: string, snapshotIdB: string) => {
    try {
      const database = db.getDb();
      const devicesA = database.prepare('SELECT * FROM devices WHERE snapshot_id = ?').all(snapshotIdA) as any[];
      const devicesB = database.prepare('SELECT * FROM devices WHERE snapshot_id = ?').all(snapshotIdB) as any[];

      const snapA = database.prepare('SELECT * FROM snapshots WHERE id = ?').get(snapshotIdA) as any;
      const snapB = database.prepare('SELECT * FROM snapshots WHERE id = ?').get(snapshotIdB) as any;
      const networkId = snapA?.network_id || '';

      const ipsA = new Set(devicesA.map(d => d.ip));
      const ipsB = new Set(devicesB.map(d => d.ip));

      const newDevices = devicesB.filter(d => !ipsA.has(d.ip));
      const removedDevices = devicesA.filter(d => !ipsB.has(d.ip));
      const commonDevices = devicesB.filter(d => ipsA.has(d.ip));

      const now = new Date().toISOString();
      const insertEvent = database.prepare(
        `INSERT INTO events (id, network_id, snapshot_id, type, severity, title, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const d of newDevices) {
        insertEvent.run(randomUUID(), networkId, snapshotIdB, 'device_new', 'info',
          `New device detected: ${d.ip}`,
          `Device ${d.ip}${d.hostname ? ` (${d.hostname})` : ''} appeared on the network.`);
      }

      for (const d of removedDevices) {
        insertEvent.run(randomUUID(), networkId, snapshotIdB, 'device_gone', 'warning',
          `Device removed: ${d.ip}`,
          `Device ${d.ip}${d.hostname ? ` (${d.hostname})` : ''} is no longer on the network.`);
      }

      return {
        success: true,
        data: {
          newDevices,
          removedDevices,
          commonDevices,
          totalBefore: devicesA.length,
          totalAfter: devicesB.length,
        },
      };
    } catch (err) {
      Logger.error('Failed to compare snapshots', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });
}
