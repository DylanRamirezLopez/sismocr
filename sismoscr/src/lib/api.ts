"use client";

import { ApiEarthquake, Earthquake } from "@/types";
import { getStatusFromDate } from "@/lib/utils";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const API_URL = `${API_BASE}/api/v1`;
export const WS_URL = API_BASE.replace(/^http/, "ws") + "/api/v1/ws";

// Mayor que el timeout de sw.js, para que el SW pueda responder con su copia guardada
const FETCH_TIMEOUT_MS = 20000;

export function apiFetch(path: string): Promise<Response> {
  return fetch(`${API_URL}${path}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

// sw.js marca así las respuestas servidas desde caché sin conexión
export function isOfflineCopy(res: Response): boolean {
  return res.headers.has("x-sw-cached");
}

export function toEarthquake(eq: ApiEarthquake): Earthquake {
  return {
    id: eq.id,
    magnitude: eq.magnitude,
    depth: eq.depth_km,
    location: eq.location_description || "Desconocida",
    latitude: eq.latitude,
    longitude: eq.longitude,
    datetime: eq.occurred_at,
    province: eq.province || "No especificada",
    status: getStatusFromDate(eq.occurred_at),
  };
}
