"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ApiEarthquake, Earthquake, FilterState, SortField, SortDirection } from "@/types";
import { apiFetch, isOfflineCopy, toEarthquake } from "@/lib/api";

export function useEarthquakes() {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineCopy, setOfflineCopy] = useState(false);
  const [filters, setFiltersState] = useState<FilterState>({
    dateFrom: "",
    dateTo: "",
    minMagnitude: 0,
    maxMagnitude: 10,
    province: "",
  });
  const [sortField, setSortField] = useState<SortField>("datetime");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;

  const fetchData = useCallback(() => {
    apiFetch("/earthquakes/history?per_page=200")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        const json: { data?: ApiEarthquake[] } = await res.json();
        setEarthquakes((json.data || []).map(toEarthquake));
        setOfflineCopy(isOfflineCopy(res));
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Error de conexión");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = useMemo(() => {
    return earthquakes
      .filter((eq) => {
        if (filters.dateFrom && new Date(eq.datetime) < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && new Date(eq.datetime) > new Date(filters.dateTo)) return false;
        if (eq.magnitude < filters.minMagnitude) return false;
        if (eq.magnitude > filters.maxMagnitude) return false;
        if (filters.province && eq.province !== filters.province) return false;
        return true;
      })
      .sort((a, b) => {
        const mul = sortDirection === "asc" ? 1 : -1;
        if (sortField === "magnitude") return (a.magnitude - b.magnitude) * mul;
        if (sortField === "depth") return (a.depth - b.depth) * mul;
        if (sortField === "datetime")
          return (new Date(a.datetime).getTime() - new Date(b.datetime).getTime()) * mul;
        return a.location.localeCompare(b.location) * mul;
      });
  }, [earthquakes, filters, sortField, sortDirection]);

  const totalPages = Math.ceil(filtered.length / perPage);
  // Una recarga puede dejar menos páginas que la actual
  const page = Math.min(currentPage, Math.max(1, totalPages));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const setFilters = (update: (prev: FilterState) => FilterState) => {
    setFiltersState(update);
    setCurrentPage(1);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const provinces = useMemo(
    () => [...new Set(earthquakes.map((eq) => eq.province))].sort(),
    [earthquakes]
  );

  return {
    earthquakes: paginated,
    totalPages,
    currentPage: page,
    setCurrentPage,
    filters,
    setFilters,
    sortField,
    sortDirection,
    toggleSort,
    provinces,
    allEarthquakes: earthquakes,
    totalFiltered: filtered.length,
    loading,
    error,
    offlineCopy,
    refetch: fetchData,
  };
}
