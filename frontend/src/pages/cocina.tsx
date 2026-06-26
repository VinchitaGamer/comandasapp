import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useStore, Order, OrderDetail } from "@/store";
import api from "@/services/api";
import Navbar from "@/components/Navbar";
import FullscreenOrderModal from "@/components/FullscreenOrderModal";
import { 
  Play, 
  Check, 
  Clock, 
  ChevronRight, 
  ChefHat, 
  Coffee, 
  AlertTriangle,
  FileText,
  RotateCcw
} from "lucide-react";

// Real-time elapsed timer component that alerts if it exceeds 15 minutes
function ElapsedTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState("");
  const [isDelayed, setIsDelayed] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const createdTime = new Date(createdAt).getTime();
      const diffMs = Date.now() - createdTime;
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      
      // Pad single digits
      const paddedSecs = diffSecs.toString().padStart(2, "0");
      setElapsed(`${diffMins}:${paddedSecs}`);

      // Threshold: 15 minutes is delayed
      setIsDelayed(diffMins >= 15);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-extrabold px-3 py-1.5 rounded-xl tabular-nums ${
      isDelayed 
        ? "bg-red-500/10 text-red-400 border border-red-500/25 animate-pulse-urgent" 
        : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-default)]"
    }`}>
      <Clock className="h-3.5 w-3.5" />
      {elapsed}
    </span>
  );
}

export default function Cocina() {
  const router = useRouter();
  const { user, token, orders, fetchActiveOrders, updateOrder } = useStore();
  const [activeTab, setActiveTab] = useState<"pendiente" | "listo" | "historial">("pendiente");

  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);

  const fetchHistoryOrders = async () => {
    try {
      const res = await api.get(`/comandas?status_filter=LISTO,ENTREGADO&hours_limit=12`);
      setHistoryOrders(res.data);
    } catch (e) {
      console.error("Error al cargar historial de cocina:", e);
    }
  };

  useEffect(() => {
    if (token && activeTab === "historial") {
      fetchHistoryOrders();
    }
  }, [token, activeTab]);

  const handleReopenOrder = async (orderId: number) => {
    try {
      const res = await api.patch(`/comandas/${orderId}?status_update=EN_PROCESO`);
      updateOrder(res.data);
      if (activeTab === "historial") {
        fetchHistoryOrders();
      }
      fetchActiveOrders();
    } catch (e) {
      console.error("Error al reabrir comanda:", e);
    }
  };

  const handleOpenFullscreenModal = (order: Order) => {
    setSelectedOrderForDetails(order);
    setIsFullscreenModalOpen(true);
  };

  const handleFullscreenAction = async (orderId: number, currentStatus: string) => {
    await handleUpdateStatus(orderId, currentStatus);
  };

  // Route security
  useEffect(() => {
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "COCINA" && user.role !== "ADMIN") {
      if (user.role === "MESERO") router.replace("/mesero");
      else router.replace("/login");
    }
  }, [user, token, router]);

  // Load active orders on mount
  useEffect(() => {
    if (token) {
      fetchActiveOrders();
    }
  }, [token, fetchActiveOrders]);

  // Filter orders based on Tab selection
  const filteredOrders = orders.filter((order) => {
    if (activeTab === "pendiente") {
      // Por Preparar (PENDIENTE and EN_PROCESO)
      return order.status === "PENDIENTE" || order.status === "EN_PROCESO";
    } else {
      // Listos (LISTO)
      return order.status === "LISTO";
    }
  });

  const handleUpdateStatus = async (orderId: number, currentStatus: string) => {
    let nextStatus = "PENDIENTE";
    if (currentStatus === "PENDIENTE") {
      nextStatus = "EN_PROCESO";
    } else if (currentStatus === "EN_PROCESO") {
      nextStatus = "LISTO";
    }

    try {
      const res = await api.patch(`/comandas/${orderId}?status_update=${nextStatus}`);
      updateOrder(res.data);
    } catch (err) {
      console.error("Error al actualizar estado de comanda:", err);
    }
  };

  // Status helpers
  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case "PENDIENTE": return "border-l-blue-400";
      case "EN_PROCESO": return "border-l-yellow-400";
      case "LISTO": return "border-l-emerald-400";
      case "ENTREGADO": return "border-l-indigo-400";
      default: return "border-l-[var(--border-default)]";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-dim)] text-[var(--text-primary)] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 p-6 flex flex-col space-y-6 overflow-hidden">
        {/* Header: Segmented Tab Control */}
        <div className="flex items-center justify-between">
          <div className="inline-flex bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-1 gap-1">
            <button
              onClick={() => setActiveTab("pendiente")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeTab === "pendiente"
                  ? "bg-emerald-500 text-[var(--primary-on)] shadow-[0_2px_8px_var(--primary-glow)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-bright)]"
              }`}
            >
              <ChefHat className="h-4 w-4" /> Por Preparar ({
                orders.filter(o => o.status === "PENDIENTE" || o.status === "EN_PROCESO").length
              })
            </button>
            <button
              onClick={() => setActiveTab("listo")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeTab === "listo"
                  ? "bg-emerald-500 text-[var(--primary-on)] shadow-[0_2px_8px_var(--primary-glow)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-bright)]"
              }`}
            >
              <Check className="h-4 w-4" /> En Pasador ({
                orders.filter(o => o.status === "LISTO").length
              })
            </button>
            <button
              onClick={() => setActiveTab("historial")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeTab === "historial"
                  ? "bg-emerald-500 text-[var(--primary-on)] shadow-[0_2px_8px_var(--primary-glow)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-bright)]"
              }`}
            >
              <RotateCcw className="h-4 w-4" /> Historial ({
                historyOrders.length
              })
            </button>
          </div>

          <div className="hidden sm:flex text-xs font-semibold text-[var(--text-muted)] gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span> En Cola: {orders.filter(o => o.status === "PENDIENTE").length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 animate-pulse"></span> Cocinando: {orders.filter(o => o.status === "EN_PROCESO").length}
            </span>
          </div>
        </div>

        {/* Content Section: Grid of Comandas */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab !== "historial" ? (
            filteredOrders.length === 0 ? (
              <div className="text-center py-24 rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--surface)]/10">
                <ChefHat className="h-12 w-12 text-[var(--text-disabled)] mx-auto mb-3" />
                <p className="text-sm font-semibold text-[var(--text-muted)]">
                  {activeTab === "pendiente" 
                    ? "No hay comandas pendientes de preparación." 
                    : "No hay comandas listas en el pasador."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-4">
                {filteredOrders.map((order, index) => {
                  const isPending = order.status === "PENDIENTE";
                  const isProcessing = order.status === "EN_PROCESO";
                  const isReady = order.status === "LISTO";

                  return (
                    <div
                      key={order.id}
                      onClick={() => handleOpenFullscreenModal(order)}
                      style={{ animationDelay: `${index * 50}ms` }}
                      className={`cursor-pointer rounded-3xl border-2 bg-[var(--surface)] overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-[var(--shadow-2)] border-l-4 animate-slide-up ${getStatusBorderColor(order.status)} ${
                        isProcessing 
                          ? "border-yellow-500/30 shadow-lg shadow-yellow-500/5" 
                          : "border-[var(--border-default)]"
                      }`}
                    >
                      {/* Header — Large table number */}
                      <div className={`px-5 py-4 border-b-2 border-[var(--border-default)] flex items-center justify-between ${
                        isProcessing ? "bg-yellow-500/[0.03]" : ""
                      }`}>
                        <div>
                          <h4 className="font-extrabold text-[var(--text-primary)] text-2xl tracking-tight">
                            Mesa {order.table_number}
                          </h4>
                          <span className="text-xs text-[var(--text-muted)] font-semibold">
                            Mesero: {order.waiter_username}
                          </span>
                        </div>
                        
                        {/* Timer ticker */}
                        {!isReady && <ElapsedTimer createdAt={order.created_at} />}
                        {isReady && (
                          <span className="text-[0.6875rem] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-wider animate-bounce">
                            LISTO
                          </span>
                        )}
                      </div>

                      {/* Order Details Body */}
                      <div className="px-5 py-4 flex-1 space-y-4">
                        <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[0.6875rem] font-bold uppercase tracking-[0.05em]">
                          <FileText className="h-3 w-3" />
                          <span>Comanda #{order.id}</span>
                        </div>

                        <ul className="space-y-3">
                          {order.details.map((detail) => (
                            <li key={detail.id} className="border-b border-[var(--border-default)]/40 last:border-0 pb-3 last:pb-0">
                              <div className="flex justify-between items-start gap-3">
                                <span className="text-lg text-[var(--text-primary)] font-bold leading-tight">
                                  <span className="text-[var(--primary-on)] bg-emerald-500 px-2.5 py-0.5 rounded-lg text-sm font-extrabold mr-2">
                                    {detail.quantity}
                                  </span>
                                  {detail.plate_name}
                                </span>
                              </div>

                              {/* Modifiers List (Highlighted in emerald) */}
                              {detail.modifiers && detail.modifiers.length > 0 && (
                                <div className="pl-10 mt-2 flex flex-wrap gap-1.5">
                                  {detail.modifiers.map((mod) => (
                                    <span
                                      key={mod.id}
                                      className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg"
                                    >
                                      + {mod.name}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Comment */}
                              {detail.comment && (
                                <div className="pl-10 mt-2 flex items-start gap-1.5 rounded-xl bg-red-500/[0.06] border border-red-500/15 p-2.5 text-xs text-red-400">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500/80 mt-0.5" />
                                  <p className="italic font-medium">&quot;{detail.comment}&quot;</p>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Action Button Footer */}
                      {!isReady && (
                        <div className="border-t-2 border-[var(--border-default)] p-4 bg-[var(--surface-dim)]/30">
                          {isPending ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(order.id, order.status);
                              }}
                              className="w-full rounded-2xl bg-[var(--surface-bright)] hover:bg-yellow-500 hover:text-[var(--primary-on)] border border-[var(--border-default)] py-3.5 text-sm font-bold text-yellow-400 transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-yellow-500/10 active:scale-[0.98]"
                            >
                              <Play className="h-4 w-4 fill-current" />
                              Empezar Preparación
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(order.id, order.status);
                              }}
                              className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 py-3.5 text-sm font-bold text-[var(--primary-on)] transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-emerald-500/25"
                            >
                              <Check className="h-4 w-4 stroke-[3]" />
                              Listo / Completar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* KITCHEN HISTORY TAB */
            historyOrders.length === 0 ? (
              <div className="text-center py-24 rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--surface)]/10">
                <ChefHat className="h-12 w-12 text-[var(--text-disabled)] mx-auto mb-3" />
                <p className="text-sm font-semibold text-[var(--text-muted)]">No hay comandas finalizadas en las últimas 12 horas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {historyOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => handleOpenFullscreenModal(order)}
                    className="cursor-pointer rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] overflow-hidden flex flex-col justify-between hover:border-[var(--border-hover)] transition-all duration-200"
                  >
                    {/* Header */}
                    <div className="p-4 border-b border-[var(--border-default)] bg-[var(--surface-dim)]/40 flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-[var(--text-secondary)] text-lg">Mesa {order.table_number}</h4>
                        <span className="text-xs text-[var(--text-muted)]">#{order.id} • {order.waiter_username}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-[0.6875rem] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                        order.status === "ENTREGADO" 
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${order.status === "ENTREGADO" ? "bg-indigo-400" : "bg-emerald-400"}`}></span>
                        {order.status}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="p-5 flex-1 space-y-3">
                      <ul className="space-y-2">
                        {order.details.map((detail) => (
                          <li key={detail.id} className="text-xs text-[var(--text-muted)]">
                            <strong className="text-[var(--text-secondary)]">{detail.quantity}x</strong> {detail.plate_name}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Reopen Action Button */}
                    <div className="border-t border-[var(--border-default)] p-4 bg-[var(--surface-dim)]/20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReopenOrder(order.id);
                        }}
                        className="w-full rounded-xl bg-[var(--surface-bright)] hover:bg-[var(--surface-highest)] border border-[var(--border-default)] py-2.5 text-xs font-bold text-[var(--text-muted)] transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reabrir Comanda
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </main>

      {/* Fullscreen Magnified View Modal */}
      <FullscreenOrderModal
        order={selectedOrderForDetails}
        isOpen={isFullscreenModalOpen}
        onClose={() => setIsFullscreenModalOpen(false)}
        role={user?.role || null}
        onAction={handleFullscreenAction}
      />
    </div>
  );
}
