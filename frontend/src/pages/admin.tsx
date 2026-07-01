import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useStore, User, Order } from "@/store";
import api, { getErrorMessage } from "@/services/api";
import Navbar from "@/components/Navbar";
import { 
  BarChart3, 
  BookOpen, 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  UserPlus,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  PlusCircle,
  Eye,
  EyeOff,
  AlertCircle,
  Activity,
  Tv,
  Calculator,
  Download,
  Clock,
  FileText,
  X
} from "lucide-react";
import FullscreenOrderModal from "@/components/FullscreenOrderModal";

interface Plate {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  is_visible: boolean;
  modifiers: Modifier[];
}

interface Modifier {
  id: number;
  plate_id: number;
  name: string;
  extra_price: number;
  is_available: boolean;
}

export default function Admin() {
  const router = useRouter();
  const { user, token, orders, fetchActiveOrders, allOrders, fetchAllOrders, startEditingOrder } = useStore();

  const [activeTab, setActiveTab] = useState<"reports" | "menu" | "users" | "monitoreo" | "caja">("reports");

  // Arqueo States
  const [activeArqueo, setActiveArqueo] = useState<any>(null);
  const [arqueoHistory, setArqueoHistory] = useState<any[]>([]);
  const [openingCash, setOpeningCash] = useState<string>("");
  const [closingCash, setClosingCash] = useState<string>("");
  const [closingObservations, setClosingObservations] = useState<string>("");
  const [isOpeningBox, setIsOpeningBox] = useState(false);
  const [isClosingBox, setIsClosingBox] = useState(false);
  const [cajaError, setCajaError] = useState("");
  
  // Magnification Modal state
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  const [monitoreoSubTab, setMonitoreoSubTab] = useState<"activas" | "historial">("activas");

  const fetchActiveArqueo = async () => {
    try {
      const res = await api.get("/arqueo/activo");
      setActiveArqueo(res.data);
    } catch (e) {
      console.error("Error al obtener arqueo activo:", e);
    }
  };

  const fetchArqueoHistory = async () => {
    try {
      const res = await api.get("/arqueo/historial");
      setArqueoHistory(res.data);
    } catch (e) {
      console.error("Error al obtener historial de arqueos:", e);
    }
  };

  const handleOpenCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setCajaError("");
    const initial = parseFloat(openingCash);
    if (isNaN(initial) || initial < 0) {
      setCajaError("El saldo inicial debe ser un número válido mayor o igual a 0");
      return;
    }
    setIsOpeningBox(true);
    try {
      const res = await api.post("/arqueo/apertura", { initial_cash: initial });
      setActiveArqueo(res.data);
      setOpeningCash("");
      fetchArqueoHistory();
    } catch (err: any) {
      console.error(err);
      setCajaError(getErrorMessage(err));
    } finally {
      setIsOpeningBox(false);
    }
  };

  const handleCloseCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setCajaError("");
    const actual = parseFloat(closingCash);
    if (isNaN(actual) || actual < 0) {
      setCajaError("El efectivo físico reportado debe ser un número mayor o igual a 0");
      return;
    }
    setIsClosingBox(true);
    try {
      const res = await api.post("/arqueo/cierre", {
        actual_cash: actual,
        observations: closingObservations || null
      });
      setActiveArqueo(null);
      setClosingCash("");
      setClosingObservations("");
      fetchArqueoHistory();
    } catch (err: any) {
      console.error(err);
      setCajaError(getErrorMessage(err));
    } finally {
      setIsClosingBox(false);
    }
  };

  const handleDownloadPDF = async (arqueoId: number) => {
    try {
      const response = await api.get(`/arqueo/${arqueoId}/pdf`, {
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `arqueo_caja_${arqueoId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error al descargar PDF:", e);
      alert("Error al descargar el reporte PDF");
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm("¿Está seguro que desea eliminar esta comanda permanentemente? Esta acción no se puede deshacer.")) return;
    try {
      await api.delete(`/comandas/${orderId}`);
      fetchActiveOrders();
      fetchAllOrders();
    } catch (e) {
      console.error("Error al eliminar comanda:", e);
      alert("Error al eliminar la comanda. Es posible que pertenezca a un arqueo cerrado.");
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, currentStatus: string) => {
    let nextStatus = "PENDIENTE";
    if (currentStatus === "PENDIENTE") nextStatus = "EN_PROCESO";
    else if (currentStatus === "EN_PROCESO") nextStatus = "LISTO";
    else if (currentStatus === "LISTO") nextStatus = "ENTREGADO";

    try {
      if (nextStatus === "ENTREGADO") {
        // Force register payment as Cash (to associate with arqueo)
        await api.patch(`/comandas/${orderId}/pago`, {
          payment_method: "EFECTIVO",
          payment_cash: 0,
          payment_qr: 0,
          payment_card: 0
        });
      }
      const res = await api.patch(`/comandas/${orderId}?status_update=${nextStatus}`);
      fetchActiveOrders();
    } catch (e) {
      console.error("Error al actualizar estado:", e);
      alert("Error al cambiar estado. Verifique si la caja de arqueo está abierta.");
    }
  };
  
  // Menu states
  const [plates, setPlates] = useState<Plate[]>([]);
  const [editingPlate, setEditingPlate] = useState<Plate | null>(null);
  const [showPlateForm, setShowPlateForm] = useState(false);
  const [plateForm, setPlateForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    is_visible: true
  });

  // Modifier states
  const [selectedPlateForModifiers, setSelectedPlateForModifiers] = useState<Plate | null>(null);
  const [showModifierForm, setShowModifierForm] = useState(false);
  const [modifierForm, setModifierForm] = useState({
    name: "",
    extra_price: "0.0",
    is_available: true
  });

  // User states
  const [usersList, setUsersList] = useState<User[]>([]);
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    role: "MESERO"
  });
  
  const [menuError, setMenuError] = useState("");
  const [userError, setUserError] = useState("");
  const [userSuccess, setUserSuccess] = useState("");

  // Route security
  useEffect(() => {
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "ADMIN") {
      if (user.role === "MESERO") router.replace("/mesero");
      else if (user.role === "COCINA") router.replace("/cocina");
      else router.replace("/login");
    }
  }, [user, token, router]);

  // Load menu, users and orders
  const loadMenu = async () => {
    try {
      // Include hidden plates for admin view
      const res = await api.get("/menu?include_hidden=true");
      setPlates(res.data);
    } catch (e) {
      console.error("Error al cargar menú completo:", e);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get("/auth/users");
      setUsersList(res.data);
    } catch (e) {
      console.error("Error al cargar usuarios:", e);
    }
  };

  useEffect(() => {
    if (token && user?.role === "ADMIN") {
      loadMenu();
      loadUsers();
      fetchActiveOrders();
      fetchAllOrders();
      fetchActiveArqueo();
      fetchArqueoHistory();
    }
  }, [token, user, fetchActiveOrders, fetchAllOrders]);

  // --- REPORT ANALYTICS CALCULATIONS ---
  // To have realistic metrics, we compute stats from current active + completed orders
  const completedOrders = allOrders.filter((o) => o.status === "ENTREGADO");
  const activeOrdersCount = allOrders.filter((o) => o.status !== "ENTREGADO" && o.status !== "CANCELADO").length;
  
  const totalSales = completedOrders.reduce((sum, o) => sum + o.total_price, 0);
  const averageTicket = completedOrders.length > 0 ? totalSales / completedOrders.length : 0;

  // Most ordered items list
  const getMostOrderedItems = () => {
    const counts: { [key: string]: { name: string; count: number; category: string } } = {};
    allOrders.forEach((o) => {
      o.details.forEach((d) => {
        if (!counts[d.plate_id]) {
          counts[d.plate_id] = { name: d.plate_name, count: 0, category: "" };
        }
        counts[d.plate_id].count += d.quantity;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  // --- USER CREATION ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError("");
    setUserSuccess("");

    if (!userForm.username || !userForm.password) {
      setUserError("Por favor, rellene todos los campos");
      return;
    }

    try {
      await api.post("/auth/register", {
        username: userForm.username,
        password: userForm.password,
        role: userForm.role
      });
      
      setUserSuccess("Usuario registrado exitosamente");
      setUserForm({ username: "", password: "", role: "MESERO" });
      loadUsers();
    } catch (err: any) {
      setUserError(getErrorMessage(err));
    }
  };

  // --- MENU CRUD HANDLERS ---
  const handleSavePlate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMenuError("");

    if (!plateForm.name || !plateForm.price || !plateForm.category) {
      setMenuError("Por favor rellene los campos obligatorios");
      return;
    }

    try {
      const payload = {
        name: plateForm.name,
        description: plateForm.description || null,
        price: parseFloat(plateForm.price),
        category: plateForm.category,
        is_visible: plateForm.is_visible
      };

      if (editingPlate) {
        await api.put(`/menu/plates/${editingPlate.id}`, payload);
      } else {
        await api.post("/menu/plates", payload);
      }

      setPlateForm({ name: "", description: "", price: "", category: "", is_visible: true });
      setEditingPlate(null);
      setShowPlateForm(false);
      loadMenu();
    } catch (err: any) {
      setMenuError("Error al guardar el plato");
    }
  };

  const handleEditPlateClick = (plate: Plate) => {
    setEditingPlate(plate);
    setPlateForm({
      name: plate.name,
      description: plate.description || "",
      price: plate.price.toString(),
      category: plate.category,
      is_visible: plate.is_visible
    });
    setShowPlateForm(true);
  };

  const handleDeletePlate = async (plateId: number) => {
    if (!confirm("¿Está seguro que desea eliminar este plato? Se borrarán sus modificadores.")) return;
    try {
      await api.delete(`/menu/plates/${plateId}`);
      loadMenu();
      if (selectedPlateForModifiers?.id === plateId) setSelectedPlateForModifiers(null);
    } catch (e) {
      alert("Error al eliminar el plato");
    }
  };

  const handleTogglePlateVisibility = async (plate: Plate) => {
    try {
      await api.put(`/menu/plates/${plate.id}`, {
        name: plate.name,
        description: plate.description,
        price: plate.price,
        category: plate.category,
        is_visible: !plate.is_visible
      });
      loadMenu();
    } catch (e) {
      console.error("Error al alternar visibilidad:", e);
    }
  };

  // --- MODIFIERS HANDLERS ---
  const handleSaveModifier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlateForModifiers || !modifierForm.name) return;

    try {
      const payload = {
        name: modifierForm.name,
        extra_price: parseFloat(modifierForm.extra_price) || 0.0,
        is_available: modifierForm.is_available
      };

      await api.post(`/menu/plates/${selectedPlateForModifiers.id}/modifiers`, payload);
      
      setModifierForm({ name: "", extra_price: "0.0", is_available: true });
      setShowModifierForm(false);
      
      // Reload menu and re-select updated plate to refresh list
      const res = await api.get("/menu?include_hidden=true");
      setPlates(res.data);
      const updatedPlate = res.data.find((p: Plate) => p.id === selectedPlateForModifiers.id);
      setSelectedPlateForModifiers(updatedPlate || null);
    } catch (e) {
      alert("Error al guardar el modificador");
    }
  };

  const handleDeleteModifier = async (modId: number) => {
    if (!confirm("¿Eliminar este modificador?")) return;
    try {
      await api.delete(`/menu/modifiers/${modId}`);
      
      // Refresh menu
      const res = await api.get("/menu?include_hidden=true");
      setPlates(res.data);
      if (selectedPlateForModifiers) {
        const updatedPlate = res.data.find((p: Plate) => p.id === selectedPlateForModifiers.id);
        setSelectedPlateForModifiers(updatedPlate || null);
      }
    } catch (e) {
      alert("Error al eliminar modificador");
    }
  };

  const handleToggleModifierAvailability = async (mod: Modifier) => {
    try {
      await api.put(`/menu/modifiers/${mod.id}`, {
        name: mod.name,
        extra_price: mod.extra_price,
        is_available: !mod.is_available
      });
      
      // Refresh
      const res = await api.get("/menu?include_hidden=true");
      setPlates(res.data);
      if (selectedPlateForModifiers) {
        const updatedPlate = res.data.find((p: Plate) => p.id === selectedPlateForModifiers.id);
        setSelectedPlateForModifiers(updatedPlate || null);
      }
    } catch (e) {
      console.error("Error al alternar disponibilidad:", e);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-dim)] text-[var(--text-primary)] flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Navigation bar for Admin section */}
        <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-[var(--border-default)] bg-[var(--surface-container)] p-3 lg:p-6 flex flex-row lg:flex-col gap-2 shrink-0 overflow-x-auto lg:overflow-x-visible scrollbar-none">
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex lg:w-full items-center gap-2 lg:gap-3 rounded-xl px-3.5 py-2.5 lg:px-4 lg:py-3 text-xs lg:text-sm font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === "reports"
                ? "bg-[var(--primary-muted)] text-emerald-400 border-b-2 lg:border-b-0 lg:border-l-2 border-emerald-400 shadow-lg shadow-emerald-500/10"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-bright)]"
            }`}
          >
            <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5" /> Reportes y Métricas
          </button>

          <button
            onClick={() => setActiveTab("monitoreo")}
            className={`flex lg:w-full items-center gap-2 lg:gap-3 rounded-xl px-3.5 py-2.5 lg:px-4 lg:py-3 text-xs lg:text-sm font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === "monitoreo"
                ? "bg-[var(--primary-muted)] text-emerald-400 border-b-2 lg:border-b-0 lg:border-l-2 border-emerald-400 shadow-lg shadow-emerald-500/10"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-bright)]"
            }`}
          >
            <Tv className="h-4 w-4 lg:h-5 lg:w-5" /> Monitoreo de Sala
          </button>

          <button
            onClick={() => setActiveTab("caja")}
            className={`flex lg:w-full items-center gap-2 lg:gap-3 rounded-xl px-3.5 py-2.5 lg:px-4 lg:py-3 text-xs lg:text-sm font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === "caja"
                ? "bg-[var(--primary-muted)] text-emerald-400 border-b-2 lg:border-b-0 lg:border-l-2 border-emerald-400 shadow-lg shadow-emerald-500/10"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-bright)]"
            }`}
          >
            <Calculator className="h-4 w-4 lg:h-5 lg:w-5" /> Caja y Arqueo
          </button>
          
          <button
            onClick={() => setActiveTab("menu")}
            className={`flex lg:w-full items-center gap-2 lg:gap-3 rounded-xl px-3.5 py-2.5 lg:px-4 lg:py-3 text-xs lg:text-sm font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === "menu"
                ? "bg-[var(--primary-muted)] text-emerald-400 border-b-2 lg:border-b-0 lg:border-l-2 border-emerald-400 shadow-lg shadow-emerald-500/10"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-bright)]"
            }`}
          >
            <BookOpen className="h-4 w-4 lg:h-5 lg:w-5" /> Gestión de Menú
          </button>
          
          <button
            onClick={() => setActiveTab("users")}
            className={`flex lg:w-full items-center gap-2 lg:gap-3 rounded-xl px-3.5 py-2.5 lg:px-4 lg:py-3 text-xs lg:text-sm font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === "users"
                ? "bg-[var(--primary-muted)] text-emerald-400 border-b-2 lg:border-b-0 lg:border-l-2 border-emerald-400 shadow-lg shadow-emerald-500/10"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-bright)]"
            }`}
          >
            <Users className="h-4 w-4 lg:h-5 lg:w-5" /> Gestión de Personal
          </button>
        </aside>

        {/* Right side: Dynamic view panels */}
        <section className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-4 lg:space-y-6">
          
          {/* TAB 1: REPORTS & ANALYTICS */}
          {activeTab === "reports" && (
            <div className="space-y-4 lg:space-y-6">
              <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Resumen Operativo (Mesas del Día)</h2>
              
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-[20px] border border-[var(--border-default)] bg-[var(--surface)] p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:shadow-lg hover:shadow-emerald-500/5 transition-all">
                  <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em] block">Venta Total</span>
                    <span className="text-lg font-black text-[var(--text-primary)]">Bs {totalSales.toFixed(2)}</span>
                  </div>
                </div>

                <div className="rounded-[20px] border border-[var(--border-default)] bg-[var(--surface)] p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:shadow-lg hover:shadow-emerald-500/5 transition-all">
                  <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em] block">Entregados</span>
                    <span className="text-lg font-black text-[var(--text-primary)]">{completedOrders.length} mesas</span>
                  </div>
                </div>

                <div className="rounded-[20px] border border-[var(--border-default)] bg-[var(--surface)] p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:shadow-lg hover:shadow-emerald-500/5 transition-all">
                  <div className="rounded-xl bg-yellow-500/10 p-3 text-yellow-400">
                    <Activity className="h-6 w-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em] block">En Preparación / Cola</span>
                    <span className="text-lg font-black text-[var(--text-primary)]">{activeOrdersCount} comanda(s)</span>
                  </div>
                </div>

                <div className="rounded-[20px] border border-[var(--border-default)] bg-[var(--surface)] p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:shadow-lg hover:shadow-emerald-500/5 transition-all">
                  <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em] block">Ticket Promedio</span>
                    <span className="text-lg font-black text-[var(--text-primary)]">Bs {averageTicket.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Leaderboard and order activity split */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                
                {/* Top dishes chart block */}
                <div className="rounded-[20px] border border-[var(--border-default)] bg-[var(--surface)] p-4 sm:p-6 space-y-4">
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">Platos más Pedidos</h3>
                  
                  {getMostOrderedItems().length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] py-6 text-center">No hay registros de platos ordenados hoy.</p>
                  ) : (
                    <div className="space-y-3">
                      {getMostOrderedItems().map((item, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-[var(--text-secondary)]">{index + 1}. {item.name}</span>
                            <span className="text-emerald-400">{item.count} un.</span>
                          </div>
                          {/* Simple simulated progress bar */}
                          <div className="h-2 rounded bg-[var(--surface-highest)] overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600" 
                              style={{ width: `${Math.min(100, (item.count / 20) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* General operational message */}
                <div className="rounded-[20px] border border-[var(--border-default)] bg-[var(--surface)] p-4 sm:p-6 flex flex-col justify-center text-center space-y-3">
                  <span className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                    <Activity className="h-5 w-5" />
                  </span>
                  <h4 className="text-sm font-extrabold text-[var(--text-primary)]">Monitoreo del Restaurante Activo</h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
                    La base de datos SQLite está respondiendo en tiempo real utilizando el modo de escritura concurrente WAL. Meseros y cocina están sincronizados por WebSocket.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: REAL-TIME ROOM MONITORING */}
          {activeTab === "monitoreo" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Monitoreo de Sala en Tiempo Real</h2>
                
                {/* Sub-tabs Selector */}
                <div className="flex rounded-xl bg-[var(--surface-dim)] p-1 border border-[var(--border-default)] w-full sm:w-fit">
                  <button
                    onClick={() => setMonitoreoSubTab("activas")}
                    className={`flex-1 sm:flex-none text-center rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                      monitoreoSubTab === "activas"
                        ? "bg-[var(--surface-bright)] text-emerald-400 shadow-md"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    Comandas Activas ({orders.length})
                  </button>
                  <button
                    onClick={() => setMonitoreoSubTab("historial")}
                    className={`flex-1 sm:flex-none text-center rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                      monitoreoSubTab === "historial"
                        ? "bg-[var(--surface-bright)] text-emerald-400 shadow-md"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    Historial (24h) ({allOrders.filter(o => o.status === "ENTREGADO" || o.status === "CANCELADO").length})
                  </button>
                </div>
              </div>
              
              {(() => {
                const displayedOrders = monitoreoSubTab === "activas"
                  ? orders
                  : allOrders.filter(o => o.status === "ENTREGADO" || o.status === "CANCELADO");

                if (displayedOrders.length === 0) {
                  return (
                    <div className="text-center py-16 rounded-[20px] border border-dashed border-[var(--border-default)] bg-[var(--surface)]">
                      <Activity className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
                      <p className="text-sm font-semibold text-[var(--text-secondary)]">
                        {monitoreoSubTab === "activas" 
                          ? "No hay comandas activas en la sala." 
                          : "No hay comandas registradas en el historial de las últimas 24h."}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {displayedOrders.map((order) => {
                      const isPending = order.status === "PENDIENTE";
                      const isProcessing = order.status === "EN_PROCESO";
                      const isReady = order.status === "LISTO";
                      const isCompleted = order.status === "ENTREGADO";
                      const isCanceled = order.status === "CANCELADO";

                      return (
                        <div
                          key={order.id}
                          onClick={() => {
                            setSelectedOrderForDetails(order);
                            setIsFullscreenModalOpen(true);
                          }}
                          className="cursor-pointer rounded-[20px] border border-[var(--border-default)] bg-[var(--surface)] p-4 sm:p-5 flex flex-col justify-between hover:border-[var(--border-hover)] transition-colors"
                        >
                          <div>
                            {/* Card Header */}
                            <div className="flex justify-between items-start border-b border-[rgba(30,41,59,0.5)] pb-3 mb-4">
                              <div>
                                <h4 className="font-extrabold text-[var(--text-primary)] text-base">Mesa {order.table_number}</h4>
                                <span className="text-xs text-[var(--text-muted)]">#{order.id} • Mesero: {order.waiter_username}</span>
                              </div>
                              <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                                isReady 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                  : isProcessing 
                                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                  : isCompleted
                                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                  : isCanceled
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                  : "bg-[var(--surface-highest)] text-[var(--text-secondary)]"
                              }`}>
                                {order.status}
                              </span>
                            </div>

                            {/* Items List */}
                            <ul className="space-y-2 mb-4">
                              {order.details.map((detail) => (
                                <li key={detail.id} className="text-xs text-[var(--text-secondary)]">
                                  <strong>{detail.quantity}x</strong> {detail.plate_name}
                                  {detail.comment && <span className="text-red-400 block text-[10px] italic">"{detail.comment}"</span>}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Footer Actions */}
                          <div className="border-t border-[rgba(30,41,59,0.5)] pt-4 mt-auto">
                            <div className="flex justify-between items-center text-xs mb-3">
                              <span className="text-[var(--text-muted)] font-bold">Total:</span>
                              <span className="font-extrabold text-[var(--text-primary)]">Bs {order.total_price.toFixed(2)}</span>
                            </div>
                            
                            {/* Payment details for completed orders */}
                            {isCompleted && order.payment_method && (
                              <div className="text-[10px] text-emerald-400 font-bold mb-3 uppercase tracking-wider">
                                Pagado con: {order.payment_method}
                              </div>
                            )}

                            <div className="flex gap-2">
                              {/* State advance button - only for active orders */}
                              {!isCompleted && !isCanceled && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateOrderStatus(order.id, order.status);
                                  }}
                                  className="flex-1 rounded-xl bg-[var(--surface-highest)] hover:bg-[var(--surface-bright)] text-[var(--text-secondary)] font-bold py-2 text-xs transition-colors flex items-center justify-center gap-1.5"
                                >
                                  Avance Estado
                                </button>
                              )}

                              {/* Edit button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingOrder(order);
                                  router.push("/mesero");
                                }}
                                className="flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-bright)] text-[var(--text-secondary)] font-bold py-2 text-xs transition-colors flex items-center justify-center gap-1.5"
                              >
                                Editar
                              </button>
                              
                              {/* Delete button (exclusivo Admin) */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteOrder(order.id);
                                }}
                                className="rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold px-3 py-2 text-xs transition-colors flex items-center justify-center"
                                title="Eliminar Comanda Permanentemente"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 5: CASH AUDIT & ARQUEO */}
          {activeTab === "caja" && (
            <div className="space-y-6">
              <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Módulo de Arqueo y Control de Caja</h2>
              
              {cajaError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-400">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                  <p>{cajaError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                
                {/* Active Box Status (Form / Dashboard) */}
                <div className="rounded-[20px] border border-[var(--border-default)] bg-[var(--surface)] p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {!activeArqueo ? (
                    /* APERTURA DE CAJA FORM */
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-[var(--border-default)] pb-3">
                        <DollarSign className="h-5 w-5 text-emerald-400" />
                        <h3 className="font-extrabold text-[var(--text-primary)] text-base">Apertura de Caja</h3>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Inicie una nueva sesión de arqueo ingresando el monto base en efectivo disponible físicamente en la caja registradora.
                      </p>
                      
                      <form onSubmit={handleOpenCaja} className="space-y-4">
                        <div>
                          <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] mb-1.5">Monto Inicial en Efectivo (Bs)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={openingCash}
                            onChange={(e) => setOpeningCash(e.target.value)}
                            placeholder="Ej: 150.00"
                            required
                            className="w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] transition-all"
                          />
                        </div>
                        
                        <button
                          type="submit"
                          disabled={isOpeningBox}
                          className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-600 py-3 text-sm font-bold text-[var(--primary-on)] hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                        >
                          {isOpeningBox && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--primary-on)] border-t-transparent"></span>}
                          Abrir Caja / Iniciar Turno
                        </button>
                      </form>
                    </div>
                  ) : (
                    /* ACTIVE ARQUEO INFO & CIERRE FORM */
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <h3 className="font-extrabold text-[var(--text-primary)] text-base">Caja Activa (Abierta)</h3>
                        </div>
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/25">
                          ID #{activeArqueo.id}
                        </span>
                      </div>
                      
                      {/* Active Info List */}
                      <div className="space-y-3 bg-[var(--surface-dim)] border border-[var(--border-default)] p-4 rounded-xl text-xs">
                        <div className="flex justify-between"><span className="text-[var(--text-muted)]">Cajero:</span><span className="text-[var(--text-primary)] font-bold">{activeArqueo.username}</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-muted)]">Apertura:</span><span className="text-[var(--text-secondary)]">{new Date(activeArqueo.opened_at).toLocaleString()}</span></div>
                        <div className="flex justify-between border-t border-[var(--border-default)] pt-2"><span className="text-[var(--text-muted)]">Monto Inicial (Base):</span><span className="text-[var(--text-secondary)] font-bold">Bs {activeArqueo.initial_cash.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-muted)]">Ventas en Efectivo:</span><span className="text-[var(--text-secondary)] font-bold">Bs {activeArqueo.estimated_cash.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-muted)]">Ventas Tarjeta/QR:</span><span className="text-[var(--text-secondary)] font-bold">Bs {activeArqueo.card_sales.toFixed(2)}</span></div>
                        <div className="flex justify-between border-t border-[var(--border-default)] pt-2 text-sm font-bold text-emerald-400">
                          <span>Efectivo Estimado:</span>
                          <span>Bs {(activeArqueo.initial_cash + activeArqueo.estimated_cash).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* CIERRE DE CAJA FORM */}
                      <form onSubmit={handleCloseCaja} className="space-y-4 pt-2 border-t border-[var(--border-default)]">
                        <h4 className="text-xs font-bold uppercase text-[var(--text-primary)]">Cierre de Caja</h4>
                        
                        <div>
                          <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase mb-1.5">Monto de Efectivo Físico (Contado)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={closingCash}
                            onChange={(e) => setClosingCash(e.target.value)}
                            placeholder="Ej: 230.50"
                            required
                            className="w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] p-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase mb-1.5">Observaciones</label>
                          <textarea
                            value={closingObservations}
                            onChange={(e) => setClosingObservations(e.target.value)}
                            placeholder="Describa diferencias, descuadres o incidencias..."
                            rows={2}
                            className="w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] p-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] resize-none transition-all"
                          />
                        </div>
                        
                        <button
                          type="submit"
                          disabled={isClosingBox}
                          className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-600 py-3 text-xs font-black text-[var(--primary-on)] hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25"
                        >
                          {isClosingBox && <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--primary-on)] border-t-transparent"></span>}
                          Realizar Cierre de Caja
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* Arqueos History (2/3 width) */}
                <div className="xl:col-span-2 rounded-[20px] border border-[var(--border-default)] bg-[var(--surface)] overflow-hidden">
                  <div className="p-3.5 sm:p-[14px_20px] border-b border-[var(--border-default)] bg-[var(--surface-container)]">
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">Historial de Arqueos (Cierres Pasados)</h3>
                  </div>
                  
                  {arqueoHistory.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] text-center py-16">No hay registros de arqueos cerrados en la base de datos.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[rgba(30,41,59,0.5)] bg-[var(--surface-container)] text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-[var(--text-muted)]">
                            <th className="p-3 sm:p-4 md:p-[14px_20px]">ID</th>
                            <th className="p-3 sm:p-4 md:p-[14px_20px]">Cajero</th>
                            <th className="p-3 sm:p-4 md:p-[14px_20px]">Apertura / Cierre</th>
                            <th className="p-3 sm:p-4 md:p-[14px_20px]">Monto Inicial</th>
                            <th className="p-3 sm:p-4 md:p-[14px_20px]">Calculado</th>
                            <th className="p-3 sm:p-4 md:p-[14px_20px]">Físico</th>
                            <th className="p-3 sm:p-4 md:p-[14px_20px]">Diferencia</th>
                            <th className="p-3 sm:p-4 md:p-[14px_20px] text-right">PDF</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(30,41,59,0.5)] text-xs">
                          {arqueoHistory.map((a) => (
                            <tr key={a.id} className="hover:bg-[var(--surface-bright)] transition-colors">
                              <td className="p-3 sm:p-4 md:p-[14px_20px] font-bold text-[var(--text-secondary)]">#{a.id}</td>
                              <td className="p-3 sm:p-4 md:p-[14px_20px] text-[var(--text-primary)] font-semibold">{a.username}</td>
                              <td className="p-3 sm:p-4 md:p-[14px_20px] text-[var(--text-secondary)]">
                                <span className="block">{new Date(a.opened_at).toLocaleDateString()}</span>
                                <span className="text-[10px] text-[var(--text-muted)]">{new Date(a.closed_at).toLocaleTimeString()}</span>
                              </td>
                              <td className="p-3 sm:p-4 md:p-[14px_20px] text-[var(--text-secondary)]">Bs {a.initial_cash.toFixed(2)}</td>
                              <td className="p-3 sm:p-4 md:p-[14px_20px] text-[var(--text-secondary)]">
                                <span className="block">Efectivo: Bs {a.estimated_cash.toFixed(2)}</span>
                                <span className="text-[10px] text-[var(--text-muted)]">Elect.: Bs {a.card_sales.toFixed(2)}</span>
                              </td>
                              <td className="p-3 sm:p-4 md:p-[14px_20px] text-[var(--text-primary)] font-bold">Bs {a.actual_cash.toFixed(2)}</td>
                              <td className={`p-3 sm:p-4 md:p-[14px_20px] font-black ${a.difference < 0 ? "text-red-400" : "text-emerald-400"}`}>
                                Bs {a.difference.toFixed(2)}
                              </td>
                              <td className="p-3 sm:p-4 md:p-[14px_20px] text-right">
                                <button
                                  onClick={() => handleDownloadPDF(a.id)}
                                  className="rounded-lg p-2 bg-[var(--surface-highest)] hover:bg-[var(--surface-bright)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all inline-flex"
                                  title="Descargar Reporte PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: MENU CRUD MANAGEMENT */}
          {activeTab === "menu" && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Gestión de Menú (Platos y Opciones)</h2>
                <button
                  onClick={() => {
                    setEditingPlate(null);
                    setPlateForm({ name: "", description: "", price: "", category: "Entradas", is_visible: true });
                    setMenuError("");
                    setShowPlateForm(true);
                  }}
                  className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-600 px-4 py-2.5 text-xs font-bold text-[var(--primary-on)] flex items-center gap-1.5 transition-all hover:brightness-110 shadow-lg shadow-emerald-500/25"
                >
                  <Plus className="h-4 w-4" /> Agregar Plato
                </button>
              </div>

              {/* Side-by-Side: Plates List (Left) and selected Plate Modifiers (Right) */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                
                {/* Plates table block (2/3 width) */}
                <div className="xl:col-span-2 rounded-[20px] border border-[var(--border-default)] bg-[var(--surface)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[rgba(30,41,59,0.5)] bg-[var(--surface-container)] text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-[var(--text-muted)]">
                          <th className="p-3 sm:p-4 md:p-[14px_20px]">Nombre</th>
                          <th className="p-3 sm:p-4 md:p-[14px_20px]">Categoría</th>
                          <th className="p-3 sm:p-4 md:p-[14px_20px]">Precio</th>
                          <th className="p-3 sm:p-4 md:p-[14px_20px] text-center">Visibilidad</th>
                          <th className="p-3 sm:p-4 md:p-[14px_20px] text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgba(30,41,59,0.5)] text-sm">
                        {plates.map((plate) => (
                          <tr 
                            key={plate.id} 
                            onClick={() => {
                              setSelectedPlateForModifiers(plate);
                              if (window.innerWidth < 1280) {
                                setTimeout(() => {
                                  document.getElementById("modifiers-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }, 100);
                              }
                            }}
                            className={`cursor-pointer transition-colors ${
                              selectedPlateForModifiers?.id === plate.id 
                                ? "bg-[var(--primary-muted)] hover:bg-emerald-500/10" 
                                : "hover:bg-[var(--surface-bright)]"
                            }`}
                          >
                            <td className="p-3 sm:p-4 md:p-[14px_20px] font-bold text-[var(--text-primary)]">
                              {plate.name}
                            </td>
                            <td className="p-3 sm:p-4 md:p-[14px_20px] text-[var(--text-secondary)]">{plate.category}</td>
                            <td className="p-3 sm:p-4 md:p-[14px_20px] font-black text-emerald-400">Bs {plate.price.toFixed(2)}</td>
                            <td className="p-3 sm:p-4 md:p-[14px_20px]" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleTogglePlateVisibility(plate)}
                                className={`mx-auto flex h-6 w-11 items-center rounded-full transition-all ${
                                  plate.is_visible ? "bg-emerald-500 justify-end" : "bg-[var(--surface-highest)] justify-start"
                                } p-0.5`}
                              >
                                <span className={`h-5 w-5 rounded-full bg-[var(--surface-dim)] transition-all`}></span>
                              </button>
                            </td>
                            <td className="p-3 sm:p-4 md:p-[14px_20px] text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleEditPlateClick(plate)}
                                className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-highest)] hover:text-[var(--text-primary)] transition-all inline-flex"
                                title="Editar"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePlate(plate.id)}
                                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-highest)] hover:text-red-400 transition-all inline-flex"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Modifiers of selected Plate (1/3 width) */}
                <div id="modifiers-section" className="rounded-[20px] border border-[var(--border-default)] bg-[var(--surface)] p-4 sm:p-6 space-y-4">
                  {selectedPlateForModifiers ? (
                    <>
                      <div className="flex justify-between items-center border-b border-[var(--border-default)] pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">Modificadores de:</h3>
                          <span className="text-xs text-emerald-400 font-extrabold">{selectedPlateForModifiers.name}</span>
                        </div>
                        <button
                          onClick={() => {
                            setModifierForm({ name: "", extra_price: "0.0", is_available: true });
                            setShowModifierForm(true);
                          }}
                          className="rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-[var(--primary-on)] p-2 transition-all"
                          title="Añadir Modificador"
                        >
                          <PlusCircle className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Modifier creation form */}
                      {showModifierForm && (
                        <form onSubmit={handleSaveModifier} className="bg-[var(--surface-dim)] p-4 rounded-xl border border-[var(--border-default)] space-y-4 animate-fade-in">
                          <h4 className="text-xs font-bold uppercase text-[var(--text-primary)]">Nuevo Modificador</h4>
                          
                          <div>
                            <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase mb-1">Nombre</label>
                            <input
                              type="text"
                              value={modifierForm.name}
                              onChange={(e) => setModifierForm({...modifierForm, name: e.target.value})}
                              placeholder="Ej: Extra Queso"
                              className="w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] p-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase mb-1">Costo Extra (Bs)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={modifierForm.extra_price}
                              onChange={(e) => setModifierForm({...modifierForm, extra_price: e.target.value})}
                              className="w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] p-2 text-xs text-[var(--text-primary)] outline-none focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] transition-all"
                            />
                          </div>

                          <div className="flex gap-2 justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => setShowModifierForm(false)}
                              className="rounded-lg px-3 py-1.5 text-[10px] font-bold border border-[var(--border-default)] hover:bg-[var(--surface-bright)] text-[var(--text-secondary)]"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="rounded-lg px-3 py-1.5 text-[10px] font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 text-[var(--primary-on)] hover:brightness-110"
                            >
                              Guardar
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Modifiers List */}
                      {selectedPlateForModifiers.modifiers && selectedPlateForModifiers.modifiers.length > 0 ? (
                        <div className="space-y-2">
                          {selectedPlateForModifiers.modifiers.map((mod) => (
                            <div key={mod.id} className="flex justify-between items-center rounded-xl bg-[var(--surface-dim)] p-3 border border-[var(--border-default)]">
                              <div>
                                <span className={`text-xs font-bold block ${mod.is_available ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] line-through"}`}>
                                  {mod.name}
                                </span>
                                <span className="text-[10px] text-emerald-400 font-bold">
                                  + Bs {mod.extra_price.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Toggle modifier availability */}
                                <button
                                  onClick={() => handleToggleModifierAvailability(mod)}
                                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                                  title={mod.is_available ? "Marcar no disponible" : "Marcar disponible"}
                                >
                                  {mod.is_available ? (
                                    <Eye className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <EyeOff className="h-4 w-4 text-[var(--text-muted)]" />
                                  )}
                                </button>
                                
                                <button
                                  onClick={() => handleDeleteModifier(mod.id)}
                                  className="text-[var(--text-muted)] hover:text-red-400 transition-all"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--text-muted)] text-center py-6">Este plato no tiene modificadores.</p>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-[var(--text-muted)]">
                      <BookOpen className="h-6 w-6 mx-auto mb-2 text-[var(--text-muted)]" />
                      <p className="text-xs">Seleccione un plato de la lista para ver y gestionar sus modificadores.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: USER CREATION & MANAGEMENT */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Gestión de Personal</h2>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                
                {/* Create user form (1/3 width) */}
                <div className="rounded-[20px] border border-[var(--border-default)] bg-[var(--surface)] p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-2 border-b border-[var(--border-default)] pb-3 mb-4">
                    <UserPlus className="h-5 w-5 text-emerald-400" />
                    <h3 className="font-extrabold text-[var(--text-primary)] text-base">Registrar Nuevo Colaborador</h3>
                  </div>

                  {userError && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <p>{userError}</p>
                    </div>
                  )}

                  {userSuccess && (
                    <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs text-emerald-400">
                      <p>{userSuccess}</p>
                    </div>
                  )}

                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] mb-1.5">Username</label>
                      <input
                        type="text"
                        value={userForm.username}
                        onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                        placeholder="Ej: mesero2"
                        className="w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] mb-1.5">Contraseña</label>
                      <input
                        type="password"
                        value={userForm.password}
                        onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                        placeholder="••••••••"
                        className="w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] mb-1.5">Rol de Trabajo</label>
                      <select
                        value={userForm.role}
                        onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                        className="w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] transition-all"
                      >
                        <option value="MESERO">Mesero</option>
                        <option value="COCINA">Cocina / Preparación</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-600 py-3 text-sm font-bold text-[var(--primary-on)] hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-emerald-500/25"
                    >
                      Registrar Personal
                    </button>
                  </form>
                </div>

                {/* List of registered users (2/3 width) */}
                <div className="xl:col-span-2 rounded-[20px] border border-[var(--border-default)] bg-[var(--surface)] overflow-hidden">
                  <div className="p-3.5 sm:p-[14px_20px] border-b border-[var(--border-default)] bg-[var(--surface-container)]">
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">Colaboradores Activos</h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[rgba(30,41,59,0.5)] bg-[var(--surface-container)] text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-[var(--text-muted)]">
                          <th className="p-3 sm:p-4 md:p-[14px_20px]">ID</th>
                          <th className="p-3 sm:p-4 md:p-[14px_20px]">Nombre de Usuario</th>
                          <th className="p-3 sm:p-4 md:p-[14px_20px]">Rol Asignado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgba(30,41,59,0.5)] text-sm">
                        {usersList.map((usr) => (
                          <tr key={usr.id} className="hover:bg-[var(--surface-bright)] transition-colors">
                            <td className="p-3 sm:p-4 md:p-[14px_20px] font-bold text-[var(--text-muted)]">#{usr.id}</td>
                            <td className="p-3 sm:p-4 md:p-[14px_20px] text-[var(--text-primary)] font-bold">{usr.username}</td>
                            <td className="p-3 sm:p-4 md:p-[14px_20px]">
                              <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold border uppercase tracking-wider ${
                                usr.role === "ADMIN" 
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : usr.role === "COCINA"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : "bg-[var(--surface-highest)] text-[var(--text-secondary)] border-[var(--border-default)]"
                              }`}>
                                {usr.role}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

        </section>
      </div>

      {/* MODAL DIALOG: PLATE CREATE / EDIT FORM */}
      {showPlateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-dim)]/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[20px] border border-[var(--border-default)] bg-[var(--surface)] shadow-2xl">
            <div className="border-b border-[var(--border-default)] px-6 py-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {editingPlate ? "Editar Plato" : "Crear Nuevo Plato"}
              </h3>
            </div>
            
            <form onSubmit={handleSavePlate}>
              <div className="p-6 space-y-4">
                {menuError && (
                  <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 p-2.5 rounded-lg">{menuError}</p>
                )}

                <div>
                  <label className="block text-[0.6875rem] font-semibold uppercase text-[var(--text-muted)] mb-1.5">Nombre del Plato *</label>
                  <input
                    type="text"
                    value={plateForm.name}
                    onChange={(e) => setPlateForm({...plateForm, name: e.target.value})}
                    placeholder="Ej: Lomo Saltado"
                    className="w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[0.6875rem] font-semibold uppercase text-[var(--text-muted)] mb-1.5">Descripción</label>
                  <textarea
                    value={plateForm.description}
                    onChange={(e) => setPlateForm({...plateForm, description: e.target.value})}
                    placeholder="Detalles sobre ingredientes, guarniciones..."
                    rows={3}
                    className="w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] resize-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.6875rem] font-semibold uppercase text-[var(--text-muted)] mb-1.5">Precio (Bs) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={plateForm.price}
                      onChange={(e) => setPlateForm({...plateForm, price: e.target.value})}
                      placeholder="19.90"
                      className="w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.6875rem] font-semibold uppercase text-[var(--text-muted)] mb-1.5">Categoría *</label>
                    <select
                      value={plateForm.category}
                      onChange={(e) => setPlateForm({...plateForm, category: e.target.value})}
                      className="w-full rounded-[14px] border-[1.5px] border-[var(--border-default)] bg-[var(--surface-dim)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-400 focus:shadow-[0_0_0_3px_var(--primary-muted)] transition-all"
                    >
                      <option value="Entradas">Entradas</option>
                      <option value="Fondos">Fondos</option>
                      <option value="Bebidas">Bebidas</option>
                      <option value="Postres">Postres</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="is_visible"
                    checked={plateForm.is_visible}
                    onChange={(e) => setPlateForm({...plateForm, is_visible: e.target.checked})}
                    className="h-4 w-4 rounded border-[var(--border-default)] bg-[var(--surface-dim)] text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor="is_visible" className="text-sm font-semibold text-[var(--text-secondary)] select-none">
                    Visible en el Menú (Mesero)
                  </label>
                </div>
              </div>

              <div className="border-t border-[var(--border-default)] px-6 py-4 bg-[var(--surface-dim)]/20 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPlateForm(false)}
                  className="rounded-xl border border-[var(--border-default)] hover:bg-[var(--surface-bright)] px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-600 px-5 py-2.5 text-xs font-bold text-[var(--primary-on)] hover:brightness-110 shadow-lg shadow-emerald-500/25"
                >
                  Guardar Plato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Magnified View Modal */}
      <FullscreenOrderModal
        order={selectedOrderForDetails}
        isOpen={isFullscreenModalOpen}
        onClose={() => setIsFullscreenModalOpen(false)}
        role={user?.role || null}
        onAction={handleUpdateOrderStatus}
        onEdit={(order) => {
          startEditingOrder(order);
          router.push("/mesero");
        }}
      />
    </div>
  );
}
