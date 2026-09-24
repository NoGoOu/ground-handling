// The planner's rules (CLAUDE.md, 4. mérföldkő, "Tervezési beállítások"). The
// values are placeholders; the break rule still has to be checked against the
// labour code. A plan day keeps a copy from its calculation.

export interface PlanningSettings {
  minShiftMinutes: number;
  maxShiftMinutes: number;
  breakMinutes: number;
  /** A shift longer than this needs a break. */
  breakAfterMinutes: number;
  /** Rest between two tasks; only one of rest and overlap may be above zero. */
  restMinutes: number;
  /** Allowed overlap of two tasks. */
  overlapMinutes: number;
  /** Positions allowed above the minimum, for an even load. */
  extraPositions: number;
}

export const DEFAULT_PLANNING_SETTINGS: PlanningSettings = {
  minShiftMinutes: 240,
  maxShiftMinutes: 720,
  breakMinutes: 20,
  breakAfterMinutes: 360,
  restMinutes: 0,
  overlapMinutes: 0,
  extraPositions: 0,
};

const KEYS = Object.keys(DEFAULT_PLANNING_SETTINGS) as (keyof PlanningSettings)[];

/** The copy stored on a plan day; anything unreadable falls back to the default. */
export function settingsFromJson(value: unknown): PlanningSettings {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    KEYS.map((key) => {
      const raw = source[key];
      return [key, typeof raw === "number" && Number.isInteger(raw) && raw >= 0 ? raw : DEFAULT_PLANNING_SETTINGS[key]];
    }),
  ) as unknown as PlanningSettings;
}

/** Only the algorithm's values, e.g. from a database row. */
export function pickSettings(row: PlanningSettings): PlanningSettings {
  return Object.fromEntries(KEYS.map((key) => [key, row[key]])) as unknown as PlanningSettings;
}
