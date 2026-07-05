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

## Fase 1: Discovery (Detección pasiva de dispositivos)

- [ ] **Python:** Implementar detección completa de red actual (SSID, gateway, subred, IP/MAC local)
  - [ ] Windows: `ipconfig /all` parser (mejorar el actual)
  - [ ] Linux/macOS: `ifconfig`/`ip addr` parser
- [ ] **Python:** Implementar ARP scan con scapy (fallback a `arp -a`)
- [ ] **Python:** Integrar vendor lookup por OUI en resultados
- [ ] **Python:** Endpoint `GET /api/v1/discovery/network` completo
- [ ] **Python:** Endpoint `POST /api/v1/discovery/scan` con progreso vía WebSocket
- [ ] **Python:** Tests para discovery service
- [ ] **Node:** IPC handler mejorado con persistencia de snapshot
- [ ] **Angular:** UI de discovery con tabla de dispositivos (IP, MAC, vendor, hostname)
- [ ] **Angular:** Indicador de estado "escaneando..."
- [ ] **E2E:** Probar discovery en red local

**Commit:** `f1 — Network discovery module`

---

## Fase 2: Port Scanning (Escaneo activo de puertos)

- [ ] **Python:** Mejorar service de port scanning con opciones avanzadas
  - [ ] Escaneo TCP SYN (-sS), TCP connect (-sT), UDP (-sU)
  - [ ] Rango de puertos personalizable
  - [ ] Detección de versión de servicio (-sV)
- [ ] **Python:** Endpoint `POST /api/v1/scan/ports` con progreso vía WebSocket
- [ ] **Python:** Tests para port scanner
- [ ] **Node:** IPC handler con registro en base de datos
- [ ] **Angular:** Modal de confirmación/aviso legal para escaneo activo
- [ ] **Angular:** Formulario: IP objetivo, rango de puertos, tipo de escaneo
- [ ] **Angular:** Tabla de resultados (puerto, estado, servicio, versión)
- [ ] **Angular:** Badge de severidad en resultados

**Commit:** `f2 — Port scanning module`

---

## Fase 3: Vulnerabilidades (Detección con NSE)

- [ ] **Python:** Service de vulnerabilidades con NSE scripts (`--script vuln`)
- [ ] **Python:** Parseo de resultados NSE (CVE IDs, severidad, descripción)
- [ ] **Python:** Endpoint `POST /api/v1/scan/vulnerabilities`
- [ ] **Python:** Tests para vulnerability service
- [ ] **Node:** IPC handler con almacenamiento en DB
- [ ] **Angular:** Modal de confirmación (reutilizar componente de Fase 2)
- [ ] **Angular:** Formulario: seleccionar dispositivo de la tabla de discovery
- [ ] **Angular:** Vista de resultados con tarjetas de vulnerabilidad (CVE, severidad, service, recomendación)
- [ ] **Angular:** Filtros por severidad (critical/high/medium/low/info)

**Commit:** `f3 — Vulnerability detection module`

---

## Fase 4: Latencia y Calidad de Conexión

- [ ] **Python:** Service de ping asíncrono a gateway e internet (8.8.8.8)
- [ ] **Python:** Cálculo de jitter y pérdida de paquetes
- [ ] **Python:** WebSocket endpoint `/api/v1/latency/ws` con streaming en vivo
- [ ] **Python:** Tests para latency service
- [ ] **Node:** IPC handler con almacenamiento histórico de mediciones
- [ ] **Angular:** Dashboard de latencia en tiempo real con WebSocket
- [ ] **Angular:** Gráfico de líneas (últimos 60 segundos)
- [ ] **Angular:** Indicadores: latencia actual, jitter, pérdida de paquetes
- [ ] **Angular:** Alertas visuales si latencia > umbral o pérdida > 5%

**Commit:** `f4 — Latency & connection quality module`

---

## Fase 5: Histórico y Comparación entre Redes

