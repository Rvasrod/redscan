import { Component } from '@angular/core';

@Component({
  selector: 'app-latency',
  standalone: true,
  template: `
    <div class="page">
      <h1>Latency Monitor</h1>
      <p>Real-time latency monitoring — coming soon</p>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; color: #e0e0e0; font-family: system-ui, -apple-system, sans-serif; background: #16213e; min-height: 100vh; }
    h1 { color: #e94560; }
  `],
})
export class LatencyComponent {}
