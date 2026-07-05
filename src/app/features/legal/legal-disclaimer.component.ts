import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-legal-disclaimer',
  standalone: true,
  template: `
    <div class="legal-overlay">
      <div class="legal-modal">
        <h1>NetSentinel — Aviso Legal / Legal Disclaimer</h1>
        
        <div class="legal-content">
          <h2>English</h2>
          <p>
            NetSentinel is a network monitoring and testing tool. It is designed to be used
            <strong>only on networks you own or have explicit written permission</strong> from the
            owner/administrator to test.
          </p>
          <p>
            Unauthorized scanning, monitoring, or penetration testing of networks you do not own
            is illegal in many jurisdictions and may result in criminal and/or civil penalties.
          </p>
          <p>
            <strong>By accepting this agreement, you acknowledge that:</strong>
          </p>
          <ul>
            <li>You will only use this software on networks you own or have permission to test</li>
            <li>Active scanning features (port scanning, vulnerability detection) require explicit
              confirmation before each scan</li>
            <li>You are solely responsible for compliance with all applicable laws</li>
            <li>The authors of NetSentinel assume no liability for misuse of this software</li>
          </ul>

          <h2>Español</h2>
          <p>
            NetSentinel es una herramienta de monitoreo y testeo de red. Está diseñada para usarse
            <strong>únicamente en redes de tu propiedad o con permiso explícito por escrito</strong>
            del propietario/administrador.
          </p>
          <p>
            El escaneo, monitoreo o testeo de penetración no autorizado de redes que no te pertenecen
            es ilegal en muchos países y puede conllevar sanciones penales y/o civiles.
          </p>
          <p>
            <strong>Al aceptar este acuerdo, reconoces que:</strong>
          </p>
          <ul>
            <li>Solo usarás este software en redes de tu propiedad o con permiso para testear</li>
            <li>Las funciones de escaneo activo requieren confirmación explícita antes de cada escaneo</li>
            <li>Eres el único responsable del cumplimiento de las leyes aplicables</li>
            <li>Los autores de NetSentinel no asumen responsabilidad por el mal uso de este software</li>
          </ul>
        </div>

        <div class="legal-actions">
          <button class="btn btn-primary" (click)="accept()">
            I Accept / Acepto
          </button>
          <button class="btn btn-secondary" (click)="decline()">
            I Decline / Rechazo
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
