import { Routes } from '@angular/router';
import { legalDisclaimerGuard } from './core/guards/legal-disclaimer.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [legalDisclaimerGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'discovery',
        loadComponent: () =>
          import('./features/discovery/discovery.component').then((m) => m.DiscoveryComponent),
      },
      {
        path: 'port-scan',
        loadComponent: () =>
          import('./features/port-scan/port-scan.component').then((m) => m.PortScanComponent),
      },
      {
        path: 'vulnerability',
        loadComponent: () =>
          import('./features/vulnerability/vulnerability.component').then((m) => m.VulnerabilityComponent),
      },
      {
        path: 'latency',
        loadComponent: () =>
          import('./features/latency/latency.component').then((m) => m.LatencyComponent),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/history/history.component').then((m) => m.HistoryComponent),
      },
    ],
  },
  {
    path: 'legal',
    loadComponent: () =>
      import('./features/legal/legal-disclaimer.component').then((m) => m.LegalDisclaimerComponent),
  },
];
