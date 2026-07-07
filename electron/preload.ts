import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const wrapperMap = new Map<string, Map<(...args: unknown[]) => void, (_event: IpcRendererEvent, ...args: unknown[]) => void>>();

export interface IpcApi {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  off: (channel: string, callback: (...args: unknown[]) => void) => void;
  once: (channel: string, callback: (...args: unknown[]) => void) => void;
  send: (channel: string, ...args: unknown[]) => void;
}

const api: IpcApi = {
  invoke: (channel: string, ...args: unknown[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const wrapper = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
    let channelMap = wrapperMap.get(channel);
    if (!channelMap) {
      channelMap = new Map();
      wrapperMap.set(channel, channelMap);
    }
    channelMap.set(callback, wrapper);
    ipcRenderer.on(channel, wrapper);
  },
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    const channelMap = wrapperMap.get(channel);
    if (channelMap) {
      const wrapper = channelMap.get(callback);
      if (wrapper) {
        ipcRenderer.removeListener(channel, wrapper);
        channelMap.delete(callback);
        if (channelMap.size === 0) {
          wrapperMap.delete(channel);
        }
      }
    }
  },
  once: (channel: string, callback: (...args: unknown[]) => void) => {
    const wrapper = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
    let channelMap = wrapperMap.get(channel);
    if (!channelMap) {
      channelMap = new Map();
      wrapperMap.set(channel, channelMap);
    }
    channelMap.set(callback, wrapper);
    ipcRenderer.once(channel, (_event: IpcRendererEvent, ...args: unknown[]) => {
      channelMap.delete(callback);
      if (channelMap.size === 0) wrapperMap.delete(channel);
      callback(...args);
    });
  },
  send: (channel: string, ...args: unknown[]) => {
    ipcRenderer.send(channel, ...args);
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
