"use client";

import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { CitizenReport } from "@/components/CitizenReport";
import { PreparednessChecklist } from "@/components/PreparednessChecklist";
import { EduCards } from "@/components/EduCards";
import { HelpModal } from "@/components/HelpModal";

const MapViewer = dynamic(
  () => import("@/components/MapViewer").then((m) => m.MapViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-dvh flex items-center justify-center bg-cr-navy/5 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-cr-navy/30 border-t-cr-navy rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted text-sm">Cargando mapa...</p>
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  return (
    <>
      <Navbar />
      <MapViewer />
      <CitizenReport />
      <PreparednessChecklist />
      <EduCards />
      <HelpModal />
    </>
  );
}
