import * as path from 'path';
import { app } from 'electron';

export function getEnginePath(): string {
  if (app.isPackaged) {
    const ext = process.platform === 'win32' ? '.exe' : '';
    return path.join(process.resourcesPath, 'engine', `netsentinel-engine${ext}`);
  }
  return path.join(__dirname, '../../engine');
}

export function getDatabasePath(): string {
  return path.join(app.getPath('userData'), 'netsentinel.db');
}
