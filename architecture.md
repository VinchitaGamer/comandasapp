# SKILL: Arquitectura Desacoplada - Sistema de Comandas

## 1. Topología General del Sistema
El proyecto implementa una arquitectura cliente-servidor estricta y desacoplada. Se compone de una aplicación *Frontend* (Next.js) que se encarga exclusivamente de la interfaz y la lógica de presentación, y una aplicación *Backend* (FastAPI) que maneja la lógica de negocio, la base de datos y la retransmisión de eventos. 

Ambas capas se comunican mediante dos protocolos:
- *HTTP/REST:* Para operaciones asíncronas tradicionales (Autenticación, CRUD de menú, carga inicial de datos).
- *WebSockets (WS):* Para una conexión bidireccional persistente que transmite los cambios de estado de las comandas en tiempo real entre la cocina y los meseros.

## 2. Estructura del Entorno (Directorio Base)
Se recomienda estructurar el proyecto en un monorepo lógico con dos carpetas raíz para facilitar el despliegue y control de versiones:

/restaurante-comandas
│
├── /backend                 (Entorno Python / FastAPI)
│   ├── /app
│   │   ├── /api             (Rutas y endpoints REST)
│   │   ├── /core            (Configuraciones, seguridad JWT)
│   │   ├── /models          (Esquemas de SQLAlchemy)
│   │   ├── /websockets      (Gestor de conexiones WS)
│   │   └── main.py          (Punto de entrada de la aplicación)
│   ├── database.db          (Archivo SQLite)
│   └── requirements.txt
│
└── /frontend                (Entorno Node.js / Next.js)
    ├── /src
    │   ├── /components      (Layouts, UI Bento, Tarjetas)
    │   ├── /pages           (Vistas: /mesero, /cocina, /admin)
    │   ├── /services        (Clientes Axios y gestión de WebSockets)
    │   └── /store           (Gestión de estado global: uso exclusivo de Zustand)
    ├── package.json
    └── next.config.js

## 3. Especificaciones del Backend (Python / FastAPI)
- *Servidor:* Uvicorn/Gunicorn actuando como servidor ASGI para soportar operaciones asíncronas y WebSockets.
- *ORM:* SQLAlchemy configurado para trabajar con SQLite local. *Es obligatorio inyectar un evento de conexión (engine listener) para ejecutar PRAGMA journal_mode=WAL; y PRAGMA synchronous=NORMAL;* asegurando concurrencia sin bloqueos en el archivo *database.db*.
- *Gestor de WebSockets:* Un módulo dedicado (*ConnectionManager*) que almacene las conexiones activas en memoria, filtrando las emisiones por "salas" o "roles" (ej. emitir actualización a la sala *cocina* o sala *meseros*).
- *CORS:* Configuración estricta en FastAPI para permitir peticiones entrantes únicamente desde la URL/IP donde esté alojado el Frontend.

## 4. Especificaciones del Frontend (React / Next.js)
- *Renderizado:* Client-Side Rendering (CSR) para las vistas operativas (/mesero, /cocina) ya que requieren reactividad extrema y conexión WebSocket constante.
- *Manejo de Estado:* Uso estricto y exclusivo de *Zustand* para mantener sincronizada la UI con los eventos que llegan del WS, evitando re-renderizados innecesarios. Al recibir un mensaje tipo *UPDATE_COMANDA*, el estado local debe mutar sin recargar la página.
- *Gestión de Sesión:* Los tokens JWT emitidos por el backend se almacenan de forma segura en el cliente. Interceptores de Axios deben adjuntar el token en el header *Authorization: Bearer <token>* de cada petición HTTP. Para la autenticación en WebSockets, el token JWT debe enviarse a través de un parámetro de consulta en la URL (ej. ws://dominio/ws?token=<token>) o como el primer mensaje del payload al abrir la conexión.
- *Resiliencia de Conexión:* Implementar lógica de reconexión automática (Exponential Backoff) para los WebSockets en el cliente. Al reconectar, el frontend debe realizar un fetch HTTP de las comandas activas para reconciliar cualquier estado perdido durante la desconexión.

## 5. Diagrama de Flujo de Datos (Comanda en Tiempo Real)
1. El *Frontend (Mesero)* envía un POST `/api/comandas` con el JSON de la orden.
2. El *Backend (FastAPI)* valida el token, inserta la comanda y sus detalles en *SQLite* y retorna un código 201 Created.
3. Inmediatamente, FastAPI invoca al *ConnectionManager* para emitir un evento WS con los datos de la comanda hacia los clientes conectados con el rol *COCINA*.
4. El *Frontend (Cocina)* recibe el evento WS y actualiza su lista de tarjetas en pantalla.
5. Al terminar, la cocina presiona "Listo", enviando un PATCH `/api/comandas/{id}`.
6. FastAPI actualiza el estado en la base de datos y emite un evento WS hacia los *MESEROS*, indicando que la orden está para recoger.

## 6. Configuración para Despliegue en VPS (Ubuntu)
Para garantizar la separación en producción, los servicios deben operar de la siguiente manera:
- *Proxy Inverso (Nginx):* Maneja el tráfico de entrada por los puertos 80/443. 
  - Las peticiones a la ruta `/api` o `/ws` se redirigen al puerto interno de FastAPI (ej. localhost:8000).
  - Las peticiones a la ruta `/` se redirigen al puerto interno de Next.js (ej. localhost:3000).
- *Gestor de Procesos:* 
  - *PM2* para mantener vivo el proceso de Next.js.
  - *Systemd* para mantener activo el servicio de Gunicorn/Uvicorn del backend.
