import { BaseRepository } from './base.repository';

export interface EventRow {
  id: string;
  network_id: string;
  snapshot_id: string | null;
  type: string;
  severity: string;
  title: string;
  description: string | null;
  created_at: string;
  acknowledged: number;
}

export class EventRepository extends BaseRepository {
  findAll(networkId?: string): EventRow[] {
    if (networkId) {
      return this.database.prepare(
        'SELECT * FROM events WHERE network_id = ? ORDER BY created_at DESC LIMIT 100'
      ).all(networkId) as EventRow[];
    }
    return this.database.prepare(
      'SELECT * FROM events ORDER BY created_at DESC LIMIT 100'
    ).all() as EventRow[];
  }

  findByNetworkId(networkId: string): EventRow[] {
    return this.database.prepare(
      'SELECT * FROM events WHERE network_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(networkId) as EventRow[];
  }

  insert(event: {
    id: string; network_id: string; snapshot_id?: string;
    type: string; severity: string; title: string;
    description?: string; created_at: string;
  }): void {
    this.database.prepare(
      `INSERT INTO events (id, network_id, snapshot_id, type, severity, title, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(event.id, event.network_id, event.snapshot_id ?? null,
      event.type, event.severity, event.title, event.description ?? null, event.created_at);
  }

  acknowledge(id: string): void {
    this.database.prepare(
      'UPDATE events SET acknowledged = 1 WHERE id = ?'
    ).run(id);
  }

  acknowledgeAll(): void {
    this.database.prepare(
      'UPDATE events SET acknowledged = 1 WHERE acknowledged = 0'
    ).run();
  }

  unreadCount(): number {
    const row = this.database.prepare(
      'SELECT COUNT(*) AS count FROM events WHERE acknowledged = 0'
    ).get() as { count: number };
    return row.count;
  }
}
