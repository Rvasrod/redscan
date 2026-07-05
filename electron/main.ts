import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { PythonManager } from './services/python-manager';
import { Database } from './services/database';
import { Logger } from './services/logger';
import { registerIpcHandlers } from './ipc/index';

let mainWindow: BrowserWindow | null = null;
let pythonManager: PythonManager;
let db: Database;

const isDev = !app.isPackaged;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    title: 'NetSentinel',
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initialize(): Promise<void> {
  Logger.info('Starting NetSentinel...');

  db = new Database();
  await db.initialize();

  pythonManager = new PythonManager(db);
  await pythonManager.start();

  registerIpcHandlers(db, pythonManager);

  await createWindow();

  Logger.info('NetSentinel initialized successfully');
}

app.whenReady().then(initialize);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', async () => {
  Logger.info('Shutting down NetSentinel...');
  await pythonManager?.stop();
  db?.close();
});
