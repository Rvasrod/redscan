import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { ApiService } from '../services/api.service';

export const legalDisclaimerGuard = () => {
  const api = inject(ApiService);
  const router = inject(Router);

  return api.getSetting('legal_disclaimer_accepted').then((result) => {
    if (result.success && result.data === 'true') {
      return true;
    }
    return router.parseUrl('/legal');
  });
};
