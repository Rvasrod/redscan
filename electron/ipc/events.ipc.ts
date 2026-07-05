import { IpcMain } from 'electron';
import { Database } from '../services/database';
import { Logger } from '../services/logger';

export function registerEventsIpc(ipcMain: IpcMain, db: Database): void {
  ipcMain.handle('events:get-all', async (_event, networkId?: string) => {
    try {
      const database = db.getDb();
      const rows = networkId
        ? database.prepare(
            'SELECT * FROM events WHERE network_id = ? ORDER BY created_at DESC LIMIT 100'
          ).all(networkId)
        : database.prepare(
            'SELECT * FROM events ORDER BY created_at DESC LIMIT 100'
          ).all();
      return { success: true, data: rows };
    } catch (err) {
      Logger.error('Failed to get events', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('events:acknowledge', async (_event, eventId: string) => {
    try {
      const database = db.getDb();
      database.prepare(
        "UPDATE events SET acknowledged = 1 WHERE id = ?"
      ).run(eventId);
      return { success: true };
    } catch (err) {
      Logger.error('Failed to acknowledge event', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('events:acknowledge-all', async () => {
    try {
      const database = db.getDb();
      database.prepare(
        "UPDATE events SET acknowledged = 1 WHERE acknowledged = 0"
      ).run();
      return { success: true };
    } catch (err) {
      Logger.error('Failed to acknowledge all events', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('events:unread-count', async () => {
    try {
      const database = db.getDb();
      const row = database.prepare(
        "SELECT COUNT(*) AS count FROM events WHERE acknowledged = 0"
      ).get() as { count: number };
      return { success: true, count: row.count };
    } catch (err) {
      Logger.error('Failed to get unread count', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });
}
