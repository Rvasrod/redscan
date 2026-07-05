import { BaseRepository } from './base.repository';

export class SettingsRepository extends BaseRepository {
  get(key: string): string | null {
    const row = this.database.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  set(key: string, value: string): void {
    this.database.prepare(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
    ).run(key, value);
  }

  setDefault(key: string, value: string): void {
    const existing = this.get(key);
    if (!existing) {
      this.set(key, value);
    }
  }
}
