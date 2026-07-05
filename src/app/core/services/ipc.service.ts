import { Injectable } from '@angular/core';
import type { IpcApi } from '../../../../electron/preload';

declare global {
  interface Window {
    electronAPI: IpcApi;
  }
}

@Injectable({ providedIn: 'root' })
export class IpcService {
  private get api(): IpcApi {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return window.electronAPI;
    }
    throw new Error('Electron API not available');
  }

  invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T> {
    return this.api.invoke(channel, ...args) as Promise<T>;
  }

  on(channel: string, callback: (...args: unknown[]) => void): void {
    this.api.on(channel, callback);
  }

  off(channel: string, callback: (...args: unknown[]) => void): void {
    this.api.off(channel, callback);
  }

  once(channel: string, callback: (...args: unknown[]) => void): void {
    this.api.once(channel, callback);
  }
}
