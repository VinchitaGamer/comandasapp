import React from "react";
import { Order } from "@/store";
import { X, Play, Check, AlertTriangle, FileText, Clock, Utensils } from "lucide-react";

interface FullscreenOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  role: string | null;
  onAction?: (orderId: number, currentStatus: string) => Promise<void> | void;
}

export default function FullscreenOrderModal({
  order,
  isOpen,
  onClose,
  role,
  onAction
}: FullscreenOrderModalProps) {
  if (!isOpen || !order) return null;

  const isPending = order.status === "PENDIENTE";
  const isProcessing = order.status === "EN_PROCESO";
  const isReady = order.status === "LISTO";

  const showActionButton = 
    (role === "COCINA" || role === "ADMIN") && (isPending || isProcessing);

  const getActionButtonText = () => {
    if (isPending) return "Empezar Preparación";
    if (isProcessing) return "Listo / Despachar";
    return "";
  };

  const handleActionClick = async () => {
    if (onAction) {
      await onAction(order.id, order.status);
      onClose();
    }
  };

  // Calculate elapsed minutes
  const getElapsedMins = (createdAt: string) => {
    const createdTime = new Date(createdAt).getTime();
    const diffMs = Date.now() - createdTime;
    return Math.floor(diffMs / 60000);
  };

  const elapsedMins = getElapsedMins(order.created_at);
  const isDelayed = elapsedMins >= 15;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--surface-dim)]/[0.98] flex flex-col justify-between p-6 md:p-12 overflow-y-auto animate-fade-in font-sans">
      
      {/* Top Header Section */}
      <header className="flex justify-between items-start border-b border-[var(--border-default)] pb-6 mb-6">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-5xl md:text-7xl font-extrabold text-emerald-400 tracking-tight">
              MESA {order.table_number}
            </h1>
            {!isReady && order.status !== "ENTREGADO" && order.status !== "CANCELADO" && (
              <span className={`inline-flex items-center gap-2 text-lg font-extrabold px-4 py-2 rounded-2xl ${
                isDelayed 
                  ? "bg-red-500/15 text-red-400 border border-red-500/25 animate-pulse-urgent" 
                  : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-default)]"
              }`}>
                <Clock className="h-5 w-5" />
                {elapsedMins} min
              </span>
            )}
          </div>
          <p className="text-sm md:text-lg text-[var(--text-muted)] mt-2 font-semibold">
            Comanda #{order.id} • Tomada por: {order.waiter_username} • {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="rounded-2xl border-2 border-[var(--border-default)] hover:border-[var(--border-hover)] bg-[var(--surface)] hover:bg-[var(--surface-bright)] p-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
        >
          <X className="h-8 w-8 stroke-[2.5]" />
        </button>
      </header>

      {/* Main Order Details Body */}
      <main className="flex-1 space-y-6 max-w-4xl w-full mx-auto my-6">
        <div className="flex items-center gap-2.5 text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest border-b border-[var(--border-default)] pb-2 mb-4">
          <FileText className="h-5 w-5 text-emerald-400" />
          <span>Detalle de Consumo</span>
        </div>

        <ul className="divide-y divide-[var(--border-default)] space-y-4">
          {order.details.map((detail) => (
            <li key={detail.id} className="pt-4 first:pt-0 pb-4">
              <div className="flex justify-between items-start gap-4">
                <span className="text-2xl md:text-3xl text-[var(--text-primary)] font-extrabold leading-snug">
                  <span className="text-[var(--primary-on)] bg-emerald-500 px-3 py-1 rounded-xl text-xl md:text-2xl font-extrabold mr-4 shadow-lg shadow-emerald-500/15">
                    {detail.quantity}x
                  </span>
                  {detail.plate_name}
                </span>
                <span className="text-xl md:text-2xl font-extrabold text-[var(--text-muted)] shrink-0">
                  Bs{(detail.plate_price * detail.quantity).toFixed(2)}
                </span>
              </div>

              {/* Modifiers List */}
              {detail.modifiers && detail.modifiers.length > 0 && (
                <div className="pl-14 mt-3 flex flex-wrap gap-2">
                  {detail.modifiers.map((mod) => (
                    <span
                      key={mod.id}
                      className="text-xs md:text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 rounded-xl uppercase tracking-wider"
                    >
                      + {mod.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Red warning card for Comments */}
              {detail.comment && (
                <div className="pl-14 mt-3">
                  <div className="flex items-start gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-base md:text-lg text-red-400 font-bold max-w-2xl">
                    <AlertTriangle className="h-6 w-6 shrink-0 text-red-500 animate-pulse mt-0.5" />
                    <p className="italic">&quot;{detail.comment.toUpperCase()}&quot;</p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>

      {/* Footer Section: Totals and Actions */}
      <footer className="border-t border-[var(--border-default)] pt-6 mt-6 flex flex-col md:flex-row gap-6 justify-between items-center max-w-4xl w-full mx-auto">
        <div className="text-center md:text-left">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest block">TOTAL COMANDA</span>
          <span className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)]">Bs{order.total_price.toFixed(2)}</span>
          {order.payment_method && (
            <span className="mt-1.5 block text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg w-fit mx-auto md:mx-0">
              PAGADO CON: {order.payment_method}
            </span>
          )}
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          {showActionButton && (
            <button
              onClick={handleActionClick}
              className="flex-1 md:flex-none rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 px-8 py-5 text-lg font-extrabold text-[var(--primary-on)] transition-all hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.98] shadow-2xl shadow-emerald-500/25 flex items-center justify-center gap-3"
            >
              {isPending ? (
                <Play className="h-6 w-6 fill-current" />
              ) : (
                <Check className="h-6 w-6 stroke-[3]" />
              )}
              {getActionButtonText()}
            </button>
          )}

          <button
            onClick={onClose}
            className="flex-1 md:flex-none rounded-2xl border border-[var(--border-default)] hover:border-[var(--border-hover)] bg-[var(--surface)] px-8 py-5 text-lg font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
          >
            Cerrar Pantalla
          </button>
        </div>
      </footer>

    </div>
  );
}
