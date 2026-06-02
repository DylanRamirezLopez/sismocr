"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Earthquake, FilterState, SortField, SortDirection } from "@/types";
import { getStatusFromDate } from "@/lib/utils";
import { API_URL } from "@/lib/api";

export function useEarthquakes() {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
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

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/earthquakes/history?per_page=200`);
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const json = await res.json();
      const mapped: Earthquake[] = (json.data || []).map((eq: any) => ({
        id: eq.id,
        magnitude: eq.magnitude,
        depth: eq.depth_km,
        location: eq.location_description || "Desconocida",
        latitude: eq.latitude,
        longitude: eq.longitude,
        datetime: eq.occurred_at,
        province: eq.province || "No especificada",
        status: getStatusFromDate(eq.occurred_at),
      }));
      setEarthquakes(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    }
    setLoading(false);
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
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  useEffect(() => { setCurrentPage(1); }, [filters]);

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
    currentPage,
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
    refetch: fetchData,
  };
}
