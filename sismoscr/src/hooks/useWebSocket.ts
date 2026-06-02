"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { EarthquakeAlert } from "@/types";
import { WS_URL } from "@/lib/api";
const MAX_RETRIES = 10;
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
      if (retriesRef.current >= MAX_RETRIES) return;

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
          if (retriesRef.current < MAX_RETRIES) {
            const delay = Math.min(BASE_DELAY * Math.pow(2, retriesRef.current - 1), 30000);
            reconnectTimer = setTimeout(connect, delay);
          }
        }
      };

      ws.onerror = () => ws.close();
    }

    connect();

    pingRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 30000);

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer);
      clearInterval(pingRef.current!);
      ws?.close();
    };
  }, []);

  return { alert, isConnected, dismissAlert };
}
