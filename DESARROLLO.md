# NetSentinel — Guía de Desarrollo

## Decisiones de Arquitectura

### Por qué Electron + Angular (no Tauri, Qt o MAUI)

| Tecnología | Considerada | Rechazada porque |
|---|---|---|
| **Electron + Angular** | ✅ **Seleccionado** | Ecosistema maduro, Chrome DevTools, comunidad enorme, modelo IPC simple |
| Tauri (Rust) | Considerado | No existe equivalente maduro de scapy o python-nmap en Rust; igual requeriría FFI con Python |
| Qt (C++/Python) | Considerado | Toolchain pesado, poca experiencia de UI tipo web, sin soporte nativo de Angular |
| .NET MAUI | Considerado | Calidad solo en Windows/Mac, soporte Linux débil, ecosistema más pequeño |

La idea clave: **necesitamos Python para networking**. Ningún otro lenguaje tiene tanto scapy (manipulación de paquetes) como python-nmap (escaneo de puertos probado). Electron envuelve Python limpiamente; Tauri aún requeriría empaquetar un runtime de Python.

### Por qué Python + FastAPI (no Go, Rust o Node.js)

| Característica | Python + scapy | Equivalente Node.js | Equivalente Go/Rust |
|---|---|---|---|
| Escaneo ARP | scapy.arp() | Ninguno maduro | Requiere CGo/unsafe |
| Inyección de paquetes | scapy nativo | Ninguno | bindings libpcap |
| Integración nmap | python-nmap | node-nmap (sin mantenimiento) | Ninguno maduro |
| Base de datos OUI | Dict simple | Igual | Igual |

### Por qué Signals (no NgRx/Akita)

Angular Signals es el modelo de reactividad por defecto del framework desde v17+. Elimina boilerplate comparado con NgRx, tiene integración de primera clase con el cambio de detección de Angular, y requiere cero dependencias adicionales.

### Por qué better-sqlite3 (no Sequelize/TypeORM)

- API síncrona es ideal para el main process de Electron (sin cambios de contexto async)
- Addon nativo en C = SQLite más rápido para Node.js
- Sin sobrecarga de ORM — SQL es la herramienta correcta para este esquema
- Migrar a una DB remota después es cuestión de reemplazar la clase `Database`

### Por qué PyInstaller (no Nuitka/Python embebido)

PyInstaller es el compilador Python-a-binario más maduro con amplia documentación sobre cómo embeberlo dentro de Electron vía `extraResources`. Nuitka produce código más rápido pero tiene peor fiabilidad multiplataforma.

---

## Estructura del Proyecto

```
netsentinel/
├── electron/                    # Proceso principal de Electron (Node.js)
│   ├── main.ts                  # Entrada de la app, creación de ventana, ciclo de vida
│   ├── preload.ts               # contextBridge para la API IPC
│   ├── ipc/                     # Manejadores IPC (uno por módulo)
│   │   ├── index.ts             # Registro de todos los manejadores
│   │   ├── discovery.ipc.ts     # Comandos de descubrimiento de red
│   │   ├── scanner.ipc.ts       # Escaneo de puertos + vulnerabilidades
│   │   ├── history.ipc.ts       # Historial de snapshots + comparación
│   │   └── settings.ipc.ts      # Configuración de la app
│   ├── services/
│   │   ├── python-manager.ts    # Spawn/manage del proceso hijo Python
│   │   ├── database.ts          # SQLite via better-sqlite3
│   │   ├── logger.ts            # Logging estructurado
│   │   └── event-bus.ts         # Sistema de eventos interno (futuro)
│   └── utils/
│       ├── paths.ts             # Resolución de rutas para dev/prod
│       └── http.ts              # Cliente HTTP para llamadas Node→Python
│
├── src/                         # Renderer de Angular
│   ├── app/
│   │   ├── core/                # Servicios singleton, modelos, guards
│   │   ├── features/            # Componentes standalone de cada funcionalidad
│   │   ├── shared/              # Componentes UI reutilizables (futuro)
│   │   └── layouts/             # Esqueletos de layout (futuro)
│   └── styles/                  # SCSS global
│
├── engine/                      # Servicio Python FastAPI
│   ├── app/
│   │   ├── main.py              # Punto de entrada FastAPI
│   │   ├── api/v1/              # Rutas REST versionadas
│   │   ├── core/                # Config, logger, excepciones
│   │   ├── models/              # Modelos Pydantic request/response
│   │   ├── services/            # Lógica de negocio (discovery, scan, etc.)
│   │   └── utils/               # ARP, OUI, wrappers de nmap
│   └── tests/                   # Suite de tests pytest
│
├── scripts/
│   ├── dev-setup.ps1            # Configuración del entorno de desarrollo en un comando
│   └── build-all.ps1            # Pipeline completo de build de producción
│
├── PLAN.md                      # Checklist de desarrollo paso a paso
└── resources/                   # Salida de PyInstaller (gitignorado)
```

