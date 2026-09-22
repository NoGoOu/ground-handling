import { parseLocalDate, toLocalDate } from "@/lib/time";

/** The ?date=YYYY-MM-DD search parameter, falling back to today in Budapest. */
export function dateParam(value: string | string[] | undefined, now = new Date()): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && parseLocalDate(raw) ? raw : toLocalDate(now);
}
