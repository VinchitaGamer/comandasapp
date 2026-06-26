---
name: visual-redesign
description: >
  Skill para remodelar completamente el aspecto visual del sistema de comandas "SourDas".
  Aplica Material Design 3 con paleta dark + acentos verde esmeralda, tipografía Inter,
  animaciones moderadas, y layouts optimizados por dispositivo según rol (mesero=móvil, cocina=tablet, admin=desktop).
---

# 🎨 Remodelación Visual — Sistema de Comandas "SourDas"

## 1. Identidad Visual

### Nombre del Sistema
- **Nombre**: SourDas
- Reemplazar todas las instancias de "Sabor Nativo" por "SourDas" en todo el frontend.

### Moneda
- **Moneda**: Bolivianos (Bs)
- Reemplazar todas las instancias de `S/` (Soles peruanos) por `Bs` (Bolivianos) en todo el frontend.
- El símbolo `Bs` se coloca antes del monto, sin espacio: `Bs45.00`.

### Paleta de Colores (Dark + Verde Esmeralda)

El sistema utiliza un tema oscuro obligatorio. La paleta se basa en **Material Design 3** con tokens de color personalizados.

#### Colores Base (Superficies)
| Token                | Valor Hex   | Uso                                      |
|----------------------|-------------|------------------------------------------|
| `--surface-dim`      | `#0d1117`   | Fondo principal de página                |
| `--surface`          | `#131a24`   | Tarjetas, contenedores principales       |
| `--surface-bright`   | `#1b2433`   | Superficies elevadas, hover states       |
| `--surface-container` | `#161d27`  | Sidebars, paneles secundarios            |
| `--surface-highest`  | `#232d3d`   | Elementos más elevados, dropdowns        |
| `--overlay`          | `#0d1117e6` | Backdrops de modales (90% opacidad)      |

#### Colores de Acento (Verde Esmeralda)
| Token                | Valor Hex   | Uso                                      |
|----------------------|-------------|------------------------------------------|
| `--primary`          | `#34d399`   | Botones primarios, links activos         |
| `--primary-hover`    | `#6ee7b7`   | Hover de elementos primarios             |
| `--primary-muted`    | `#34d39926` | Fondos sutiles con tinte primario (15%)  |
| `--primary-on`       | `#022c22`   | Texto sobre fondo primario               |
| `--primary-glow`     | `#34d39933` | Sombras y glows (20%)                    |
| `--gradient-primary` | `linear-gradient(135deg, #34d399, #10b981)` | Gradiente para CTAs principales |

#### Colores Semánticos de Estado
| Estado       | Color Texto  | Color Fondo       | Borde             |
|--------------|-------------|--------------------|--------------------|
| Pendiente    | `#60a5fa`   | `#60a5fa15`        | `#60a5fa30`        |
| En Proceso   | `#fbbf24`   | `#fbbf2415`        | `#fbbf2430`        |
| Listo        | `#34d399`   | `#34d39915`        | `#34d39930`        |
| Entregado    | `#818cf8`   | `#818cf815`        | `#818cf830`        |
| Error        | `#f87171`   | `#f8717115`        | `#f8717130`        |
| Urgente      | `#fb923c`   | `#fb923c15`        | `#fb923c30`        |

#### Colores de Texto
| Token           | Valor Hex   | Uso                               |
|-----------------|-------------|------------------------------------|
| `--text-primary`| `#f1f5f9`   | Texto principal (headings, body)   |
| `--text-secondary`| `#94a3b8` | Texto secundario, descripciones    |
| `--text-muted`  | `#64748b`   | Labels, placeholders, hints        |
| `--text-disabled`| `#475569`  | Texto deshabilitado                |

#### Bordes
| Token             | Valor Hex   | Uso                          |
|-------------------|-------------|-------------------------------|
| `--border-default`| `#1e293b`   | Bordes estándar de tarjetas  |
| `--border-hover`  | `#334155`   | Bordes en hover              |
| `--border-focus`  | `#34d399`   | Bordes en focus (inputs)     |

---

## 2. Tipografía

