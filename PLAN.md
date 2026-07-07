# Plan de Desarrollo — NetSentinel

> Cada paso incluye: implementación → test → commit → push.
> Los checkboxes se marcan a medida que se completan.

---

## Fase 0: Fundación ✅

- [x] Crear estructura de carpetas del proyecto
- [x] Configurar archivos raíz (package.json, angular.json, tsconfig, electron-builder.yml, .gitignore)
- [x] Implementar esqueleto de Electron (main.ts, preload.ts, python-manager, database, logger, IPC handlers)
- [x] Implementar esqueleto de Angular (standalone components, routing, guards, servicios core, dashboard)
- [x] Implementar esqueleto de Python/FastAPI (health endpoint, router v1, config, logger, excepciones)
- [x] Escribir tests unitarios de Python (modelos de discovery, port-scan, vulnerability, OUI)
- [x] Verificar que todo compila (TypeScript, Angular build, pytest)

**Commit:** `f0c4d19 — Initial project skeleton`

---

## Fase 1: Discovery (Detección pasiva de dispositivos) ✅

- [x] **Python:** Implementar detección completa de red actual (SSID, gateway, subred, IP/MAC local)
  - [x] Windows: `ipconfig /all` parser + `netsh wlan` + `route print`
  - [x] Linux/macOS: `ip`/`ifconfig`/`nmcli`/`iwgetid` parser
- [x] **Python:** Implementar ARP scan con scapy (fallback a `arp -a`)
- [x] **Python:** Integrar vendor lookup por OUI en resultados
- [x] **Python:** Endpoint `GET /api/v1/discovery/network` completo
- [x] **Python:** Endpoint `POST /api/v1/discovery/scan` + WebSocket `/ws/scan` con progreso
- [x] **Python:** Tests (modelos, OUI — 18 tests)
- [x] **Node:** IPC handler mejorado con persistencia de snapshot
- [x] **Angular:** UI de discovery con tabla de dispositivos (IP, MAC, vendor, hostname)
- [x] **Angular:** Indicador de estado "escaneando..."

**Commit:** `1154390 — feat: completar descubrimiento de red (Fase 1)`

---

## Fase 2: Port Scanning (Escaneo activo de puertos) ✅

- [x] **Python:** Mejorar service de port scanning con opciones avanzadas
  - [x] Escaneo TCP SYN (-sS), TCP connect (-sT), UDP (-sU)
  - [x] Rango de puertos personalizable
  - [x] Detección de versión de servicio (-sV)
- [x] **Python:** Endpoint `POST /api/v1/scan/ports` + WebSocket `/ws/ports` con progreso
- [x] **Python:** Endpoint `GET /api/v1/scan/types`
- [x] **Python:** Tests para port scanner (7 tests, 42 total)
- [x] **Node:** IPC handler con registro en base de datos
- [x] **Angular:** Banner de advertencia para escaneo activo
- [x] **Angular:** Formulario: IP objetivo (select desde discovery), rango de puertos, tipo de escaneo
- [x] **Angular:** Tabla de resultados (puerto, estado, servicio, versión)

**Commit:** `f2 — Port scanning module`

---

## Fase 3: Vulnerabilidades (Detección con NSE) ✅

- [x] **Python:** Service de vulnerabilidades con NSE scripts (`--script vuln`)
- [x] **Python:** Parseo de resultados NSE (CVE IDs, severidad, descripción, recomendación)
- [x] **Python:** Endpoint `POST /api/v1/scan/vulnerabilities` + WebSocket `/ws/vulnerabilities`
- [x] **Python:** Tests (modelos — 4 tests)
- [x] **Node:** IPC handler con almacenamiento en DB (crea port_scan + inserta vulnerabilities)
- [x] **Angular:** Banner de advertencia para escaneo activo
- [x] **Angular:** Formulario: seleccionar dispositivo + rango de puertos opcional
- [x] **Angular:** Vista de resultados con tarjetas (CVE badge, severidad, descripción, recomendación)
- [x] **Angular:** Filtros por severidad (critical/high/medium/low/info)

**Commit:** `f3 — Vulnerability detection module`

---

## Fase 4: Latencia y Calidad de Conexión ✅

- [x] **Python:** Service de ping asíncrono con manejo de fallos individuales
- [x] **Python:** Cálculo de latencia (avg/min/max), jitter y pérdida de paquetes
- [x] **Python:** REST endpoint `POST /latency/measure` + WebSocket `/latency/ws` en vivo
- [x] **Python:** Tests (modelos — 3 tests)
- [x] **Node:** IPC handler con almacenamiento histórico en tabla `latency_meas`
- [x] **Angular:** Dashboard en tiempo real con WebSocket (conexión directa al engine)
- [x] **Angular:** Gráfico de barras dinámico (últimas 60 lecturas)
- [x] **Angular:** Indicadores: latencia, jitter, pérdida de paquetes, target
- [x] **Angular:** Alertas visuales si latencia > 150ms o pérdida > 5%