---

## Protocolo de Comunicación Node ↔ Python

### Transporte

- **REST (HTTP/1.1)** — Para operaciones comando/respuesta: enviar un escaneo, obtener info de red, consultar historial
- **WebSocket** — Para streams en tiempo real: pings de latencia en vivo, progreso de escaneo, eventos de discovery

### URL Base

```
http://127.0.0.1:8765/api/v1/
```

Toda la comunicación ocurre solo en localhost. El servidor Python se vincula a `127.0.0.1` y nunca se expone a la red.

### Autenticación

Ninguna. El servicio Python solo escucha en `127.0.0.1` y solo es accesible desde la máquina local. En el futuro, se podría añadir una API key si el motor se usa como microservicio independiente.

### Manejo de Errores

Python devuelve códigos de estado HTTP estándar:
- `200` — Éxito
- `400` — Petición incorrecta (parámetros inválidos)
- `403` — Permiso denegado (sin admin/root)
- `500` — Error interno (con campo `detail`)

Los manejadores IPC de Node envuelven cada llamada en try-catch y devuelven un envoltorio estandarizado:

```typescript
interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Flujo de Petición

```
Renderer (Angular) → IPC invoke → Main Process (Node) → HTTP → Python (FastAPI)
                                                                         │
                               Renderer (Angular) ← IPC response ← Main Process ← HTTP response
```

---

## Configuración para Desarrollo Local

### Prerrequisitos

- Node.js 18+ (con npm)
- Python 3.10+
- nmap (desde https://nmap.org/download.html) — requerido para escaneo de puertos
- Windows: Npcap (instalado por el instalador de nmap) — requerido para captura de paquetes con scapy

### Configuración en un Comando

```powershell
.\scripts\dev-setup.ps1
```

### Configuración Manual

```powershell
# 1. Instalar dependencias de Node.js
npm install

# 2. Configurar entorno virtual de Python
cd engine
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
cd ..

# 3. Iniciar el motor Python (Terminal 1)
cd engine
..\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8765
# O: npm run dev:python

# 4. Iniciar Angular + Electron (Terminal 2)
npm run dev
```

El script `dev` ejecuta el servidor de desarrollo Angular (puerto 4200) y espera a que esté listo, luego lanza Electron apuntando a `http://localhost:4200`.

### Ejecutar Tests

```powershell
# Tests de Python
cd engine
.\.venv\Scripts\pytest -v

# Tests de Angular (aún no configurados)
npm run test:angular
```

---

## Build de Producción

### Pipeline de Build

```
1. PyInstaller compila Python/engine → resources/netsentinel-engine.exe
2. ng build --production → dist/renderer/
3. electron-builder empaqueta todo → release/NetSentinel Setup *.exe
```

### Comando de Build

```powershell
.\scripts\build-all.ps1
```

O paso a paso:

```powershell
# Paso 1: Compilar motor Python
cd engine
pyinstaller --onefile --name netsentinel-engine --distpath ../resources app/main.py
cd ..

# Paso 2: Compilar Angular
npm run build:renderer

# Paso 3: Empaquetar Electron
npm run build:electron
```

El binario de PyInstaller se incluye via `electron-builder.yml` bajo `extraResources`:

```yaml
extraResources:
  - from: resources/
    to: engine
    filter:
      - "netsentinel-engine*"
```

En tiempo de ejecución, `PythonManager` resuelve la ruta:

```typescript
this.enginePath = path.join(process.resourcesPath, 'engine', 'netsentinel-engine.exe');
```

---

## Esquema de Base de Datos (SQLite)

Gestionado por `electron/services/database.ts` via better-sqlite3.

### Relaciones Entidad-Relación

