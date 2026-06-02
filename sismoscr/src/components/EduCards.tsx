"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/lib/i18n";
import { useState } from "react";

const phases = [
  {
    key: "before",
    icon: "🛠",
    color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    items: [
      "Prepara tu mochila de emergencia",
      "Identifica zonas seguras en tu hogar",
      "Fija estantes, cuadros y objetos pesados",
      "Acuerda un punto de encuentro familiar",
      "Guarda números de emergencia",
      "Participa en simulacros",
    ],
  },
  {
    key: "during",
    icon: "🔄",
    color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    items: [
      "Mantén la calma y no corras",
      "Agáchate, cúbrete y sujétate",
      "Aléjate de ventanas y objetos que caigan",
      "Si estás en la calle, aléjate de edificios",
      "No uses ascensores",
      "Si manejas, oríllate y detente",
    ],
  },
  {
    key: "after",
    icon: "🔍",
    color: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    items: [
      "Revisa si hay heridos a tu alrededor",
      "Corta el gas y la electricidad si hay daños",
      "Usa el silbato si quedas atrapado",
      "Prepárate para réplicas",
      "Escucha la radio para instrucciones",
      "No uses el teléfono salvo emergencias",
    ],
  },
];

export function EduCards() {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-20 z-[9999] w-12 h-12 rounded-2xl bg-cr-navy-light text-white shadow-xl flex items-center justify-center text-lg hover:scale-105 active:scale-95 transition-all"
        title={t("learn.title")}
      >
        📖
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
              className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl border border-white/30 max-w-lg w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-cr-navy dark:text-white">
                  {t("learn.title")}
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-text-muted"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {phases.map((phase, pi) => (
                  <motion.div
                    key={phase.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: pi * 0.1 }}
                    className={`rounded-xl border p-4 ${phase.color}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{phase.icon}</span>
                      <h4 className="font-bold text-cr-navy dark:text-white">
                        {t(`learn.${phase.key}`)}
                      </h4>
                    </div>
                    <ul className="space-y-1.5">
                      {phase.items.map((item, ii) => (
                        <motion.li
                          key={ii}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: pi * 0.1 + ii * 0.05 }}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="text-cr-red mt-0.5">•</span>
                          <span className="text-text dark:text-gray-300">{item}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
