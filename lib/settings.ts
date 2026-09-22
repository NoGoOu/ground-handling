import { cache } from "react";
import { prisma } from "@/lib/db";
import { DEVIATION_THRESHOLDS, type DeviationThresholds } from "@/lib/turnaround";

// Global settings live in a single row (decision 7). The calculations stay pure:
// the thresholds are passed in as a parameter.

export const SETTINGS_ID = "global";

export interface Settings {
  deviationThresholds: DeviationThresholds;
}

/** Read once per request; falls back to the defaults while the row is missing. */
export const getSettings = cache(async (): Promise<Settings> => {
  const row = await prisma.setting.findUnique({ where: { id: SETTINGS_ID } });
  return {
    deviationThresholds: row
      ? { greenMax: row.deviationGreenMaxMinutes, yellowMax: row.deviationYellowMaxMinutes }
      : DEVIATION_THRESHOLDS,
  };
});
