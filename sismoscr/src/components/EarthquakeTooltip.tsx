"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Earthquake } from "@/types";
import { formatDateTime, getMagnitudeColor } from "@/lib/utils";
import { useT } from "@/lib/i18n";

interface EarthquakeTooltipProps {
  earthquake: Earthquake;
  onClose: () => void;
}

export function EarthquakeTooltip({ earthquake, onClose }: EarthquakeTooltipProps) {
  const _t = useT();
  const magColor = getMagnitudeColor(earthquake.magnitude);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
      className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-5 min-w-[300px] max-w-[360px]"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: magColor }}
          />
          <span className="text-sm font-semibold text-text-muted uppercase tracking-wider">
            {_t("tooltip.detected")}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-text-muted"
        >
          ✕
        </button>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-bold" style={{ color: magColor }}>
          {earthquake.magnitude.toFixed(1)}
        </span>
        <span className="text-sm text-text-muted font-medium">ML</span>
      </div>

      <div className="space-y-2 text-sm bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
        <div className="flex justify-between">
          <span className="text-text-muted">{_t("tooltip.depth")}</span>
          <span className="font-medium">{earthquake.depth.toFixed(1)} km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">{_t("tooltip.location")}</span>
          <span className="font-medium text-right max-w-[180px] text-xs">{earthquake.location}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">{_t("tooltip.province")}</span>
          <span className="font-medium">{earthquake.province}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">{_t("tooltip.datetime")}</span>
          <span className="font-medium text-xs text-right">
            {formatDateTime(earthquake.datetime)}
          </span>
        </div>
        <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
          <span className="text-text-muted">Latitud</span>
          <span className="font-mono text-xs">{earthquake.latitude.toFixed(4)}°N</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Longitud</span>
          <span className="font-mono text-xs">{earthquake.longitude.toFixed(4)}°O</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">ID</span>
          <span className="font-mono text-xs text-ellipsis overflow-hidden max-w-[140px]">{earthquake.id}</span>
        </div>
      </div>

      <button
        onClick={onClose}
        className="mt-3 w-full py-2 rounded-xl bg-cr-navy text-white font-semibold text-sm hover:bg-cr-navy-light transition-colors"
      >
        {_t("alert.dismiss")}
      </button>
    </motion.div>
  );
}
