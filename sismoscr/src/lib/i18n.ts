"use client";

import { useState, useEffect } from "react";

export type Lang = "es" | "en";

let ssrLang: Lang = "es";

const dict: Record<Lang, Record<string, string>> = {
  es: {
    "app.title": "SismosCR",
    "app.subtitle": "Monitoreo Sísmico",
    "nav.map": "Mapa en Vivo",
    "nav.history": "Historial",
    "nav.report": "Reportar",
    "nav.checklist": "Preparación",
    "nav.learn": "Aprender",
    "stats.total": "Total",
    "stats.active": "Activos",
    "stats.maxMag": "Max Mag",
    "alert.title": "Alerta Sísmica",
    "alert.subtitle": "Nuevo sismo detectado",
    "alert.dismiss": "Entendido",
    "tooltip.detected": "Sismo Detectado",
    "tooltip.depth": "Profundidad",
    "tooltip.location": "Ubicación",
    "tooltip.province": "Provincia",
    "tooltip.datetime": "Fecha/Hora",
    "tooltip.details": "Ver más detalles",
    "history.title": "Historial Sísmico",
    "history.events": "eventos registrados",
    "history.filter.from": "Desde",
    "history.filter.to": "Hasta",
    "history.filter.minMag": "Mag. Mín",
    "history.filter.maxMag": "Mag. Máx",
    "history.filter.province": "Provincia",
    "history.filter.all": "Todas",
    "history.table.date": "Fecha/Hora",
    "history.table.magnitude": "Magnitud",
    "history.table.depth": "Profundidad",
    "history.table.location": "Ubicación",
    "history.table.province": "Provincia",
    "history.table.status": "Estado",
    "history.status.critical": "Activo",
    "history.status.recent": "Reciente",
    "history.status.past": "Pasado",
    "history.pagination": "Página",
    "history.pagination.of": "de",
    "history.pagination.prev": "Anterior",
    "history.pagination.next": "Siguiente",
    "history.export.csv": "CSV",
    "history.export.geojson": "GeoJSON",
    "report.title": "Reportar Intensidad",
    "report.subtitle": "¿Cómo sentiste el último sismo?",
    "report.location": "Tu ubicación",
    "report.intensity": "Intensidad percibida",
    "report.comment": "Comentario (opcional)",
    "report.submit": "Enviar reporte",
    "report.thanks": "¡Gracias! Tu reporte ayuda a todos.",
    "report.view": "Ver reportes ciudadanos",
    "intensity.1": "No se sintió",
    "intensity.2": "Débil",
    "intensity.3": "Leve",
    "intensity.4": "Moderado",
    "intensity.5": "Fuerte",
    "intensity.6": "Muy Fuerte",
    "checklist.title": "Mochila de Emergencia",
    "checklist.score": "Puntaje de Preparación",
    "checklist.items": "artículos",
    "checklist.reset": "Reiniciar progreso",
    "learn.title": "¿Qué hacer en un sismo?",
    "learn.before": "Antes",
    "learn.during": "Durante",
    "learn.after": "Después",
    "dark": "Oscuro",
    "light": "Claro",
    "help.title": "Atajos de Teclado",
    "help.m": "Ir al mapa",
    "help.h": "Ir al historial",
    "help.escape": "Cerrar modal",
    "help.question": "Mostrar esta ayuda",

    "map.stats.title": "Estadísticas",
    "map.stats.total": "Total",
    "map.stats.active": "Activos",
    "map.stats.maxMag": "Max Mag",
    "map.loading": "Cargando sismos...",
    "map.error.title": "Error al cargar datos",
    "map.error.retry": "Reintentar",
    "map.error.connection": "Error de conexión",

    "history.loading": "Cargando historial...",
    "history.error.title": "Error al cargar historial",
    "history.chart.monthly": "Sismos por Mes",
    "history.chart.avgMag": "Magnitud Promedio por Mes",
    "history.pagination.page": "Página {current} de {total}",

    "alert.detected": "Nuevo sismo detectado",
    "alert.location": "Ubicación",
    "alert.depth": "Profundidad",
    "alert.coords": "Coordenadas",
    "alert.time": "Hora",

    "dark.title.light": "Modo claro",
    "dark.title.dark": "Modo oscuro",

    "status.critical": "⚠ Activo",
    "status.recent": "● Reciente",
    "status.past": "○ Pasado",

    "error.connection": "Error de conexión",
    "error.api": "Error {code}",
  },
  en: {
    "app.title": "SismosCR",
    "app.subtitle": "Seismic Monitoring",
    "nav.map": "Live Map",
    "nav.history": "History",
    "nav.report": "Report",
    "nav.checklist": "Preparedness",
    "nav.learn": "Learn",
    "stats.total": "Total",
    "stats.active": "Active",
    "stats.maxMag": "Max Mag",
    "alert.title": "Earthquake Alert",
    "alert.subtitle": "New earthquake detected",
    "alert.dismiss": "Got it",
    "tooltip.detected": "Quake Detected",
    "tooltip.depth": "Depth",
    "tooltip.location": "Location",
    "tooltip.province": "Province",
    "tooltip.datetime": "Date/Time",
    "tooltip.details": "View details",
    "history.title": "Earthquake History",
    "history.events": "events recorded",
    "history.filter.from": "From",
    "history.filter.to": "To",
    "history.filter.minMag": "Min Mag",
    "history.filter.maxMag": "Max Mag",
    "history.filter.province": "Province",
    "history.filter.all": "All",
    "history.table.date": "Date/Time",
    "history.table.magnitude": "Magnitude",
    "history.table.depth": "Depth",
    "history.table.location": "Location",
    "history.table.province": "Province",
    "history.table.status": "Status",
    "history.status.critical": "Active",
    "history.status.recent": "Recent",
    "history.status.past": "Past",
    "history.pagination": "Page",
    "history.pagination.of": "of",
    "history.pagination.prev": "Previous",
    "history.pagination.next": "Next",
    "history.export.csv": "CSV",
    "history.export.geojson": "GeoJSON",
    "report.title": "Report Intensity",
    "report.subtitle": "How did you feel the last quake?",
    "report.location": "Your location",
    "report.intensity": "Perceived intensity",
    "report.comment": "Comment (optional)",
    "report.submit": "Submit report",
    "report.thanks": "Thanks! Your report helps everyone.",
    "report.view": "View citizen reports",
    "intensity.1": "Not felt",
    "intensity.2": "Weak",
    "intensity.3": "Light",
    "intensity.4": "Moderate",
    "intensity.5": "Strong",
    "intensity.6": "Very Strong",
    "checklist.title": "Emergency Kit",
    "checklist.score": "Preparedness Score",
    "checklist.items": "items",
    "checklist.reset": "Reset progress",
    "learn.title": "What to do in an earthquake?",
    "learn.before": "Before",
    "learn.during": "During",
    "learn.after": "After",
    "dark": "Dark",
    "light": "Light",
    "help.title": "Keyboard Shortcuts",
    "help.m": "Go to map",
    "help.h": "Go to history",
    "help.escape": "Close modal",
    "help.question": "Show this help",

    "map.stats.title": "Statistics",
    "map.stats.total": "Total",
    "map.stats.active": "Active",
    "map.stats.maxMag": "Max Mag",
    "map.loading": "Loading earthquakes...",
    "map.error.title": "Error loading data",
    "map.error.retry": "Retry",
    "map.error.connection": "Connection error",

    "history.loading": "Loading history...",
    "history.error.title": "Error loading history",
    "history.chart.monthly": "Earthquakes per Month",
    "history.chart.avgMag": "Average Magnitude per Month",
    "history.pagination.page": "Page {current} of {total}",

    "alert.detected": "New earthquake detected",
    "alert.location": "Location",
    "alert.depth": "Depth",
    "alert.coords": "Coordinates",
    "alert.time": "Time",

    "dark.title.light": "Light mode",
    "dark.title.dark": "Dark mode",

    "status.critical": "⚠ Active",
    "status.recent": "● Recent",
    "status.past": "○ Past",

    "error.connection": "Connection error",
    "error.api": "Error {code}",
  },
};

function getStoredLang(): Lang {
  if (typeof window === "undefined") return "es";
  const stored = localStorage.getItem("sismoscr-lang");
  if (stored === "es" || stored === "en") return stored;
  return "es";
}

export function getLang(): Lang {
  if (typeof window !== "undefined") return getStoredLang();
  return ssrLang;
}

export function setLang(lang: Lang) {
  ssrLang = lang;
  if (typeof window !== "undefined") {
    localStorage.setItem("sismoscr-lang", lang);
    document.documentElement.lang = lang;
    window.dispatchEvent(new Event("langchange"));
  }
}

export function t(key: string): string {
  return dict[getLang()][key] ?? key;
}

export function useLang(): Lang {
  const [lang, setLangState] = useState<Lang>(ssrLang);
  useEffect(() => {
    const stored = getStoredLang();
    if (stored !== lang) setLangState(stored);
    const handler = () => {
      const current = getStoredLang();
      ssrLang = current;
      setLangState(current);
    };
    window.addEventListener("langchange", handler);
    return () => window.removeEventListener("langchange", handler);
  }, [lang]);
  return lang;
}

export function useT() {
  const lang = useLang();
  return (key: string) => dict[lang][key] ?? key;
}
