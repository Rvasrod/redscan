import { IpcMain } from 'electron';
import { Database } from '../services/database';
import { Logger } from '../services/logger';

export function registerSettingsIpc(ipcMain: IpcMain, db: Database): void {
  ipcMain.handle('settings:get', async (_event, key: string) => {
    try {
      const row = db.getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
      return { success: true, data: row?.value ?? null };
    } catch (err) {
      Logger.error(`Failed to get setting ${key}`, err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('settings:set', async (_event, key: string, value: string) => {
    try {
      db.getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
      return { success: true };
    } catch (err) {
      Logger.error(`Failed to set setting ${key}`, err as Error);
      return { success: false, error: (err as Error).message };
    }
  });
}