### Fuente: Inter (Google Fonts)
- **Importar** la fuente Inter desde Google Fonts en `_document.tsx` con los pesos: 400, 500, 600, 700, 800.
- **No usar** `next/font` por incompatibilidades potenciales con Next.js 16. Usar `<link>` estándar en `<Head>`.
- **URL**: `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap`

### Escala Tipográfica (Material Design 3 adaptada)
| Nivel           | Tamaño  | Peso | Tracking    | Uso                          |
|-----------------|---------|------|-------------|-------------------------------|
| Display Large   | 2.25rem | 800  | -0.02em     | Números grandes cocina        |
| Display Medium  | 1.875rem| 700  | -0.015em    | Títulos de página             |
| Headline        | 1.5rem  | 700  | -0.01em     | Secciones principales         |
| Title Large     | 1.25rem | 700  | -0.005em    | Títulos de tarjetas           |
| Title Medium    | 1rem    | 600  | normal      | Subtítulos                    |
| Body Large      | 1rem    | 400  | normal      | Texto principal               |
| Body Medium     | 0.875rem| 400  | 0.01em      | Texto estándar                |
| Body Small      | 0.75rem | 500  | 0.02em      | Texto secundario              |
| Label           | 0.6875rem| 600 | 0.05em      | Labels, badges (UPPERCASE)    |

---

## 3. Sistema de Elevación (Material Design 3)

Usar sombras con capas múltiples + tinte de color para simular elevación MD3 en tema oscuro:

| Nivel     | CSS Shadow                                                                 | Uso                    |
|-----------|---------------------------------------------------------------------------|------------------------|
| Level 0   | ninguna                                                                   | Superficie base        |
| Level 1   | `0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)`                  | Tarjetas, inputs       |
| Level 2   | `0 4px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)`                  | Tarjetas hover, FABs   |
| Level 3   | `0 10px 20px rgba(0,0,0,0.4), 0 6px 6px rgba(0,0,0,0.3)`                | Modales, dropdowns     |
| Level 4   | `0 14px 28px rgba(0,0,0,0.5), 0 10px 10px rgba(0,0,0,0.3)`              | Overlays superiores    |

---

## 4. Componentes y Patrones de Diseño

### 4.1 Botones

#### Botón Primario (Filled)
```
background: linear-gradient(135deg, #34d399, #10b981);
color: #022c22;
font-weight: 700;
border-radius: 16px;
padding: 14px 24px;
font-size: 0.875rem;
box-shadow: 0 4px 14px rgba(52, 211, 153, 0.25);
transition: all 0.2s ease;
hover: brightness(1.1) + translateY(-1px) + shadow amplificada;
active: scale(0.98) + translateY(0);
```

#### Botón Secundario (Outlined)
```
background: transparent;
border: 1.5px solid #1e293b;
color: #94a3b8;
border-radius: 16px;
hover: border-color #34d399, color #34d399, bg rgba(52,211,153,0.05);
```

#### Botón Peligro (Tonal)
```
background: rgba(248, 113, 113, 0.1);
color: #f87171;
border-radius: 16px;
hover: bg rgba(248,113,113,0.2);
```

#### Botón POS (Especial para mesero — selección de platos)
```
background: var(--surface);
border: 1.5px solid var(--border-default);
border-radius: 20px;
padding: 20px 16px;
min-height: 90px;
display: flex; flex-direction: column; align-items: center; justify-content: center;
text-align: center;

/* Nombre del plato */
font-size: 1rem; font-weight: 700; color: var(--text-primary);

/* Precio */
font-size: 1.25rem; font-weight: 800; color: var(--primary);

hover: border-color var(--primary), bg var(--primary-muted), 
       shadow 0 0 20px var(--primary-glow), translateY(-2px);
active: scale(0.97);
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
```

### 4.2 Tarjetas

#### Tarjeta Base (Card)
```
background: var(--surface);
border: 1px solid var(--border-default);
border-radius: 20px;
padding: 0; /* Usar secciones internas */
overflow: hidden;
box-shadow: Level 1;
transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
hover: border-color var(--border-hover), shadow Level 2;
```

