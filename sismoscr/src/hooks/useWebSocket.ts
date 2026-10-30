"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { EarthquakeAlert } from "@/types";
import { WS_URL } from "@/lib/api";
const BASE_DELAY = 1000;

export function useWebSocket() {
  const [alert, setAlert] = useState<EarthquakeAlert | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retriesRef = useRef(0);
  const mountedRef = useRef(true);

  const dismissAlert = useCallback(() => setAlert(null), []);

  useEffect(() => {
    mountedRef.current = true;
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (!mountedRef.current) return;

      ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        retriesRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "NEW_QUAKE_ALERT") {
            setAlert({
              id: data.id,
              magnitude: data.magnitude,
              depth: data.depth_km,
              location: data.location_description || "Desconocida",
              latitude: data.latitude,
              longitude: data.longitude,
              datetime: data.occurred_at,
              isActive: true,
            });
          }
        } catch {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (mountedRef.current) {
          retriesRef.current++;
          const delay = Math.min(BASE_DELAY * Math.pow(2, retriesRef.current - 1), 30000);
          // Jitter: tras una caída no deben reconectar todos a la vez
          reconnectTimer = setTimeout(connect, delay * (0.5 + Math.random() * 0.5));
        }
      };

      ws.onerror = () => ws.close();
    }

    connect();

    // Al volver la red no se espera el backoff completo
    const handleOnline = () => {
      if (wsRef.current?.readyState === WebSocket.CLOSED) {
        clearTimeout(reconnectTimer);
        retriesRef.current = 0;
        connect();
      }
    };
    window.addEventListener("online", handleOnline);

    pingRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 30000);

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer);
      clearInterval(pingRef.current!);
      window.removeEventListener("online", handleOnline);
      ws?.close();
    };
  }, []);

  return { alert, isConnected, dismissAlert };
}
