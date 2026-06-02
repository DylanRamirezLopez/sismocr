"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/lib/i18n";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useState } from "react";

const ITEMS = [
  { id: "water", label: "Agua potable (4L por persona)", icon: "💧" },
  { id: "food", label: "Comida no perecedera (3 días)", icon: "🥫" },
  { id: "radio", label: "Radio de pilas", icon: "📻" },
  { id: "flashlight", label: "Linterna + pilas extra", icon: "🔦" },
  { id: "firstaid", label: "Botiquín de primeros auxilios", icon: "🩹" },
  { id: "whistle", label: "Silbato (para señalización)", icon: "📯" },
  { id: "mask", label: "Mascarillas (polvo/escombros)", icon: "😷" },
  { id: "documents", label: "Copias de documentos importantes", icon: "📄" },
  { id: "cash", label: "Efectivo (colones + dólares)", icon: "💰" },
  { id: "meds", label: "Medicamentos recetados", icon: "💊" },
  { id: "blanket", label: "Manta térmica", icon: "🧣" },
  { id: "tools", label: "Multiherramienta / navaja", icon: "🔧" },
  { id: "charger", label: "Power bank para celular", icon: "🔋" },
  { id: "gloves", label: "Guantes gruesos", icon: "🧤" },
  { id: "whistle2", label: "Pito de emergencia", icon: "📣" },
];

export function PreparednessChecklist() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [checked, setChecked, reset] = useLocalStorage<Record<string, boolean>>(
    "sismoscr-checklist",
    {}
  );

  const done = Object.values(checked).filter(Boolean).length;
  const total = ITEMS.length;
  const score = Math.round((done / total) * 100);

  const getLevel = () => {
    if (score === 100) return "🌟 Preparación Completa";
    if (score >= 80) return "🟢 Bien Preparado";
    if (score >= 50) return "🟡 Preparación Media";
    if (score >= 25) return "🟠 Poco Preparado";
    return "🔴 Sin Preparación";
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[9999] w-12 h-12 rounded-2xl bg-cr-navy text-white shadow-xl flex items-center justify-center text-lg hover:scale-105 active:scale-95 transition-all"
        title={t("checklist.title")}
      >
        🎒
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
              className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl border border-white/30 max-w-md w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-cr-navy dark:text-white">
                  {t("checklist.title")}
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-text-muted"
                >
                  ✕
                </button>
              </div>

              <div className="bg-cr-navy/5 dark:bg-white/5 rounded-xl p-4 mb-4 text-center">
                <div className="text-3xl font-bold text-cr-navy dark:text-white">
                  {score}%
                </div>
                <div className="text-sm font-semibold text-cr-red mt-1">{getLevel()}</div>
                <div className="text-xs text-text-muted mt-1">
                  {done}/{total} {t("checklist.items")}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className="h-full bg-cr-red rounded-full transition-all duration-500"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                {ITEMS.map((item, i) => (
                  <motion.label
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                      checked[item.id]
                        ? "bg-green-50 dark:bg-green-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked[item.id] || false}
                      onChange={() =>
                        setChecked((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      className="w-4 h-4 rounded border-gray-300 text-cr-red focus:ring-cr-red"
                    />
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm font-medium text-text dark:text-white flex-1">
                      {item.label}
                    </span>
                    {checked[item.id] && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-green-600"
                      >
                        ✓
                      </motion.span>
                    )}
                  </motion.label>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={reset}
                className="w-full mt-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-muted text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                {t("checklist.reset")}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
