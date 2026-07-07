# NetSentinel

Aplicación de escritorio profesional para monitoreo de red, detección de dispositivos, escaneo de puertos y detección de vulnerabilidades.

## ¿Qué Hace?

NetSentinel te ayuda a entender qué está pasando en tu red:

- **Ve todos los dispositivos** conectados a tu red Wi-Fi o cableada
- **Escanea puertos abiertos** y servicios ejecutándose en cualquier dispositivo
- **Detecta vulnerabilidades conocidas** en los servicios encontrados
- **Monitorea la latencia** y calidad de la conexión en tiempo real
- **Rastrea cambios a lo largo del tiempo** — detecta cuando aparecen nuevos dispositivos o cambian configuraciones

## Instalación

### Desde el Instalador (Windows)

1. Descarga el archivo `NetSentinel Setup x.x.x.exe` desde la página de Releases
2. Ejecuta el instalador — no necesitas dependencias adicionales
3. Inicia NetSentinel desde el Menú Inicio

### Desde el Código Fuente (para desarrolladores)

Consulta [DESARROLLO.md](./DESARROLLO.md) para instrucciones de configuración.

## Cómo Usarlo

1. **Inicia NetSentinel** — detectará automáticamente tu red actual y comenzará el descubrimiento pasivo
2. El **Dashboard** muestra el estado de tu red y enlaces a cada funcionalidad
3. **Network Discovery** (pasivo) — lista todos los dispositivos conectados a tu red
4. **Port Scanner** (activo) — requiere confirmación: escanea puertos abiertos en un dispositivo seleccionado
5. **Vulnerability Check** (activo) — requiere confirmación: verifica servicios en busca de vulnerabilidades conocidas
6. **Latency Monitor** — ping en tiempo real a tu gateway e internet
7. **History** — compara snapshots de red para detectar cambios

## ⚠️ Aviso Legal

**NetSentinel está diseñado para usarse ÚNICAMENTE en redes de tu propiedad o con permiso explícito para realizar pruebas.**

- El escaneo o monitoreo no autorizado de redes es **ilegal** en muchos países
- Eres el único responsable del cumplimiento de todas las leyes aplicables
- Las funciones de escaneo activo requieren **confirmación explícita** antes de cada escaneo — nada se ejecuta automáticamente
- Los autores **no asumen responsabilidad alguna** por el mal uso de este software

Al usar NetSentinel, aceptas estos términos.

## Requisitos

- **Windows 10/11** (64-bit)
- Privilegios de administrador para escaneo de puertos y descubrimiento avanzado
- No necesitas Python ni ningún otro runtime — todo está empaquetado

## Estado del Desarrollo

Actualmente en **Fase 13: Bugfix Sprint**. El proyecto ha sido revisado en profundidad y se están corrigiendo bugs críticos identificados en las 3 capas (Electron, Angular, Python). Consulta [PLAN.md](./PLAN.md) para el estado detallado y [DESARROLLO.md](./DESARROLLO.md) para el registro de cambios.

## Licencia

Licencia MIT — consulta [LICENSE.txt](./LICENSE.txt) para más detalles.
