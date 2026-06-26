import { useState, useEffect } from "react";
import { X, Plus, Minus } from "lucide-react";
import { Modifier } from "@/store";

interface Plate {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  modifiers: Modifier[];
}

interface ModifierModalProps {
  plate: Plate | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number, selectedModifiers: Modifier[], comment: string) => void;
}

export default function ModifierModal({ plate, isOpen, onClose, onConfirm }: ModifierModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([]);
  const [comment, setComment] = useState("");

  // Reset modal state when open changes or a new plate is selected
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSelectedModifiers([]);
      setComment("");
    }
  }, [isOpen, plate]);

  if (!isOpen || !plate) return null;

  const handleToggleModifier = (modifier: Modifier) => {
    const isSelected = selectedModifiers.some((m) => m.id === modifier.id);
    if (isSelected) {
      setSelectedModifiers(selectedModifiers.filter((m) => m.id !== modifier.id));
    } else {
      setSelectedModifiers([...selectedModifiers, modifier]);
    }
  };

  const incrementQty = () => setQuantity(quantity + 1);
  const decrementQty = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const calculateItemTotal = () => {
    const modifierExtra = selectedModifiers.reduce((acc, curr) => acc + curr.extra_price, 0);
    return (plate.price + modifierExtra) * quantity;
  };

  const handleConfirm = () => {
    onConfirm(quantity, selectedModifiers, comment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur-md font-sans animate-fade-in">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-container)] shadow-[var(--shadow-4)] animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">{plate.name}</h3>
            <span className="text-xs font-semibold text-emerald-400">{plate.category}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--surface-bright)] hover:text-[var(--text-primary)] transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6 space-y-6">
          {plate.description && (
            <div>
              <h4 className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] mb-2">Descripción</h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{plate.description}</p>
            </div>
          )}

          {/* Modifiers List */}
          {plate.modifiers && plate.modifiers.length > 0 ? (
            <div>
              <h4 className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] mb-3">
                Modificadores Disponibles
              </h4>
              <div className="space-y-2">
                {plate.modifiers.map((mod) => {
                  const isChecked = selectedModifiers.some((m) => m.id === mod.id);
                  return (
                    <label
                      key={mod.id}
                      className={`flex items-center justify-between rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
                        isChecked
                          ? "border-emerald-500/40 bg-[var(--primary-muted)] text-[var(--text-primary)]"
                          : "border-[var(--border-default)] bg-[var(--surface-dim)]/30 text-[var(--text-secondary)] hover:bg-[var(--surface-bright)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleModifier(mod)}
                          className="h-[18px] w-[18px] accent-emerald-500 rounded border-[var(--border-default)] bg-[var(--surface-dim)] text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium">{mod.name}</span>
                      </div>
                      {mod.extra_price > 0 && (
                        <span className="text-xs font-bold text-emerald-400">
                          + Bs{mod.extra_price.toFixed(2)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Comments */}
          <div>
            <label htmlFor="comment" className="block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] mb-2">
              Comentarios / Instrucciones Especiales
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ej: Término de carne, sin salsa, extra servilletas..."
              rows={3}
              className="w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] p-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-disabled)] transition-all focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] outline-none resize-none"
            />
          </div>

          {/* Quantity selector */}
          <div className="flex items-center justify-between border-t border-[var(--border-default)]/60 pt-6">
            <span className="text-sm font-bold text-[var(--text-secondary)]">Cantidad</span>
            <div className="flex items-center rounded-2xl bg-[var(--surface-dim)] border border-[var(--border-default)] p-1">
              <button
                onClick={decrementQty}
                className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--surface-bright)] hover:text-[var(--text-primary)] transition-all disabled:opacity-30"
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-bold text-[var(--text-primary)]">{quantity}</span>
              <button
                onClick={incrementQty}
                className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--surface-bright)] hover:text-[var(--text-primary)] transition-all"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-default)] px-6 py-4 bg-[var(--surface-dim)]/50">
          <button
            onClick={handleConfirm}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 py-3.5 text-sm font-bold text-[var(--primary-on)] transition-all hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.98] shadow-lg shadow-emerald-500/25"
          >
            Agregar a la Orden — Bs{calculateItemTotal().toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
