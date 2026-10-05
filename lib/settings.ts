import { cache } from "react";
import { prisma } from "@/lib/db";
import { BUD_STATION_ID } from "@/lib/stations";
import { DEVIATION_THRESHOLDS, type DeviationThresholds } from "@/lib/turnaround";

// Global settings live in a single row (decision 7). The calculations stay pure:
// the thresholds are passed in as a parameter.

export const SETTINGS_ID = "global";

export interface Settings {
  deviationThresholds: DeviationThresholds;
  /** A qualification expiring within this many days is "hamarosan lejár" (6. mérföldkő). */
  expiryWarningDays: number;
  /** A slot warning beyond this many minutes (8. mérföldkő). */
  slotToleranceMinutes: number;
  /** A deadline of ground equipment within this many days is "hamarosan lejár" (11. mérföldkő). */
  equipmentWarningDays: number;
  /** The refresh suggested to subscribed roster calendars, in minutes (12. mérföldkő). */
  calendarRefreshMinutes: number;
}

export const DEFAULT_EXPIRY_WARNING_DAYS = 30;
export const DEFAULT_SLOT_TOLERANCE_MINUTES = 10;
export const DEFAULT_EQUIPMENT_WARNING_DAYS = 30;
export const DEFAULT_CALENDAR_REFRESH_MINUTES = 60;

/**
 * Read once per request; falls back to the defaults while a row is missing.
 * The station's own settings and the company's (14. mérföldkő); the station is
 * BUD until the station context comes (14. mérföldkő, 3. lépés).
 */
export const getSettings = cache(async (): Promise<Settings> => {
  const [station, company] = await Promise.all([
    prisma.stationSetting.findUnique({ where: { stationId: BUD_STATION_ID } }),
    prisma.setting.findUnique({ where: { id: SETTINGS_ID } }),
  ]);
  return {
    deviationThresholds: station
      ? { greenMax: station.deviationGreenMaxMinutes, yellowMax: station.deviationYellowMaxMinutes }
      : DEVIATION_THRESHOLDS,
    expiryWarningDays: station?.expiryWarningDays ?? DEFAULT_EXPIRY_WARNING_DAYS,
    slotToleranceMinutes: station?.slotToleranceMinutes ?? DEFAULT_SLOT_TOLERANCE_MINUTES,
    equipmentWarningDays: station?.equipmentWarningDays ?? DEFAULT_EQUIPMENT_WARNING_DAYS,
    calendarRefreshMinutes: company?.calendarRefreshMinutes ?? DEFAULT_CALENDAR_REFRESH_MINUTES,
  };
});
