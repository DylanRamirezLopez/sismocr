"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Earthquake } from "@/types";
import { getMagnitudeColor, getMagnitudeSize, getStatusFromDate, formatDateTime } from "@/lib/utils";
import { EarthquakeTooltip } from "./EarthquakeTooltip";
import { RealTimeAlert } from "./RealTimeAlert";
import { useWebSocket } from "@/hooks/useWebSocket";
import { API_URL } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useSearchParams } from "next/navigation";

const CR_CENTER: [number, number] = [9.7489, -83.7534];
const CR_BOUNDS: [[number, number], [number, number]] = [
  [8.0, -86.0],
  [11.5, -82.0],
];

function MapController({
  onReady,
}: {
  onReady: (map: L.Map) => void;
}) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

function EarthquakesLayer({
  earthquakes,
  onEarthquakeClick,
  highlightedId,
}: {
  earthquakes: Earthquake[];
  onEarthquakeClick: (eq: Earthquake) => void;
  highlightedId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    const mcg = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 12,
    });

    const highlightLayers: L.Layer[] = [];

    earthquakes.forEach((eq) => {
      const isHighlighted = eq.id === highlightedId;
      const color = getMagnitudeColor(eq.magnitude);
      const size = getMagnitudeSize(eq.magnitude);

      const icon = L.divIcon({
        html: `
          <div style="
            width: ${size}px; height: ${size}px;
            background: ${color};
            border: ${isHighlighted ? '3px solid #002B7F' : '2px solid white'};
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 ${size * 0.3}px ${color}33;
            cursor: pointer;
          "></div>
        `,
        className: "",
        iconSize: L.point(size, size),
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([eq.latitude, eq.longitude], { icon });
      marker.on("click", () => onEarthquakeClick(eq));
      mcg.addLayer(marker);

      if (isHighlighted) {
        // Highlight ring: pulsating circle showing radius / location
        const ring = L.circle([eq.latitude, eq.longitude], {
          radius: eq.magnitude * 1000,
          color: "#002B7F",
          fillColor: "#002B7F",
          fillOpacity: 0.08,
          weight: 2,
          opacity: 0.4,
        }).addTo(map);
        highlightLayers.push(ring);
      }
    });

    map.addLayer(mcg);

    return () => {
      map.removeLayer(mcg);
      highlightLayers.forEach((l) => map.removeLayer(l));
    };
  }, [earthquakes, onEarthquakeClick, map, highlightedId]);

  return null;
}

