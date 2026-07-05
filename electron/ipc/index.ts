import { ipcMain } from 'electron';
import { Database } from '../services/database';
import { PythonManager } from '../services/python-manager';
import { registerDiscoveryIpc } from './discovery.ipc';
import { registerScannerIpc } from './scanner.ipc';
import { registerHistoryIpc } from './history.ipc';
import { registerSettingsIpc } from './settings.ipc';

export function registerIpcHandlers(db: Database, pythonManager: PythonManager): void {
  registerDiscoveryIpc(ipcMain, db, pythonManager);
  registerScannerIpc(ipcMain, db, pythonManager);
  registerHistoryIpc(ipcMain, db);
  registerSettingsIpc(ipcMain, db);

  ipcMain.handle('app:get-version', () => {
    return { version: '0.1.0', enginePort: pythonManager.port };
  });
}
