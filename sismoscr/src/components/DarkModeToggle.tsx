"use client";

import { motion } from "framer-motion";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useT } from "@/lib/i18n";

export function DarkModeToggle() {
  const { dark, toggle } = useDarkMode();
  const _t = useT();

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      className="ml-2 w-9 h-9 rounded-xl flex items-center justify-center text-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      title={dark ? _t("dark.title.light") : _t("dark.title.dark")}
    >
      {dark ? "☀️" : "🌙"}
    </motion.button>
  );
}
