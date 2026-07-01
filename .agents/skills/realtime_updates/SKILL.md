---
name: realtime_updates
description: Guía de arquitectura y patrones de diseño para actualizaciones en tiempo real en aplicaciones web, analizando WebSockets, Server-Sent Events (SSE) y Short/Long Polling.
---

# Patrones de Actualización en Tiempo Real en Sistemas Web

Este documento detalla las metodologías, ventajas, desventajas y configuraciones necesarias para implementar sistemas de actualización en tiempo real fiables en entornos de producción.

---

## 1. Comparativa de Protocolos en Tiempo Real

### A) WebSockets (WS / WSS)
Es un protocolo bidireccional de baja latencia basado en TCP. Una vez establecido el handshake mediante HTTP (101 Switching Protocols), la conexión permanece abierta para que tanto el cliente como el servidor envíen datos de forma asíncrona.

*   **Ventajas**: Bidireccional puro, bajísima latencia, ideal para chat o juegos multijugador.
*   **Desventajas**:
    *   No pasa bien por firewalls corporativos o proxies estrictos que bloquean protocolos que no sean estándar HTTP.
    *   Requiere configuración manual en proxies inversos (ej. Nginx: `Upgrade` y `Connection` headers).
    *   Sufre desconexiones agresivas en navegadores móviles (iOS/Android cortan sockets al apagar pantalla o cambiar de pestaña para ahorrar batería).
    *   No tiene reconexión automática nativa en el navegador; debe ser programada en JavaScript.

### B) Server-Sent Events (SSE)
Es un protocolo unidireccional (servidor a cliente) que opera sobre HTTP estándar usando cabeceras de streaming (`text/event-stream`). El cliente abre una petición GET persistente y el servidor le envía eventos de forma indefinida.

*   **Ventajas**:
    *   Funciona sobre HTTP/HTTPS estándar. Pasa de forma transparente por todos los proxies, firewalls y balanceadores de carga sin configuración adicional.
    *   Navegadores móviles lo manejan de forma nativa e inteligente.
    *   **Reconexión automática nativa**: Si la conexión se corta, el navegador intenta reconectar automáticamente en segundo plano sin código JavaScript adicional.
    *   Soporta paso de identificadores del último evento recibido (`Last-Event-ID`) para recuperar datos perdidos tras reconexión.
*   **Desventajas**:
    *   Unidireccional. Si el cliente necesita enviar datos, debe hacer peticiones HTTP tradicionales (POST/PATCH/PUT), lo cual es ideal para arquitecturas RESTful.

### C) Short Polling y Long Polling
El cliente hace peticiones HTTP periódicas para preguntar si hay cambios. En Short Polling se hace con un `setInterval` (ej. cada 5s). En Long Polling, el servidor mantiene la petición abierta hasta que tiene datos nuevos, responde, y el cliente vuelve a abrir una petición.

*   **Ventajas**: Altamente compatible, no requiere conexiones persistentes dedicadas en el servidor.
*   **Desventajas**: Short Polling genera mucho tráfico innecesario y latencia; Long Polling es ineficiente en recursos de CPU bajo alta carga.

---

## 2. Retos Comunes en Entornos de Producción (VPS)

### A) Multiprocesamiento (Workers de Servidor de Aplicaciones)
Cuando se usan servidores como Gunicorn con múltiples workers (`-w 4`), cada worker corre en su propio proceso aislado.
*   **El problema**: Si los sockets se almacenan en la memoria interna del proceso (ej. una lista de Python), un mensaje emitido por el Worker A no llegará a los clientes conectados en el Worker B.
*   **Soluciones**:
    1.  **Un solo worker (`-w 1`)**: Adecuado para baja/mediana carga, unifica la memoria del WebSocket en un único proceso.
    2.  **Broker de Mensajes (Redis Pub/Sub)**: Imprescindible para escalar horizontalmente. Los workers se suscriben a un canal de Redis y retransmiten el mensaje a sus respectivos sockets locales.

### B) Restricciones de Red y Extensiones de Navegador
Ciertos proxies corporativos, firewalls y extensiones de navegador (como bloqueadores de anuncios, falsificadores de ubicación o rastreadores tipo "spoofer.js") bloquean proactivamente las conexiones WebSocket (`ws://` o `wss://`) por seguridad o privacidad, provocando cierres inesperados de conexión tras unos segundos.
*   **Solución**: En entornos propensos a estos bloqueos, **Server-Sent Events (SSE)** es infinitamente más robusto, ya que la conexión parece una descarga de archivo de texto HTTP persistente.

---

## 3. Guía de Selección para el Sistema de Comandas

Para un restaurante que utiliza tablets, teléfonos móviles (iOS/Android) y computadoras de escritorio, la fiabilidad de la conexión es vital.

| Requisito | WebSockets | Server-Sent Events (SSE) |
| :--- | :--- | :--- |
| **Resiliencia en móviles** | Baja (se desconecta al apagar la pantalla) | Alta (reconecta automáticamente) |
| **Bypass de Firewalls / Extensiones** | Medio/Bajo (a menudo bloqueados) | Excelente (HTTP puro) |
| **Facilidad de despliegue en VPS** | Requiere Nginx Upgrade y timeouts largos | Sin cambios en Nginx (HTTP estándar) |
| **Flujo de datos** | Bidireccional (innecesario para comandas) | Unidireccional (suficiente con REST POST) |

### Arquitectura Recomendada para Restaurantes:
1.  **Escrituras**: El mesero/cocinero envía las actualizaciones de estado mediante peticiones HTTP REST estándar (`POST /comandas`, `PATCH /comandas/{id}`).
2.  **Lecturas en tiempo real**: Los terminales escuchan una conexión **Server-Sent Events (SSE)** en `/api/comandas/events`.
3.  **Resiliencia**: Si el SSE se interrumpe temporalmente, el cliente vuelve a conectarse automáticamente y el frontend realiza un fetch rápido para reconciliar el estado.