#### Tarjeta de Cocina (Ticket Style — Grande para distancia)
```
background: var(--surface);
border: 2px solid var(--border-default);
border-radius: 24px;
overflow: hidden;

/* Header de la tarjeta */
padding: 16px 20px;
border-bottom: 2px solid var(--border-default);
display: flex; justify-content: space-between; align-items: center;

  /* Número de mesa — MUY GRANDE */
  font-size: 2.25rem (display-large); font-weight: 800;
  
  /* Timer */
  font-size: 1.25rem; font-weight: 700; font-variant-numeric: tabular-nums;

/* Body de la tarjeta */
padding: 16px 20px;

  /* Cada plato */
  font-size: 1.125rem; font-weight: 600;
  /* Modificadores */
  font-size: 0.9375rem; color: var(--primary); font-weight: 500;
  /* Comentarios */
  font-size: 0.875rem; color: var(--text-secondary); font-style: italic;

/* Footer — Botón de acción */
padding: 16px 20px;
border-top: 2px solid var(--border-default);

/* Borde izquierdo de color según estado */
border-left: 4px solid [color-estado];

/* Efecto de urgencia (>15min) */
animation: pulse con borde rojo;
```

### 4.3 Modales

#### Modal Estándar
```
/* Backdrop */
position: fixed; inset: 0; z-index: 50;
background: var(--overlay);
backdrop-filter: blur(8px);
display: flex; align-items: center; justify-content: center;
animation: fadeIn 0.2s ease;

/* Contenedor */
background: var(--surface-container);
border: 1px solid var(--border-default);
border-radius: 24px;
box-shadow: Level 4;
max-width: 480px; width: calc(100% - 32px);
max-height: 90vh; overflow-y: auto;
animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);

/* Header */
padding: 20px 24px; border-bottom: 1px solid var(--border-default);
/* Body */
padding: 24px;
/* Footer */
padding: 16px 24px; border-top: 1px solid var(--border-default);
background: var(--surface-dim);
```

#### Modal Fullscreen (Cocina — Detalle de orden)
```
position: fixed; inset: 0; z-index: 50;
background: var(--surface-dim);
padding: 24px;
overflow-y: auto;

/* Número de mesa gigante */
font-size: clamp(3rem, 8vw, 5rem); font-weight: 800;
/* Platos */
font-size: clamp(1.5rem, 4vw, 2.5rem); font-weight: 700;
```

### 4.4 Inputs y Forms

```
/* Input estándar */
background: var(--surface-dim);
border: 1.5px solid var(--border-default);
border-radius: 14px;
padding: 12px 16px;
font-size: 0.875rem;
color: var(--text-primary);
transition: all 0.2s ease;

focus: border-color var(--border-focus), 
       box-shadow 0 0 0 3px var(--primary-muted);

/* Label */
font-size: 0.6875rem; font-weight: 600; 
text-transform: uppercase; letter-spacing: 0.05em;
color: var(--text-muted);
margin-bottom: 8px;
```

### 4.5 Navbar / App Bar

```
position: sticky; top: 0; z-index: 40;
background: rgba(13, 17, 23, 0.8);
backdrop-filter: blur(16px) saturate(180%);
border-bottom: 1px solid var(--border-default);
padding: 0 24px;
height: 64px;

/* Logo "SourDas" */
font-size: 1.25rem; font-weight: 800;
background: linear-gradient(135deg, #34d399, #10b981);
-webkit-background-clip: text; -webkit-text-fill-color: transparent;
```

### 4.6 Badges de Estado

```
display: inline-flex; align-items: center; gap: 6px;
padding: 4px 12px;
border-radius: 100px; /* Pill shape */
font-size: 0.6875rem; font-weight: 700;
text-transform: uppercase; letter-spacing: 0.05em;
border: 1px solid [color-estado con 20% opacidad];
background: [color-estado con 10% opacidad];
color: [color-estado];

/* Dot indicator */
width: 6px; height: 6px; border-radius: 50%;
background: [color-estado];
```

### 4.7 Tabs / Segmented Control

```
background: var(--surface);
border: 1px solid var(--border-default);
border-radius: 16px;
padding: 4px;
display: inline-flex; gap: 4px;

/* Tab item */
padding: 10px 20px;
border-radius: 12px;
font-size: 0.8125rem; font-weight: 600;
color: var(--text-muted);
transition: all 0.2s ease;

/* Tab activo */
background: var(--primary);
color: var(--primary-on);
box-shadow: 0 2px 8px var(--primary-glow);
```

