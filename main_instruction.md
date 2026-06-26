# SKILL: Desarrollo de Sistema de Comandas Web para Restaurante

## 1. Contexto y Objetivos
El objetivo es construir una aplicación web de gestión de comandas en tiempo real para un restaurante, diseñada para desplegarse en un VPS (Ubuntu) utilizando una base de datos local ligera (*SQLite*). El sistema debe optimizar la comunicación entre el salón y la cocina, permitiendo una gestión dinámica del menú.

## 2. Roles de Usuario y Accesos
El sistema cuenta con tres roles estrictos bajo autenticación tradicional (usuario/contraseña):
* *Administrador:* Control total del sistema. Gestión del menú (crear, ocultar, modificar precios, eliminar platos y modificadores) y visualización de reportes básicos.
* *Mesero:* Acceso a la toma de pedidos a través de una interfaz optimizada. Visualización del estado de las comandas en tiempo real.
* *Cocina:* Pantalla receptora de órdenes de preparación en orden cronológico con cronómetro de tiempo transcurrido.

## 3. Stack Tecnológico Recomendado
* *Backend:* Python con *FastAPI*. Elegido por su alto rendimiento, tipado estático, generación automática de documentación y manejo nativo y eficiente de *WebSockets*.
* *Frontend:* *Next.js* (React) con Tailwind CSS para una interfaz reactiva y modular.
* *Base de Datos:* *SQLite*. Almacenamiento local en un archivo único dentro del VPS, eliminando la sobrecarga de un motor externo pero garantizando transacciones ACID. *Se exige obligatoriamente la activación del modo WAL a nivel de conexión para prevenir bloqueos de escritura concurrente*.
* *Comunicación en Tiempo Real:* *WebSockets* (nativo en FastAPI y WS Client en Next.js) para la transmisión instantánea de comandas.

## 4. Arquitectura de Datos (Esquema Relacional SQLite)
El agente debe inicializar los siguientes modelos base:
* *Usuarios:* `id`, `username`, `password_hash`, `role` (ADMIN, MESERO, COCINA).
* *Platos:* `id`, `name`, `description`, `price`, `category`, `is_visible` (booleano para ocultar/mostrar).
* *Modificadores:* `id`, `plate_id` (FK), `name`, `extra_price`, `is_available`.
* *Comandas:* `id`, `table_number`, `waiter_id` (FK), `status` (PENDIENTE, EN_PROCESO, LISTO), `created_at`, `updated_at`.
* *DetalleComanda:* `id`, `comanda_id` (FK), `plate_id` (FK), `quantity`, `comment`.
* *DetalleModificadores:* `id`, `detalle_comanda_id` (FK), `modificador_id` (FK).

## 5. Flujos de Trabajo por Módulo

### 5.1 Vista del Mesero (Toma de Pedidos)
* *Diseño de Interfaz:* Layout tipo *Bento Box* para las categorías y platos. Cuadrículas limpias y visuales que faciliten la selección rápida en dispositivos táctiles.
* *Selección:* Al presionar un plato, se despliega un modal interactivo con los modificadores disponibles (ej. términos de carne, salsas, extras).
* *Flujo:* El mesero confirma la orden -> Se envía al backend -> Se procesa en SQLite -> Se emite por WebSocket -> El estado inicial queda en *En Proceso*.
* *Notificaciones:* Escucha activa del WebSocket. Cuando el estado de la comanda cambia a *LISTO*, la vista del mesero muestra una alerta visual/auditiva indicando el número de mesa.
* *Lógica de Precios:* *FastAPI es el único responsable de calcular los totales de la comanda*. El backend sumará los precios consultando directamente a la base de datos basándose en los IDs recibidos, ignorando por completo cualquier precio numérico o total enviado desde el frontend por motivos de seguridad.

### 5.2 Vista de Cocina (Recepción y Despacho)
* *Diseño de Interfaz:* Tarjetas compactas por cada comanda. Cada tarjeta muestra el número de mesa, hora de creación, tiempo transcurrido, mesero y el desglose detallado de platos con sus respectivos modificadores resaltados.
* *Interacción:* Cada tarjeta posee un botón de acción principal para cambiar el estado de la comanda. Al dar clic en *Listo/Completar*, se cierra el ciclo de preparación, actualizando la base de datos y notificando al mesero de forma inmediata vía WebSocket.

### 5.3 Vista de Administrador (Gestión del Menú)
* *CRUD de Platos y Categorías:* Panel privado para añadir nuevos platos, editar precios y descripciones.
* *Sistema de Visibilidad:* Switch para cambiar el estado `is_visible`. Si se desmarca, el plato se oculta inmediatamente del layout bento del mesero sin borrar el histórico de ventas.
* *Gestión de Modificadores:* Configuración de opciones asociadas a cada plato con la capacidad de definir si añaden un costo extra al total de la comanda.

## 6. Seguridad y Autenticación
* Implementar autenticación basada en tokens *JWT* (JSON Web Tokens).
* Para las conexiones WebSockets, el agente debe programar la validación del JWT capturándolo desde los query parameters o el primer evento WS emitido por el cliente.
* Las contraseñas deben almacenarse en la base de datos SQLite utilizando hashing seguro (*passlib* con *bcrypt* en Python).
* Cada endpoint del backend y ruta del frontend debe estar protegida por middleware que verifique el rol del usuario antes de resolver la petición o renderizar la vista.

## 7. Instrucciones de Implementación para el Agente
1. Diseñar el esquema de base de datos en SQLAlchemy (Python) y configurar las migraciones con Alembic. *Asegurar inyección de PRAGMA journal_mode=WAL;*.
2. Desarrollar la API REST en FastAPI para la autenticación y el CRUD del menú.
3. Configurar el servidor de WebSockets en el backend para gestionar las conexiones de las pantallas de cocina y meseros, incorporando la validación del JWT.
4. Construir el frontend en Next.js estructurando los componentes del Layout Bento, limitando la gestión de estado a *Zustand* e implementando lógica de *Exponential Backoff* para el socket.
5. Crear un archivo de configuración de despliegue básico para producción en el VPS (usando Gunicorn/Uvicorn y Nginx como proxy inverso).