```
networks 1──N snapshots 1──N devices
    │                          │
    │                          └──N port_scans 1──N vulnerabilities
    │
    └──N latency_meas
    └──N events
settings (almacén clave-valor)
```

### Tablas

#### `networks`
| Columna | Tipo | Descripción |
|---|---|---|
| id | TEXT (UUID) | Clave primaria |
| ssid | TEXT | SSID de la red |
| gateway_ip | TEXT | Dirección IP del gateway |
| gateway_mac | TEXT | Dirección MAC del gateway |
| subnet | TEXT | Máscara de subred |
| interface_name | TEXT | Nombre de la interfaz local |
| interface_ip | TEXT | IP local en esta red |
| interface_mac | TEXT | MAC local en esta interfaz |
| first_seen | TEXT (ISO 8601) | Primera vez que se vio esta red |
| last_seen | TEXT (ISO 8601) | Visita más reciente |

#### `snapshots`
| Columna | Tipo | Descripción |
|---|---|---|
| id | TEXT (UUID) | Clave primaria |
| network_id | TEXT (FK) | Referencia a networks(id) |
| captured_at | TEXT (ISO 8601) | Cuándo se tomó el snapshot |
| device_count | INTEGER | Número de dispositivos encontrados |
| data | TEXT (JSON) | Metadatos arbitrarios |

#### `devices`
| Columna | Tipo | Descripción |
|---|---|---|
| id | TEXT (UUID) | Clave primaria |
| snapshot_id | TEXT (FK) | Referencia a snapshots(id) |
| ip | TEXT | Dirección IP |
| mac | TEXT | Dirección MAC |
| hostname | TEXT | Nombre de host resuelto |
| vendor | TEXT | Resultado de consulta OUI |
| first_seen | TEXT (ISO 8601) | Primer descubrimiento |
| last_seen | TEXT (ISO 8601) | Último descubrimiento |
| is_gateway | INTEGER (0/1) | Si este dispositivo es el gateway |

#### `port_scans`
| Columna | Tipo | Descripción |
|---|---|---|
| id | TEXT (UUID) | Clave primaria |
| snapshot_id | TEXT (FK) | Referencia a snapshots(id) |
| device_id | TEXT (FK) | Referencia a devices(id) |
| scan_type | TEXT | 'tcp' o 'udp' |
| started_at | TEXT (ISO 8601) | Inicio del escaneo |
| completed_at | TEXT (ISO 8601) | Fin del escaneo |
| results | TEXT (JSON) | Salida completa de nmap |
| status | TEXT | 'pending', 'running', 'completed', 'failed' |

#### `vulnerabilities`
| Columna | Tipo | Descripción |
|---|---|---|
| id | TEXT (UUID) | Clave primaria |
| port_scan_id | TEXT (FK) | Referencia a port_scans(id) |
| port | INTEGER | Puerto afectado |
| service | TEXT | Nombre del servicio |
| cve_id | TEXT | Identificador CVE |
| severity | TEXT | 'info', 'low', 'medium', 'high', 'critical' |
| description | TEXT | Descripción de la vulnerabilidad |
| recommendation | TEXT | Sugerencia de remediación |

#### `latency_meas`
| Columna | Tipo | Descripción |
|---|---|---|
| id | TEXT (UUID) | Clave primaria |
| network_id | TEXT (FK) | Referencia a networks(id) |
| timestamp | TEXT (ISO 8601) | Momento de la medición |
| target | TEXT | 'gateway' o 'internet' o IP |
| avg_latency_ms | REAL | Latencia promedio |
| min_latency_ms | REAL | Latencia mínima |
| max_latency_ms | REAL | Latencia máxima |
| jitter_ms | REAL | Variación de latencia |
| packet_loss_pct | REAL | Porcentaje de pérdida de paquetes |

#### `events`
| Columna | Tipo | Descripción |
|---|---|---|
| id | TEXT (UUID) | Clave primaria |
| network_id | TEXT (FK) | Referencia a networks(id) |
| snapshot_id | TEXT (FK) | Referencia a snapshots(id) (nullable) |
| type | TEXT | Tipo de evento (ej. 'device_new', 'port_new') |
| severity | TEXT | 'info', 'warning', 'critical' |
| title | TEXT | Título corto del evento |
| description | TEXT | Descripción detallada |
| created_at | TEXT (ISO 8601) | Marca de tiempo |
| acknowledged | INTEGER (0/1) | Si el usuario lo ha visto/descartado |

