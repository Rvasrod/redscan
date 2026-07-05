import { randomUUID } from 'crypto';
import { Notification } from 'electron';
import { Database } from './database';
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

export function createEvent(db: Database, input: EventInput): void {
  try {
    const database = db.getDb();
    const now = new Date().toISOString();

    database.prepare(
      `INSERT INTO events (id, network_id, snapshot_id, type, severity, title, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(), input.networkId, input.snapshotId ?? null,
      input.type, input.severity, input.title, input.description ?? null, now,
    );

    Logger.debug(`Event created: ${input.type} (${input.severity}) — ${input.title}`);

    if (SEVERITY_ORDER[input.severity] >= SEVERITY_ORDER.warning) {
      sendNotification(input.title, input.description);
    }
  } catch (err) {
    Logger.error('Failed to create event', err as Error);
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
