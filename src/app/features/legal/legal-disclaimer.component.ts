import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-legal-disclaimer',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="legal-overlay">
      <div class="legal-modal">
        <h1>{{ 'app.name' | translate }} — {{ 'legal.title' | translate }}</h1>
        
        <div class="legal-content">
          <h2>{{ 'legal.bodyTitle' | translate }}</h2>
          <p>{{ 'legal.description' | translate }}</p>
          <p>{{ 'legal.paragraph1' }}</p>
          <p>{{ 'legal.paragraph2' }}</p>
          <ul>
            <li>{{ 'legal.list1' | translate }}</li>
            <li>{{ 'legal.list2' | translate }}</li>
            <li>{{ 'legal.list3' | translate }}</li>
            <li>{{ 'legal.list4' | translate }}</li>
          </ul>
          <p class="legal-warning">{{ 'legal.paragraph3' | translate }}</p>
          <p class="legal-warning"><strong>{{ 'legal.warning' | translate }}</strong></p>
        </div>

        <div class="legal-actions">
          <button class="btn btn-primary" (click)="accept()">
            {{ 'legal.accept' | translate }}
          </button>
          <button class="btn btn-secondary" (click)="decline()">
            {{ 'legal.decline' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .legal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .legal-modal {
      background: #1a1a2e;
      color: #e0e0e0;
      border-radius: 12px;
      padding: 2rem;
      max-width: 700px;
      max-height: 90vh;
      overflow-y: auto;
      font-family: system-ui, -apple-system, sans-serif;
    }
    h1 { font-size: 1.4rem; margin-bottom: 1rem; color: #e94560; }
    h2 { font-size: 1.1rem; margin-top: 1.2rem; color: #0f3460; background: #e94560; display: inline-block; padding: 0.2rem 0.8rem; border-radius: 4px; }
    p { line-height: 1.6; margin: 0.6rem 0; }
    ul { margin: 0.6rem 0; padding-left: 1.5rem; }
    li { margin: 0.3rem 0; line-height: 1.5; }
    .legal-warning { color: #e9a560; border-left: 3px solid #e9a560; padding-left: 0.8rem; }
    .legal-actions { display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: flex-end; }
    .btn { padding: 0.7rem 1.5rem; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 600; }
    .btn-primary { background: #e94560; color: white; }
    .btn-primary:hover { background: #d63851; }
    .btn-secondary { background: #16213e; color: #e0e0e0; border: 1px solid #0f3460; }
    .btn-secondary:hover { background: #0f3460; }
  `],
})
export class LegalDisclaimerComponent {
  constructor(
    private readonly api: ApiService,
    private readonly router: Router,
  ) {}

  async accept(): Promise<void> {
    await this.api.setSetting('legal_disclaimer_accepted', 'true');
    await this.router.navigateByUrl('/');
  }

  async decline(): Promise<void> {
    window.close();
  }
}