#### `settings`
| Columna | Tipo | Descripción |
|---|---|---|
| key | TEXT (PK) | Nombre de la configuración |
| value | TEXT | Valor de la configuración |

---

## Catálogo de Endpoints (Node ↔ Python)

### Sistema

#### `GET /api/v1/health`
Endpoint de health check.

**Respuesta:**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "python_version": "3.11.5"
}
```

#### `POST /api/v1/shutdown`
Apaga gracefulmente el motor Python.

### Discovery

#### `GET /api/v1/discovery/network`
Obtiene información de la red actual (SSID, gateway, IP local, etc.)

**Respuesta:**
```json
{
  "ssid": "MiWiFi",
  "gateway_ip": "192.168.1.1",
  "gateway_mac": "00:11:22:33:44:55",
  "subnet": "255.255.255.0",
  "interface_name": "Wi-Fi",
  "interface_ip": "192.168.1.100",
  "interface_mac": "aa:bb:cc:dd:ee:ff"
}
```

#### `POST /api/v1/discovery/scan`
Realiza escaneo ARP para descubrir dispositivos en la red.

**Respuesta:**
```json
{
  "network": { "...": "..." },
  "devices": [
    { "ip": "192.168.1.1", "mac": "00:11:22:33:44:55", "vendor": "Cisco", "is_gateway": true },
    { "ip": "192.168.1.101", "mac": "aa:bb:cc:11:22:33", "vendor": "Apple", "is_gateway": false }
  ],
  "device_count": 5,
  "scan_duration_ms": 3200.5
}
```

### Escaneo de Puertos

#### `POST /api/v1/scan/ports`
Escanea puertos abiertos en un dispositivo objetivo.

**Petición:**
```json
{
  "target_ip": "192.168.1.101",
  "ports": "22,80,443,8080",
  "scan_type": "tcp"
}
```

**Respuesta:**
```json
{
  "target_ip": "192.168.1.101",
  "open_ports": [
    { "port": 22, "state": "open", "service": "ssh" },
    { "port": 80, "state": "open", "service": "http", "version": "nginx 1.24.0" }
  ],
  "total_scanned": 2,
  "scan_duration_ms": 5230.0,
  "scan_type": "tcp"
}
```

### Detección de Vulnerabilidades

#### `POST /api/v1/scan/vulnerabilities`
Ejecuta scripts NSE de vulnerabilidades contra un objetivo.

**Petición:**
```json
{
  "target_ip": "192.168.1.101"
}
```

**Respuesta:**
```json
{
  "target_ip": "192.168.1.101",
  "vulnerabilities": [
    {
      "cve_id": "CVE-2024-1234",
      "port": 80,
      "service": "http",
      "severity": "high",
      "description": "Desbordamiento de búfer en el parser HTTP...",
      "recommendation": "Actualizar nginx a 1.25.0"
    }
  ],
  "total_found": 1,
  "scan_duration_ms": 15230.0
}
```

### Latencia

#### `WebSocket /api/v1/latency/ws`
Mediciones de latencia en tiempo real.

**El cliente envía:**
```json
{ "target": "gateway" }
```

**El servidor envía:**
```json
{
  "target": "gateway",
  "avg_latency_ms": 3.5,
  "min_latency_ms": 1.2,
  "max_latency_ms": 5.8,
  "jitter_ms": 4.6,
  "packet_loss_pct": 0.0,
  "timestamp": "2026-07-05T13:00:00Z"
}
```

---

## Roadmap y Extensibilidad

### Añadir un Nuevo Módulo de Escaneo

1. **Capa Python:**
   - Crear `app/services/nuevo_scanner.py` — lógica de negocio
   - Crear `app/models/nuevo_scan.py` — modelos Pydantic request/response
   - Crear `app/api/v1/nuevo_scan.py` — router
   - Registrar router en `app/api/v1/router.py`

2. **Capa Node:**
   - Crear `electron/ipc/nuevo_scan.ipc.ts` — manejador IPC
   - Registrar en `electron/ipc/index.ts`

3. **Capa Angular:**
   - Crear `src/app/features/nuevo-scan/` — componente
   - Añadir ruta en `app.routes.ts`
   - Añadir tarjeta en DashboardComponent

### Migrar de SQLite a Base de Datos Remota

La clase `Database` en `electron/services/database.ts` es el punto único de persistencia. Para cambiar a PostgreSQL/MongoDB:

1. Implementar la misma interfaz pública (actualmente `getDb()` expone la instancia de better-sqlite3 — refactorizar a patrón Repository primero)
2. Reemplazar la implementación
3. No se necesitan cambios en los manejadores IPC (dependen de `Database`, no del driver subyacente)

### Usar el Motor Python como Microservicio Independiente

El servicio FastAPI ya es un servidor web independiente. Para desplegarlo de forma autónoma:

1. Eliminar la restricción `--host 127.0.0.1` → vincular a `0.0.0.0`
2. Añadir autenticación por API key
3. Construir imagen Docker
4. Apuntar cualquier cliente HTTP a `http://<host>:8765/api/v1/...`

