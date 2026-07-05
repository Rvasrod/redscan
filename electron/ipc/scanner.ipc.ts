import { IpcMain } from 'electron';
import { Database } from '../services/database';
import { PythonManager } from '../services/python-manager';
import { Logger } from '../services/logger';
import { httpRequest } from '../utils/http';

export function registerScannerIpc(ipcMain: IpcMain, db: Database, pythonManager: PythonManager): void {
  ipcMain.handle('scanner:port-scan', async (_event, params: { targetIp: string; ports?: string; scanType?: string }) => {
    try {
      const data = await httpRequest(`http://127.0.0.1:${pythonManager.port}/api/v1/scan/ports`, {
        method: 'POST',
        body: JSON.stringify(params),
        headers: { 'Content-Type': 'application/json' },
      });
      return { success: true, data: JSON.parse(data) };
    } catch (err) {
      Logger.error('Failed to run port scan', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('scanner:vulnerability-scan', async (_event, params: { targetIp: string }) => {
    try {
      const data = await httpRequest(`http://127.0.0.1:${pythonManager.port}/api/v1/scan/vulnerabilities`, {
        method: 'POST',
        body: JSON.stringify(params),
        headers: { 'Content-Type': 'application/json' },
      });
      return { success: true, data: JSON.parse(data) };
    } catch (err) {
      Logger.error('Failed to run vulnerability scan', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });
}
