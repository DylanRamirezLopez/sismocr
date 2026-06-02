"use client";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const API_URL = `${API_BASE}/api/v1`;
export const WS_URL = API_BASE.replace(/^http/, "ws") + "/api/v1/ws";
