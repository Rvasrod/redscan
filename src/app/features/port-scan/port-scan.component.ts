import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AppStateService } from '../../core/services/app-state.service';
import type { Device } from '../../core/models/device.model';

interface PortResult {
  port: number;
  state: string;
  service?: string;
  version?: string;
}

interface ScanResult {
  target_ip: string;
  open_ports: PortResult[];
  total_scanned: number;
  scan_duration_ms: number;
  scan_type: string;
}

@Component({
  selector: 'app-port-scan',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <header class="header">
        <div>
          <h1>Port Scanner</h1>
          <p class="subtitle">Scan open ports on a target device</p>
        </div>
      </header>

      <div class="warning-banner">
        <strong>Warning:</strong> Port scanning is an active probing technique.
        Only scan devices you own or have explicit permission to test.
      </div>

      @if (error()) {
        <div class="alert alert-error">
          {{ error() }}
          <button class="btn-close" (click)="error.set(null)">x</button>
        </div>
      }

      <section class="scan-form">
        <div class="form-row">
          <div class="form-group">
            <label for="targetIp">Target IP</label>
            <select id="targetIp" [(ngModel)]="targetIp" class="form-select">
              <option value="" disabled>Select a device</option>
              @for (device of availableDevices(); track device.ip) {
                <option [value]="device.ip">{{ device.ip }} {{ device.hostname ? '— ' + device.hostname : '' }}</option>
              }
            </select>
          </div>

          <div class="form-group">
            <label for="ports">Port Range</label>
            <input id="ports" type="text" [(ngModel)]="ports" class="form-input" placeholder="e.g. 22,80,443 or 1-1000">
          </div>

          <div class="form-group">
            <label for="scanType">Scan Type</label>
            <select id="scanType" [(ngModel)]="scanType" class="form-select">
              @for (type of scanTypes(); track type) {
                <option [value]="type">{{ typeLabels[type] || type }}</option>
              }
            </select>
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="versionDetection">
              Version Detection (-sV)
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-primary" (click)="startScan()" [disabled]="isLoading() || !targetIp">
            @if (isLoading()) {
              <span class="spinner"></span>
              Scanning...
            } @else {
              Start Scan
            }
          </button>
          @if (devices().length > 0) {
            <button class="btn btn-secondary" (click)="clearResults()">Clear Results</button>
          }
        </div>
      </section>

      @if (devices().length > 0) {
        <section class="results-header">
          <h2>Results for {{ lastTarget() }}</h2>
          <span class="scan-info">Scan type: {{ targetScanType }} | {{ scanDuration() }}</span>
        </section>

        @if (devices().length === 0 && !isLoading()) {
          <div class="empty">
            <p>No open ports found.</p>
          </div>
        }

        <div class="table-wrapper">
          <table class="port-table">
            <thead>
              <tr>
                <th>Port</th>
                <th>State</th>
                <th>Service</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              @for (port of devices(); track port.port) {
                <tr>
                  <td class="port-num">{{ port.port }}</td>
                  <td><span class="state-badge open">open</span></td>
                  <td>{{ port.service || '—' }}</td>
                  <td class="version">{{ port.version || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (!isLoading() && devices().length === 0 && !error()) {
        <div class="empty">
          <p>Select a device and click <strong>Start Scan</strong> to begin.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 2rem; color: #e0e0e0; font-family: system-ui, -apple-system, sans-serif; background: #16213e; min-height: 100vh; }
    .header { margin-bottom: 1.5rem; }
    .header h1 { margin: 0; font-size: 1.8rem; color: #e94560; }
    .subtitle { margin: 0.3rem 0 0 0; color: #888; font-size: 0.95rem; }
    .warning-banner { background: #4a3a1a; border: 1px solid #e9a560; border-radius: 8px; padding: 0.8rem 1rem; margin-bottom: 1rem; font-size: 0.85rem; color: #e9a560; }
    .alert { display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; }
    .alert-error { background: #4a1a2e; color: #e94560; border: 1px solid #e94560; }
    .btn-close { background: none; border: none; color: inherit; cursor: pointer; font-size: 1.1rem; padding: 0 0.3rem; opacity: 0.7; }
    .btn-close:hover { opacity: 1; }
    .scan-form { background: #1a1a2e; border: 1px solid #0f3460; border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .form-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.2rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; min-width: 180px; flex: 1; }
    .checkbox-group { justify-content: flex-end; min-width: auto; }
    .form-group label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .form-input, .form-select { padding: 0.6rem 0.8rem; background: #0f3460; border: 1px solid #1a4a8a; border-radius: 6px; color: #e0e0e0; font-size: 0.9rem; font-family: inherit; }
    .form-input::placeholder { color: #555; }
    .form-input:focus, .form-select:focus { outline: none; border-color: #e94560; }
    .form-select option { background: #0f3460; }
    .checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #ccc; text-transform: none; letter-spacing: normal; cursor: pointer; margin-top: 1.4rem; }
    .checkbox-label input { accent-color: #e94560; }
    .form-actions { display: flex; gap: 0.8rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.5rem; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.15s; white-space: nowrap; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary { background: #e94560; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #d63851; }
    .btn-secondary { background: #0f3460; color: #e0e0e0; }
    .btn-secondary:hover:not(:disabled) { background: #1a4a8a; }
    .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .results-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem; }
    .results-header h2 { margin: 0; font-size: 1.1rem; color: #e0e0e0; }
    .scan-info { font-size: 0.8rem; color: #888; }
    .table-wrapper { overflow-x: auto; border: 1px solid #0f3460; border-radius: 10px; background: #1a1a2e; }
    .port-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .port-table th { text-align: left; padding: 0.8rem 1rem; background: #0f3460; color: #888; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px; white-space: nowrap; }
    .port-table td { padding: 0.7rem 1rem; border-top: 1px solid #0f3460; }
    .port-table tbody tr:hover { background: rgba(233, 69, 96, 0.05); }
    .port-num { font-family: monospace; color: #4ecc; font-weight: 600; }
    .version { font-family: monospace; color: #aaa; font-size: 0.85rem; }
    .state-badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .state-badge.open { background: #1a4a2e; color: #4ecca3; }
    .empty { display: flex; align-items: center; justify-content: center; padding: 4rem 2rem; color: #666; text-align: center; }
    .empty p { margin: 0; font-size: 1rem; }
  `],
})
export class PortScanComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly state = inject(AppStateService);

  readonly availableDevices = signal<Device[]>([]);
  readonly scanTypes = signal<string[]>(['tcp_syn', 'tcp_connect', 'udp', 'tcp_syn_version', 'tcp_connect_version']);
  readonly devices = signal<PortResult[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  targetIp = '';
  ports = '';
  scanType = 'tcp_syn';
  versionDetection = false;

  lastTarget = signal('');
  targetScanType = '';
  scanDuration = signal('');

  readonly typeLabels: Record<string, string> = {
    tcp_syn: 'TCP SYN (fast)',
    tcp_connect: 'TCP Connect',
    udp: 'UDP Scan',
    tcp_syn_version: 'TCP SYN + Version',
    tcp_connect_version: 'TCP Connect + Version',
  };

  async ngOnInit(): Promise<void> {
    const devices = this.state.devices();
    this.availableDevices.set(devices);

    const result = await this.api.getScanTypes();
    if (result.success && result.data) {
      this.scanTypes.set(result.data);
    }
  }

  async startScan(): Promise<void> {
    if (!this.targetIp) return;

    this.isLoading.set(true);
    this.error.set(null);
    this.devices.set([]);
    this.lastTarget.set(this.targetIp);
    this.targetScanType = this.typeLabels[this.scanType] || this.scanType;
    this.scanDuration.set('');

    const result = await this.api.portScan({
      targetIp: this.targetIp,
      ports: this.ports || undefined,
      scanType: this.scanType,
      versionDetection: this.versionDetection,
    });

    this.isLoading.set(false);

    if (result.success && result.data) {
      const data = result.data as ScanResult;
      this.devices.set(data.open_ports);
      if (data.scan_duration_ms) {
        this.scanDuration.set(`Completed in ${(data.scan_duration_ms / 1000).toFixed(1)}s`);
      }
    } else {
      this.error.set(result.error || 'Port scan failed');
    }
  }

  clearResults(): void {
    this.devices.set([]);
    this.lastTarget.set('');
    this.scanDuration.set('');
  }
}
