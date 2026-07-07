import { randomUUID } from 'crypto';
import { Notification } from 'electron';
import { Database } from './database';
import { EventRepository, NetworkRepository } from './repositories';
import { Logger } from './logger';

interface EventInput {
  networkId: string;
  snapshotId?: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description?: string;
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

export class EventService {
  constructor(private readonly db: Database) {}

  create(input: EventInput): void {
    try {
      const repo = new EventRepository(this.db);
      const now = new Date().toISOString();
      repo.insert({
        id: randomUUID(),
        network_id: input.networkId,
        snapshot_id: input.snapshotId,
        type: input.type,
        severity: input.severity,
        title: input.title,
        description: input.description,
        created_at: now,
      });

      Logger.debug(`Event created: ${input.type} (${input.severity}) — ${input.title}`);

      if (SEVERITY_ORDER[input.severity] >= SEVERITY_ORDER['warning']) {
        sendNotification(input.title, input.description);
      }
    } catch (err) {
      Logger.error('Failed to create event', err as Error);
    }
  }
}

function sendNotification(title: string, body?: string): void {
  try {
    if (!Notification.isSupported()) return;
    new Notification({ title, body: body ?? '' }).show();
  } catch (err) {
    Logger.error('Failed to show notification', err as Error);
  }
}

// Convenience function for backward compatibility
export function createEvent(db: Database, input: EventInput): void {
  new EventService(db).create(input);
}
