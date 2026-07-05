import { Component } from '@angular/core';

@Component({
  selector: 'app-discovery',
  standalone: true,
  template: `
    <div class="page">
      <h1>Network Discovery</h1>
      <p>Passive device discovery — coming soon</p>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; color: #e0e0e0; font-family: system-ui, -apple-system, sans-serif; background: #16213e; min-height: 100vh; }
    h1 { color: #e94560; }
  `],
})
export class DiscoveryComponent {}
