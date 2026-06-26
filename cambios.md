# Plan de Mejoras y Cambios - Próxima Sesión

Este archivo detalla la planificación y el diseño técnico para la implementación de las 5 mejoras solicitadas en el sistema de comandas. **No se ejecutarán cambios en el código en esta sesión**, quedando este documento como la guía de desarrollo para la siguiente.

---

## 1. Diseño Responsivo para Dispositivos Móviles (Horizontal y Vertical)

### Objetivos:
- Adaptar las interfaces de mesero, cocina y administrador para pantallas táctiles de celulares y tablets.
- Soportar el cambio de orientación dinámico (Landscape / Portrait).

### Propuesta Técnica:
- **Mesero (Toma de Pedido)**:
  - En vertical (`portrait`): El layout de dos columnas se convertirá en un flujo de una columna. La "Comanda Actual" (carrito) pasará a ser una hoja inferior deslizable (*Bottom Sheet*) o un cajón colapsable (*Drawer*) que se abre con un botón flotante que muestra la cantidad de ítems.
  - En horizontal (`landscape`): Se distribuirá en un layout de 2 columnas de ancho adaptado (`60%` menú bento, `40%` carrito) optimizando el scroll vertical para que no se superpongan los modales.
- **Cocina (Pantalla de preparación)**:
  - Reducir el tamaño de las tarjetas en pantallas móviles y usar un sistema de cuadrícula flexible (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3`).
  - Soportar scroll lateral o deslizamiento (*swipe*) para navegar entre comandas.
- **Clases de Tailwind CSS a utilizar**:
  - `portrait:flex-col`, `landscape:flex-row`, `sm:grid-cols-2`, `h-[calc(100vh-theme(spacing.16))]` para alturas fijas sin desbordamiento.

---

## 2. Historial de Comandas en Vistas de Cocinero y Mesero

### Objetivos:
- Permitir que el cocinero consulte comandas ya despachadas durante el turno.
- Permitir que el mesero consulte comandas ya entregadas para control de cuentas.

### Propuesta Técnica:
- **Cocina (`/cocina`)**:
  - Añadir una pestaña secundaria: **"Historial de Turno"**.
  - Mostrará comandas con estado `LISTO` y `ENTREGADO` completadas en las últimas 12 horas.
  - Permitirá al cocinero "Reabrir" una comanda (cambiarla a `EN_PROCESO`) si hubo algún error o reclamo.
- **Mesero (`/mesero`)**:
  - En la pestaña **"Mis Mesas"**, dividir en dos sub-secciones: **"Activas"** (estados `PENDIENTE`, `EN_PROCESO`, `LISTO`) e **"Historial"** (estado `ENTREGADO`).
  - Esto le permitirá ver el total vendido en su turno y reimprimir/revisar detalles.

---

## 3. Monitoreo de Comandas en Tiempo Real para Administrador

### Objetivos:
- Añadir una nueva pestaña en `/admin` que muestre todas las comandas del salón en tiempo real sin tener que entrar a la vista de cocina o mesero.

### Propuesta Técnica:
- **Frontend (`admin.tsx`)**:
  - Nueva pestaña: **"Monitoreo de Sala"**.
  - Reutilizará el componente de tarjetas de comandas para listar los pedidos activos ordenados por número de mesa o antigüedad.
  - Escuchará el canal WebSocket principal. Cualquier creación o cambio de estado (`PENDIENTE` -> `EN_PROCESO` -> `LISTO` -> `ENTREGADO`) se reflejará instantáneamente en la pantalla del administrador.
  - Permitirá al administrador realizar cancelaciones o cambios de estado de emergencia.

---

## 4. Módulo de Arqueo de Caja (Apertura, Cortes y Cierre de Caja)

### Objetivos:
- Llevar un control estricto de los flujos de dinero en efectivo y ventas con tarjeta.
- Registrar procesos de apertura, cortes parciales y cierre de caja.
- Descarga de reportes en formato PDF con la información histórica.

### Propuesta Técnica:

#### A) Modelo de Base de Datos (SQLAlchemy)
Crear una tabla `arqueos` en `backend/app/models/arqueo.py`:
- `id` (PK)
- `user_id` (FK a Usuarios, quien realiza el arqueo)
- `opened_at` (Datetime, fecha/hora de apertura)
- `closed_at` (Datetime, fecha/hora de cierre, nullable)
- `status` (String: "ABIERTO", "CERRADO")
- `initial_cash` (Float, dinero base con el que abre caja)
- `estimated_cash` (Float, ventas en efectivo calculadas por el sistema)
- `actual_cash` (Float, dinero físico reportado en el cierre)
- `card_sales` (Float, ventas calculadas por tarjeta)
- `difference` (Float, descuadre: `actual_cash - (initial_cash + estimated_cash)`)
- `observations` (String, observaciones del cierre)

Vincular las comandas a la caja añadiendo una columna `arqueo_id` en la tabla `orders` (FK a `arqueos.id`).

#### B) API Endpoints (FastAPI)
- `POST /api/arqueo/apertura`: Crea una sesión de arqueo con `initial_cash`.
- `GET /api/arqueo/activo`: Obtiene los datos del arqueo abierto actual y suma las ventas acumuladas del turno.
- `POST /api/arqueo/cierre`: Cierra la caja registrando `actual_cash`, calcula el descuadre y cambia el estado a `CERRADO`.
- `GET /api/arqueo/historial`: Lista los arqueos de días pasados.
- `GET /api/arqueo/{id}/pdf`: Genera y retorna un flujo de bytes PDF con el reporte formal. Se utilizará la biblioteca `reportlab` o `fpdf` en Python para la renderización del PDF.

#### C) Panel Frontend (`admin.tsx`)
- Nueva pestaña: **"Caja y Arqueo"**.
- Si no hay caja abierta: Muestra un formulario para ingresar el saldo inicial.
- Si hay caja abierta: Muestra el estado actual (efectivo acumulado, ventas con tarjeta, botones para realizar un "Corte Parcial" o "Cerrar Caja").
- Sección de Historial: Tabla con arqueos de días pasados y botón para descargar el reporte PDF.

---

## 5. Visualización de Comanda en Pantalla Completa (Modal Flotante)

### Objetivos:
- Permitir la visualización magnificada de cualquier comanda al hacer clic sobre ella en cualquier rol (mesero, cocina, admin) para evitar fatiga visual o facilitar chequeos rápidos.

### Propuesta Técnica:
- **Componente Compartido (`src/components/FullscreenOrderModal.tsx`)**:
  - Modal overlay que cubre toda la pantalla (`fixed inset-0 z-50 bg-slate-950`).
  - Muestra la información de la comanda en tipografía extra grande (`text-3xl`, `text-4xl` para números de mesa y cantidades).
  - Destaca los comentarios en rojo y los modificadores en color naranja/amber en caja alta para una legibilidad instantánea desde la distancia en el pasador de cocina.
  - Botón grande de cerrado en la esquina superior y acciones rápidas correspondientes a la vista que lo invoca.

---

## 6. Métodos de Pago y Pago Dividido en Comandas

### Objetivos:
- Permitir especificar cómo se cancela la cuenta de la comanda (por defecto: Efectivo, QR o Tarjeta).
- Ofrecer flexibilidad mediante la opción de "Pago Dividido", permitiendo detallar montos específicos pagados con cada uno de los tres métodos.
- Garantizar que los métodos de pago se puedan modificar posteriormente y que impacten de forma automática en los totales de caja (Arqueo).

### Propuesta Técnica:

#### A) Modelo de Base de Datos (SQLAlchemy)
Añadir los siguientes campos a la tabla `orders` en `backend/app/models/order.py`:
- `payment_method` (String, nullable=True. Valores: `"EFECTIVO"`, `"QR"`, `"TARJETA"`, `"DIVIDIDO"`)
- `payment_cash` (Float, default=0.0. Monto cobrado en efectivo)
- `payment_qr` (Float, default=0.0. Monto cobrado vía código QR)
- `payment_card` (Float, default=0.0. Monto cobrado vía tarjeta de crédito/débito)

#### B) API Endpoints (FastAPI)
- **Creación (`POST /api/comandas`)**: El esquema `OrderCreate` aceptará de forma opcional los campos de pago al registrar el pedido (por defecto puede inicializarse en nulo hasta que se entregue).
- **Actualización de Pago (`PATCH /api/comandas/{order_id}/pago`)**: 
  - Permitirá a meseros o administradores actualizar el método de pago en cualquier momento.
  - **Regla de Validación**: Si `payment_method` es `"DIVIDIDO"`, el backend validará obligatoriamente que la suma de `payment_cash + payment_qr + payment_card` sea igual a `total_price` de la comanda, rechazando la solicitud con un código HTTP 400 si hay descuadres.
  - Si el método es directo (ej: `"EFECTIVO"`), el backend autocompletará el campo respectivo (`payment_cash = total_price`) y pondrá en cero los demás.

#### C) Interfaz Frontend (Meseros y Administrador)
- **Selector de Métodos**: En la vista de comisiones o al marcar como "Entregado", se mostrará un menú desplegable con las opciones:
  - *Efectivo*
  - *Código QR*
  - *Tarjeta*
  - *Pago Dividido*
- **Menú Desplegable de Pago Dividido**: Al seleccionar esta opción, se abrirá un sub-formulario animado con 3 campos numéricos:
  - **Efectivo (S/.)**
  - **QR (S/.)**
  - **Tarjeta (S/.)**
  - Se mostrará un indicador dinámico en tiempo real que muestre la diferencia restante para llegar al total de la cuenta. El botón "Confirmar Pago" se deshabilitará hasta que la diferencia sea exactamente `0.00`.
- **Integración con Arqueo de Caja**:
  - Al realizar el cierre de caja, el sistema sumará de manera independiente todos los `payment_cash`, `payment_qr` y `payment_card` de las comandas cerradas de ese turno, mostrando al administrador un desglose exacto de ingresos para facilitar el arqueo físico.

