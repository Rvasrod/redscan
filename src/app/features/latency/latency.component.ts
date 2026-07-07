import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LocaleService } from '../../core/i18n/locale.service';

interface LatencyPoint {
  timestamp: string;
  avg_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
  jitter_ms: number;
  packet_loss_pct: number;
  target: string;
}

@Component({
  selector: 'app-latency',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="page">
      <header class="header">
        <div>
          <h1>{{ 'latency.title' | translate }}</h1>
          <p class="subtitle">{{ 'latency.subtitle' | translate }}</p>
        </div>
        <div class="header-controls">
          <button class="btn" [class.btn-active]="isRunning()" (click)="toggleMonitoring()">
            {{ isRunning() ? ('latency.stop' | translate) : ('latency.start' | translate) }}
          </button>
          <button class="btn btn-secondary" (click)="clearReadings()">{{ 'latency.clear' | translate }}</button>
        </div>
      </header>

      @if (error()) {
        <div class="alert alert-error">
          {{ error() }}
          <button class="btn-close" (click)="error.set(null)">x</button>
        </div>
      }

      <div class="metrics-grid">
        <div class="metric-card" [class.alert-critical]="latestReading()?.packet_loss_pct! > 5" [class.alert-warning]="latestReading()?.avg_latency_ms! > 150 && latestReading()?.avg_latency_ms! <= 300">
          <span class="metric-label">{{ 'latency.avg' | translate }}</span>
          <span class="metric-value">{{ latestReading()?.avg_latency_ms?.toFixed(1) || '—' }} <span class="unit">{{ 'latency.ms' | translate }}</span></span>
          <span class="metric-sub">{{ 'latency.min' | translate }} {{ latestReading()?.min_latency_ms?.toFixed(1) || '—' }} / {{ 'latency.max' | translate }} {{ latestReading()?.max_latency_ms?.toFixed(1) || '—' }} {{ 'latency.ms' | translate }}</span>
        </div>

        <div class="metric-card" [class.alert-critical]="latestReading()?.packet_loss_pct! > 5">
          <span class="metric-label">{{ 'latency.packetLoss' | translate }}</span>
          <span class="metric-value">{{ latestReading()?.packet_loss_pct?.toFixed(1) || '—' }} <span class="unit">{{ 'latency.percent' | translate }}</span></span>
          <span class="metric-sub">{{ packetLossStatus }}</span>
        </div>

        <div class="metric-card">
          <span class="metric-label">{{ 'latency.jitter' | translate }}</span>
          <span class="metric-value">{{ latestReading()?.jitter_ms?.toFixed(1) || '—' }} <span class="unit">{{ 'latency.ms' | translate }}</span></span>
          <span class="metric-sub">{{ 'latency.variation' | translate }}</span>
        </div>

        <div class="metric-card">
          <span class="metric-label">{{ 'latency.target' | translate }}</span>
          <span class="metric-value value-target">{{ latestReading()?.target || '—' }}</span>
          <span class="metric-sub">{{ 'latency.readings' | translate }}: {{ readings().length }}</span>
        </div>
      </div>

      <section class="chart-section">
        <h2>{{ 'latency.chart' | translate }}</h2>
        <div class="chart-container">
          <div class="chart-bars">
            @for (point of visibleReadings; track point.timestamp) {
              <div class="bar-wrapper" [title]="formatTooltip(point)">
                <div
                  class="bar"
                  [style.height.%]="barHeight(point.avg_latency_ms)"
                  [class.alert-critical]="point.packet_loss_pct > 5"
                  [class.alert-warning]="point.avg_latency_ms > 150 && point.avg_latency_ms <= 300"
                ></div>
              </div>
            }
          </div>
          <div class="chart-labels">
            <span>0{{ 'latency.ms' | translate }}</span>
            <span>{{ maxLatencyDisplay() }}{{ 'latency.ms' | translate }}</span>
          </div>
        </div>
      </section>

      @if (!isRunning() && readings().length === 0 && !error()) {
        <div class="empty">
          <p>{{ 'latency.startPrompt' | translate }}</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 2rem; color: #e0e0e0; font-family: system-ui, -apple-system, sans-serif; background: #16213e; min-height: 100vh; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap; }
    .header h1 { margin: 0; font-size: 1.8rem; color: #e94560; }
    .subtitle { margin: 0.3rem 0 0 0; color: #888; font-size: 0.95rem; }
    .header-controls { display: flex; gap: 0.5rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.5rem; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
    .btn-secondary { background: #0f3460; color: #e0e0e0; }
    .btn-secondary:hover { background: #1a4a8a; }
    .btn-active { background: #4a1a2e; color: #e94560; }
    .btn-active:hover { background: #5a2a3e; }
    .alert { display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; }
    .alert-error { background: #4a1a2e; color: #e94560; border: 1px solid #e94560; }
    .btn-close { background: none; border: none; color: inherit; cursor: pointer; font-size: 1.1rem; padding: 0 0.3rem; opacity: 0.7; }
    .btn-close:hover { opacity: 1; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .metric-card { background: #1a1a2e; border: 1px solid #0f3460; border-radius: 10px; padding: 1.2rem; transition: border-color 0.3s; }
    .metric-card.alert-warning { border-color: #e9c445; }
    .metric-card.alert-critical { border-color: #e94560; }
    .metric-label { display: block; font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.3rem; }
    .metric-value { display: block; font-size: 2rem; font-weight: 700; color: #e0e0e0; }
    .metric-value .unit { font-size: 0.9rem; font-weight: 400; color: #888; }
    .metric-value.value-target { font-size: 1.2rem; font-family: monospace; }
    .metric-sub { display: block; font-size: 0.8rem; color: #666; margin-top: 0.2rem; }
    .chart-section { background: #1a1a2e; border: 1px solid #0f3460; border-radius: 10px; padding: 1.2rem 1.5rem; }
    .chart-section h2 { margin: 0 0 1rem 0; font-size: 1rem; color: #e0e0e0; }
    .chart-container { position: relative; }
    .chart-bars { display: flex; align-items: flex-end; gap: 2px; height: 160px; }
    .bar-wrapper { flex: 1; display: flex; align-items: flex-end; height: 100%; min-width: 4px; }
    .bar { width: 100%; min-height: 2px; border-radius: 2px 2px 0 0; background: #4ecc; transition: height 0.3s; cursor: pointer; }
    .bar.alert-warning { background: #e9c445; }
    .bar.alert-critical { background: #e94560; }
    .chart-labels { display: flex; justify-content: space-between; margin-top: 0.3rem; font-size: 0.7rem; color: #555; }
    .empty { display: flex; align-items: center; justify-content: center; padding: 4rem 2rem; color: #666; text-align: center; }
    .empty p { margin: 0; font-size: 1rem; }
  `],
})
export class LatencyComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly locale = inject(LocaleService);

  readonly isRunning = signal(false);
  readonly error = signal<string | null>(null);
  readonly readings = signal<LatencyPoint[]>([]);
  readonly latestReading = signal<LatencyPoint | null>(null);
  readonly maxLatencyDisplay = signal(200);

  readonly MAX_READINGS = 60;
  private ws: WebSocket | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private enginePort = 8765;

  get visibleReadings(): LatencyPoint[] {
    const all = this.readings();
    return all.slice(-this.MAX_READINGS);
  }

  get packetLossStatus(): string {
    const locale = this.locale;
    const latest = this.latestReading();
    if (!latest) return locale.translate('latency.noData');
    if (latest.packet_loss_pct === 0) return locale.translate('latency.noLoss');
    const value = latest.packet_loss_pct.toFixed(1);
    if (latest.packet_loss_pct <= 5) return locale.translate('latency.loss').replace('{value}', value);
    return locale.translate('latency.criticalLoss').replace('{value}', value);
  }

  async ngOnInit(): Promise<void> {
    try {
      this.enginePort = await this.api.getEnginePort();
    } catch {
      this.enginePort = 8765;
    }
  }

  ngOnDestroy(): void {
    this.stopMonitoring();
  }

  toggleMonitoring(): void {
    if (this.isRunning()) {
      this.stopMonitoring();
    } else {
      this.startMonitoring();
    }
  }

  startMonitoring(): void {
    this.isRunning.set(true);
    this.error.set(null);

    try {
      this.ws = new WebSocket(`ws://127.0.0.1:${this.enginePort}/api/v1/latency/ws`);

      this.ws.onopen = () => {
        this.requestMeasurement();
        this.timer = setInterval(() => this.requestMeasurement(), 2000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as LatencyPoint;
          this.addReading(data);
        } catch { /* ignore malformed */ }
      };

      this.ws.onerror = () => {
        this.error.set(this.locale.translate('latency.wsError'));
        this.stopMonitoring();
      };

      this.ws.onclose = () => {
        if (this.isRunning()) {
          this.error.set(this.locale.translate('latency.wsDisconnected'));
          this.stopMonitoring();
        }
      };
    } catch (err) {
      this.error.set(this.locale.translate('latency.wsFailed'));
      this.stopMonitoring();
    }
  }

  stopMonitoring(): void {
    this.isRunning.set(false);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private requestMeasurement(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ target: 'gateway' }));
    }
  }

  private addReading(point: LatencyPoint): void {
    this.readings.update(prev => [...prev, point].slice(-this.MAX_READINGS * 2));
    this.latestReading.set(point);

    const maxVal = Math.max(point.avg_latency_ms, 50);
    this.maxLatencyDisplay.set(Math.max(maxVal * 1.3, 50));
  }

  clearReadings(): void {
    this.readings.set([]);
    this.latestReading.set(null);
    this.maxLatencyDisplay.set(200);
  }

  barHeight(latency: number): number {
    const max = this.maxLatencyDisplay();
    if (max === 0) return 0;
    return Math.min((latency / max) * 100, 100);
  }

  formatTooltip(point: LatencyPoint): string {
    const time = point.timestamp ? new Date(point.timestamp).toLocaleTimeString() : '';
    return this.locale.translate('latency.chartLabel')
        .replace('{time}', time)
        .replace('{value}', point.avg_latency_ms.toFixed(1))
        .replace('{loss}', point.packet_loss_pct.toString());
  }
}