**Commit:** `f4 — Latency & connection quality module`

---

## Fase 5: Histórico y Comparación entre Redes ✅

- [x] **Node:** Servicio de snapshots: guardar estado completo al detectar red
- [x] **Node:** Algoritmo de comparación entre dos snapshots
  - [x] Detectar dispositivos nuevos
  - [x] Detectar dispositivos desaparecidos
- [x] **Node:** Generación de eventos (device_new, device_gone) almacenados en DB
- [x] **Node:** IPC handler `history:get-events` para timeline
- [x] **Angular:** Vista de lista de redes conocidas con metadatos (SSID, gateway, fechas)
- [x] **Angular:** Vista de detalle de snapshot (tabla de dispositivos)
- [x] **Angular:** Vista de comparación lado a lado con diff resaltado (+ verde, − rojo)
- [x] **Angular:** Timeline de eventos por red con severidad

**Commit:** `f5 — History & comparison module`

---

## Fase 6: Dashboard Principal y Pulido ✅

- [x] **Angular:** Dashboard con tarjetas de resumen en vivo
  - [x] Dispositivos detectados (conteo + cambios desde último snapshot)
  - [x] Último escaneo de vulnerabilidades (conteo por severidad)
  - [x] Latencia actual (avg/jitter/packet loss)
  - [x] Eventos recientes (feed en tiempo real con severidad)
- [x] **Angular:** Navegación lateral persistente (MainLayout con sidebar)
- [x] **Angular:** Modo oscuro consistente en toda la UI
- [x] **Angular:** Responsive con CSS grid auto-fill
- [x] **Angular:** Estados loading/error en dashboard; cada componente ya tiene los suyos

**Commit:** `f6 — Dashboard & UI polish`

---

## Fase 7: Sistema de Alertas y Eventos ✅

- [x] **Node:** Sistema de eventos con severidad (info/warning/critical)
  - [x] Evento: dispositivo nuevo detectado (en persistSnapshot)
  - [x] Evento: dispositivo desaparecido (en persistSnapshot)
  - [x] Evento: puerto nuevo abierto (en persistPortScan)
  - [x] Evento: vulnerabilidad crítica/alta encontrada (en persistVulnerabilityScan)
  - [x] Evento: latencia alta sostenida / pérdida de paquetes (en persistLatency)
- [x] **Node:** Persistencia de eventos en SQLite
- [x] **Node:** Notificaciones OS (Electron Notification API) para warning/critical
- [x] **Angular:** IPC handlers: events:get-all, events:acknowledge, events:acknowledge-all, events:unread-count
- [x] **Angular:** Badge de no leídos en sidebar History (polling cada 10s)
- [x] **Angular:** Marcado de eventos como leídos (individual y masivo)

**Commit:** `f7 — Sistema de alertas y eventos`

---

## Fase 8: Build y Empaquetado para Producción ✅