No se necesitan cambios de código — la API ya es autocontenida.

---

## Registro de Desarrollo (Changelog)

### 2026-07-05 — Esqueleto inicial

- Creada estructura del proyecto: Electron + Angular + Python FastAPI
- Configurado proceso principal de Electron con:
  - Creación de BrowserWindow (dev → localhost:4200, prod → file://)
  - PythonManager: lanza `uvicorn` en dev, binario `netsentinel-engine` en prod
  - Database: esquema SQLite con todas las tablas
  - Manejadores IPC para discovery, scanner, history, settings
- Configurado renderer de Angular con:
  - Arquitectura de componentes standalone
  - Routing con lazy loading para módulos funcionales
  - Guard de aviso legal (bloquea hasta aceptación)
  - Dashboard con tema oscuro
  - ApiService, IpcService, AppStateService
- Configurado motor Python con:
  - FastAPI con rutas versionadas `/api/v1/`
  - Endpoints health y shutdown
  - Servicio de discovery (Windows: ipconfig + arp, con fallback a scapy)
  - Servicio de escaneo de puertos (wrapper python-nmap)
  - Servicio de vulnerabilidades (NSE `--script vuln`)
  - Servicio de latencia (ping asíncrono)
  - Base de datos OUI de fabricantes (150+ prefijos)
  - Jerarquía de excepciones personalizada
  - Logging estructurado
- Creados scripts de desarrollo (dev-setup.ps1, build-all.ps1)
- Documentado todo en DESARROLLO.md y PLAN.md

### Problemas y Resoluciones Notables

- **PyInstaller + hidden imports**: Uvicorn usa imports dinámicos para sus implementaciones de protocolo HTTP. Hay que listar explícitamente `--hidden-import=uvicorn.protocols.http.auto` etc. en el comando de PyInstaller
- **Scapy en Windows requiere Npcap**: El instalador de nmap incluye Npcap, pero si se instala por separado, hay que marcar "Modo compatible con WinPcap". Documentado en prerrequisitos
- **Advertencia de anotaciones de tipo**: Usar `list` en type hints requiere sintaxis Python 3.9+ o `from __future__ import annotations`. Apuntamos a 3.10+ así que `list[str]` nativo funciona
- **Electron contextIsolation**: Toda la comunicación con Node.js pasa por contextBridge/preload. El renderer de Angular no tiene acceso directo a Node.js
- **Importación de servicios nmap**: `PortScannerService` y `VulnerabilityService` se inicializan de forma perezosa (lazy) para que el motor Python pueda importarse sin tener nmap instalado

---

## Permisos de Administrador/Root

Estas operaciones requieren admin/root:

| Operación | Windows | Linux/Mac |
|---|---|---|
| Escaneo ARP con scapy (raw sockets) | Ejecutar como Administrador | `sudo` |
| Escaneo TCP SYN (-sS) | Ejecutar como Administrador | `sudo` |
| Scripts NSE de vulnerabilidades | Ejecutar como Administrador | `sudo` |

Para ejecutar con admin en Windows:
```powershell
Start-Process powershell -Verb RunAs -ArgumentList "cd C:\path\to\netsentinel; npm run dev"
```

Sin admin, el escaneo ARP fallbackea a la tabla ARP del sistema (`arp -a`), y los escaneos SYN fallbackean a TCP connect (`-sT`).
