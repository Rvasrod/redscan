import { Injectable, signal } from '@angular/core';
import { IpcService } from './ipc.service';

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly engineConnected = signal(false);

  constructor(private readonly ipc: IpcService) {}

  async getNetworkInfo(): Promise<ApiResult<any>> {
    return this.ipc.invoke('discovery:get-network-info');
  }

  async scanNetwork(): Promise<ApiResult<any>> {
    return this.ipc.invoke('discovery:scan');
  }

  async portScan(params: { targetIp: string; ports?: string; scanType?: string; versionDetection?: boolean }): Promise<ApiResult<any>> {
    return this.ipc.invoke('scanner:port-scan', params);
  }

  async getScanTypes(): Promise<ApiResult<string[]>> {
    return this.ipc.invoke('scanner:get-scan-types');
  }

  async vulnerabilityScan(params: { targetIp: string }): Promise<ApiResult<any>> {
    return this.ipc.invoke('scanner:vulnerability-scan', params);
  }

  async getNetworks(): Promise<ApiResult<any[]>> {
    return this.ipc.invoke('history:get-networks');
  }

  async getSnapshots(networkId: string): Promise<ApiResult<any[]>> {
    return this.ipc.invoke('history:get-snapshots', networkId);
  }

  async getSnapshotDetail(snapshotId: string): Promise<ApiResult<any>> {
    return this.ipc.invoke('history:get-snapshot-detail', snapshotId);
  }

  async compareSnapshots(snapshotIdA: string, snapshotIdB: string): Promise<ApiResult<any>> {
    return this.ipc.invoke('history:compare', snapshotIdA, snapshotIdB);
  }

  async getSetting(key: string): Promise<ApiResult<string>> {
    return this.ipc.invoke('settings:get', key);
  }

  async setSetting(key: string, value: string): Promise<ApiResult<void>> {
    return this.ipc.invoke('settings:set', key, value);
  }
}
