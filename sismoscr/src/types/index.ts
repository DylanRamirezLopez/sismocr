export interface Earthquake {
  id: string;
  magnitude: number;
  depth: number;
  location: string;
  latitude: number;
  longitude: number;
  datetime: string;
  province: string;
  status: "recent" | "past" | "critical";
}

export interface ApiEarthquake {
  id: string;
  magnitude: number;
  depth_km: number;
  location_description: string | null;
  latitude: number;
  longitude: number;
  occurred_at: string;
  province: string | null;
}

export interface EarthquakeAlert {
  id: string;
  magnitude: number;
  depth: number;
  location: string;
  latitude: number;
  longitude: number;
  datetime: string;
  isActive: boolean;
}

export type SortField = "magnitude" | "datetime" | "depth" | "location";
export type SortDirection = "asc" | "desc";

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  minMagnitude: number;
  maxMagnitude: number;
  province: string;
}

export interface ChartData {
  month: string;
  count: number;
  avgMagnitude: number;
}
