import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { useStore } from "@/store";
import { connectWebSocket, disconnectWebSocket } from "@/services/websocket";

export default function App({ Component, pageProps }: AppProps) {
  const initializeAuth = useStore((state) => state.initializeAuth);
  const token = useStore((state) => state.token);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Connect/disconnect WebSockets automatically when token state changes
  useEffect(() => {
    if (token) {
      connectWebSocket(token);
    } else {
      disconnectWebSocket();
    }
    return () => {
      disconnectWebSocket();
    };
  }, [token]);

  return <Component {...pageProps} />;
}
