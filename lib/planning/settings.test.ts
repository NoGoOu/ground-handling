import { describe, expect, it } from "vitest";
import { DEFAULT_PLANNING_SETTINGS, pickSettings, settingsFromJson } from "@/lib/planning/settings";

describe("the settings copy of a plan day", () => {
  it("reads back what was stored", () => {
    const stored = { ...DEFAULT_PLANNING_SETTINGS, restMinutes: 10, extraPositions: 2 };
    expect(settingsFromJson(JSON.parse(JSON.stringify(stored)))).toEqual(stored);
  });

  it("falls back to the defaults for missing or broken values", () => {
    expect(settingsFromJson(null)).toEqual(DEFAULT_PLANNING_SETTINGS);
    expect(settingsFromJson({ minShiftMinutes: -5, maxShiftMinutes: "x", breakMinutes: 30 })).toEqual({
      ...DEFAULT_PLANNING_SETTINGS,
      breakMinutes: 30,
    });
  });

  it("keeps only the algorithm's values of a database row", () => {
    const row = { ...DEFAULT_PLANNING_SETTINGS, id: "global", segmentTypeId: "t" };
    expect(pickSettings(row)).toEqual(DEFAULT_PLANNING_SETTINGS);
  });
});
