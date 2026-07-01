import { create } from "zustand";
import api from "../services/api";

export interface User {
  id: number;
  username: string;
  role: "ADMIN" | "MESERO" | "COCINA";
}

export interface Modifier {
  id: number;
  plate_id: number;
  name: string;
  extra_price: number;
  is_available: boolean;
}

export interface OrderDetail {
  id: number;
  plate_id: number;
  plate_name: string;
  plate_price: number;
  quantity: number;
  comment?: string;
  modifiers: Modifier[];
}

export interface Order {
  id: number;
  table_number: number;
  waiter_id: number;
  waiter_username: string;
  status: "PENDIENTE" | "EN_PROCESO" | "LISTO" | "ENTREGADO" | "CANCELADO";
  created_at: string;
  updated_at: string;
  details: OrderDetail[];
  total_price: number;
  arqueo_id?: number | null;
  payment_method?: string | null;
  payment_cash?: number;
  payment_qr?: number;
  payment_card?: number;
}

export interface CartItem {
  plate_id: number;
  name: string;
  base_price: number;
  quantity: number;
  comment: string;
  selected_modifiers: Modifier[];
}

interface AppState {
  // Auth State
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  initializeAuth: () => void;

  // Cart State (Waiter)
  tableNumber: number | "";
  cart: CartItem[];
  setTableNumber: (tableNumber: number | "") => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;

  // Active Orders (Waiter, Kitchen, Admin)
  orders: Order[];
  fetchActiveOrders: () => Promise<void>;
  allOrders: Order[];
  fetchAllOrders: () => Promise<void>;
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  removeOrder: (orderId: number) => void;

  // Connection state
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;

  // Editing state
  editingOrderId: number | null;
  setEditingOrderId: (id: number | null) => void;
  startEditingOrder: (order: Order) => void;
  cancelEditingOrder: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Auth State
  user: null,
  token: null,
  login: (user, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null, token: null, cart: [], tableNumber: "", orders: [], allOrders: [] });
  },
  initializeAuth: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ token, user });
        } catch (e) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
    }
  },

  // Cart State
  tableNumber: "",
  cart: [],
  setTableNumber: (tableNumber) => set({ tableNumber }),
  addToCart: (item) => {
    const currentCart = get().cart;
    // Check if item with same plate and modifiers and comment already exists to merge quantity
    const existingIndex = currentCart.findIndex(
      (c) =>
        c.plate_id === item.plate_id &&
        c.comment === item.comment &&
        JSON.stringify(c.selected_modifiers.map((m) => m.id).sort()) ===
          JSON.stringify(item.selected_modifiers.map((m) => m.id).sort())
    );

    if (existingIndex > -1) {
      const updatedCart = [...currentCart];
      updatedCart[existingIndex].quantity += item.quantity;
      set({ cart: updatedCart });
    } else {
      set({ cart: [...currentCart, item] });
    }
  },
  removeFromCart: (index) => {
    const updatedCart = [...get().cart];
    updatedCart.splice(index, 1);
    set({ cart: updatedCart });
  },
  clearCart: () => set({ cart: [], tableNumber: "" }),

  // Orders State
  orders: [],
  allOrders: [],
  fetchActiveOrders: async () => {
    try {
      const res = await api.get<Order[]>("/comandas");
      set({ orders: res.data });
    } catch (err) {
      console.error("Error al obtener comandas activas:", err);
    }
  },
  fetchAllOrders: async () => {
    try {
      const res = await api.get<Order[]>("/comandas?status_filter=PENDIENTE,EN_PROCESO,LISTO,ENTREGADO,CANCELADO&hours_limit=24");
      set({ allOrders: res.data });
    } catch (err) {
      console.error("Error al obtener todas las comandas:", err);
    }
  },
  addOrder: (order) => {
    const currentOrders = get().orders;
    const currentAllOrders = get().allOrders;
    
    // Update active orders
    const exists = currentOrders.some((o) => o.id === order.id);
    if (!exists && order.status !== "ENTREGADO" && order.status !== "CANCELADO") {
      const updated = [...currentOrders, order].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      set({ orders: updated });
    }
    
    // Update allOrders
    const existsAll = currentAllOrders.some((o) => o.id === order.id);
    if (!existsAll) {
      const updatedAll = [...currentAllOrders, order].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      set({ allOrders: updatedAll });
    }
  },
  updateOrder: (order) => {
    const currentOrders = get().orders;
    const currentAllOrders = get().allOrders;
    
    // Update active orders (only PENDIENTE, EN_PROCESO, LISTO)
    if (order.status === "ENTREGADO" || order.status === "CANCELADO") {
      set({ orders: currentOrders.filter((o) => o.id !== order.id) });
    } else {
      const index = currentOrders.findIndex((o) => o.id === order.id);
      if (index > -1) {
        const updated = [...currentOrders];
        updated[index] = order;
        set({ orders: updated });
      } else {
        const updated = [...currentOrders, order].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        set({ orders: updated });
      }
    }
    
    // Update allOrders (retains completed and cancelled)
    const indexAll = currentAllOrders.findIndex((o) => o.id === order.id);
    if (indexAll > -1) {
      const updatedAll = [...currentAllOrders];
      updatedAll[indexAll] = order;
      set({ allOrders: updatedAll });
    } else {
      const updatedAll = [...currentAllOrders, order].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      set({ allOrders: updatedAll });
    }
  },
  removeOrder: (orderId) => {
    set({
      orders: get().orders.filter((o) => o.id !== orderId),
      allOrders: get().allOrders.filter((o) => o.id !== orderId)
    });
  },

  // Connection state
  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),

  // Editing state
  editingOrderId: null,
  setEditingOrderId: (editingOrderId) => set({ editingOrderId }),
  startEditingOrder: (order) => {
    const cartItems: CartItem[] = order.details.map((detail) => ({
      plate_id: detail.plate_id,
      name: detail.plate_name,
      base_price: detail.plate_price,
      quantity: detail.quantity,
      comment: detail.comment || "",
      selected_modifiers: detail.modifiers.map((mod) => ({
        id: mod.id,
        plate_id: mod.plate_id,
        name: mod.name,
        extra_price: mod.extra_price,
        is_available: mod.is_available
      }))
    }));
    set({
      editingOrderId: order.id,
      tableNumber: order.table_number,
      cart: cartItems
    });
  },
  cancelEditingOrder: () => {
    set({
      editingOrderId: null,
      tableNumber: "",
      cart: []
    });
  },
}));
