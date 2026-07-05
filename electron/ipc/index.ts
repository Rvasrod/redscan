import { ipcMain } from 'electron';
import { Database } from '../services/database';
import { PythonManager } from '../services/python-manager';
import { registerDiscoveryIpc } from './discovery.ipc';
import { registerScannerIpc } from './scanner.ipc';
import { registerHistoryIpc } from './history.ipc';
import { registerLatencyIpc } from './latency.ipc';
import { registerSettingsIpc } from './settings.ipc';
import { registerEventsIpc } from './events.ipc';

export function registerIpcHandlers(db: Database, pythonManager: PythonManager): void {
  registerDiscoveryIpc(ipcMain, db, pythonManager);
  registerScannerIpc(ipcMain, db, pythonManager);
  registerHistoryIpc(ipcMain, db);
  registerLatencyIpc(ipcMain, db, pythonManager);
  registerSettingsIpc(ipcMain, db);
  registerEventsIpc(ipcMain, db);

  ipcMain.handle('app:get-version', () => {
    return { version: '0.1.0', enginePort: pythonManager.port };
  });

  ipcMain.handle('system:get-nmap-status', async () => {
    return pythonManager.getNmapStatus();
  });
}
