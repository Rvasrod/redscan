import { IpcMain } from 'electron';
import { Database } from '../services/database';
import { EventRepository } from '../services/repositories';
import { Logger } from '../services/logger';

export function registerEventsIpc(ipcMain: IpcMain, db: Database): void {
  ipcMain.handle('events:get-all', async (_event, networkId?: string) => {
    try {
      const repo = new EventRepository(db);
      return { success: true, data: repo.findAll(networkId) };
    } catch (err) {
      Logger.error('Failed to get events', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('events:acknowledge', async (_event, eventId: string) => {
    try {
      const repo = new EventRepository(db);
      repo.acknowledge(eventId);
      return { success: true };
    } catch (err) {
      Logger.error('Failed to acknowledge event', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('events:acknowledge-all', async () => {
    try {
      const repo = new EventRepository(db);
      repo.acknowledgeAll();
      return { success: true };
    } catch (err) {
      Logger.error('Failed to acknowledge all events', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('events:unread-count', async () => {
    try {
      const repo = new EventRepository(db);
      return { success: true, count: repo.unreadCount() };
    } catch (err) {
      Logger.error('Failed to get unread count', err as Error);
      return { success: false, error: (err as Error).message };
    }
  });
}
