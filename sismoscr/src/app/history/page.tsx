"use client";

import { Navbar } from "@/components/Navbar";
import { EarthquakeHistoryTable } from "@/components/EarthquakeHistoryTable";
import { HelpModal } from "@/components/HelpModal";

export default function HistoryPage() {
  return (
    <>
      <Navbar />
      <EarthquakeHistoryTable />
      <HelpModal />
    </>
  );
}
