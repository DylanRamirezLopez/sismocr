"use client";
/*
 * Push notification subscription manager.
 * Why: Users opt in once, then receive real-time quake alerts even with the app closed.
 * The SW handles the push event and shows a notification with magnitude + location.
 */
import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const len = raw.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

// VAPID public key — set via NEXT_PUBLIC_VAPID_KEY env var
// Generate: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || "";

export function PushNotificationManager() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true);
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
      );
    }
  }, []);

  const subscribe = async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    });
    await fetch(`${API_BASE}/api/v2/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    setSubscribed(true);
  };

  if (!supported) return null;

  return (
    <button
      onClick={subscribe}
      disabled={subscribed}
      className="fixed bottom-4 right-4 z-[10000] px-4 py-2 rounded-xl text-sm font-semibold shadow-lg transition-colors
        bg-cr-navy text-white hover:bg-cr-navy-light disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {subscribed ? "Alertas activadas" : "Activar alertas push"}
    </button>
  );
}
