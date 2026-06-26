import { useStore } from "../store";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

let socket: WebSocket | null = null;
let reconnectTimeout: any = null;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30000;
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
  if (socket) {
    socket.close();
  }

  isExpectedClose = false;
  const wsUrlWithToken = `${WS_URL}?token=${encodeURIComponent(token)}`;
  socket = new WebSocket(wsUrlWithToken);

  socket.onopen = () => {
    console.log("WebSocket conectado exitosamente");
    reconnectDelay = 1000; // Reset reconnect delay on success
    
    // Sync active orders via HTTP after reconnect to avoid missing any status transitions
    useStore.getState().fetchActiveOrders();
  };

  socket.onmessage = (event) => {
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

  socket.onclose = () => {
    console.log("WebSocket desconectado");
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
  };
};

export const disconnectWebSocket = () => {
  isExpectedClose = true;
  clearTimeout(reconnectTimeout);
  if (socket) {
    socket.close();
    socket = null;
  }
};
