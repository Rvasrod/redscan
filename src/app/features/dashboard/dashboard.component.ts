import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AppStateService } from '../../core/services/app-state.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="dashboard">
      <header class="header">
        <h1>Dashboard</h1>
        <div class="header-right">
          @if (state.currentNetwork(); as net) {
            <span class="current-ssid">{{ net.ssid }}</span>
          }
          <span class="status-badge" [class.connected]="api.engineConnected()">
            {{ api.engineConnected() ? 'Connected' : 'Connecting...' }}
          </span>
        </div>
      </header>

      @if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      }

      @if (isLoading()) {
        <section class="loading-section">
          <div class="spinner"></div>
          <p>Loading dashboard data...</p>
        </section>
      } @else {
        <div class="summary-grid">
          <div class="summary-card">
            <span class="label">Devices</span>
            <span class="value">{{ deviceCount() }}</span>
            <span class="sub">{{ deviceChange() }}</span>
          </div>

          <div class="summary-card">
            <span class="label">Vulnerabilities</span>
            <span class="value">{{ vulnCount() }}</span>
            <span class="sub">{{ vulnBreakdown() }}</span>
          </div>

          <div class="summary-card">
            <span class="label">Latency</span>
            <span class="value">{{ latencyDisplay() }}</span>
            <span class="sub">{{ jitterDisplay() }}</span>
          </div>

          <div class="summary-card" routerLink="/history" style="cursor:pointer">
            <span class="label">Events (24h)</span>
            <span class="value">{{ eventCount() }}</span>
            <span class="sub">View history →</span>
          </div>
        </div>

        @if (state.currentNetwork(); as net) {
          <section class="section current-network">
            <h3>Current Network</h3>
            <div class="network-info">
              <span><strong>SSID:</strong> {{ net.ssid }}</span>
              <span><strong>Gateway:</strong> {{ net.gateway_ip }}</span>
              <span><strong>IP:</strong> {{ net.interface_ip }}</span>
              <span><strong>Subnet:</strong> {{ net.subnet }}</span>
              <span><strong>MAC:</strong> {{ net.interface_mac }}</span>
            </div>
          </section>
        }

        @if (events().length > 0) {
          <section class="section events-section">
            <h3>Recent Events</h3>
            <div class="events-list">
              @for (e of events(); track e.id) {
                <div class="event-item" [class]="'sev-' + e.severity">
                  <span class="event-icon">
                    @if (e.type === 'device_new') { + }
                    @else if (e.type === 'device_gone') { − }
                    @else { ! }
                  </span>
                  <span class="event-title">{{ e.title }}</span>
                  <span class="event-time">{{ e.created_at | date:'short' }}</span>
                </div>
              }
            </div>
          </section>
        }

        <section class="section quick-links">
          <h3>Quick Actions</h3>
          <div class="links-grid">
            <a class="link-card" routerLink="/discovery">Scan Network</a>
            <a class="link-card" routerLink="/port-scan">Port Scan</a>
            <a class="link-card" routerLink="/vulnerability">Check Vulns</a>
            <a class="link-card" routerLink="/latency">Monitor Latency</a>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .dashboard { padding: 2rem; color: #e0e0e0; font-family: system-ui, -apple-system, sans-serif; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.5rem; }
    .header h1 { margin: 0; font-size: 1.8rem; color: #e94560; }
    .header-right { display: flex; align-items: center; gap: 0.8rem; }
    .current-ssid { font-size: 0.85rem; color: #888; }
    .status-badge { padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem; background: #0f3460; color: #888; }
    .status-badge.connected { background: #1a4a2e; color: #4ecca3; }
    .alert { padding: 0.8rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; background: #4a1a2e; color: #e94560; border: 1px solid #e94560; }
    .loading-section { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; color: #666; }
    .loading-section .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #e94560; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-section p { margin-top: 1rem; font-size: 0.9rem; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .summary-card { background: #1a1a2e; border: 1px solid #0f3460; border-radius: 10px; padding: 1.2rem; }
    .summary-card .label { display: block; font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.3rem; }
    .summary-card .value { display: block; font-size: 1.8rem; font-weight: 700; color: #e0e0e0; }
    .summary-card .sub { display: block; font-size: 0.8rem; color: #888; margin-top: 0.2rem; }
    .section { background: #1a1a2e; border: 1px solid #0f3460; border-radius: 10px; padding: 1.2rem 1.5rem; margin-bottom: 1.2rem; }
    .section h3 { margin: 0 0 0.8rem 0; color: #e94560; font-size: 1rem; }
    .network-info { display: flex; flex-wrap: wrap; gap: 1.2rem; font-size: 0.9rem; }
    .events-list { display: flex; flex-direction: column; gap: 0.4rem; }
    .event-item { display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; padding: 0.4rem 0; border-bottom: 1px solid #0f3460; }
    .event-item:last-child { border-bottom: none; }
    .event-icon { font-weight: 700; width: 1.2rem; text-align: center; }
    .event-title { flex: 1; color: #ccc; }
    .event-time { font-size: 0.75rem; color: #555; white-space: nowrap; }
    .sev-info .event-icon { color: #4e8cca; }
    .sev-warning .event-icon { color: #e9c445; }
    .sev-critical .event-icon { color: #e94560; }
    .links-grid { display: flex; flex-wrap: wrap; gap: 0.6rem; }
    .link-card { padding: 0.6rem 1.2rem; background: #0f3460; border-radius: 8px; color: #e0e0e0; text-decoration: none; font-size: 0.85rem; transition: background 0.15s; }
    .link-card:hover { background: #1a4a8a; }
  `],
})
export class DashboardComponent implements OnInit {
  protected readonly api = inject(ApiService);
  protected readonly state = inject(AppStateService);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deviceCount = signal(0);
  readonly deviceChange = signal('');
  readonly vulnCount = signal(0);
  readonly vulnBreakdown = signal('');
  readonly latencyDisplay = signal('—');
  readonly jitterDisplay = signal('');
  readonly eventCount = signal(0);
  readonly events = signal<any[]>([]);

  async ngOnInit(): Promise<void> {
    await this.loadDashboard();
  }

  private async loadDashboard(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [netResult] = await Promise.all([
        this.api.getNetworkInfo(),
      ]);

      if (netResult.success && netResult.data) {
        this.state.setCurrentNetwork(netResult.data);
        this.api.engineConnected.set(true);
      }

      const currentNet = this.state.currentNetwork();
      const networksResult = await this.api.getNetworks();
      const latestNetwork = currentNet || (networksResult.success && networksResult.data?.[0]);

      if (latestNetwork) {
        const [snapshotsResult, eventsResult] = await Promise.all([
          this.api.getSnapshots(latestNetwork.id || ''),
          this.api.getEvents(latestNetwork.id || ''),
        ]);

        if (snapshotsResult.success && snapshotsResult.data) {
          const snaps = snapshotsResult.data as any[];
          if (snaps.length > 0) {
            const latest = snaps[0];
            this.deviceCount.set(latest.device_count || 0);

            if (snaps.length >= 2) {
              const prev = snaps[1];
              const diff = (latest.device_count || 0) - (prev.device_count || 0);
              this.deviceChange.set(diff > 0 ? `+${diff} since last scan` : diff < 0 ? `${diff} since last scan` : 'No change');
            } else {
              this.deviceChange.set('First scan');
            }

            const detailResult = await this.api.getSnapshotDetail(latest.id);
            if (detailResult.success && detailResult.data) {
              this.state.setDevices(detailResult.data.devices || []);
            }

            const scanData = latest.data ? JSON.parse(latest.data) : null;
            if (scanData?.vulnerabilities) {
              this.vulnCount.set(scanData.vulnerabilities.length);
              const bySeverity: Record<string, number> = {};
              for (const v of scanData.vulnerabilities) {
                bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
              }
              const parts: string[] = [];
              for (const s of ['critical', 'high', 'medium', 'low']) {
                if (bySeverity[s]) parts.push(`${bySeverity[s]} ${s}`);
              }
              this.vulnBreakdown.set(parts.join(', ') || 'No vulns');
            }
          }
        }

        if (eventsResult.success && eventsResult.data) {
          this.events.set(eventsResult.data.slice(0, 10));
          this.eventCount.set(eventsResult.data.length);
        }
      }

      const latencyResult = await this.api.measureLatency('gateway');
      if (latencyResult.success && latencyResult.data) {
        const l = latencyResult.data;
        this.latencyDisplay.set(l.packet_loss_pct >= 100 ? 'No response' : `${l.avg_latency_ms?.toFixed(1)} ms`);
        this.jitterDisplay.set(l.packet_loss_pct >= 100 ? '100% loss' : `jitter ${l.jitter_ms?.toFixed(1)} ms | loss ${l.packet_loss_pct}%`);
      }
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load dashboard');
    }
    this.isLoading.set(false);
  }
}
