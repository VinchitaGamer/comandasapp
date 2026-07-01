import Head from "next/head";
import { useState } from "react";
import { 
  ChefHat, 
  User, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Volume2, 
  CreditCard, 
  TrendingUp, 
  Play,
  SquareTerminal,
  ExternalLink,
  BookOpen
} from "lucide-react";

export default function Demo() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const openRole = (role: string) => {
    if (typeof window !== "undefined") {
      window.open(`/login?demo=${role}`, "_blank");
    }
  };

  const steps = [
    {
      id: 1,
      title: "1. Inicializar Turno (Administrador)",
      icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />,
      desc: "Ve a la pestaña de Administrador y abre la caja del restaurante con un monto inicial (ej. S/. 150.00). La caja abierta es indispensable para procesar cobros y pedidos.",
      accent: "from-emerald-500/20 to-teal-500/20"
    },
    {
      id: 2,
      title: "2. Registrar Comanda (Mesero)",
      icon: <User className="h-5 w-5 text-amber-400" />,
      desc: "Ve a la pestaña de Mesero, selecciona la Mesa 4, añade 2 Lomo Saltado, un Ceviche con modificadores ('Huevo frito montado', 'Picante medio') y pulsa 'Enviar Pedido'.",
      accent: "from-amber-500/20 to-orange-500/20"
    },
    {
      id: 3,
      title: "3. Recibir en Cocina (Cocina en Tiempo Real)",
      icon: <ChefHat className="h-5 w-5 text-sky-400" />,
      desc: "Ve a la pestaña de Cocina. Verás que el pedido aparece de inmediato y el cronómetro de la comanda empieza a contar de forma instantánea sin necesidad de recargar.",
      accent: "from-sky-500/20 to-blue-500/20"
    },
    {
      id: 4,
      title: "4. Preparar y Despachar (Cocina)",
      icon: <SquareTerminal className="h-5 w-5 text-indigo-400" />,
      desc: "Haz clic en 'Empezar preparación' en la tarjeta de cocina (la tarjeta se volverá naranja). Cuando termines, haz clic en 'Listo'. El pedido desaparecerá de cocina.",
      accent: "from-indigo-500/20 to-purple-500/20"
    },
    {
      id: 5,
      title: "5. Alerta de Entrega y Audio (Mesero)",
      icon: <Volume2 className="h-5 w-5 text-pink-400" />,
      desc: "Vuelve a la pestaña del Mesero. Escucharás un timbre acústico de campana (sintetizado digitalmente) y verás que la Mesa 4 pulsa con un borde dorado brillante.",
      accent: "from-pink-500/20 to-rose-500/20"
    },
    {
      id: 6,
      title: "6. Procesar Pago y Cierre (Mesero)",
      icon: <CreditCard className="h-5 w-5 text-purple-400" />,
      desc: "Selecciona la Mesa 4 en la pestaña de Mesero. Registra el pago en efectivo o tarjeta, y haz clic en 'Entregado' para concluir el pedido y archivar la mesa.",
      accent: "from-purple-500/20 to-violet-500/20"
    },
    {
      id: 7,
      title: "7. Dashboard Consolidado (Administrador)",
      icon: <TrendingUp className="h-5 w-5 text-emerald-400" />,
      desc: "Vuelve al panel del Administrador. Verás cómo las ventas, el ticket promedio y las estadísticas de platos populares se actualizaron al instante.",
      accent: "from-emerald-500/20 to-emerald-600/20"
    }
  ];

  return (
    <>
      <Head>
        <title>SourDas - Centro de Control de Demo</title>
        <meta name="description" content="Prueba interactiva del Sistema de Comandas en Tiempo Real con múltiples roles simulados." />
      </Head>

      <div className="relative min-h-screen w-full bg-[var(--surface-dim)] text-[var(--text-primary)] font-sans overflow-x-hidden pb-16">
        {/* Background ambient glows */}
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-[150px] pointer-events-none"></div>
        <div className="absolute bottom-10 right-1/4 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-emerald-600/5 blur-[120px] pointer-events-none"></div>

        <div className="max-w-6xl mx-auto px-6 pt-12 z-10 relative">
          
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-4 tracking-wide uppercase">
              <Sparkles className="h-3.5 w-3.5" /> Modo Demo Interactivo
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Centro de Control de <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">SourDas</span>
            </h1>
            <p className="mt-3 text-base text-[var(--text-muted)] max-w-2xl mx-auto">
              Experimenta la sincronización en tiempo real del sistema de comandas abriendo los 3 roles en paralelo. 
              Las sesiones están aisladas para que puedas probar todo en este mismo navegador.
            </p>
          </div>

          {/* Grid de Roles (Bento Box) */}
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Play className="h-5 w-5 text-emerald-400" /> 1. Abre las pantallas de trabajo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            
            {/* Tarjeta Mesero */}
            <div className="group relative rounded-3xl border border-[var(--border-default)] bg-[var(--surface)]/50 p-6 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-amber-500/40 hover:shadow-amber-500/5">
              <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-amber-500 animate-ping"></div>
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <User className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold group-hover:text-amber-400 transition-colors duration-200">Terminal de Mesero</h3>
              <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed min-h-[60px]">
                Toma pedidos de las mesas, añade notas especiales, configura modificadores y recibe alertas acústicas instantáneas cuando la comida esté lista.
              </p>
              <button 
                onClick={() => openRole("mesero")}
                className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 py-3 text-sm font-bold text-slate-950 transition-all duration-200 active:scale-95 shadow-md shadow-amber-500/10"
              >
                Abrir Mesero <ExternalLink className="h-4 w-4" />
              </button>
            </div>

            {/* Tarjeta Cocina */}
            <div className="group relative rounded-3xl border border-[var(--border-default)] bg-[var(--surface)]/50 p-6 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-sky-500/40 hover:shadow-sky-500/5">
              <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-sky-500 animate-ping"></div>
              <div className="h-12 w-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <ChefHat className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold group-hover:text-sky-400 transition-colors duration-200">Pantalla de Cocina</h3>
              <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed min-h-[60px]">
                Recibe comandas en tiempo real por WebSockets, visualiza cronómetros de control y marca pedidos &apos;En Preparación&apos; y &apos;Listos&apos;.
              </p>
              <button 
                onClick={() => openRole("cocina")}
                className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-sky-500 hover:bg-sky-600 py-3 text-sm font-bold text-slate-950 transition-all duration-200 active:scale-95 shadow-md shadow-sky-500/10"
              >
                Abrir Cocina <ExternalLink className="h-4 w-4" />
              </button>
            </div>

            {/* Tarjeta Administrador */}
            <div className="group relative rounded-3xl border border-[var(--border-default)] bg-[var(--surface)]/50 p-6 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-emerald-500/40 hover:shadow-emerald-500/5">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold group-hover:text-emerald-400 transition-colors duration-200">Panel de Administración</h3>
              <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed min-h-[60px]">
                Monitorea ingresos y ticket promedio, abre y cierra caja (arqueos), gestiona el stock del menú y visualiza el Top 5 de platos más populares.
              </p>
              <button 
                onClick={() => openRole("admin")}
                className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 py-3 text-sm font-bold text-slate-950 transition-all duration-200 active:scale-95 shadow-md shadow-emerald-500/10"
              >
                Abrir Admin <ExternalLink className="h-4 w-4" />
              </button>
            </div>

          </div>

          {/* Guía Interactiva Paso a Paso */}
          <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface)]/30 p-8 shadow-lg backdrop-blur-md">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-[var(--border-default)] pb-4">
              <BookOpen className="h-5 w-5 text-emerald-400" /> 2. Guía del Recorrido (Tiempo Real)
            </h2>
            
            <p className="text-sm text-[var(--text-muted)] mb-8">
              Acomoda las tres pestañas de manera que puedas verlas simultáneamente en tu pantalla (split-screen o mosaico) y sigue las instrucciones para experimentar el flujo completo en tiempo real.
            </p>

            <div className="space-y-4">
              {steps.map((step) => (
                <div 
                  key={step.id}
                  onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                  className={`rounded-2xl border transition-all duration-300 cursor-pointer p-4 ${
                    activeStep === step.id 
                      ? `border-emerald-500/30 bg-gradient-to-r ${step.accent}` 
                      : 'border-[var(--border-default)] bg-[var(--surface-dim)]/50 hover:bg-[var(--surface)]/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {step.icon}
                      <span className="font-semibold text-sm md:text-base">{step.title}</span>
                    </div>
                    <ArrowRight className={`h-4 w-4 text-[var(--text-muted)] transition-transform duration-300 ${
                      activeStep === step.id ? 'rotate-90 text-emerald-400' : ''
                    }`} />
                  </div>
                  {activeStep === step.id && (
                    <div className="mt-3 text-xs md:text-sm text-[var(--text-muted)] leading-relaxed pl-8 animate-fade-in">
                      {step.desc}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Credenciales por defecto */}
            <div className="mt-8 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-dim)] p-4 text-xs">
              <span className="font-bold text-[var(--text-primary)] block mb-2 uppercase tracking-wide text-[10px]">Credenciales de la demo (por si prefieres loguearte a mano):</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[var(--surface)] p-2 rounded-lg border border-[var(--border-default)]">
                  <span className="font-semibold text-amber-400">Mesero:</span> <code className="bg-slate-950 px-1 py-0.5 rounded text-red-300">mesero1</code> / <code className="bg-slate-950 px-1 py-0.5 rounded text-red-300">mesero123</code>
                </div>
                <div className="bg-[var(--surface)] p-2 rounded-lg border border-[var(--border-default)]">
                  <span className="font-semibold text-sky-400">Cocina:</span> <code className="bg-slate-950 px-1 py-0.5 rounded text-red-300">cocina1</code> / <code className="bg-slate-950 px-1 py-0.5 rounded text-red-300">cocina123</code>
                </div>
                <div className="bg-[var(--surface)] p-2 rounded-lg border border-[var(--border-default)]">
                  <span className="font-semibold text-emerald-400">Admin:</span> <code className="bg-slate-950 px-1 py-0.5 rounded text-red-300">admin</code> / <code className="bg-slate-950 px-1 py-0.5 rounded text-red-300">admin123</code>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="text-center mt-12 text-xs text-[var(--text-disabled)]">
            SourDas Comandas © 2026. Diseñado para demostraciones de arquitectura de microservicios y tiempo real.
          </div>

        </div>
      </div>
    </>
  );
}
