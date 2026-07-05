import { IpcMain } from 'electron';
import { Database } from '../services/database';
import { PythonManager } from '../services/python-manager';
import { Logger } from '../services/logger';
import { httpRequest } from '../utils/http';

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
      const data = await httpRequest(`http://127.0.0.1:${pythonManager.port}/api/v1/discovery/scan`, { method: 'POST' });
      return { success: true, data: JSON.parse(data) };
    } catch (err) {
      Logger.error('Failed to scan network', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });
}
