import { format, formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Earthquake } from "@/types";

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "dd MMM yyyy, HH:mm:ss", { locale: es });
}

export function formatRelativeTime(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: es });
}

export function getMagnitudeColor(magnitude: number): string {
  if (magnitude >= 6) return "#CE1126";
  if (magnitude >= 5) return "#E8590C";
  if (magnitude >= 4) return "#F59E0B";
  if (magnitude >= 3) return "#FCD34D";
  return "#6EE7B7";
}

export function getMagnitudeSize(magnitude: number): number {
  return Math.max(8, magnitude * 5);
}

export function getStatusFromDate(iso: string): Earthquake["status"] {
  const now = Date.now();
  const date = parseISO(iso).getTime();
  const diffHours = (now - date) / 1000 / 60 / 60;
  if (diffHours < 1) return "critical";
  if (diffHours < 24) return "recent";
  return "past";
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
