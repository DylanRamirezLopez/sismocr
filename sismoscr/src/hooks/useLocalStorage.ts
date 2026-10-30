"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("localstoragechange", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("localstoragechange", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function parse<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useLocalStorage<T>(key: string, initial: T) {
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem(key), () => null);
  const value = useMemo(() => parse(raw, initial), [raw, initial]);

  const setValue = useCallback(
    (update: T | ((prev: T) => T)) => {
      const prev = parse(localStorage.getItem(key), initial);
      const next = typeof update === "function" ? (update as (prev: T) => T)(prev) : update;
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event("localstoragechange"));
    },
    [key, initial]
  );

  const reset = useCallback(() => {
    localStorage.removeItem(key);
    window.dispatchEvent(new Event("localstoragechange"));
  }, [key]);

  return [value, setValue, reset] as const;
}
