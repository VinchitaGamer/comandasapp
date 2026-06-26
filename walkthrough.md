# Walkthrough de Implementación - Sistema de Comandas

Hemos completado exitosamente el desarrollo del sistema de comandas en tiempo real para restaurante, cumpliendo con todos los requerimientos funcionales y no funcionales detallados en los skills del workspace.

---

## Estructura del Proyecto Creado

El monorepo contiene la siguiente estructura de carpetas y archivos clave:

```
/sistema_comandas
│
├── /backend                    (Python / FastAPI)
│   ├── /app
│   │   ├── /api                (Rutas: auth.py, menu.py, comandas.py)
│   │   ├── /core               (config.py, security.py, seed.py)
│   │   ├── /models             (user.py, plate.py, order.py)
│   │   ├── /schemas            (user.py, menu.py, order.py)
│   │   ├── /websockets         (manager.py)
│   │   └── main.py             (Punto de entrada de FastAPI y WS)
│   ├── database.db             (Base de datos local SQLite en modo WAL)
│   ├── Dockerfile
│   └── requirements.txt        (Dependencias: FastAPI, SQLAlchemy, PyJWT, passlib, uvicorn)
│
├── /frontend                   (Next.js / TypeScript / Tailwind CSS)
│   ├── /src
│   │   ├── /components         (Navbar.tsx, ModifierModal.tsx)
│   │   ├── /pages              (login.tsx, mesero.tsx, cocina.tsx, admin.tsx, index.tsx, _app.tsx)
│   │   ├── /services           (api.ts, websocket.ts)
│   │   └── /store              (index.ts - Zustand State Store)
│   ├── /styles
│   │   └── globals.css         (Estilos globales con animaciones premium)
│   ├── Dockerfile
│   └── package.json            (Dependencias: Next.js, Zustand, Axios, Lucide React)
│
└── docker-compose.yml          (Orquestador de contenedores para producción)
```

---

## Logros de Implementación

### 1. Base de Datos Local Concurrente (SQLite + WAL)
- Implementamos modelos en SQLAlchemy vinculados a SQLite.
- **Modo WAL**: Se configuró un engine connection listener en `backend/app/database.py` que fuerza `PRAGMA journal_mode=WAL` y `PRAGMA synchronous=NORMAL` al conectarse. Esto previene bloqueos de escritura y permite que la cocina y el salón envíen y actualicen pedidos simultáneamente de forma segura.

### 2. Seguridad y Lógica de Precios Segura
- **Autenticación**: Hashing de contraseñas con `passlib[bcrypt]` y generación de tokens `JWT` en el backend.
- **Middleware**: El backend valida los tokens y restringe el acceso de endpoints según el rol del usuario (ADMIN, MESERO, COCINA).
- **Cálculo Seguro de Totales**: Para prevenir fraude, el backend **no acepta precios desde el cliente**. El mesero envía los IDs de plato y modificadores, y FastAPI calcula el total consultando los precios reales directamente de la base de datos en `backend/app/api/comandas.py`.

### 3. Comunicación en Tiempo Real (WebSockets)
- Desarrollamos un `ConnectionManager` en `backend/app/websockets/manager.py` que agrupa conexiones por rol.
- Autentica la conexión WebSocket leyendo el token desde el query string del cliente.
- Transmite de inmediato los estados a las pantallas involucradas al crear o avanzar comandas.
- **Frontend resiliente**: Implementamos reconexión exponencial y reconciliación automática (ejecuta un `GET /comandas` al reconectarse para obtener comandas perdidas durante cortes de red).

### 4. Vistas del Sistema (Frontend Moderno y Premium)

- **Login (`/login`)**: Formulario con estética oscura de cristal (glassmorphism), validación de campos y redireccionamiento inteligente según el rol del colaborador.
- **Mesero (`/mesero`)**:
  - Diseño *Bento Box* interactivo para organizar platos por categorías.
  - Modal interactivo (`ModifierModal.tsx`) para configurar cantidades, notas especiales y seleccionar modificadores disponibles.
  - Carrito lateral con resumen y totalizador estimado.
  - Alerta por WebSocket: Cuando cocina despacha un plato, el mesero recibe una notificación flotante visual y una **alerta auditiva con doble tono premium sintetizado digitalmente** usando la API de Audio Web nativa (sin archivos externos).
  - Tarjeta de mesa lista con un borde pulsante dorado y opción de marcar como `ENTREGADO`.
- **Cocina (`/cocina`)**:
  - Tarjetas cronológicas de comandas con desgloses de platos, notas y modificadores destacados.
  - **Cronómetros en Tiempo Real**: Muestran los minutos/segundos transcurridos desde que se hizo el pedido, coloreándose en rojo de alarma si superan los 15 minutos de retraso.
  - Botones de estado dinámicos ("Empezar preparación" -> "Listo").
- **Admin Panel (`/admin`)**:
  - Tarjetas de métricas interactivas: Venta Total, Mesas Servidas, Comandas en cola y Ticket promedio.
  - Leaderboard de los 5 platos más vendidos del día con barras de progreso de popularidad.
  - CRUD completo de platos y categorías, con control de visibilidad (`is_visible`) para ocultar platos temporalmente sin borrar su histórico.
  - CRUD de modificadores específicos para cada plato y control de stock/disponibilidad.
  - Registro de cuentas de personal y listado de colaboradores activos.

---

## Verificación de Pruebas Realizadas

