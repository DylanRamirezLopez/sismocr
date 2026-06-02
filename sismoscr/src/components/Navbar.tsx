"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useT, setLang, useLang } from "@/lib/i18n";
import { DarkModeToggle } from "./DarkModeToggle";

const navItems = [
  { href: "/", labelKey: "nav.map" },
  { href: "/history", labelKey: "nav.history" },
];

export function Navbar() {
  const pathname = usePathname();
  const _t = useT();
  const currentLang = useLang();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") window.location.href = "/";
      if (e.key === "h" || e.key === "H") window.location.href = "/history";
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleLang = () => {
    setLang(currentLang === "es" ? "en" : "es");
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-[9999] bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-white/20 dark:border-gray-800/50 shadow-lg shadow-black/5"
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cr-navy to-cr-red bg-clip-text text-transparent">
            SismosCR
          </span>
          <span className="hidden sm:inline text-xs text-text-muted">
            · {_t("app.subtitle")}
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "text-cr-navy dark:text-white"
                    : "text-text-muted hover:text-cr-navy dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-cr-navy/5 dark:bg-white/10 rounded-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{_t(item.labelKey)}</span>
              </Link>
            );
          })}

          <button
            onClick={toggleLang}
            className="ml-1 px-2 py-1 rounded-lg text-xs font-semibold text-text-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {currentLang === "es" ? "EN" : "ES"}
          </button>

          <DarkModeToggle />
        </div>
      </div>
    </motion.nav>
  );
}
