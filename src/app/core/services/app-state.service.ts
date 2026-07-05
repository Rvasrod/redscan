import { Injectable, signal } from '@angular/core';
import { NetworkInfo, Device, NetworkEvent } from '../models/device.model';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  readonly currentNetwork = signal<NetworkInfo | null>(null);
  readonly devices = signal<Device[]>([]);
  readonly events = signal<NetworkEvent[]>([]);
  readonly isScanning = signal(false);
  readonly activeScanning = signal(false);
  readonly isLegalAccepted = signal(false);

  setCurrentNetwork(network: NetworkInfo): void {
    this.currentNetwork.set(network);
  }

  setDevices(devices: Device[]): void {
    this.devices.set(devices);
  }

  addEvent(event: NetworkEvent): void {
    this.events.update(events => [event, ...events]);
  }

  setScanning(value: boolean): void {
    this.isScanning.set(value);
  }

  setActiveScanning(value: boolean): void {
    this.activeScanning.set(value);
  }
}
