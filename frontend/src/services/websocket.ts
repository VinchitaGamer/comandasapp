import { useStore } from "../store";

// Helper to determine the WebSocket URL dynamically based on environment and browser context
const getWebSocketUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl;
  }

  // If running in the browser, construct a dynamic URL relative to the current location
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const hostname = window.location.hostname;
    
    // In local development, Next.js runs on 3000 (or similar) while FastAPI runs on 8000
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:8000/ws`;
    }
    
    // In production (VPS), Nginx handles reverse proxying on the same host/port under /ws
    return `${protocol}//${window.location.host}/ws`;
  }
  
  // Server-side fallback (if any)
  return "ws://localhost:8000/ws";
};

let socket: WebSocket | null = null;
let reconnectTimeout: any = null;
let pingInterval: any = null;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30000;
const PING_INTERVAL_MS = 25000; // 25 seconds heartbeat to prevent proxy timeouts
let isExpectedClose = false;

// Custom function to trigger a premium double-chime using browser Web Audio API
export const playAlertSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      // Use triangle or sine wave for a soft, premium chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = audioCtx.currentTime;
    // Premium chime: D5 (587.33 Hz) followed shortly by A5 (880.00 Hz)
    playTone(587.33, now, 0.4);
    playTone(880.00, now + 0.15, 0.6);
  } catch (err) {
    console.warn("No se pudo reproducir la alerta sonora:", err);
  }
};

export const connectWebSocket = (token: string) => {
  // Clear any existing connections and timers before initializing
  if (socket) {
    socket.close();
  }
  clearInterval(pingInterval);

  isExpectedClose = false;
  const wsUrl = getWebSocketUrl();
  const wsUrlWithToken = `${wsUrl}?token=${encodeURIComponent(token)}`;
  
  console.log(`Intentando conectar a WebSocket: ${wsUrl}`);
  socket = new WebSocket(wsUrlWithToken);

  socket.onopen = () => {
    console.log("WebSocket conectado exitosamente");
    reconnectDelay = 1000; // Reset reconnect delay on success
    
    // Update store state
    useStore.getState().setWsConnected(true);
    
    // Sync active orders via HTTP after reconnect to avoid missing any status transitions
    useStore.getState().fetchActiveOrders();
    
    // If the user is admin, also sync the full list of orders
    const user = useStore.getState().user;
    if (user && user.role === "ADMIN") {
      useStore.getState().fetchAllOrders();
    }

    // Set up heartbeat ping to keep connection alive
    clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        // Send heartbeat ping to the backend
        socket.send("ping");
      }
    }, PING_INTERVAL_MS);
  };

  socket.onmessage = (event) => {
    // If it's a heartbeat pong response, we can safely ignore it or log it silently
    if (event.data === "pong") {
      return;
    }

    try {
      const data = JSON.parse(event.data);
      const { type, order } = data;
      const user = useStore.getState().user;

      console.log("Evento WS recibido:", type, order);

      switch (type) {
        case "NEW_ORDER":
          useStore.getState().addOrder(order);
          break;
        case "ORDER_READY":
          useStore.getState().updateOrder(order);
          // Only play alert chime and show toast if current user is a Waiter (MESERO)
          if (user && user.role === "MESERO") {
            playAlertSound();
            // Dispatch custom event to notify components (to show temporary UI Toast alerts)
            window.dispatchEvent(
              new CustomEvent("order-ready-notification", { detail: order })
            );
          }
          break;
        case "ORDER_UPDATED":
          useStore.getState().updateOrder(order);
          break;
        case "ORDER_DELETED":
          useStore.getState().removeOrder(data.order_id);
          break;
        default:
          break;
      }
    } catch (e) {
      console.error("Error al procesar mensaje de WebSocket:", e);
    }
  };

  socket.onclose = (event) => {
    console.log("WebSocket desconectado:", event.reason || "Sin razón especificada");
    useStore.getState().setWsConnected(false);
    clearInterval(pingInterval);

    if (!isExpectedClose) {
      // Exponential backoff reconnect
      clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(() => {
        console.log(`Intentando reconectar WS en ${reconnectDelay}ms...`);
        connectWebSocket(token);
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
      }, reconnectDelay);
    }
  };

  socket.onerror = (error) => {
    console.error("Error en conexión WebSocket:", error);
    useStore.getState().setWsConnected(false);
  };
};

export const disconnectWebSocket = () => {
  isExpectedClose = true;
  clearTimeout(reconnectTimeout);
  clearInterval(pingInterval);
  useStore.getState().setWsConnected(false);
  if (socket) {
    socket.close();
    socket = null;
  }
};
