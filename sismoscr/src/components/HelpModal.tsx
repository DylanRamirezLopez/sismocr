"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/lib/i18n";
import { useState, useEffect } from "react";

const shortcuts = [
  { key: "M", descKey: "help.m" },
  { key: "H", descKey: "help.h" },
  { key: "Esc", descKey: "help.escape" },
  { key: "?", descKey: "help.question" },
];

export function HelpModal() {
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?") setOpen((p) => !p);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10002] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl border border-white/30 max-w-xs w-full"
          >
            <h3 className="font-bold text-lg text-cr-navy dark:text-white mb-4">
              {t("help.title")}
            </h3>
            <div className="space-y-2">
              {shortcuts.map((s) => (
                <div key={s.key} className="flex items-center justify-between">
                  <kbd className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 font-mono text-sm font-bold text-cr-navy dark:text-white">
                    {s.key}
                  </kbd>
                  <span className="text-sm text-text-muted">{t(s.descKey)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
