import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AppStateService } from '../../core/services/app-state.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="dashboard">
      <header class="header">
        <h1>NetSentinel</h1>
        <div class="status-badge" [class.connected]="api.engineConnected()">
          {{ api.engineConnected() ? 'Engine Connected' : 'Connecting...' }}
        </div>
      </header>

      <div class="grid">
        <div class="card" routerLink="/discovery">
          <h2>Network Discovery</h2>
          <p>Scan and discover devices on your network</p>
          <span class="badge passive">Passive</span>
        </div>

        <div class="card" routerLink="/port-scan">
          <h2>Port Scanner</h2>
          <p>Scan open ports on discovered devices</p>
          <span class="badge active">Active</span>
        </div>

        <div class="card" routerLink="/vulnerability">
          <h2>Vulnerability Check</h2>
          <p>Check services for known vulnerabilities</p>
          <span class="badge active">Active</span>
        </div>

        <div class="card" routerLink="/latency">
          <h2>Latency Monitor</h2>
          <p>Real-time latency and connection quality</p>
          <span class="badge passive">Passive</span>
        </div>

        <div class="card" routerLink="/history">
          <h2>History</h2>
          <p>Compare network snapshots over time</p>
          <span class="badge info">Data</span>
        </div>
      </div>

      @if (state.currentNetwork(); as net) {
      <section class="current-network">
        <h3>Current Network</h3>
        <div class="network-info">
          <span><strong>SSID:</strong> {{ net.ssid }}</span>
          <span><strong>Gateway:</strong> {{ net.gatewayIp }}</span>
          <span><strong>Your IP:</strong> {{ net.interfaceIp }}</span>
          <span><strong>Subnet:</strong> {{ net.subnet }}</span>
        </div>
      </section>
      }
    </div>
  `,
  styles: [`
    .dashboard { padding: 2rem; color: #e0e0e0; font-family: system-ui, -apple-system, sans-serif; background: #16213e; min-height: 100vh; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
    .header h1 { font-size: 2rem; margin: 0; color: #e94560; }
    .status-badge { padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.85rem; background: #0f3460; color: #888; }
    .status-badge.connected { background: #1a4a2e; color: #4ecca3; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.2rem; margin-bottom: 2rem; }
    .card { background: #1a1a2e; border: 1px solid #0f3460; border-radius: 10px; padding: 1.5rem; cursor: pointer; transition: transform 0.15s, border-color 0.15s; }
    .card:hover { transform: translateY(-2px); border-color: #e94560; }
    .card h2 { margin: 0 0 0.5rem 0; font-size: 1.2rem; color: #e0e0e0; }
    .card p { margin: 0 0 1rem 0; font-size: 0.9rem; color: #888; }
    .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .badge.passive { background: #1a4a2e; color: #4ecca3; }
    .badge.active { background: #4a1a2e; color: #e94560; }
    .badge.info { background: #1a2a4e; color: #4e8cca; }
    .current-network { background: #1a1a2e; border: 1px solid #0f3460; border-radius: 10px; padding: 1.2rem 1.5rem; }
    .current-network h3 { margin: 0 0 0.8rem 0; color: #e94560; font-size: 1rem; }
    .network-info { display: flex; flex-wrap: wrap; gap: 1.5rem; font-size: 0.9rem; }
  `],
})
export class DashboardComponent implements OnInit {
  protected readonly api = inject(ApiService);
  protected readonly state = inject(AppStateService);

  async ngOnInit(): Promise<void> {
    const result = await this.api.getNetworkInfo();
    if (result.success && result.data) {
      this.state.setCurrentNetwork(result.data);
      this.api.engineConnected.set(true);
    }
  }
}