- [ ] **Node:** Servicio de snapshots: guardar estado completo al detectar red
- [ ] **Node:** Algoritmo de comparación entre dos snapshots
  - [ ] Detectar dispositivos nuevos
  - [ ] Detectar dispositivos desaparecidos
  - [ ] Detectar cambios de puertos abiertos
- [ ] **Node:** Generación de eventos (device_new, device_gone, port_new, port_closed)
- [ ] **Angular:** Vista de lista de redes conocidas con metadatos
- [ ] **Angular:** Vista de detalle de snapshot (dispositivos + puertos)
- [ ] **Angular:** Vista de comparación lado a lado con diff resaltado
- [ ] **Angular:** Timeline de eventos por red

**Commit:** `f5 — History & comparison module`

---

## Fase 6: Dashboard Principal y Pulido

- [ ] **Angular:** Dashboard con tarjetas de resumen en vivo
  - [ ] Dispositivos detectados (conteo + cambios desde último snapshot)
  - [ ] Último escaneo de vulnerabilidades (conteo por severidad)
  - [ ] Latencia actual vs promedio histórico
  - [ ] Eventos recientes (feed en tiempo real)
- [ ] **Angular:** Navegación lateral persistente
- [ ] **Angular:** Modo oscuro consistente en toda la UI
- [ ] **Angular:** Responsive para diferentes tamaños de ventana
- [ ] **Angular:** Cargar estados vacíos/error/loading en cada vista

**Commit:** `f6 — Dashboard & UI polish`

---

## Fase 7: Sistema de Alertas y Eventos

- [ ] **Node:** Sistema de eventos con severidad (info/warning/critical)
  - [ ] Evento: dispositivo nuevo detectado
  - [ ] Evento: dispositivo desaparecido
  - [ ] Evento: puerto nuevo abierto
  - [ ] Evento: vulnerabilidad crítica encontrada
  - [ ] Evento: latencia alta sostenida
- [ ] **Node:** Persistencia de eventos en SQLite
- [ ] **Node:** Notificaciones del sistema operativo (Electron Notification API)
- [ ] **Angular:** Feed de eventos en dashboard
- [ ] **Angular:** Badge de notificaciones no leídas
- [ ] **Angular:** Marcado de eventos como leídos

**Commit:** `f7 — Alert & event system`

---

## Fase 8: Build y Empaquetado para Producción

- [ ] **Python:** Compilar con PyInstaller y verificar binario standalone
- [ ] **Node:** Configurar `extraResources` en electron-builder con el binario
- [ ] **Build:** Probar build completo en Windows
- [ ] **Build:** Probar build completo en macOS (si hay acceso)
- [ ] **Build:** Probar build completo en Linux (si hay acceso)
- [ ] **QA:** Probar app empaquetada sin Python instalado
- [ ] **QA:** Probar app empaquetada sin nmap instalado (con mensaje de error claro)
- [ ] **QA:** Probar flujo legal disclaimer → dashboard → discovery → port scan

**Commit:** `f8 — Production build & packaging`

---

## Fase 9: Internacionalización i18n

- [ ] **Angular:** Configurar @angular/localize
- [ ] **Angular:** Extraer textos al archivo de traducción base
- [ ] **Angular:** Traducir UI a inglés y español
- [ ] **Angular:** Selector de idioma en settings

**Commit:** `f9 — i18n support (en/es)`

---

## Fase 10: Mejoras de Escalabilidad (Futuro)

- [ ] **Node:** Refactorizar Database a patrón Repository para poder cambiar de SQLite a PostgreSQL
- [ ] **Python:** Añadir autenticación por API key para modo microservicio standalone
- [ ] **Python:** Dockerfile para despliegue del engine como contenedor
- [ ] **Angular:** Migrar de Signals a signals store si la app crece (o añadir NgRx opcional)
- [ ] **Documentación:** Actualizar DESARROLLO.md con instrucciones para microservicio

**Commit:** `f10 — Scalability improvements`

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
