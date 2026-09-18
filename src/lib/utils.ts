import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a "YYYY-MM-DD" date string as local time instead of UTC.
 * Prevents off-by-one day issues caused by timezone offset.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Ensure a user-entered link is an absolute URL. Links typed without a
 * protocol (e.g. "instagram.com/band") would otherwise resolve as broken
 * relative paths inside the app.
 */
export function ensureHttp(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
