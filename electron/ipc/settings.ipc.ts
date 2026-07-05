import { IpcMain } from 'electron';
import { Database } from '../services/database';
import { SettingsRepository } from '../services/repositories';
import { Logger } from '../services/logger';

export function registerSettingsIpc(ipcMain: IpcMain, db: Database): void {
  ipcMain.handle('settings:get', async (_event, key: string) => {
    try {
      const repo = new SettingsRepository(db);
      return { success: true, data: repo.get(key) };
    } catch (err) {
      Logger.error(`Failed to get setting ${key}`, err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('settings:set', async (_event, key: string, value: string) => {
    try {
      const repo = new SettingsRepository(db);
      repo.set(key, value);
      return { success: true };
    } catch (err) {
      Logger.error(`Failed to set setting ${key}`, err as Error);
      return { success: false, error: (err as Error).message };
    }
  });
}