export function MapViewer() {
  const _t = useT();
  const searchParams = useSearchParams();
  const [selectedEarthquake, setSelectedEarthquake] = useState<Earthquake | null>(null);
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const { alert, dismissAlert } = useWebSocket();
  const mapRef = useRef<L.Map | null>(null);

  const fetchEarthquakes = useCallback(() => {
    setError(null);
    fetch(`${API_URL}/earthquakes/history?per_page=200`)
      .then((r) => (r.ok ? r.json() : Promise.reject(_t("error.api").replace("{code}", String(r.status)))))
      .then((res) => {
        const mapped: Earthquake[] = (res.data || []).map((eq: any) => ({
          id: eq.id,
          magnitude: eq.magnitude,
          depth: eq.depth_km,
          location: eq.location_description || "Desconocida",
          latitude: eq.latitude,
          longitude: eq.longitude,
          datetime: eq.occurred_at,
          province: eq.province || "No especificada",
          status: getStatusFromDate(eq.occurred_at),
        }));
        setEarthquakes(mapped);
        setLoading(false);
      })
      .catch((err) => {
        setError(typeof err === "string" ? err : _t("error.connection"));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchEarthquakes();
  }, [fetchEarthquakes]);

  // Handle ?eq=ID from history click: fetch detail, fly, show highlight
  useEffect(() => {
    const eqId = searchParams.get("eq");
    if (!eqId) return;

    setHighlightedId(eqId);

    // Check if already in local list
    const local = earthquakes.find((e) => e.id === eqId);
    if (local) {
      setSelectedEarthquake(local);
      if (mapRef.current) {
        mapRef.current.flyTo([local.latitude, local.longitude], 10, { duration: 1.5 });
      }
      return;
    }

    // Fetch detail from API
    fetch(`${API_URL}/earthquakes/${eqId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const eq: Earthquake = {
          id: data.id,
          magnitude: data.magnitude,
          depth: data.depth_km,
          location: data.location_description || "Desconocida",
          latitude: data.latitude,
          longitude: data.longitude,
          datetime: data.occurred_at,
          province: data.province || "No especificada",
          status: getStatusFromDate(data.occurred_at),
        };
        setSelectedEarthquake(eq);
        if (mapRef.current) {
          mapRef.current.flyTo([eq.latitude, eq.longitude], 10, { duration: 1.5 });
        }
      })
      .catch(() => {});
  }, [searchParams, earthquakes]);

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
  }, []);

  const handleEarthquakeClick = useCallback((eq: Earthquake) => {
    setSelectedEarthquake(eq);
  }, []);

  useEffect(() => {
    if (alert) {
      if (mapRef.current) {
        mapRef.current.flyTo([alert.latitude, alert.longitude], 8, {
          duration: 1.5,
        });
      }
      if (alert.magnitude >= 5) {
        document.body.classList.add("shake");
        setTimeout(() => document.body.classList.remove("shake"), 500);
      }
    }
  }, [alert]);

  const stats = {
    total: earthquakes.length,
    critical: earthquakes.filter((e) => e.status === "critical").length,
    maxMag: earthquakes.length > 0 ? Math.max(...earthquakes.map((e) => e.magnitude)) : 0,
  };

  return (
    <div className="relative w-full h-dvh">
      {alert && (
        <div
          className="fixed inset-0 pointer-events-none z-[9998] border-8"
          style={{
            animation: "border-pulse 1.5s ease-in-out infinite",
            borderColor: "rgba(206, 17, 38, 0.6)",
          }}
        />
      )}

      <div className="absolute top-16 left-4 z-[1000] flex flex-col gap-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/30 min-w-[160px]"
        >
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            {_t("map.stats.title")}
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">{_t("map.stats.total")}</span>
              <span className="font-bold">{stats.total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">{_t("map.stats.active")}</span>
              <span className="font-bold text-cr-red">{stats.critical}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">{_t("map.stats.maxMag")}</span>
              <span className="font-bold">{stats.maxMag.toFixed(1)}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-cr-navy/30 border-t-cr-navy rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-muted text-sm">{_t("map.loading")}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-20 right-4 z-[9999] bg-cr-red/10 backdrop-blur-xl rounded-2xl p-4 border border-cr-red/30 max-w-sm">
          <p className="text-cr-red text-sm font-semibold mb-2">{_t("map.error.title")}</p>
          <p className="text-text-muted text-xs mb-3">{error}</p>
          <button
            onClick={fetchEarthquakes}
            className="w-full py-1.5 rounded-xl bg-cr-red text-white text-sm font-semibold hover:bg-cr-red-light transition-colors"
          >
            {_t("map.error.retry")}
          </button>
        </div>
      )}

      <RealTimeAlert alert={alert} onDismiss={dismissAlert} />

      <MapContainer
        center={CR_CENTER}
        zoom={8}
        minZoom={7}
        maxBounds={CR_BOUNDS}
        maxBoundsViscosity={1}
        className="w-full h-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapController onReady={handleMapReady} />
        <EarthquakesLayer
          earthquakes={earthquakes}
          onEarthquakeClick={handleEarthquakeClick}
          highlightedId={highlightedId}
        />
      </MapContainer>

      <AnimatePresence>
        {selectedEarthquake && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/20 backdrop-blur-sm"
            onClick={() => setSelectedEarthquake(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <EarthquakeTooltip
                earthquake={selectedEarthquake}
                onClose={() => setSelectedEarthquake(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
