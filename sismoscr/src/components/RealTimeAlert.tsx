"use client";

import { motion, AnimatePresence } from "framer-motion";
import { EarthquakeAlert } from "@/types";
import { formatDateTime, getMagnitudeColor } from "@/lib/utils";
import { useT } from "@/lib/i18n";

interface RealTimeAlertProps {
  alert: EarthquakeAlert | null;
  onDismiss: () => void;
}

export function RealTimeAlert({ alert, onDismiss }: RealTimeAlertProps) {
  const _t = useT();
  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          key={alert.id}
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.35, duration: 0.6 }}
          className="fixed top-20 right-4 z-[10001] max-w-sm w-full pointer-events-auto"
        >
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="relative bg-white/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-cr-red/30 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cr-red/5 to-transparent" />

            <div className="relative p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-3 h-3 rounded-full bg-cr-red"
                  />
                  <div>
                    <h3 className="font-bold text-cr-red text-sm uppercase tracking-wider">
                      ⚠ Alerta Sísmica
                    </h3>
                    <p className="text-xs text-text-muted">{_t("alert.detected")}</p>
                  </div>
                </div>
                <button
                  onClick={onDismiss}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-cr-red/10 transition-colors text-text-muted hover:text-cr-red"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-baseline gap-2 mb-3">
                <motion.span
                  key={alert.magnitude}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-5xl font-bold"
                  style={{ color: getMagnitudeColor(alert.magnitude) }}
                >
                  {alert.magnitude.toFixed(1)}
                </motion.span>
                <span className="text-sm text-text-muted font-medium">ML</span>
              </div>

              <div className="space-y-1.5 text-sm bg-cr-red/5 rounded-xl p-3">
                <div className="flex justify-between">
                  <span className="text-text-muted">{_t("alert.location")}</span>
                  <span className="font-semibold">{alert.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">{_t("alert.depth")}</span>
                  <span className="font-semibold">{alert.depth.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">{_t("alert.coords")}</span>
                  <span className="font-mono text-xs">
                    {alert.latitude.toFixed(3)}, {alert.longitude.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">{_t("alert.time")}</span>
                  <span className="font-semibold text-xs">
                    {formatDateTime(alert.datetime)}
                  </span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onDismiss}
                className="mt-3 w-full py-2.5 rounded-xl text-white font-semibold text-sm"
                style={{ backgroundColor: "#CE1126" }}
              >
                {_t("alert.dismiss")}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
