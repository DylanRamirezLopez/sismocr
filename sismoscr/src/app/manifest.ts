import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SismosCR — Monitoreo Sísmico Costa Rica",
    short_name: "SismosCR",
    description: "Monitoreo y alerta temprana de sismos en Costa Rica. Funciona offline.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F9FA",
    theme_color: "#002B7F",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
  };
}
