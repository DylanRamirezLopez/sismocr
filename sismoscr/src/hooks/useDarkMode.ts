"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("darkchange", onChange);
  return () => window.removeEventListener("darkchange", onChange);
}

const readDark = () => localStorage.getItem("sismoscr-dark") === "true";

export function useDarkMode() {
  const dark = useSyncExternalStore(subscribe, readDark, () => false);

  const toggle = useCallback(() => {
    const next = !readDark();
    localStorage.setItem("sismoscr-dark", String(next));
    document.documentElement.classList.toggle("dark", next);
    window.dispatchEvent(new Event("darkchange"));
  }, []);

  return { dark, toggle };
}
