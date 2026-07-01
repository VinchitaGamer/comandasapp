import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useStore, Order, Modifier, CartItem } from "@/store";
import api, { getErrorMessage } from "@/services/api";
import Navbar from "@/components/Navbar";
import ModifierModal from "@/components/ModifierModal";
import FullscreenOrderModal from "@/components/FullscreenOrderModal";
import SplitPaymentModal from "@/components/SplitPaymentModal";
import { 
  ShoppingBag, 
  Utensils, 
  Clock, 
  CheckCircle, 
  Trash2, 
  AlertCircle, 
  Bell, 
  Search,
  CheckSquare,
  Coffee,
  IceCream,
  Pizza,
  Wine,
  X
} from "lucide-react";

interface Plate {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  modifiers: Modifier[];
}

interface ToastNotification {
  id: string;
  table_number: number;
  order_id: number;
}

export default function Mesero() {
  const router = useRouter();
  const { 
    user, 
    token, 
    cart, 
    tableNumber, 
    orders, 
    setTableNumber, 
    addToCart, 
    removeFromCart, 
    clearCart,
    fetchActiveOrders,
    updateOrder,
    editingOrderId,
    startEditingOrder,
    cancelEditingOrder
  } = useStore();

  // Component states
  const [plates, setPlates] = useState<Plate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"toma" | "comandas">("toma");
  const [selectedPlateForModal, setSelectedPlateForModal] = useState<Plate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Route security
  useEffect(() => {
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "MESERO" && user.role !== "ADMIN") {
      // Redirect to correct dashboard
      if (user.role === "COCINA") router.replace("/cocina");
      else router.replace("/login");
    }
  }, [user, token, router]);

  // Load menu plates and active orders
  useEffect(() => {
    if (token) {
      // Fetch menu
      api.get("/menu")
        .then((res) => {
          setPlates(res.data);
          // Extract categories
          const cats: string[] = Array.from(new Set(res.data.map((p: Plate) => p.category)));
          setCategories(["Todos", ...cats]);
        })
        .catch((err) => console.error("Error al cargar menú:", err));

      // Initial active orders load
      fetchActiveOrders();
    }
  }, [token, fetchActiveOrders]);

  // Listen to WebSocket events for ORDER_READY notifications
  useEffect(() => {
    const handleNotification = (e: Event) => {
      const order = (e as CustomEvent).detail as Order;
      const newToast: ToastNotification = {
        id: Math.random().toString(),
        table_number: order.table_number,
        order_id: order.id
      };
      setToasts((prev) => [...prev, newToast]);
    };

    window.addEventListener("order-ready-notification", handleNotification);
    return () => {
      window.removeEventListener("order-ready-notification", handleNotification);
    };
  }, []);

  // Filter plates based on Category and Search Query
  const filteredPlates = plates.filter((plate) => {
    const matchesCategory = selectedCategory === "Todos" || plate.category === selectedCategory;
    const matchesSearch = plate.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (plate.description && plate.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleOpenModifierModal = (plate: Plate) => {
    setSelectedPlateForModal(plate);
    setIsModalOpen(true);
  };

  const handleConfirmModifiers = (quantity: number, selectedMods: Modifier[], comment: string) => {
    if (!selectedPlateForModal) return;
    
    const cartItem: CartItem = {
      plate_id: selectedPlateForModal.id,
      name: selectedPlateForModal.name,
      base_price: selectedPlateForModal.price,
      quantity,
      comment,
      selected_modifiers: selectedMods
    };
    
    addToCart(cartItem);
  };

  // Calculate cart subtotal
  const calculateCartTotal = () => {
    return cart.reduce((acc, item) => {
      const modPrice = item.selected_modifiers.reduce((mAcc, m) => mAcc + m.extra_price, 0);
      return acc + (item.base_price + modPrice) * item.quantity;
    }, 0);
  };

  // Handle Order Submit
  const handleSendOrder = async () => {
    if (!tableNumber) {
      setErrorMsg("Debe ingresar un número de mesa");
      return;
    }
    if (cart.length === 0) {
      setErrorMsg("El pedido está vacío");
      return;
    }

    setSubmittingOrder(true);
    setErrorMsg("");

    try {
      const payload = {
        table_number: Number(tableNumber),
        items: cart.map((item) => ({
          plate_id: item.plate_id,
          quantity: item.quantity,
          comment: item.comment || null,
          modifier_ids: item.selected_modifiers.map((m) => m.id)
        }))
      };

      if (editingOrderId) {
        await api.put(`/comandas/${editingOrderId}`, payload);
        cancelEditingOrder();
        if (user && user.role === "ADMIN") {
          router.push("/admin");
          return;
        }
      } else {
        await api.post("/comandas", payload);
        clearCart();
      }

      // Switch tab to view orders
      setActiveTab("comandas");
      // Reload orders to ensure synchronization
      fetchActiveOrders();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(getErrorMessage(err));
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Handle Mark as Delivered
  const [subTab, setSubTab] = useState<"activas" | "historial">("activas");
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);

  const fetchHistoryOrders = async () => {
    try {
      const res = await api.get(`/comandas?status_filter=ENTREGADO&hours_limit=12`);
      setHistoryOrders(res.data);
    } catch (e) {
      console.error("Error al cargar historial:", e);
    }
  };

  useEffect(() => {
    if (token && subTab === "historial") {
      fetchHistoryOrders();
    }
  }, [token, subTab]);

  const handleMarkAsDeliveredClick = (order: Order) => {
    setSelectedOrderForPayment(order);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (method: string, paymentData: any) => {
    if (!selectedOrderForPayment) return;
    try {
      // 1. Save payment details (includes payment_method in body)
      await api.patch(`/comandas/${selectedOrderForPayment.id}/pago`, {
        payment_method: method,
        ...paymentData
      });
      // 2. Mark as delivered
      const res = await api.patch(`/comandas/${selectedOrderForPayment.id}?status_update=ENTREGADO`);
      updateOrder(res.data);
      
      // Update history list if needed
      if (subTab === "historial") {
        fetchHistoryOrders();
      }
      fetchActiveOrders();
    } catch (err: any) {
      console.error("Error al registrar pago/entrega:", err);
      throw new Error(getErrorMessage(err));
    }
  };

  const handleOpenFullscreenModal = (order: Order) => {
    setSelectedOrderForDetails(order);
    setIsFullscreenModalOpen(true);
  };

  const handleFullscreenAction = async (orderId: number, currentStatus: string) => {
    if (currentStatus === "LISTO" && selectedOrderForDetails) {
      setSelectedOrderForPayment(selectedOrderForDetails);
      setIsPaymentModalOpen(true);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper icon selector for categories
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("entrada") || cat.includes("frio")) return <Utensils className="h-4 w-4" />;
    if (cat.includes("fondo") || cat.includes("principal")) return <Pizza className="h-4 w-4" />;
    if (cat.includes("bebida") || cat.includes("tomar")) return <Wine className="h-4 w-4" />;
    if (cat.includes("postre") || cat.includes("dulce")) return <IceCream className="h-4 w-4" />;
    if (cat.includes("cafe") || cat.includes("caliente")) return <Coffee className="h-4 w-4" />;
    return <Utensils className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-[var(--surface-dim)] text-[var(--text-primary)] flex flex-col font-[Inter,sans-serif]">
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left Side: Bento menu and order tracking tabs */}
        <section className="flex-1 p-4 md:p-6 overflow-y-auto space-y-5">
          
          {/* Segmented Tab Control */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-[16px] p-1 flex">
              <button
                onClick={() => setActiveTab("toma")}
                className={`px-5 py-2.5 rounded-[12px] text-sm font-bold tracking-wide transition-all flex items-center gap-2 ${
                  activeTab === "toma"
                    ? "bg-emerald-500 text-[var(--primary-on)] shadow-[0_2px_8px_var(--primary-glow)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Utensils className="h-4 w-4" /> Menú
              </button>
              <button
                onClick={() => setActiveTab("comandas")}
                className={`px-5 py-2.5 rounded-[12px] text-sm font-bold tracking-wide transition-all flex items-center gap-2 ${
                  activeTab === "comandas"
                    ? "bg-emerald-500 text-[var(--primary-on)] shadow-[0_2px_8px_var(--primary-glow)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Clock className="h-4 w-4" />
                Comandas ({orders.length})
              </button>
            </div>

            {/* Simple status stats */}
            <div className="hidden sm:flex gap-4 text-xs font-semibold text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span> Pendientes: {orders.filter(o => o.status === "PENDIENTE").length}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></span> Cocinando: {orders.filter(o => o.status === "EN_PROCESO").length}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span> Listas: {orders.filter(o => o.status === "LISTO").length}
              </span>
            </div>
          </div>

          {/* VIEW: TOMA DE PEDIDOS (BENTO BOX LAYOUT) */}
          {activeTab === "toma" && (
            <div className="space-y-5">
              {/* Category pills (horizontal scroll) & Search bar */}
              <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                {/* Category pills */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide w-full md:w-auto">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                        selectedCategory === cat
                          ? "bg-emerald-500 text-[var(--primary-on)] font-black shadow-lg shadow-emerald-500/25"
                          : "bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]"
                      }`}
                    >
                      {cat !== "Todos" && getCategoryIcon(cat)}
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative w-full md:w-64">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar plato..."
                    className="w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] py-2.5 pl-9 pr-4 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Dishes POS Grid layout */}
              {filteredPlates.length === 0 ? (
                <div className="text-center py-16 rounded-[20px] border border-dashed border-[var(--border-default)] bg-[var(--surface)]">
                  <Utensils className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">No se encontraron platos en esta categoría.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                  {filteredPlates.map((plate) => (
                    <div
                      key={plate.id}
                      onClick={() => handleOpenModifierModal(plate)}
                      className="group cursor-pointer rounded-[20px] border border-[var(--border-default)] bg-[var(--surface)] p-4 md:p-5 min-h-[90px] hover:border-[var(--border-hover)] hover:shadow-[0_4px_6px_rgba(0,0,0,0.4),0_0_20px_var(--primary-glow)] transition-all duration-300 flex flex-col justify-between active:scale-[0.97]"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 md:gap-4 mb-2">
                          <h4 className="font-bold text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors text-sm md:text-base leading-snug">
                            {plate.name}
                          </h4>
                          <span className="text-sm font-black text-emerald-400 shrink-0">
                            Bs {plate.price.toFixed(2)}
                          </span>
                        </div>
                        {plate.description && (
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-4 hidden md:block">
                            {plate.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center mt-auto border-t border-[var(--border-default)] pt-3">
                        <span className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
                          {plate.category}
                        </span>
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          ORDENAR +
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: MIS COMANDAS (ACTIVE ORDERS TRACKING) */}
          {activeTab === "comandas" && (
            <div className="space-y-5">
              
              {/* Sub-tabs selector for active vs history */}
              <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-[16px] p-1 flex w-fit">
                <button
                  onClick={() => setSubTab("activas")}
                  className={`px-4 py-2 rounded-[12px] text-xs font-bold transition-all ${
                    subTab === "activas"
                      ? "bg-emerald-500 text-[var(--primary-on)] font-black shadow-[0_2px_8px_var(--primary-glow)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Activas ({orders.length})
                </button>
                <button
                  onClick={() => setSubTab("historial")}
                  className={`px-4 py-2 rounded-[12px] text-xs font-bold transition-all ${
                    subTab === "historial"
                      ? "bg-emerald-500 text-[var(--primary-on)] font-black shadow-[0_2px_8px_var(--primary-glow)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Historial (12h)
                </button>
              </div>

              {subTab === "activas" ? (
                orders.length === 0 ? (
                  <div className="text-center py-16 rounded-[20px] border border-dashed border-[var(--border-default)] bg-[var(--surface)]">
                    <CheckSquare className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
                    <p className="text-sm font-semibold text-[var(--text-secondary)]">No hay comandas activas asignadas.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orders.map((order) => {
                      const isReady = order.status === "LISTO";
                      const isProcessing = order.status === "EN_PROCESO";
                      
                      return (
                        <div
                          key={order.id}
                          onClick={() => handleOpenFullscreenModal(order)}
                          className={`group cursor-pointer rounded-[20px] border transition-all duration-300 p-5 flex flex-col justify-between hover:shadow-[0_4px_6px_rgba(0,0,0,0.4)] ${
                            isReady
                              ? "border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/10 animate-pulse"
                              : "border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-hover)]"
                          }`}
                        >
                          <div>
                            {/* Order Header */}
                            <div className="flex justify-between items-start border-b border-[var(--border-default)] pb-3 mb-4">
                              <div>
                                <h4 className="font-extrabold text-[var(--text-primary)] text-base">
                                  Mesa {order.table_number}
                                </h4>
                                <span className="text-xs text-[var(--text-muted)]">
                                  Comanda #{order.id} • {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                                  isReady
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black"
                                    : isProcessing
                                    ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                }`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  isReady ? "bg-emerald-400 animate-ping" : isProcessing ? "bg-yellow-400 animate-pulse" : "bg-blue-400"
                                }`}></span>
                                {isReady ? "LISTO PARA SERVIR" : isProcessing ? "PREPARANDO" : "EN COLA"}
                              </span>
                            </div>

                            {/* Order items detail */}
                            <ul className="space-y-3 mb-6">
                              {order.details.map((detail) => (
                                <li key={detail.id} className="text-sm">
                                  <div className="flex justify-between items-start gap-2">
                                    <span className="text-[var(--text-secondary)] font-medium">
                                      <strong className="text-[var(--text-primary)] bg-[var(--surface-highest)] px-1.5 py-0.5 rounded text-xs mr-2">{detail.quantity}x</strong> 
                                      {detail.plate_name}
                                    </span>
                                    <span className="text-xs font-bold text-[var(--text-muted)]">
                                      Bs {(detail.plate_price * detail.quantity).toFixed(2)}
                                    </span>
                                  </div>

                                  {/* Modifiers list */}
                                  {detail.modifiers && detail.modifiers.length > 0 && (
                                    <div className="pl-9 mt-1 flex flex-wrap gap-1">
                                      {detail.modifiers.map((mod) => (
                                        <span key={mod.id} className="text-[10px] font-medium text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-md">
                                          + {mod.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Item comment */}
                                  {detail.comment && (
                                    <p className="pl-9 mt-1 text-xs text-[var(--text-secondary)] italic">
                                      Nota: &quot;{detail.comment}&quot;
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Order Footer */}
                          <div className="border-t border-[var(--border-default)] pt-4 mt-auto flex justify-between items-center">
                            <div>
                              <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase block">Total</span>
                              <span className="text-base font-black text-[var(--text-primary)]">Bs {order.total_price.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingOrder(order);
                                  setActiveTab("toma");
                                }}
                                className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-bright)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] transition-colors"
                              >
                                Editar
                              </button>
                              
                              {isReady && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsDeliveredClick(order);
                                  }}
                                  className="rounded-[14px] bg-gradient-to-r from-emerald-400 to-emerald-600 px-4 py-2 text-xs font-bold text-[var(--primary-on)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/25"
                                >
                                  <CheckCircle className="h-4 w-4" /> Marcar Entregado
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* HISTORIAL SUB-TAB */
                <div className="space-y-4">
                  {/* Historial Stats Banner */}
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[20px] p-5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Total Vendido en Turno</span>
                      <h4 className="text-3xl font-black text-emerald-400 mt-1">Bs {historyOrders.reduce((sum, o) => sum + o.total_price, 0).toFixed(2)}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Comandas Entregadas</span>
                      <h4 className="text-3xl font-black text-[var(--text-primary)] mt-1">{historyOrders.length}</h4>
                    </div>
                  </div>

                  {historyOrders.length === 0 ? (
                    <div className="text-center py-16 rounded-[20px] border border-dashed border-[var(--border-default)] bg-[var(--surface)]">
                      <CheckSquare className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
                      <p className="text-sm font-semibold text-[var(--text-secondary)]">No hay comandas entregadas en las últimas 12 horas.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {historyOrders.map((order) => (
                        <div
                          key={order.id}
                          onClick={() => handleOpenFullscreenModal(order)}
                          className="cursor-pointer rounded-[20px] border border-[var(--border-default)] bg-[var(--surface)] p-5 flex flex-col justify-between hover:border-[var(--border-hover)] hover:shadow-[0_4px_6px_rgba(0,0,0,0.4)] transition-all duration-300"
                        >
                          <div>
                            {/* Header */}
                            <div className="flex justify-between items-start border-b border-[var(--border-default)] pb-3 mb-4">
                              <div>
                                <h4 className="font-extrabold text-[var(--text-primary)] text-base">
                                  Mesa {order.table_number}
                                </h4>
                                <span className="text-xs text-[var(--text-muted)]">
                                  Comanda #{order.id} • Entregada a las {new Date(order.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                              <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-[9px] font-black text-indigo-400 uppercase tracking-wider">
                                {order.payment_method}
                              </span>
                            </div>

                            {/* Details list */}
                            <ul className="space-y-2 mb-4">
                              {order.details.map((detail) => (
                                <li key={detail.id} className="text-xs text-[var(--text-secondary)]">
                                  <strong className="text-[var(--text-primary)]">{detail.quantity}x</strong> {detail.plate_name}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Footer */}
                          <div className="border-t border-[var(--border-default)] pt-3 mt-auto flex justify-between items-center text-xs">
                            <div>
                              <span className="text-[var(--text-muted)] font-bold">Total:</span>
                              <span className="font-extrabold text-[var(--text-primary)] ml-1">Bs {order.total_price.toFixed(2)}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingOrder(order);
                                setActiveTab("toma");
                              }}
                              className="rounded-lg border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-bright)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--text-secondary)] transition-colors"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </section>

        {/* Right Side: Cart / Order input Sidebar (Always visible) */}
        <section className="w-full lg:w-96 h-80 lg:h-full bg-[var(--surface-container)] border-t lg:border-t-0 lg:border-l border-[var(--border-default)] flex flex-col p-6 font-[Inter,sans-serif] shrink-0">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3 mb-6">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-400" />
              <h3 className="font-extrabold text-[var(--text-primary)] text-base">
                {editingOrderId ? `Editando Comanda #${editingOrderId}` : "Comanda Actual"}
              </h3>
            </div>
            {editingOrderId && (
              <button
                onClick={() => {
                  cancelEditingOrder();
                  if (user && user.role === "ADMIN") {
                    router.push("/admin");
                  }
                }}
                className="text-xs font-bold text-red-400 hover:text-red-300 border border-red-500/20 bg-red-500/5 px-2.5 py-1 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="mb-4 flex items-start gap-2.5 rounded-[14px] border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Table Selector */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Número de Mesa
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Ej: 5"
              disabled={submittingOrder}
              className="w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] outline-none transition-all"
            />
          </div>

          {/* Cart Items list */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-6">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[var(--text-muted)] py-12">
                <ShoppingBag className="h-8 w-8 text-[var(--text-muted)] mb-2" />
                <p className="text-xs font-medium">Seleccione platos del menú para armar el pedido.</p>
              </div>
            ) : (
              cart.map((item, index) => {
                const modifierSum = item.selected_modifiers.reduce((acc, curr) => acc + curr.extra_price, 0);
                const itemTotal = (item.base_price + modifierSum) * item.quantity;
                
                return (
                  <div key={index} className="rounded-[16px] border border-[var(--border-default)] bg-[var(--surface)] p-4 relative group">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h5 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                          {item.name}
                        </h5>
                        <span className="text-xs text-[var(--text-secondary)] font-semibold mt-0.5 block">
                          Bs {(item.base_price + modifierSum).toFixed(2)} c/u
                        </span>
                      </div>
                      
                      <button
                        onClick={() => removeFromCart(index)}
                        disabled={submittingOrder}
                        className="rounded-lg p-1.5 text-[var(--text-muted)] bg-red-500/0 hover:bg-red-500/10 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Modifiers selected info */}
                    {item.selected_modifiers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.selected_modifiers.map((m) => (
                          <span key={m.id} className="text-[9px] font-bold text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded">
                            + {m.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Cart item comment */}
                    {item.comment && (
                      <p className="mt-1.5 text-xs text-[var(--text-secondary)] italic">
                        &quot;{item.comment}&quot;
                      </p>
                    )}

                    {/* Quantity and running price */}
                    <div className="flex justify-between items-center border-t border-[var(--border-default)] pt-3 mt-3">
                      <span className="text-xs font-bold text-[var(--text-secondary)]">
                        Cantidad: {item.quantity}
                      </span>
                      <span className="text-xs font-black text-emerald-400">
                        Bs {itemTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Checkout Footer */}
          {cart.length > 0 && (
            <div className="border-t border-[var(--border-default)] pt-4 space-y-4">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-[var(--text-secondary)]">Total estimado:</span>
                <span className="text-lg font-black text-[var(--text-primary)]">Bs {calculateCartTotal().toFixed(2)}</span>
              </div>
              
              <button
                onClick={handleSendOrder}
                disabled={submittingOrder || !tableNumber}
                className="w-full rounded-[14px] bg-gradient-to-r from-emerald-400 to-emerald-600 py-3 text-sm font-bold text-[var(--primary-on)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                {submittingOrder ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary-on)] border-t-transparent"></span>
                    {editingOrderId ? "Guardando Cambios..." : "Enviando a Cocina..."}
                  </>
                ) : (
                  editingOrderId ? "Guardar Cambios" : "Enviar Comanda a Cocina"
                )}
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Floating Ready Toast Alert Notifications */}
      <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-[20px] border border-emerald-500/30 bg-[var(--surface-dim)] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_16px_var(--primary-glow)] flex items-center justify-between gap-4 animate-slide-in backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-400 animate-ping absolute h-8 w-8"></div>
              <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-400 relative flex items-center justify-center">
                <Bell className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <h5 className="font-extrabold text-[var(--text-primary)] text-sm">¡Comanda Lista!</h5>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">La mesa {toast.table_number} está lista para ser servida.</p>
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="rounded-[10px] border border-[var(--border-default)] hover:bg-[var(--surface-bright)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all shrink-0"
            >
              Cerrar
            </button>
          </div>
        ))}
      </div>

      {/* Plate Modifiers Selection Modal */}
      <ModifierModal
        plate={selectedPlateForModal}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmModifiers}
      />



      {/* Fullscreen Magnified Details Modal */}
      <FullscreenOrderModal
        order={selectedOrderForDetails}
        isOpen={isFullscreenModalOpen}
        onClose={() => setIsFullscreenModalOpen(false)}
        role={user?.role || null}
        onAction={handleFullscreenAction}
        onEdit={(order) => {
          startEditingOrder(order);
          setActiveTab("toma");
        }}
      />

      {/* Split/Digital Payment Modal */}
      <SplitPaymentModal
        order={selectedOrderForPayment}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={handleConfirmPayment}
      />
    </div>
  );
}
