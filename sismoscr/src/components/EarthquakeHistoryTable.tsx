"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { SortField, FilterState } from "@/types";
import { formatDateTime, getMagnitudeColor, cn } from "@/lib/utils";
import { useEarthquakes } from "@/hooks/useEarthquakes";
import { ExportButton } from "./ExportButton";
import { useT } from "@/lib/i18n";
import { useRouter } from "next/navigation";

export function EarthquakeHistoryTable() {
  const _t = useT();
  const router = useRouter();
  const {
    earthquakes,
    totalPages,
    currentPage,
    setCurrentPage,
    filters,
    setFilters,
    sortField,
    sortDirection,
    toggleSort,
    provinces,
    totalFiltered,
    loading,
    error,
    refetch,
    allEarthquakes,
  } = useEarthquakes();

  const chartData = React.useMemo(() => {
    const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Set","Oct","Nov","Dic"];
    const counts: Record<string, number> = {};
    months.forEach((m) => { counts[m] = 0; });
    allEarthquakes.forEach((eq) => {
      const d = new Date(eq.datetime);
      const m = months[d.getMonth()];
      if (m) counts[m] = (counts[m] || 0) + 1;
    });
    return months.filter((m) => counts[m] > 0).map((month) => ({ month, count: counts[month], avgMagnitude: 3.0 }));
  }, [allEarthquakes]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-text-muted">↕</span>;
    return (
      <span className={sortDirection === "asc" ? "text-cr-navy" : "text-cr-navy"}>
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  return (
    <div className="min-h-dvh pt-16 pb-8 px-4 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-start justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-cr-navy dark:text-white">{_t("history.title")}</h1>
          <p className="text-text-muted mt-1">
            {totalFiltered} {_t("history.events")} · {new Date().toLocaleDateString("es-CR")}
          </p>
        </div>
        <ExportButton earthquakes={earthquakes} />
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-cr-red/10 backdrop-blur-xl rounded-2xl p-4 border border-cr-red/30"
        >
          <p className="text-cr-red text-sm font-semibold mb-1">{_t("history.error.title")}</p>
          <p className="text-text-muted text-xs mb-3">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-1.5 rounded-xl bg-cr-red text-white text-sm font-semibold hover:bg-cr-red-light transition-colors"
          >
            {_t("map.error.retry")}
          </button>
        </motion.div>
      )}

      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-20"
        >
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-cr-navy/30 border-t-cr-navy rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-muted text-sm">{_t("history.loading")}</p>
          </div>
        </motion.div>
      )}

      {!loading && !error && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-white/20"
        >
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
            {_t("history.chart.monthly")}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#6B7280" />
              <YAxis tick={{ fontSize: 11 }} stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.1)",
                  backdropFilter: "blur(12px)",
                  background: "rgba(255,255,255,0.9)",
                }}
              />
              <Bar
                dataKey="count"
                fill="#002B7F"
                radius={[6, 6, 0, 0]}
                animationBegin={200}
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-white/20"
        >
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
            {_t("history.chart.avgMag")}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#6B7280" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#6B7280"
                domain={[0, "auto"]}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.1)",
                  backdropFilter: "blur(12px)",
                  background: "rgba(255,255,255,0.9)",
                }}
              />
              <Line
                type="monotone"
                dataKey="avgMagnitude"
                stroke="#CE1126"
                strokeWidth={2}
                dot={{ fill: "#CE1126", r: 4 }}
                animationBegin={400}
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 overflow-hidden"
      >
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                Desde
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cr-navy/20 focus:border-cr-navy transition-all"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cr-navy/20 focus:border-cr-navy transition-all"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                Mag. Mín
              </label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={filters.minMagnitude}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    minMagnitude: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cr-navy/20 focus:border-cr-navy transition-all"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                Mag. Máx
              </label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={filters.maxMagnitude}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    maxMagnitude: parseFloat(e.target.value) || 10,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cr-navy/20 focus:border-cr-navy transition-all"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                Provincia
              </label>
              <select
                value={filters.province}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, province: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cr-navy/20 focus:border-cr-navy transition-all bg-white"
              >
                <option value="">{_t("history.filter.all")}</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {[
                  { key: "datetime" as SortField, label: _t("history.table.date") },
                  { key: "magnitude" as SortField, label: _t("history.table.magnitude") },
                  { key: "depth" as SortField, label: _t("history.table.depth") },
                  { key: "location" as SortField, label: _t("history.table.location") },
                  { label: _t("history.table.province"), noSort: true },
                  { label: _t("history.table.status"), noSort: true },
                ].map((col) => (
                  <th
                    key={col.key || col.label}
                    className={`px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${
                      !col.noSort ? "cursor-pointer hover:text-cr-navy select-none" : ""
                    }`}
                    onClick={() => col.key && toggleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.key && <SortIcon field={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {earthquakes.map((eq, i) => (
                  <motion.tr
                    key={eq.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => router.push(`/?eq=${eq.id}`)}
                    className="border-b border-gray-50 hover:bg-cr-navy/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {formatDateTime(eq.datetime)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 font-bold text-sm"
                        style={{ color: getMagnitudeColor(eq.magnitude) }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getMagnitudeColor(eq.magnitude) }}
                        />
                        {eq.magnitude.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{eq.depth.toFixed(1)} km</td>
                    <td className="px-4 py-3 text-sm">{eq.location}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{eq.province}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                          eq.status === "critical" && "bg-cr-red/10 text-cr-red",
                          eq.status === "recent" && "bg-amber-50 text-amber-700",
                          eq.status === "past" && "bg-gray-100 text-text-muted"
                        )}
                      >
                        {eq.status === "critical" && _t("status.critical")}
                        {eq.status === "recent" && _t("status.recent")}
                        {eq.status === "past" && _t("status.past")}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-100">
          <AnimatePresence mode="popLayout">
            {earthquakes.map((eq, i) => (
              <motion.div
                key={eq.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => router.push(`/?eq=${eq.id}`)}
                className="p-4 hover:bg-cr-navy/[0.02] transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="font-bold text-lg"
                    style={{ color: getMagnitudeColor(eq.magnitude) }}
                  >
                    {eq.magnitude.toFixed(1)} ML
                  </span>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                      eq.status === "critical" && "bg-cr-red/10 text-cr-red",
                      eq.status === "recent" && "bg-amber-50 text-amber-700",
                      eq.status === "past" && "bg-gray-100 text-text-muted"
                    )}
                  >
                    {eq.status === "critical" && _t("status.critical")}
                    {eq.status === "recent" && _t("status.recent")}
                    {eq.status === "past" && _t("status.past")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <span className="text-text-muted">{_t("tooltip.location")}:</span>
                  <span className="font-medium text-right">{eq.location}</span>
                  <span className="text-text-muted">{_t("tooltip.province")}:</span>
                  <span className="font-medium text-right">{eq.province}</span>
                  <span className="text-text-muted">{_t("tooltip.depth")}:</span>
                  <span className="font-medium text-right">{eq.depth.toFixed(1)} km</span>
                  <span className="text-text-muted">{_t("tooltip.datetime")}:</span>
                  <span className="font-medium text-right text-xs">
                    {formatDateTime(eq.datetime)}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-text-muted">
              {_t("history.pagination")} {currentPage} {_t("history.pagination.of")} {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-muted hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {_t("history.pagination.prev")}
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                const page = start + i;
                if (page > totalPages) return null;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                      page === currentPage
                        ? "bg-cr-navy text-white"
                        : "text-text-muted hover:bg-gray-100"
                    )}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-muted hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {_t("history.pagination.next")}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
