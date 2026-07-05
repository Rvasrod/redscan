import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>NetSentinel</h2>
          <div class="status-dot" [class.connected]="api.engineConnected()"></div>
        </div>

        <nav class="sidebar-nav">
          <a class="nav-item" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">
            <span class="nav-icon">◉</span> Dashboard
          </a>
          <a class="nav-item" routerLink="/discovery" routerLinkActive="active">
            <span class="nav-icon">⊙</span> Discovery
          </a>
          <a class="nav-item" routerLink="/port-scan" routerLinkActive="active">
            <span class="nav-icon">◎</span> Port Scan
          </a>
          <a class="nav-item" routerLink="/vulnerability" routerLinkActive="active">
            <span class="nav-icon">⚠</span> Vulnerabilities
          </a>
          <a class="nav-item" routerLink="/latency" routerLinkActive="active">
            <span class="nav-icon">▤</span> Latency
          </a>
          <a class="nav-item" routerLink="/history" routerLinkActive="active">
            <span class="nav-icon">⏱</span> History
          </a>
        </nav>
      </aside>

      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-shell { display: flex; min-height: 100vh; background: #16213e; font-family: system-ui, -apple-system, sans-serif; }
    .sidebar { width: 220px; min-width: 220px; background: #1a1a2e; border-right: 1px solid #0f3460; display: flex; flex-direction: column; padding: 0; }
    .sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 1.2rem 1.2rem; border-bottom: 1px solid #0f3460; }
    .sidebar-header h2 { margin: 0; font-size: 1.2rem; color: #e94560; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; background: #555; }
    .status-dot.connected { background: #4ecca3; box-shadow: 0 0 6px #4ecca3; }
    .sidebar-nav { display: flex; flex-direction: column; padding: 0.5rem 0; gap: 0.1rem; }
    .nav-item { display: flex; align-items: center; gap: 0.7rem; padding: 0.7rem 1.2rem; color: #888; text-decoration: none; font-size: 0.9rem; transition: all 0.15s; border-left: 3px solid transparent; }
    .nav-item:hover { background: rgba(233, 69, 96, 0.05); color: #e0e0e0; }
    .nav-item.active { background: rgba(233, 69, 96, 0.1); color: #e94560; border-left-color: #e94560; }
    .nav-icon { font-size: 1rem; width: 1.2rem; text-align: center; }
    .main-content { flex: 1; overflow-y: auto; }
  `],
})
export class MainLayoutComponent {
  protected readonly api = inject(ApiService);
}
