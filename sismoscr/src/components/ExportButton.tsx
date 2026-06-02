"use client";

import { Earthquake } from "@/types";
import { formatDateTime } from "@/lib/utils";

export function ExportButton({ earthquakes }: { earthquakes: Earthquake[] }) {
  const toCSV = () => {
    const headers = ["magnitud","profundidad_km","latitud","longitud","ubicacion","provincia","fecha"];
    const rows = earthquakes.map((eq) =>
      [
        eq.magnitude,
        eq.depth,
        eq.latitude,
        eq.longitude,
        `"${eq.location}"`,
        `"${eq.province}"`,
        eq.datetime,
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    download(csv, "sismoscr-export.csv", "text/csv");
  };

  const toGeoJSON = () => {
    const geojson = {
      type: "FeatureCollection",
      features: earthquakes.map((eq) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [eq.longitude, eq.latitude] },
        properties: {
          magnitude: eq.magnitude,
          depth_km: eq.depth,
          location: eq.location,
          province: eq.province,
          datetime: eq.datetime,
          status: eq.status,
        },
      })),
    };
    download(
      JSON.stringify(geojson, null, 2),
      "sismoscr-export.geojson",
      "application/geo+json"
    );
  };

  const download = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (earthquakes.length === 0) return null;

  return (
    <div className="flex gap-2">
      <button
        onClick={toCSV}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cr-navy/10 text-cr-navy hover:bg-cr-navy/20 transition-colors"
      >
        CSV
      </button>
      <button
        onClick={toGeoJSON}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600/10 text-green-700 hover:bg-green-600/20 transition-colors"
      >
        GeoJSON
      </button>
    </div>
  );
}