### 4.8 Tablas (Admin)

```
/* Contenedor */
border-radius: 20px;
border: 1px solid var(--border-default);
background: var(--surface);
overflow: hidden;

/* Header */
background: var(--surface-container);
font-size: 0.6875rem; font-weight: 700;
text-transform: uppercase; letter-spacing: 0.05em;
color: var(--text-muted);
padding: 14px 20px;
border-bottom: 1px solid var(--border-default);

/* Rows */
padding: 14px 20px;
border-bottom: 1px solid rgba(30, 41, 59, 0.5);
font-size: 0.875rem;
transition: background 0.15s ease;
hover: background var(--surface-bright);

/* Acciones */
gap: 8px; display: flex;
```

---

## 5. Layouts por Vista

### 5.1 Login
- Centro exacto de la pantalla.
- Card de login con glassmorphism sutil: `backdrop-filter: blur(20px)`.
- Logo "SourDas" con gradiente verde esmeralda.
- Dos círculos decorativos de fondo con blur (verde esmeralda en vez de ámbar).
- Animación de entrada `slideUp` para la card.

### 5.2 Mesero (Optimizado para MÓVIL)
- **Tab bar inferior** fija para navegar entre "Menú" y "Comandas" (estilo app nativa).
- **Menú**: Grid de botones POS, 2 columnas en móvil, 3 en tablet.
- **Filtro de categorías**: Scroll horizontal con chips/pills.
- **Barra de búsqueda**: Sticky debajo del navbar.
- **Carrito**: Bottom sheet deslizable en móvil (no sidebar lateral).
  - Resumen pegado al fondo con total y botón de enviar.
  - Swipe up para expandir, swipe down para minimizar.
  - En desktop: sidebar lateral derecha (mantener funcionalidad actual).
- **FAB de carrito**: Badge con contador sobre el botón flotante.
- **Notificaciones toast**: Desde arriba en móvil con vibración visual.

### 5.3 Cocina (Optimizado para TABLET)
- **Sin sidebar**, layout full-width.
- **Tab bar superior** con 3 segmentos: Pendientes | Listas | Historial.
- **Grid de tickets**: 2 columnas en tablet, 3-4 en monitores grandes.
- **Tarjetas tipo ticket**: Grandes, fuente gruesa, legibles a 2-3 metros.
  - Borde izquierdo de color según estado.
  - Timer prominente con conteo en tiempo real.
  - Número de mesa ENORME en el header.
  - Platos listados con fuente grande.
  - Modificadores en color primario (verde esmeralda).
  - Botón de acción grande en el footer de cada ticket.
- **Auto-scroll**: Nuevas comandas aparecen con animación.

### 5.4 Admin (Optimizado para DESKTOP)
- **Sidebar vertical izquierda** con iconos + labels.
  - Logo "SourDas" arriba.
  - Secciones: Dashboard, Menú, Modificadores, Usuarios, Turnos.
  - Indicador activo con barra lateral verde + fondo tinted.
  - Colapsable en tablet (solo iconos).
- **Área de contenido**: Max-width con padding generoso.
- **Dashboard cards**: Fila de stats con iconos, números grandes, labels pequeños.
  - Efecto hover con elevación sutil.
- **Tablas**: Estilo MD3, bordes redondeados, header fijo.
- **Forms**: En cards separadas, inputs con estados focus claros.

---

## 6. Animaciones

