import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';

export const legalDisclaimerGuard = async () => {
  const api = inject(ApiService);
  const router = inject(Router);

  try {
    const result = await api.getSetting('legal_disclaimer_accepted');
    if (result.success && result.data === 'true') {
      return true;
    }
  } catch {
    // If the engine is not running, redirect to legal page
  }
  return router.parseUrl('/legal');
};
