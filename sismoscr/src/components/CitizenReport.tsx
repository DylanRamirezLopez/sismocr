"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/lib/i18n";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface CitizenReport {
  id: string;
  latitude: number;
  longitude: number;
  intensity: number;
  comment: string;
  timestamp: string;
}

const intensityLevels = [1, 2, 3, 4, 5, 6];

export function CitizenReport() {
  const t = useT();
  const [reports, setReports] = useLocalStorage<CitizenReport[]>("sismoscr-reports", []);
  const [open, setOpen] = useState(false);
  const [intensity, setIntensity] = useState(3);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const report: CitizenReport = {
      id: Date.now().toString(),
      latitude: 9.7489 + (Math.random() - 0.5) * 1,
      longitude: -83.7534 + (Math.random() - 0.5) * 1.5,
      intensity,
      comment,
      timestamp: new Date().toISOString(),
    };
    setReports([report, ...reports]);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setOpen(false);
      setComment("");
    }, 2000);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] w-12 h-12 rounded-2xl bg-cr-red text-white shadow-xl flex items-center justify-center text-lg hover:scale-105 active:scale-95 transition-all"
        title={t("report.title")}
      >
        🫨
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl border border-white/30 max-w-sm w-full"
            >
              {submitted ? (
                <div className="text-center py-8">
                  <span className="text-4xl">✅</span>
                  <p className="text-lg font-semibold mt-3 text-cr-navy dark:text-white">
                    {t("report.thanks")}
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-lg text-cr-navy dark:text-white mb-1">
                    {t("report.title")}
                  </h3>
                  <p className="text-sm text-text-muted mb-4">{t("report.subtitle")}</p>

                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">
                    {t("report.intensity")}
                  </label>
                  <div className="flex gap-2 mb-4">
                    {intensityLevels.map((level) => (
                      <button
                        key={level}
                        onClick={() => setIntensity(level)}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                          intensity === level
                            ? "bg-cr-red text-white shadow-lg scale-105"
                            : "bg-gray-100 dark:bg-gray-800 text-text-muted hover:bg-gray-200"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t("report.comment")}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-cr-navy/20 mb-4 resize-none h-20"
                  />

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    className="w-full py-2.5 rounded-xl bg-cr-navy text-white font-semibold text-sm"
                  >
                    {t("report.submit")}
                  </motion.button>

                  {reports.length > 0 && (
                    <p className="text-xs text-text-muted text-center mt-3">
                      {reports.length} reportes enviados
                    </p>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
