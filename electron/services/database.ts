import DatabaseConstructor from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import { Logger } from './logger';

export class Database {
  private db: DatabaseConstructor.Database | null = null;
  private readonly dbPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'netsentinel.db');
  }

  get path(): string {
    return this.dbPath;
  }

  async initialize(): Promise<void> {
    Logger.info(`Initializing database at ${this.dbPath}`);
    this.db = new DatabaseConstructor(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.createSchema();
    Logger.info('Database initialized');
  }

  private createSchema(): void {
    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS networks (
        id TEXT PRIMARY KEY,
        ssid TEXT NOT NULL,
        gateway_ip TEXT NOT NULL,
        gateway_mac TEXT,
        subnet TEXT,
        interface_name TEXT,
        interface_ip TEXT,
        interface_mac TEXT,
        first_seen TEXT NOT NULL,
        last_seen TEXT NOT NULL,
        UNIQUE(ssid, gateway_ip)
      );

      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        network_id TEXT NOT NULL,
        captured_at TEXT NOT NULL,
        device_count INTEGER DEFAULT 0,
        data TEXT DEFAULT '{}',
        FOREIGN KEY (network_id) REFERENCES networks(id)
      );

      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        snapshot_id TEXT NOT NULL,
        ip TEXT NOT NULL,
        mac TEXT,
        hostname TEXT,
        vendor TEXT,
        first_seen TEXT NOT NULL,
        last_seen TEXT NOT NULL,
        is_gateway INTEGER DEFAULT 0,
        FOREIGN KEY (snapshot_id) REFERENCES snapshots(id)
      );

      CREATE TABLE IF NOT EXISTS port_scans (
        id TEXT PRIMARY KEY,
        snapshot_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        scan_type TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        results TEXT DEFAULT '{}',
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (snapshot_id) REFERENCES snapshots(id),
        FOREIGN KEY (device_id) REFERENCES devices(id)
      );

      CREATE TABLE IF NOT EXISTS vulnerabilities (
        id TEXT PRIMARY KEY,
        port_scan_id TEXT NOT NULL,
        port INTEGER NOT NULL,
        service TEXT,
        cve_id TEXT,
        severity TEXT DEFAULT 'unknown',
        description TEXT,
        recommendation TEXT,
        FOREIGN KEY (port_scan_id) REFERENCES port_scans(id)
      );

      CREATE TABLE IF NOT EXISTS latency_meas (
        id TEXT PRIMARY KEY,
        network_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        target TEXT NOT NULL,
        avg_latency_ms REAL,
        min_latency_ms REAL,
        max_latency_ms REAL,
        jitter_ms REAL,
        packet_loss_pct REAL,
        FOREIGN KEY (network_id) REFERENCES networks(id)
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        network_id TEXT NOT NULL,
        snapshot_id TEXT,
        type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'info',
        title TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        acknowledged INTEGER DEFAULT 0,
        FOREIGN KEY (network_id) REFERENCES networks(id),
        FOREIGN KEY (snapshot_id) REFERENCES snapshots(id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    this.setDefault('legal_disclaimer_accepted', 'false');
    this.setDefault('active_scan_confirmation', 'true');
  }

  private setDefault(key: string, value: string): void {
    const existing = this.db!.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!existing) {
      this.db!.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      Logger.info('Database closed');
    }
  }

  getDb(): DatabaseConstructor.Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }
}