### Keyframes a definir en globals.css

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.3); }
  50% { box-shadow: 0 0 0 8px rgba(52, 211, 153, 0); }
}
```

### Reglas de uso
- **Transiciones base**: `transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)` para interacciones.
- **Hover de botones**: `translateY(-1px)` + shadow amplificada.
- **Active de botones**: `scale(0.98)` + `translateY(0)`.
- **Entrada de tarjetas**: `slideUp` escalonado (`animation-delay: ${index * 50}ms`).
- **Entrada de modales**: Backdrop `fadeIn 0.2s`, contenido `slideUp 0.3s`.
- **Loading**: Spinner con `animate-spin` + skeleton shimmer para carga de datos.
- **Success feedback**: `scaleIn` + check verde momentáneo.
- **Error feedback**: shake horizontal sutil (3 oscilaciones).
- **Timer urgente (>15min)**: `pulseGlow` con borde rojo + badge animado.

---

## 7. Reglas de Implementación

### 7.1 Correcciones Críticas Obligatorias
Antes de aplicar estilos nuevos, **corregir estos bugs existentes**:

1. **Clases Tailwind inválidas**: Reemplazar TODAS las clases con valores no estándar:
   - `slate-250`, `slate-350`, `slate-550`, `slate-555`, `slate-650`, `slate-755`, `slate-850`, `slate-880`, `slate-955`
   - `emerald-450`, `emerald-550`, `amber-450`
   - `border-slate-750`, `border-slate-850`, `border-emerald-550`
   - `h-4.5`, `w-4.5`
   - `duration-305`
   → Reemplazar por valores válidos de Tailwind o clases CSS custom.

2. **Fuente no cargando**: La configuración `@theme` referencia `--font-geist-sans` pero nunca se importa. Reemplazar por Inter.

3. **CSS variables muertas**: Eliminar las variables `--background`/`--foreground` no usadas y el media query de `prefers-color-scheme`.

### 7.2 Enfoque de Estilos
- **Mantener Tailwind CSS v4** como sistema principal de estilos.
- **Definir CSS custom properties** en `:root` de `globals.css` para los tokens de color del design system.
- **Usar las variables CSS** dentro de clases Tailwind con `[var(--token)]` syntax cuando corresponda.
- **Crear clases utilitarias custom** en `globals.css` solo para animaciones y patrones repetitivos complejos.

### 7.3 Estructura de Archivos (No crear nuevos archivos a menos que sea necesario)
- Modificar los archivos existentes in-place.
- Si un componente crece demasiado, se puede extraer a un archivo nuevo en `/components`.
- No alterar la lógica de negocio, WebSocket, ni llamadas a API.
- Solo tocar JSX (className, estructura HTML) y CSS.

### 7.4 Orden de Implementación Recomendado
1. `globals.css` — Design tokens, variables, animaciones, utilidades base.
2. `_document.tsx` — Import de fuente Inter.
3. `Navbar.tsx` — Componente compartido, impacta todas las vistas.
4. `login.tsx` — Punto de entrada, primera impresión.
5. `mesero.tsx` — Vista más compleja, optimizar para móvil.
6. `ModifierModal.tsx` — Modal de modificadores del mesero.
7. `SplitPaymentModal.tsx` — Modal de pago dividido.
8. `cocina.tsx` — Vista de cocina, tickets grandes.
9. `FullscreenOrderModal.tsx` — Modal fullscreen de cocina.
10. `admin.tsx` — Dashboard admin con sidebar.

### 7.5 Preservación de Funcionalidad
- **NO modificar**: lógica de estado (Zustand), llamadas API (Axios), WebSocket, autenticación JWT, routing.
- **SÍ modificar**: className, estructura JSX para layout, textos de UI ("Sabor Nativo" → "SourDas"), animaciones.
- **Testar** que cada vista siga funcionando tras los cambios visuales.

---

## 8. Resumen de Decisiones de Diseño

| Aspecto              | Decisión                                                    |
|----------------------|-------------------------------------------------------------|
| Nombre               | SourDas                                                     |
| Tema                 | Dark obligatorio                                            |
| Estilo               | Material Design 3                                           |
| Color primario       | Verde esmeralda (#34d399 → #10b981)                        |
| Tipografía           | Inter (Google Fonts)                                        |
| Animaciones          | Moderadas + feedback esencial                               |
| Mesero               | Optimizado móvil, botones POS grandes, bottom sheet cart    |
| Cocina               | Optimizado tablet, tickets grandes, fuente legible a distancia |
| Admin                | Desktop, sidebar + dashboard con stats                      |
| Elevación            | Sombras multi-capa estilo MD3                               |
| Bordes               | Redondeados generosos (16-24px)                             |
