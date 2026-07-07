import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as http from 'http';
import { app } from 'electron';
import { Logger } from './logger';
import { Database } from './database';

const ENGINE_PORT = 8765;
const HEALTH_CHECK_RETRIES = 30;
const HEALTH_CHECK_INTERVAL_MS = 500;

export class PythonManager {
  private process: ChildProcess | null = null;
  private processExitPromise: Promise<void> | null = null;
  private resolveProcessExit: (() => void) | null = null;
  private readonly enginePath: string;
  private readonly db: Database;
  private _ready = false;

  constructor(db: Database) {
    this.db = db;
    this.enginePath = this.resolveEnginePath();
  }

  get ready(): boolean {
    return this._ready;
  }

  private resolveEnginePath(): string {
    if (app.isPackaged) {
      const platform = process.platform;
      const ext = platform === 'win32' ? '.exe' : '';
      return path.join(process.resourcesPath, 'engine', `netsentinel-engine${ext}`);
    }
    return path.join(__dirname, '../../engine', 'app', 'main.py');
  }

  async start(): Promise<void> {
    Logger.info('Starting Python engine...');
    Logger.info(`Engine path: ${this.enginePath}`);

    try {
      const nmapPath = app.isPackaged
        ? path.join(process.resourcesPath, 'nmap')
        : path.join(__dirname, '../../resources/nmap');

      if (app.isPackaged) {
        this.process = spawn(this.enginePath, [], {
          env: {
            ...process.env,
            DATABASE_PATH: this.db.path,
            PYTHONUNBUFFERED: '1',
            NMAP_PATH: nmapPath,
          },
        });
      } else {
        this.process = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(ENGINE_PORT)], {
          cwd: path.join(__dirname, '../../engine'),
          env: {
            ...process.env,
            DATABASE_PATH: this.db.path,
            PYTHONUNBUFFERED: '1',
            NMAP_PATH: nmapPath,
          },
        });
      }

      this.process.stdout?.on('data', (data: Buffer) => {
        Logger.debug(`[Python] ${data.toString().trim()}`);
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        const line = data.toString().trim();
        Logger.error(`[Python] ${line}`);
      });

      this.processExitPromise = new Promise(resolve => { this.resolveProcessExit = resolve; });
      this.process.on('exit', (code: number | null) => {
        Logger.info(`Python engine exited with code ${code}`);
        this.process = null;
        this._ready = false;
        this.resolveProcessExit?.();
        this.resolveProcessExit = null;
        this.processExitPromise = null;
      });

      this.process.on('error', (err: Error) => {
        Logger.error('Failed to start Python engine', err);
        this._ready = false;
      });

      await this.waitForHealth();
      this._ready = true;
      Logger.info('Python engine is ready');
    } catch (err) {
      this._ready = false;
      Logger.error('Failed to initialize Python engine', err as Error);
      throw err;
    }
  }

  private async waitForHealth(): Promise<void> {
    for (let i = 0; i < HEALTH_CHECK_RETRIES; i++) {
      try {
        await this.healthCheck();
        return;
      } catch {
        await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS));
      }
    }
    throw new Error('Python engine failed to start within timeout');
  }

  private healthCheck(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${ENGINE_PORT}/api/v1/health`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Health check returned ${res.statusCode}`));
        }
      });
      req.on('error', reject);
      req.setTimeout(2000, () => {
        req.destroy();
        reject(new Error('Health check timed out'));
      });
    });
  }

  async getNmapStatus(): Promise<{ available: boolean; version?: string; error?: string }> {
    try {
      const data = await this.httpGet(`http://127.0.0.1:${ENGINE_PORT}/api/v1/system/nmap`);
      return JSON.parse(data);
    } catch (err) {
      return { available: false, error: (err as Error).message };
    }
  }

  private httpGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = http.get(url, (res) => {
        let body = '';
        res.on('data', (chunk: string) => { body += chunk; });
        res.on('end', () => resolve(body));
      });
      req.on('error', reject);
      req.setTimeout(3000, () => {
        req.destroy();
        reject(new Error('HTTP request timed out'));
      });
    });
  }

  async stop(): Promise<void> {
    if (this.process) {
      Logger.info('Stopping Python engine...');
      const exitPromise = this.processExitPromise;
      try {
        await this.shutdownViaApi();
      } catch {
        this.process.kill('SIGTERM');
      }
      if (exitPromise) {
        await Promise.race([
          exitPromise,
          new Promise(resolve => setTimeout(resolve, 5000)),
        ]);
      }
      this._ready = false;
    }
  }

  private shutdownViaApi(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        `http://127.0.0.1:${ENGINE_PORT}/api/v1/shutdown`,
        { method: 'POST' },
        () => resolve()
      );
      req.on('error', reject);
      req.setTimeout(2000, () => {
        req.destroy();
        reject(new Error('Shutdown request timed out'));
      });
      req.end();
    });
  }

  get port(): number {
    return ENGINE_PORT;
  }
}
