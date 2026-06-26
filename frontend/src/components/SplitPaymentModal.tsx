import React, { useState, useEffect } from "react";
import { Order } from "@/store";
import { X, CreditCard, DollarSign, QrCode, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { getErrorMessage } from "@/services/api";

interface SplitPaymentModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (method: string, paymentData: { payment_cash: number; payment_qr: number; payment_card: number }) => Promise<void> | void;
}

export default function SplitPaymentModal({
  order,
  isOpen,
  onClose,
  onConfirm
}: SplitPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"EFECTIVO" | "TARJETA" | "QR" | "DIVIDIDO">("EFECTIVO");
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [qrAmount, setQrAmount] = useState<number>(0);
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const totalPrice = order ? order.total_price : 0;

  // Reset states on order change or open
  useEffect(() => {
    if (isOpen && order) {
      setPaymentMethod("EFECTIVO");
      setCashAmount(0);
      setQrAmount(0);
      setCardAmount(0);
      setErrorMsg("");
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  // Sum of split payments
  const totalPaidSplit = Number((cashAmount + qrAmount + cardAmount).toFixed(2));
  const remaining = Number((totalPrice - totalPaidSplit).toFixed(2));

  // Determine if confirmation is allowed
  const isPaymentValid = () => {
    if (paymentMethod !== "DIVIDIDO") return true;
    return remaining === 0;
  };

  const handleConfirm = async () => {
    if (!isPaymentValid()) return;
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const paymentData = {
        payment_cash: paymentMethod === "DIVIDIDO" ? cashAmount : (paymentMethod === "EFECTIVO" ? totalPrice : 0),
        payment_qr: paymentMethod === "DIVIDIDO" ? qrAmount : (paymentMethod === "QR" ? totalPrice : 0),
        payment_card: paymentMethod === "DIVIDIDO" ? cardAmount : (paymentMethod === "TARJETA" ? totalPrice : 0),
      };

      await onConfirm(paymentMethod, paymentData);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Autofill helpers
  const handleAutofill = (type: "cash" | "qr" | "card") => {
    const currentSum = 
      (type === "cash" ? 0 : cashAmount) + 
      (type === "qr" ? 0 : qrAmount) + 
      (type === "card" ? 0 : cardAmount);
    const difference = Number((totalPrice - currentSum).toFixed(2));
    const finalVal = difference > 0 ? difference : 0;

    if (type === "cash") setCashAmount(finalVal);
    if (type === "qr") setQrAmount(finalVal);
    if (type === "card") setCardAmount(finalVal);
  };

  const methodOptions = [
    { key: "EFECTIVO" as const, icon: DollarSign, label: "Efectivo" },
    { key: "TARJETA" as const, icon: CreditCard, label: "Tarjeta" },
    { key: "QR" as const, icon: QrCode, label: "Pago QR" },
    { key: "DIVIDIDO" as const, icon: Sparkles, label: "Pago Dividido" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur-md animate-fade-in font-sans">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-container)] shadow-[var(--shadow-4)] animate-slide-up">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[var(--border-default)] px-6 py-4 bg-[var(--surface-dim)]/30">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Procesar Pago - Mesa {order.table_number}</h3>
            <span className="text-xs text-[var(--text-muted)] font-semibold">Comanda #{order.id}</span>
          </div>
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--surface-bright)] hover:text-[var(--text-primary)] transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400 animate-shake">
              <AlertCircle className="h-[18px] w-[18px] shrink-0 text-red-500 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Large Total Indicator */}
          <div className="text-center bg-[var(--surface-dim)] rounded-2xl p-5 border border-[var(--border-default)]">
            <span className="text-[0.625rem] font-extrabold tracking-widest text-[var(--text-muted)] uppercase">Monto Total a Pagar</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-emerald-400 mt-1">Bs{totalPrice.toFixed(2)}</h2>
          </div>

          {/* Payment Method Selector Grid */}
          <div className="space-y-2">
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">Seleccione Método de Pago</label>
            <div className="grid grid-cols-2 gap-2.5">
              {methodOptions.map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPaymentMethod(key)}
                  className={`flex items-center gap-3 rounded-2xl p-3.5 border transition-all duration-200 ${
                    paymentMethod === key
                      ? "border-emerald-500/40 bg-[var(--primary-muted)] text-[var(--text-primary)]"
                      : "border-[var(--border-default)] bg-[var(--surface-dim)] text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="text-xs font-bold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sub-form for Split Payment */}
          {paymentMethod === "DIVIDIDO" && (
            <div className="bg-[var(--surface-dim)] border border-[var(--border-default)] rounded-2xl p-4 space-y-4 animate-slide-in">
              <h4 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">Desglose de Montos</h4>
              
              <div className="space-y-3">
                {/* Cash split */}
                <div className="flex items-center gap-3">
                  <div className="w-20 text-xs font-bold text-[var(--text-muted)]">Efectivo:</div>
                  <div className="flex-1 relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)] text-xs font-semibold">Bs</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalPrice}
                      value={cashAmount || ""}
                      onChange={(e) => setCashAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-2.5 pl-8 pr-16 text-xs text-[var(--text-primary)] focus:border-emerald-400 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleAutofill("cash")}
                      className="absolute inset-y-1.5 right-1.5 px-2 bg-emerald-500 hover:bg-emerald-600 text-[var(--primary-on)] rounded-lg text-[9px] font-extrabold transition-colors"
                    >
                      Autofill
                    </button>
                  </div>
                </div>

                {/* QR split */}
                <div className="flex items-center gap-3">
                  <div className="w-20 text-xs font-bold text-[var(--text-muted)]">QR:</div>
                  <div className="flex-1 relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)] text-xs font-semibold">Bs</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalPrice}
                      value={qrAmount || ""}
                      onChange={(e) => setQrAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-2.5 pl-8 pr-16 text-xs text-[var(--text-primary)] focus:border-emerald-400 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleAutofill("qr")}
                      className="absolute inset-y-1.5 right-1.5 px-2 bg-emerald-500 hover:bg-emerald-600 text-[var(--primary-on)] rounded-lg text-[9px] font-extrabold transition-colors"
                    >
                      Autofill
                    </button>
                  </div>
                </div>

                {/* Card split */}
                <div className="flex items-center gap-3">
                  <div className="w-20 text-xs font-bold text-[var(--text-muted)]">Tarjeta:</div>
                  <div className="flex-1 relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--text-muted)] text-xs font-semibold">Bs</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalPrice}
                      value={cardAmount || ""}
                      onChange={(e) => setCardAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-2.5 pl-8 pr-16 text-xs text-[var(--text-primary)] focus:border-emerald-400 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleAutofill("card")}
                      className="absolute inset-y-1.5 right-1.5 px-2 bg-emerald-500 hover:bg-emerald-600 text-[var(--primary-on)] rounded-lg text-[9px] font-extrabold transition-colors"
                    >
                      Autofill
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Math Progress Indicator */}
              <div className="border-t border-[var(--border-default)] pt-3 flex justify-between items-center text-xs">
                <span className="text-[var(--text-muted)] font-medium">Suma Pagada: <strong className="text-[var(--text-primary)]">Bs{totalPaidSplit.toFixed(2)}</strong></span>
                {remaining === 0 ? (
                  <span className="text-emerald-400 font-extrabold flex items-center gap-1.5 animate-pulse">
                    <CheckCircle2 className="h-4 w-4" /> Pago Cuadrado
                  </span>
                ) : remaining > 0 ? (
                  <span className="text-yellow-400 font-bold">Falta: Bs{remaining.toFixed(2)}</span>
                ) : (
                  <span className="text-red-400 font-bold">Exceso: Bs{Math.abs(remaining).toFixed(2)}</span>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[var(--border-default)] px-6 py-4 bg-[var(--surface-dim)]/30">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-[var(--border-default)] hover:bg-[var(--surface-bright)] px-4 py-2.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !isPaymentValid()}
            className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-600 px-5 py-2.5 text-xs font-extrabold text-[var(--primary-on)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
          >
            {isSubmitting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--primary-on)] border-t-transparent"></span>}
            Confirmar Pago
          </button>
        </div>

      </div>
    </div>
  );
}