- [x] **Python:** spec de PyInstaller con hidden imports (scapy, nmap, uvicorn, websockets)
- [x] **Python:** main.py adaptado para frozen mode (sys._MEIPASS, sys.frozen)
- [x] **Python:** Config con database_path por defecto junto al binario compilado
- [x] **Python:** Endpoint `/api/v1/system/nmap` para detectar nmap disponible
- [x] **Node:** electron-builder.yml configurado con extraResources (resources/*)
- [x] **Node:** python-manager.ts manejando app.isPackaged (spawn binario compilado)
- [x] **Node:** Método getNmapStatus() + IPC handler system:get-nmap-status
- [x] **Angular:** ApiService.getNmapStatus() para verificar nmap desde UI
- [x] **Build:** Directorios resources/ y build/ creados con iconos placeholder
- [x] **Build:** .gitignore configurado para trackear iconos pero ignorar builds
- [x] **Build:** Scripts npm build:python (spec), build:python:quick, build:electron (--win), build:electron:all
**Commit:** `f8 — Production build & packaging`

---

## Fase 9: Internacionalización i18n ✅

- [x] **Angular:** LocaleService con signal reactivo + carga de JSON vía fetch
- [x] **Angular:** TranslatePipe impuro para templates (pure: false, actualización reactiva)
- [x] **Angular:** Archivos de traducción: `assets/i18n/en.json`, `assets/i18n/es.json`
- [x] **Angular:** APP_INITIALIZER para cargar locale al arranque (persistencia en localStorage)
- [x] **Angular:** Traducciones en sidebar, dashboard, legal disclaimer (infraestructura lista para el resto)
- [x] **Angular:** Ruta /settings con selector de idioma (🇬🇧 EN / 🇪🇸 ES)
- [x] **Angular:** Enlace a settings en footer del sidebar

**Commit:** `f9 — Internacionalización i18n (en/es)`

---

## Fase 10: Mejoras de Escalabilidad ✅

- [x] **Node:** Refactor a Repository pattern (8 repositorios: Network, Snapshot, Device, PortScan, Vulnerability, Latency, Event, Settings)
- [x] **Node:** Todos los IPC handlers refactorizados para usar repositorios
- [x] **Node:** BaseRepository abstracto para swapping SQLite ↔ PostgreSQL futuro
- [x] **Python:** Middleware de API key opcional (via `NETSENTINEL_API_KEY` env var)
- [x] **Python:** Dockerfile con nmap + uvicorn para despliegue como contenedor
- [x] **Python:** Endpoint `/api/v1/system/nmap` para health check de nmap
- [x] **Tests:** 21 tests Python siguen pasando

**Commit:** `f10 — Scalability improvements (Repository pattern, Docker, API key auth)`

---

## Fase 11: Pulido UI y i18n Completo 🔄

- [ ] **Angular:** Implementar i18n en componente Discovery (usa `discovery.*` keys)
- [ ] **Angular:** Implementar i18n en componente Port Scan (usa `portScan.*` keys)
- [ ] **Angular:** Implementar i18n en componente Vulnerability (usa `vuln.*` keys)
- [ ] **Angular:** Implementar i18n en componente Latency (usa `latency.*` keys)
- [ ] **Angular:** Implementar i18n en componente History (usa `history.*` keys)
- [ ] **Angular:** Completar i18n en Dashboard (textos hardcodeados restantes)
- [ ] **Angular:** Refactorizar Legal Disclaimer a claves de traducción
- [ ] **Angular:** Badge de severidad en tabla de Port Scan (colores por estado)
- [ ] **Angular:** Añadir claves de traducción faltantes (`nav.settings`, `legal.decline`, etc.)
- [ ] **Angular:** Verificar que todos los textos visibles usan `| translate`
- [ ] **Tests:** `npm run build:renderer` sin errores

**Commit:** `f11 — UI polish & full i18n`

---

## Fase 12: Build y QA Final 🔄

- [ ] **Build:** Ejecutar `npm run build:python` (PyInstaller)
- [ ] **Build:** Ejecutar `npm run build:renderer` (ng build --production)
- [ ] **Build:** Ejecutar `npm run build:electron` (electron-builder --win)
- [ ] **QA:** Probar app empaquetada en Windows (flujo completo)
- [ ] **QA:** Probar sin nmap instalado (fallback graceful)
- [ ] **QA:** Probar sin Python compilado (engine no encontrado)

**Commit:** `f12 — Production build & QA`

---

## Fase 13: Bugfix Sprint ✅

- [x] **Bug 1 (High):** `electron/preload.ts` — `off()` no elimina listeners (memory leak)
- [x] **Bug 2 (Critical):** `electron/ipc/scanner.ipc.ts` — persistencia solo funciona para gateway
- [x] **Bug 3 (High):** `src/app/features/dashboard/dashboard.component.ts` — vulnerabilidades siempre 0
- [x] **Bug 4 (High):** `src/app/features/dashboard/dashboard.component.ts` — `NetworkInfo.id` undefined
- [x] **Bug 5 (Critical):** `engine/app/services/port_scanner.py` + `vulnerability.py` — nmap bloquea event loop
- [x] **Bug 6 (High):** `engine/app/api/v1/system.py` — shutdown abrupto con `sys.exit(0)`
- [x] **Bug 7 (High):** `electron/services/python-manager.ts` — `stop()` no espera proceso hijo
- [x] **Bug 8 (High):** `engine/tests/test_port_scanner_service.py` — método inexistente `_check_nmap`
- [x] **Bug 9 (Medium):** `electron/ipc/scanner.ipc.ts` — eventos high/critical mismo `type`
- [x] **Bug 10 (High):** `src/app/features/history/history.component.ts` — `viewStack().pop()` muta signal
- [x] **Bug 11 (Medium):** `src/app/features/history/history.component.ts` — `acknowledged: 1` (number vs boolean)
- [x] **Bug 12 (Medium):** `src/app/features/port-scan/port-scan.component.ts` — dead code + `targetScanType` no es signal
- [x] **Bug 13 (Medium):** `src/app/core/guards/legal-disclaimer.guard.ts` — sin try/catch
- [x] **Bug 14 (High):** `engine/app/services/latency.py` — latencia inflada por `subprocess` + jitter como rango
- [x] **Verificación:** `npm run build:renderer` sin errores
- [x] **Verificación:** `cd engine && pytest -v` pasa todos los tests

**Commit:** `f13 — Bugfix sprint: 14 bugs corregidos`

---

## Leyenda

- ✅ Completado
- [ ] Pendiente
- ~~[ ] Bloqueado~~ (especificar causa)

---

## Notas

- Cada fase debe producir un commit firmado y pusheado a GitHub
- Los tests deben pasar antes de cada commit
- Si una fase requiere permisos de administrador, se indica al inicio
- Las fases pueden solaparse si no hay dependencias bloqueantes
