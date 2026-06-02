import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SismosCR — Monitoreo Sísmico en Tiempo Real",
  description:
    "Plataforma de monitoreo y alerta temprana de sismos en Costa Rica. Datos en tiempo real, historial interactivo y sistema de notificaciones.",
  keywords: ["sismos", "Costa Rica", "terremotos", "monitoreo", "alertas"],
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SismosCR", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#002B7F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{
          __html: `
            if (localStorage.getItem("sismoscr-dark") === "true") {
              document.documentElement.classList.add("dark");
            }
          `
        }} />
      </head>
      <body className="min-h-dvh flex flex-col antialiased">
        <Providers>{children}</Providers>
        <script dangerouslySetInnerHTML={{
          __html: `
            if ("serviceWorker" in navigator) {
              window.addEventListener("load", function() {
                navigator.serviceWorker.register("/sw.js");
              });
            }
          `
        }} />
      </body>
    </html>
  );
}
