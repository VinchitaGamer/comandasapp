import { useStore } from "../store";

// Helper to determine the SSE (Server-Sent Events) URL dynamically based on environment and browser context
const getSseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  let baseUrl = "";
  
  if (envUrl && envUrl.trim() !== "") {
    baseUrl = envUrl;
  } else if (typeof window !== "undefined") {
    // If running in the browser, construct relative to current origin
    const hostname = window.location.hostname;
    
    // In local development, Next.js runs on 3000 (or similar) while FastAPI runs on 8000
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      baseUrl = `${window.location.protocol}//${hostname}:8000/api`;
    } else {
      // In production (VPS), Nginx proxies /api on the same host/port
      baseUrl = `${window.location.protocol}//${window.location.host}/api`;
    }
  } else {
    baseUrl = "http://localhost:8000/api";
  }

  return `${baseUrl}/comandas/events`;
};

let eventSource: EventSource | null = null;
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
  // Clear any existing connections and timers before initializing
  if (eventSource) {
    eventSource.close();
  }

  isExpectedClose = false;
  const sseUrl = getSseUrl();
  const sseUrlWithToken = `${sseUrl}?token=${encodeURIComponent(token)}`;
  
  console.log(`Intentando conectar a SSE en: ${sseUrl}`);
  eventSource = new EventSource(sseUrlWithToken);

  eventSource.onopen = () => {
    console.log("Conexión SSE establecida con éxito");
    reconnectDelay = 1000; // Reset reconnect delay on success
    
    // Update store state to indicate live status
    useStore.getState().setWsConnected(true);
    
    // Sync active orders via HTTP after reconnect to avoid missing any status transitions
    useStore.getState().fetchActiveOrders();
    
    // If the user is admin, also sync the full list of orders
    const user = useStore.getState().user;
    if (user && user.role === "ADMIN") {
      useStore.getState().fetchAllOrders();
    }
  };

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const { type, order } = data;
      const user = useStore.getState().user;

      console.log("Evento SSE recibido:", type, order);

      switch (type) {
        case "CONNECTED":
          console.log("SSE handshake exitoso.");
          break;
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
      console.error("Error al procesar mensaje de SSE:", e);
    }
  };

  eventSource.onerror = (error) => {
    console.error("Error en conexión SSE:", error);
    useStore.getState().setWsConnected(false);
    
    // EventSource handles reconnection natively under the hood, 
    // but in case it enters a closed state, we can force a manual reconnection timeout.
    if (eventSource && eventSource.readyState === EventSource.CLOSED && !isExpectedClose) {
      eventSource.close();
      clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(() => {
        console.log(`Intentando reconectar SSE en ${reconnectDelay}ms...`);
        connectWebSocket(token);
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
      }, reconnectDelay);
    }
  };
};

export const disconnectWebSocket = () => {
  isExpectedClose = true;
  clearTimeout(reconnectTimeout);
  useStore.getState().setWsConnected(false);
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
};
