"use client";
/*
 * leaflet.heat integration — weighted by magnitude with time decay.
 * Why time decay: Recent quakes should visually dominate older ones.
 * Formula: weight = magnitude * Math.max(0, 1 - hoursAgo / (24 * 7))
 *   → A M5 from 6h ago = 5 * 0.96 = 4.8
 *   → A M5 from 7 days ago = 5 * 0 = 0 (faded out)
 */
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { Earthquake } from "@/types";

interface Props {
  earthquakes: Earthquake[];
  enabled: boolean;
}

export function HeatmapLayer({ earthquakes, enabled }: Props) {
  const map = useMap();
  const layerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (!enabled || earthquakes.length === 0) return;

    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

    // Build weighted points [lat, lng, intensity]
    const points: Array<[number, number, number]> = [];
    for (const eq of earthquakes) {
      const age = now - new Date(eq.datetime).getTime();
      const decay = Math.max(0, 1 - age / maxAge);
      if (decay <= 0) continue;
      const intensity = eq.magnitude * decay;
      points.push([eq.latitude, eq.longitude, intensity]);
    }

    if (points.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layerRef.current = (L as any).heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      max: 8, // normalize so M8 = max intensity
      gradient: {
        0.0: "blue",
        0.3: "cyan",
        0.5: "lime",
        0.7: "yellow",
        0.9: "orange",
        1.0: "red",
      },
    }).addTo(map);

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [earthquakes, enabled, map]);

  return null;
}
