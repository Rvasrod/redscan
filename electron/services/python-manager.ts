import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as http from 'http';
import { app } from 'electron';
import { Logger } from './logger';
import { Database } from './database';

const ENGINE_PORT = 8765;
const HEALTH_CHECK_RETRIES = 20;
const HEALTH_CHECK_INTERVAL_MS = 500;

export class PythonManager {
  private process: ChildProcess | null = null;
  private readonly enginePath: string;
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
    this.enginePath = this.resolveEnginePath();
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

    try {
      if (app.isPackaged) {
        this.process = spawn(this.enginePath, [], {
          env: { ...process.env, DATABASE_PATH: this.db.path },
        });
      } else {
        this.process = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(ENGINE_PORT)], {
          cwd: path.join(__dirname, '../../engine'),
          env: { ...process.env, DATABASE_PATH: this.db.path },
        });
      }

      this.process.stdout?.on('data', (data: Buffer) => {
        Logger.debug(`[Python] ${data.toString().trim()}`);
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        Logger.error(`[Python] ${data.toString().trim()}`);
      });

      this.process.on('exit', (code: number | null) => {
        Logger.info(`Python engine exited with code ${code}`);
        this.process = null;
      });

      this.process.on('error', (err: Error) => {
        Logger.error('Failed to start Python engine', err);
      });

      await this.waitForHealth();
      Logger.info('Python engine is ready');
    } catch (err) {
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

  async stop(): Promise<void> {
    if (this.process) {
      Logger.info('Stopping Python engine...');
      try {
        await this.shutdownViaApi();
      } catch {
        this.process.kill('SIGTERM');
      }
      this.process = null;
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