Creamos un script de prueba de integración en [test_api.py](file:///C:/Users/Lenovo/.gemini/antigravity/brain/c5029030-69fb-4aaa-94b4-e57962f37cbd/scratch/test_api.py) que simula el flujo operativo completo:
1. Inicio de sesión del Administrador.
2. Registro de un nuevo mesero (`meseroprueba`).
3. Inicio de sesión del mesero.
4. Consulta del menú y modificadores.
5. Creación de una orden con modificadores (2 Lomo Saltado + Huevo frito montado).
6. **Validación de total calculado por backend**: Se constató que el backend sumó correctamente `(S/. 19.90 + S/. 1.00) * 2 = S/. 41.80` ignorando cualquier parámetro de total enviado del cliente.
7. Avance del estado de comanda por Cocinero (`EN_PROCESO` -> `LISTO`).
8. Entrega final por el mesero (`ENTREGADO`).

### Log de Ejecución Exitosa:
```text
--- EMPEZANDO PRUEBA DE INTEGRACIÓN ---

1. Iniciando sesión como Administrador...
Login exitoso. Rol: ADMIN

2. Registrando nuevo mesero...
Registro exitoso. Creado usuario: meseroprueba

3. Iniciando sesión como el nuevo mesero...
Login exitoso. Rol: MESERO

4. Consultando el menú del restaurante...
Se encontraron 6 platos visibles en el menú.
 - Ceviche Carretillero (S/. 16.5) - Cat: Entradas
    * Mod: Picante extra (+ S/. 0.0)
    * Mod: Picante medio (+ S/. 0.0)
    * Mod: Porción de cancha adicional (+ S/. 1.5)
    * Mod: Sin picante (+ S/. 0.0)
 - Lomo Saltado a la Criolla (S/. 19.9) - Cat: Fondos
    * Mod: Huevo frito montado (+ S/. 1.0)
    * Mod: Sin Arroz (Solo Papas) (+ S/. 0.0)
    * Mod: Término Jugoso (+ S/. 0.0)
    * Mod: Término a Punto (+ S/. 0.0)
 - Tallarines a la Huancaína con Bife (S/. 22.0) - Cat: Fondos
    * Mod: Extra salsa huancaína (+ S/. 2.0)
    * Mod: Término Bife: Bien cocido (+ S/. 0.0)
    * Mod: Término Bife: Jugoso (+ S/. 0.0)
 - Pisco Sour Clásico (S/. 8.5) - Cat: Bebidas
    * Mod: Con pisco acholado (+ S/. 1.0)
    * Mod: Menos dulce (+ S/. 0.0)
 - Chicha Morada Natural (S/. 4.5) - Cat: Bebidas
 - Suspiro a la Limeña (S/. 6.0) - Cat: Postres

Plato seleccionado para prueba: Lomo Saltado a la Criolla (ID: 2, Precio: S/. 19.9)
Modificador seleccionado: Huevo frito montado (ID: 8, Precio extra: S/. 1.0)

5. Creando una comanda para la Mesa 4...
Comanda #1 creada con éxito para la mesa 4.
Total esperado (Mesero): S/. 41.8
Total calculado por el Backend: S/. 41.8
¡Cálculo de total seguro verificado correctamente!

6. Simulando Cocinero iniciando preparación de comanda...
Estado de la comanda #1 cambiado a: EN_PROCESO

7. Simulando Cocinero terminando preparación de comanda (Listo)...
Estado de la comanda #1 cambiado a: LISTO

8. Simulando Mesero entregando comanda a la mesa...
Estado final de la comanda #1: ENTREGADO (Archivado)

--- ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE! ---
```

---

## Guía de Uso Local y Despliegue

### Ejecución Simplificada (Recomendado)

Hemos creado un script de control automatizado para Windows en la raíz del proyecto: [control_sistema.bat](file:///c:/Users/Lenovo/OneDrive/Desktop/sistema_comandas/control_sistema.bat).

1. Haz doble clic en `control_sistema.bat`.
2. Selecciona la opción **1** para iniciar automáticamente tanto el Backend (FastAPI) como el Frontend (Next.js) en ventanas separadas.
3. Abre tu navegador en:
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
4. Cuando desees apagar el sistema, vuelve a ejecutar el `.bat` y selecciona la opción **2** (Detener Servidores). Esto cerrará los servidores y liberará los puertos 8000 y 3000 de forma automática y limpia.
5. Si deseas limpiar y reiniciar la base de datos a sus valores iniciales, selecciona la opción **4** (Reiniciar Base de Datos).

### Ejecución Manual en Desarrollo (Local)

Si prefieres levantar los servicios de manera individual:

1. **Backend**:
   - Abrir una terminal en `/backend`
   - Activar el entorno virtual:
     - Windows: `.\venv\Scripts\activate`
     - Linux/macOS: `source venv/bin/activate`
   - Iniciar el servidor FastAPI:
     `uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`
   - *Nota*: La base de datos `database.db` se creará y sembrará de inmediato en el primer arranque con los usuarios predeterminados.

2. **Frontend**:
   - Abrir una terminal en `/frontend`
   - Iniciar el entorno Next.js:
     `npm run dev`
   - Abrir la URL `http://localhost:3000` en tu navegador.

### Despliegue en VPS (DigitalOcean/Docker)
Cumpliendo con `vps_upload.md`, para levantar la aplicación en producción en tu servidor Ubuntu:
1. Sube tu código al repositorio GitHub.
2. Conéctate vía SSH al VPS.
3. Clona y entra a la carpeta: `/var/www/restaurante-comandas`.
4. Construye y corre el proyecto en background:
   `docker-compose up -d --build`
5. Configura Nginx en el host para redirigir el tráfico del dominio `comandas.sourdev.app` a los puertos `3000` (Frontend) y `/api`, `/ws` al puerto `8000` (Backend).
6. Genera tu certificado SSL con `certbot --nginx -d comandas.sourdev.app`.
