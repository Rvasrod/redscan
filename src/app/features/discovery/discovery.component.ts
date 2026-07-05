import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AppStateService } from '../../core/services/app-state.service';
import type { Device, DiscoveryResult, NetworkInfo } from '../../core/models/device.model';

@Component({
  selector: 'app-discovery',
  standalone: true,
  template: `
    <div class="page">
      <header class="header">
        <div>
          <h1>Network Discovery</h1>
          <p class="subtitle">Discover devices on your current network</p>
        </div>
        <button class="btn btn-primary" (click)="startScan()" [disabled]="isLoading()">
          @if (isLoading()) {
            <span class="spinner"></span>
            Scanning...
          } @else {
            Scan Network
          }
        </button>
      </header>

      @if (error()) {
        <div class="alert alert-error">
          {{ error() }}
          <button class="btn-close" (click)="error.set(null)">x</button>
        </div>
      }

      @if (networkInfo(); as net) {
        <section class="network-info">
          <div class="info-item">
            <span class="label">Network</span>
            <span class="value">{{ net.ssid }}</span>
          </div>
          <div class="info-item">
            <span class="label">Gateway</span>
            <span class="value">{{ net.gateway_ip }}</span>
          </div>
          <div class="info-item">
            <span class="label">Your IP</span>
            <span class="value">{{ net.interface_ip }}</span>
          </div>
          <div class="info-item">
            <span class="label">Subnet</span>
            <span class="value">{{ net.subnet || 'N/A' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Interface</span>
            <span class="value">{{ net.interface_name || 'N/A' }}</span>
          </div>
          <div class="info-item">
            <span class="label">MAC</span>
            <span class="value">{{ net.interface_mac || 'N/A' }}</span>
          </div>
        </section>
      }

      @if (devices().length > 0) {
        <section class="results-header">
          <h2>Devices <span class="count">({{ devices().length }})</span></h2>
          <span class="scan-duration">{{ scanDuration() }}</span>
        </section>

        <div class="table-wrapper">
          <table class="device-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>MAC Address</th>
                <th>Vendor</th>
                <th>Hostname</th>
                <th>Gateway</th>
              </tr>
            </thead>
            <tbody>
              @for (device of devices(); track device.ip) {
                <tr [class.gateway]="device.is_gateway">
                  <td class="ip">{{ device.ip }}</td>
                  <td class="mac">{{ device.mac || '—' }}</td>
                  <td>
                    @if (device.vendor) {
                      <span class="vendor-badge">{{ device.vendor }}</span>
                    } @else {
                      <span class="na">—</span>
                    }
                  </td>
                  <td class="hostname">{{ device.hostname || '—' }}</td>
                  <td>
                    @if (device.is_gateway) {
                      <span class="gateway-badge">Gateway</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (!isLoading() && devices().length === 0 && !error()) {
        <div class="empty">
          <p>No devices discovered yet. Click <strong>Scan Network</strong> to start.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 2rem; color: #e0e0e0; font-family: system-ui, -apple-system, sans-serif; background: #16213e; min-height: 100vh; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.5rem; gap: 1rem; }
    .header h1 { margin: 0; font-size: 1.8rem; color: #e94560; }
    .subtitle { margin: 0.3rem 0 0 0; color: #888; font-size: 0.95rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.5rem; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.15s; white-space: nowrap; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary { background: #e94560; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #d63851; }
    .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .alert { display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; }
    .alert-error { background: #4a1a2e; color: #e94560; border: 1px solid #e94560; }
    .btn-close { background: none; border: none; color: inherit; cursor: pointer; font-size: 1.1rem; padding: 0 0.3rem; opacity: 0.7; }
    .btn-close:hover { opacity: 1; }
    .network-info { display: flex; flex-wrap: wrap; gap: 1rem; background: #1a1a2e; border: 1px solid #0f3460; border-radius: 10px; padding: 1.2rem 1.5rem; margin-bottom: 1.5rem; }
    .info-item { display: flex; flex-direction: column; gap: 0.2rem; min-width: 120px; }
    .label { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .value { font-size: 0.95rem; font-weight: 500; color: #e0e0e0; }
    .results-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem; }
    .results-header h2 { margin: 0; font-size: 1.1rem; color: #e0e0e0; }
    .count { color: #888; font-weight: 400; }
    .scan-duration { font-size: 0.8rem; color: #888; }
    .table-wrapper { overflow-x: auto; border: 1px solid #0f3460; border-radius: 10px; background: #1a1a2e; }
    .device-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .device-table th { text-align: left; padding: 0.8rem 1rem; background: #0f3460; color: #888; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px; white-space: nowrap; }
    .device-table td { padding: 0.7rem 1rem; border-top: 1px solid #0f3460; }
    .device-table tbody tr:hover { background: rgba(233, 69, 96, 0.05); }
    .device-table tbody tr.gateway { background: rgba(78, 204, 163, 0.05); }
    .ip { font-family: monospace; color: #4ecc; }
    .mac { font-family: monospace; color: #aaa; font-size: 0.85rem; }
    .hostname { color: #ccc; }
    .vendor-badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; background: #1a2a4e; color: #4e8cca; font-size: 0.8rem; }
    .gateway-badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; background: #1a4a2e; color: #4ecca3; font-size: 0.75rem; font-weight: 600; }
    .na { color: #555; }
    .empty { display: flex; align-items: center; justify-content: center; padding: 4rem 2rem; color: #666; text-align: center; }
    .empty p { margin: 0; font-size: 1rem; }
  `],
})
export class DiscoveryComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly state = inject(AppStateService);

  readonly networkInfo = signal<NetworkInfo | null>(null);
  readonly devices = signal<Device[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly scanDuration = signal('');

  async ngOnInit(): Promise<void> {
    await this.loadNetworkInfo();
  }

  async loadNetworkInfo(): Promise<void> {
    const result = await this.api.getNetworkInfo();
    if (result.success && result.data) {
      this.networkInfo.set(result.data);
      this.state.setCurrentNetwork(result.data);
    }
  }

  async startScan(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.devices.set([]);
    this.scanDuration.set('');

    const result = await this.api.scanNetwork();
    this.isLoading.set(false);

    if (result.success && result.data) {
      const data = result.data as DiscoveryResult;
      this.devices.set(data.devices);
      this.state.setDevices(data.devices);
      this.state.setScanning(false);
      this.state.setActiveScanning(false);

      if (data.scan_duration_ms) {
        this.scanDuration.set(`Completed in ${(data.scan_duration_ms / 1000).toFixed(1)}s`);
      }
    } else {
      this.error.set(result.error || 'Discovery scan failed');
    }
  }
}
