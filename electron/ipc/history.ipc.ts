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

  ipcMain.handle('history:compare', async (_event, snapshotIdA: string, snapshotIdB: string) => {
    try {
      const devicesA = db.getDb().prepare('SELECT * FROM devices WHERE snapshot_id = ?').all(snapshotIdA) as any[];
      const devicesB = db.getDb().prepare('SELECT * FROM devices WHERE snapshot_id = ?').all(snapshotIdB) as any[];

      const ipsA = new Set(devicesA.map(d => d.ip));
      const ipsB = new Set(devicesB.map(d => d.ip));

      const newDevices = devicesB.filter(d => !ipsA.has(d.ip));
      const removedDevices = devicesA.filter(d => !ipsB.has(d.ip));
      const commonDevices = devicesB.filter(d => ipsA.has(d.ip));

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
