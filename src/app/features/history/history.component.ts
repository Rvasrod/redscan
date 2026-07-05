import { Component } from '@angular/core';

@Component({
  selector: 'app-history',
  standalone: true,
  template: `
    <div class="page">
      <h1>History & Comparison</h1>
      <p>Network snapshot history — coming soon</p>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; color: #e0e0e0; font-family: system-ui, -apple-system, sans-serif; background: #16213e; min-height: 100vh; }
    h1 { color: #e94560; }
  `],
})
export class HistoryComponent {}
