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
