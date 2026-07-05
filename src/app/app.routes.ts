import { Routes } from '@angular/router';
import { legalDisclaimerGuard } from './core/guards/legal-disclaimer.guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
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
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
  {
    path: 'legal',
    loadComponent: () =>
      import('./features/legal/legal-disclaimer.component').then((m) => m.LegalDisclaimerComponent),
  },
];
