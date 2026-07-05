import { Component, inject } from '@angular/core';
import { LocaleService, Locale } from '../../core/i18n/locale.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="page">
      <h1>{{ 'settings.title' | translate }}</h1>

      <section class="section">
        <h3>{{ 'settings.language' | translate }}</h3>
        <div class="lang-options">
          <button
            class="lang-btn"
            [class.active]="locale.current() === 'en'"
            (click)="setLocale('en')"
          >
            🇬🇧 {{ 'settings.en' | translate }}
          </button>
          <button
            class="lang-btn"
            [class.active]="locale.current() === 'es'"
            (click)="setLocale('es')"
          >
            🇪🇸 {{ 'settings.es' | translate }}
          </button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; color: #e0e0e0; font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; }
    h1 { margin: 0 0 1.5rem; font-size: 1.8rem; color: #e94560; }
    .section { background: #1a1a2e; border: 1px solid #0f3460; border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem; }
    .section h3 { margin: 0 0 1rem; font-size: 1rem; color: #4ecca3; }
    .lang-options { display: flex; gap: 1rem; }
    .lang-btn { padding: 0.8rem 1.5rem; background: #16213e; color: #888; border: 1px solid #0f3460; border-radius: 8px; cursor: pointer; font-size: 1rem; transition: all 0.15s; }
    .lang-btn:hover { border-color: #4ecca3; color: #e0e0e0; }
    .lang-btn.active { background: rgba(78, 204, 163, 0.1); border-color: #4ecca3; color: #4ecca3; }
  `],
})
export class SettingsComponent {
  protected readonly locale = inject(LocaleService);

  async setLocale(locale: Locale): Promise<void> {
    await this.locale.load(locale);
  }
}
