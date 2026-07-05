import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

type View = 'list' | 'snapshots' | 'detail' | 'compare' | 'events';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <div class="page">
      <header class="header">
        <div class="header-left">
          @if (currentView() !== 'list') {
            <button class="btn-back" (click)="goBack()">← Back</button>
          }
          <div>
            <h1>History & Comparison</h1>
            <p class="subtitle">{{ viewTitle() }}</p>
          </div>
        </div>
      </header>

      @if (error()) {
        <div class="alert alert-error">
          {{ error() }}
          <button class="btn-close" (click)="error.set(null)">x</button>
        </div>
      }

      @if (currentView() === 'list') {
        @if (networks().length === 0) {
          <div class="empty"><p>No networks discovered yet. Run a scan first.</p></div>
        }
        <div class="network-grid">
          @for (net of networks(); track net.id) {
            <div class="network-card">
              <h3>{{ net.ssid }}</h3>
              <span class="gw">{{ net.gateway_ip }}</span>
              <div class="network-meta">
                <span>First: {{ net.first_seen | date:'medium' }}</span>
                <span>Last: {{ net.last_seen | date:'medium' }}</span>
                <span>IP: {{ net.interface_ip }}</span>
              </div>
              <div class="network-actions">
                <button class="btn-sm btn-sm-primary" (click)="selectNetwork(net)">Snapshots</button>
                <button class="btn-sm btn-sm-secondary" (click)="showEvents(net)">Events</button>
              </div>
            </div>
          }
        </div>
      }

      @if (currentView() === 'snapshots') {
        <h2>Snapshots for {{ selectedNetwork()?.ssid }}</h2>
        @if (snapshots().length >= 2) {
          <div class="compare-selector">
            <select [ngModel]="compareSnapA()" (ngModelChange)="compareSnapA.set($event); compareResult.set(null)">
              <option value="">Select snapshot A (older)</option>
              @for (s of snapshots(); track s.id) {
                <option [value]="s.id">{{ s.captured_at | date:'medium' }} ({{ s.device_count }} devices)</option>
              }
            </select>
            <span>vs</span>
            <select [ngModel]="compareSnapB()" (ngModelChange)="compareSnapB.set($event); compareResult.set(null)">
              <option value="">Select snapshot B (newer)</option>
              @for (s of snapshots(); track s.id) {
                <option [value]="s.id">{{ s.captured_at | date:'medium' }} ({{ s.device_count }} devices)</option>
              }
            </select>
            <button class="btn-sm btn-sm-primary" (click)="compare()" [disabled]="!compareSnapA() || !compareSnapB()">Compare</button>
          </div>
        }
        <div class="snapshot-list">
          @for (s of snapshots(); track s.id) {
            <div class="snapshot-item" (click)="selectSnapshot(s)">
              <div>
                <div class="time">{{ s.captured_at | date:'medium' }}</div>
                <div class="count">{{ s.device_count }} devices</div>
              </div>
              <span>></span>
            </div>
          }
        </div>
      }

      @if (currentView() === 'detail') {
        <h2>Devices ({{ snapshotDevices().length }})</h2>
        <div class="table-wrapper">
          <table class="device-table">
            <thead>
              <tr><th>IP</th><th>MAC</th><th>Vendor</th><th>Hostname</th><th></th></tr>
            </thead>
            <tbody>
              @for (d of snapshotDevices(); track d.id) {
                <tr>
                  <td class="ip">{{ d.ip }}</td>
                  <td class="mac">{{ d.mac || '—' }}</td>
                  <td>{{ d.vendor || '—' }}</td>
                  <td>{{ d.hostname || '—' }}</td>
                  <td>@if (d.is_gateway) { <span class="gw-badge">Gateway</span> }</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (currentView() === 'compare') {
        @if (compareResult(); as cmp) {
          <div class="compare-summary">
            <span class="summary-badge new">{{ cmp.newDevices.length }} new</span>
            <span class="summary-badge removed">{{ cmp.removedDevices.length }} removed</span>
            <span class="summary-badge common">{{ cmp.commonDevices.length }} unchanged</span>
            <span class="summary-badge">Before: {{ cmp.totalBefore }} → After: {{ cmp.totalAfter }}</span>
          </div>
          <table class="device-table">
            <thead>
              <tr><th>IP</th><th>MAC</th><th>Vendor</th><th>Hostname</th></tr>
            </thead>
            <tbody>
              @for (d of cmp.newDevices; track d.ip) {
                <tr class="diff-new">
                  <td class="ip">{{ d.ip }}</td>
                  <td class="mac">{{ d.mac || '—' }}</td>
                  <td>{{ d.vendor || '—' }}</td>
                  <td>{{ d.hostname || '—' }}</td>
                </tr>
              }
              @for (d of cmp.removedDevices; track d.ip) {
                <tr class="diff-removed">
                  <td class="ip">{{ d.ip }}</td>
                  <td class="mac">{{ d.mac || '—' }}</td>
                  <td>{{ d.vendor || '—' }}</td>
                  <td>{{ d.hostname || '—' }}</td>
                </tr>
              }
              @for (d of cmp.commonDevices; track d.ip) {
                <tr>
                  <td class="ip">{{ d.ip }}</td>
                  <td class="mac">{{ d.mac || '—' }}</td>
                  <td>{{ d.vendor || '—' }}</td>
                  <td>{{ d.hostname || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      }

      @if (currentView() === 'events') {
        <h2>Events for {{ selectedNetwork()?.ssid }}</h2>
        @if (events().length === 0) {
          <div class="empty"><p>No events recorded yet.</p></div>
        }
        <div class="events-list">
          @for (e of events(); track e.id) {
            <div class="event-item" [class]="'event-severity-' + e.severity">
              <div class="event-icon">
                @if (e.type === 'device_new') { + }
                @else if (e.type === 'device_gone') { − }
                @else { ! }
              </div>
              <div class="event-content">
                <div class="event-title">{{ e.title }}</div>
                @if (e.description) { <div class="event-desc">{{ e.description }}</div> }
                <div class="event-time">{{ e.created_at | date:'medium' }}</div>
              </div>
            </div>
          }
        </div>
      }

      @if (currentView() === 'list' && networks().length === 0) {
        <div class="empty"><p>No networks discovered yet. Run a scan first.</p></div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 2rem; color: #e0e0e0; font-family: system-ui, -apple-system, sans-serif; background: #16213e; min-height: 100vh; }
    .header { margin-bottom: 1.5rem; }
    .header-left { display: flex; align-items: flex-start; gap: 1rem; }
    .header h1 { margin: 0; font-size: 1.8rem; color: #e94560; }
    .subtitle { margin: 0.3rem 0 0 0; color: #888; font-size: 0.95rem; }
    .btn-back { background: #0f3460; color: #e0e0e0; border: none; border-radius: 8px; padding: 0.5rem 1rem; font-size: 0.9rem; cursor: pointer; margin-top: 0.3rem; white-space: nowrap; }
    .btn-back:hover { background: #1a4a8a; }
    .alert { display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; }
    .alert-error { background: #4a1a2e; color: #e94560; border: 1px solid #e94560; }
    .btn-close { background: none; border: none; color: inherit; cursor: pointer; font-size: 1.1rem; padding: 0 0.3rem; opacity: 0.7; }
    .network-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    .network-card { background: #1a1a2e; border: 1px solid #0f3460; border-radius: 10px; padding: 1.2rem 1.5rem; cursor: pointer; transition: border-color 0.15s; }
    .network-card:hover { border-color: #e94560; }
    .network-card h3 { margin: 0 0 0.3rem 0; color: #e0e0e0; font-size: 1.1rem; }
    .network-card .gw { font-family: monospace; color: #4ecc; font-size: 0.9rem; }
    .network-meta { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 0.6rem; font-size: 0.8rem; color: #888; }
    .network-actions { display: flex; gap: 0.5rem; margin-top: 0.8rem; }
    .btn-sm { padding: 0.35rem 0.8rem; border: none; border-radius: 6px; font-size: 0.8rem; cursor: pointer; transition: background 0.15s; }
    .btn-sm-primary { background: #e94560; color: #fff; }
    .btn-sm-primary:hover { background: #d63851; }
    .btn-sm-secondary { background: #0f3460; color: #e0e0e0; }
    .btn-sm-secondary:hover { background: #1a4a8a; }
    .snapshot-list { display: flex; flex-direction: column; gap: 0.6rem; }
    .snapshot-item { display: flex; align-items: center; justify-content: space-between; background: #1a1a2e; border: 1px solid #0f3460; border-radius: 8px; padding: 0.8rem 1.2rem; cursor: pointer; transition: border-color 0.15s; }
    .snapshot-item:hover { border-color: #e94560; }
    .snapshot-item .time { color: #aaa; font-size: 0.85rem; }
    .snapshot-item .count { color: #888; font-size: 0.8rem; }
    .compare-selector { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.2rem; flex-wrap: wrap; }
    .compare-selector select { padding: 0.5rem 0.8rem; background: #0f3460; border: 1px solid #1a4a8a; border-radius: 6px; color: #e0e0e0; font-size: 0.9rem; min-width: 200px; }
    .compare-selector select:focus { outline: none; border-color: #e94560; }
    .compare-selector select option { background: #0f3460; }
    .compare-summary { display: flex; gap: 1.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .summary-badge { padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.85rem; }
    .summary-badge.new { background: #1a4a2e; color: #4ecca3; }
    .summary-badge.removed { background: #4a1a2e; color: #e94560; }
    .summary-badge.common { background: #1a2a4e; color: #4e8cca; }
    .device-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; background: #1a1a2e; border: 1px solid #0f3460; border-radius: 10px; overflow: hidden; }
    .device-table th { text-align: left; padding: 0.7rem 1rem; background: #0f3460; color: #888; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px; }
    .device-table td { padding: 0.6rem 1rem; border-top: 1px solid #0f3460; }
    .device-table tbody tr:hover { background: rgba(233, 69, 96, 0.05); }
    .device-table .ip { font-family: monospace; color: #4ecc; }
    .device-table .mac { font-family: monospace; color: #aaa; font-size: 0.85rem; }
    .device-table .gw-badge { display: inline-block; padding: 0.1rem 0.4rem; border-radius: 4px; background: #1a4a2e; color: #4ecca3; font-size: 0.7rem; font-weight: 600; }
    .device-table .diff-new td { background: rgba(78, 204, 163, 0.08); }
    .device-table .diff-new .ip::before { content: '+ '; color: #4ecca3; font-weight: 700; }
    .device-table .diff-removed td { background: rgba(233, 69, 96, 0.08); opacity: 0.6; }
    .device-table .diff-removed .ip::before { content: '− '; color: #e94560; font-weight: 700; }
    .events-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .event-item { display: flex; align-items: flex-start; gap: 0.8rem; background: #1a1a2e; border: 1px solid #0f3460; border-radius: 8px; padding: 0.8rem 1rem; }
    .event-icon { font-size: 1.2rem; margin-top: 0.1rem; min-width: 1.5rem; text-align: center; }
    .event-content { flex: 1; }
    .event-title { font-size: 0.9rem; color: #e0e0e0; }
    .event-desc { font-size: 0.8rem; color: #888; margin-top: 0.2rem; }
    .event-time { font-size: 0.75rem; color: #555; margin-top: 0.2rem; }
    .event-severity-info { border-left: 3px solid #4e8cca; }
    .event-severity-warning { border-left: 3px solid #e9c445; }
    .event-severity-critical { border-left: 3px solid #e94560; }
    .empty { display: flex; align-items: center; justify-content: center; padding: 4rem 2rem; color: #666; text-align: center; }
    .empty p { margin: 0; font-size: 1rem; }
  `],
})
export class HistoryComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly currentView = signal<View>('list');
  readonly error = signal<string | null>(null);

  readonly networks = signal<any[]>([]);
  readonly snapshots = signal<any[]>([]);
  readonly selectedNetwork = signal<any | null>(null);
  readonly selectedSnapshot = signal<any | null>(null);
  readonly snapshotDevices = signal<any[]>([]);
  readonly events = signal<any[]>([]);

  readonly compareSnapA = signal('');
  readonly compareSnapB = signal('');
  readonly compareResult = signal<any | null>(null);

  readonly viewStack = signal<View[]>([]);

  viewTitle(): string {
    switch (this.currentView()) {
      case 'list': return 'All known networks';
      case 'snapshots': return `Snapshots for ${this.selectedNetwork()?.ssid || ''}`;
      case 'detail': return 'Snapshot devices';
      case 'compare': return 'Snapshot comparison';
      case 'events': return 'Event timeline';
    }
  }

  async ngOnInit(): Promise<void> {
    await this.loadNetworks();
  }

  async loadNetworks(): Promise<void> {
    const result = await this.api.getNetworks();
    if (result.success && result.data) {
      this.networks.set(result.data);
    }
  }

  async selectNetwork(network: any): Promise<void> {
    this.selectedNetwork.set(network);
    this.viewStack.set(['list']);
    this.currentView.set('snapshots');

    const result = await this.api.getSnapshots(network.id);
    if (result.success && result.data) {
      this.snapshots.set(result.data);
    } else {
      this.error.set(result.error || 'Failed to load snapshots');
    }
  }

  async selectSnapshot(snapshot: any): Promise<void> {
    this.selectedSnapshot.set(snapshot);
    this.viewStack.update(v => [...v, 'snapshots']);
    this.currentView.set('detail');

    const result = await this.api.getSnapshotDetail(snapshot.id);
    if (result.success && result.data) {
      this.snapshotDevices.set(result.data.devices || []);
    }
  }

  async showEvents(network: any): Promise<void> {
    this.selectedNetwork.set(network);
    this.viewStack.set(['list']);
    this.currentView.set('events');

    const result = await this.api.getEvents(network.id);
    if (result.success && result.data) {
      this.events.set(result.data);
    }
  }

  async compare(): Promise<void> {
    if (!this.compareSnapA() || !this.compareSnapB()) return;
    this.viewStack.update(v => [...v, 'snapshots']);
    this.currentView.set('compare');

    const result = await this.api.compareSnapshots(this.compareSnapA(), this.compareSnapB());
    if (result.success && result.data) {
      this.compareResult.set(result.data);
    }
  }

  goBack(): void {
    const prev = this.viewStack().pop();
    if (prev) {
      this.currentView.set(prev);
    } else {
      this.currentView.set('list');
    }
  }
}
