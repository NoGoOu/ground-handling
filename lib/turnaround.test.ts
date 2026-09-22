import { describe, expect, it } from "vitest";
import { DEMO_MILESTONES, DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import {
  addMinutes,
  computeTimeline,
  delayMinutes,
  deviationLevel,
  diffMinutes,
  isRequiredMissing,
  orderConflicts,
  plannedTimes,
  truncateToMinute,
  type FlightTimes,
  type MilestoneDef,
} from "@/lib/turnaround";

const milestones: MilestoneDef[] = DEMO_MILESTONES.map((m) => ({ ...m, id: m.code }));

/** A UTC instant on a fixed day, e.g. at("10:25"). */
function at(hhmm: string, seconds = 0): Date {
  return new Date(`2026-09-22T${hhmm}:${String(seconds).padStart(2, "0")}Z`);
}

function timeline(flight: FlightTimes, recorded: Record<string, Date> = {}) {
  return computeTimeline({
    flight,
    params: DEMO_TEMPLATE_PARAMS,
    milestones,
    recorded: new Map(Object.entries(recorded)),
  });
}

function relativePlanned(flight: FlightTimes, base: Date, recorded: Record<string, Date> = {}) {
  return timeline(flight, recorded).rows.map((r) => diffMinutes(r.planned, base));
}

describe("rule 10: minute precision", () => {
  it("cuts off seconds instead of rounding", () => {
    expect(truncateToMinute(new Date("2026-09-22T10:00:59.999Z"))).toEqual(at("10:00"));
  });

  it("measures differences in whole minutes", () => {
    expect(diffMinutes(at("10:05", 59), at("10:00"))).toBe(5);
    expect(diffMinutes(at("09:58"), at("10:00"))).toBe(-2);
  });
});

describe("rule 4: quick turnaround check (STD = ATA + 25)", () => {
  const expected = [0, 1, 1, 2, 10, 10, 20, 22, 24, 25];

  it("gives the reference planned times relative to the system ATA", () => {
    const flight = { sta: at("10:00"), std: at("10:25"), ata: at("10:00") };
    expect(relativePlanned(flight, at("10:00"))).toEqual(expected);
  });

  it("gives the same result when the ATA comes from the agent's record", () => {
    const flight = { sta: at("10:00"), std: at("10:25") };
    expect(relativePlanned(flight, at("10:00"), { ATA: at("10:00") })).toEqual(expected);
  });
});

describe("rule 1: arrival anchor", () => {
  it("uses STA when nothing else is known", () => {
    expect(timeline({ sta: at("10:00"), std: at("12:00") }).arrivalAnchor).toEqual(at("10:00"));
  });

  it("prefers ETA over STA", () => {
    const t = timeline({ sta: at("10:00"), eta: at("10:15"), std: at("12:00") });
    expect(t.arrivalAnchor).toEqual(at("10:15"));
  });

  it("prefers the effective ATA over ETA", () => {
    const t = timeline({ sta: at("10:00"), eta: at("10:15"), std: at("12:00") }, { ATA: at("10:12") });
    expect(t.arrivalAnchor).toEqual(at("10:12"));
  });
});

describe("rule 2: departure anchor", () => {
  it("is the STD when the aircraft is on time", () => {
    expect(timeline({ sta: at("09:00"), std: at("11:30") }).departureAnchor).toEqual(at("11:30"));
  });

  it("moves to arrival + minimum turnaround when the aircraft is late", () => {
    const t = timeline({ sta: at("10:00"), std: at("10:30"), ata: at("10:20") });
    expect(t.departureAnchor).toEqual(at("10:45"));
  });

  it("uses ETD instead of STD, also when it is earlier", () => {
    expect(timeline({ sta: at("09:00"), std: at("11:30"), etd: at("11:45") }).departureAnchor).toEqual(at("11:45"));
    expect(timeline({ sta: at("09:00"), std: at("11:30"), etd: at("11:20") }).departureAnchor).toEqual(at("11:20"));
  });

  it("never lets ETD go below the minimum turnaround", () => {
    const t = timeline({ sta: at("10:00"), std: at("10:40"), etd: at("10:20") });
    expect(t.departureAnchor).toEqual(at("10:25"));
  });
});

describe("rule 3: planned times", () => {
  it("follows anchor + offset on a long turnaround", () => {
    const planned = relativePlanned({ sta: at("09:00"), std: at("11:30") }, at("09:00"));
    expect(planned).toEqual([0, 1, 1, 2, 10, 120, 145, 147, 149, 150]);
  });

  it("never plans a milestone earlier than the previous one", () => {
    const shuffled: MilestoneDef[] = [
      { ...milestones[0], id: "a", order: 1, anchor: "ARRIVAL", offsetMinutes: 10 },
      { ...milestones[1], id: "b", order: 2, anchor: "ARRIVAL", offsetMinutes: 3 },
    ];
    const planned = plannedTimes(shuffled, at("10:00"), at("11:00"));
    expect(planned.get("b")).toEqual(at("10:10"));
  });
});

describe("rule 5: deviation", () => {
  it("colours ≤ 0 green, 1–5 yellow, above 5 red", () => {
    expect(deviationLevel(-3)).toBe("green");
    expect(deviationLevel(0)).toBe("green");
    expect(deviationLevel(1)).toBe("yellow");
    expect(deviationLevel(5)).toBe("yellow");
    expect(deviationLevel(6)).toBe("red");
  });

  it("is actual − planned for a recorded milestone", () => {
    const row = timeline({ sta: at("10:00"), std: at("11:30") }, { LAST_PAX_OUT: at("10:13") }).rows[4];
    expect(row.deviationMinutes).toBe(3);
    expect(row.deviationLevel).toBe("yellow");
  });

  it("is 0 on the ATA row once ATA is known, because planning follows ATA", () => {
    const row = timeline({ sta: at("10:00"), std: at("11:30"), ata: at("10:12") }).rows[0];
    expect(row.deviationMinutes).toBe(0);
  });

  it("leaves rows without an actual time empty", () => {
    const row = timeline({ sta: at("10:00"), std: at("11:30") }).rows[1];
    expect(row.deviationMinutes).toBeNull();
    expect(row.deviationLevel).toBeNull();
  });
});

describe("rule 9: effective ATA / ATD", () => {
  it("uses the system value but keeps the agent's record visible", () => {
    const t = timeline({ sta: at("10:00"), std: at("10:25"), ata: at("10:05"), atd: at("10:40") }, {
      ATA: at("10:07"),
      ATD: at("10:39"),
    });
    const ataRow = t.rows[0];
    const atdRow = t.rows[9];
    expect(t.effectiveAta).toEqual(at("10:05"));
    expect(ataRow).toMatchObject({ systemValue: at("10:05"), recorded: at("10:07"), actual: at("10:05") });
    expect(atdRow).toMatchObject({ systemValue: at("10:40"), recorded: at("10:39"), actual: at("10:40") });
    // Planned off-block = max(STD 10:25, ATA 10:05 + 25) = 10:30.
    expect(atdRow.deviationMinutes).toBe(10);
  });

  it("falls back to the agent's record without a system value", () => {
    const t = timeline({ sta: at("10:00"), std: at("10:25") }, { ATA: at("10:07") });
    expect(t.effectiveAta).toEqual(at("10:07"));
    expect(t.rows[0].systemValue).toBeNull();
  });
});

describe("rule 6: order check", () => {
  it("flags a time earlier than a preceding milestone's time", () => {
    const t = timeline({ sta: at("10:00"), std: at("11:30") }, {
      FIRST_PAX_OUT: at("10:05"),
      LAST_PAX_OUT: at("10:03"),
    });
    expect(t.rows[4].orderConflictIds).toEqual(["FIRST_PAX_OUT"]);
    expect(t.rows[3].orderConflictIds).toEqual([]);
  });

  it("does not flag equal times", () => {
    const conflicts = orderConflicts(milestones, new Map([
      ["FRONT_DOOR_OPEN", at("10:01")],
      ["BACK_DOOR_OPEN", at("10:01")],
    ]));
    expect(conflicts).toEqual([]);
  });

  it("uses the effective (system) value on the ATA row", () => {
    const t = timeline({ sta: at("10:00"), std: at("11:30"), ata: at("10:04") }, {
      ATA: at("10:00"),
      FRONT_DOOR_OPEN: at("10:02"),
    });
    expect(t.rows[1].orderConflictIds).toEqual(["ATA"]);
  });
});

describe("rule 7: delay", () => {
  it("is effective ATD − STD when positive", () => {
    expect(delayMinutes(at("10:25"), at("10:31"))).toBe(6);
    expect(delayMinutes(at("10:25"), at("10:20"))).toBe(0);
    expect(delayMinutes(at("10:25"), null)).toBeNull();
  });

  it("is measured against STD, not ETD", () => {
    const t = timeline({ sta: at("09:00"), std: at("11:30"), etd: at("11:45"), atd: at("11:47") });
    expect(t.delayMinutes).toBe(17);
  });
});

describe("missing required milestones", () => {
  const row = { milestone: milestones[1], actual: null, planned: at("10:01") };

  it("is flagged only once the planned time has passed or the task is completed", () => {
    expect(isRequiredMissing(row, { now: at("10:00"), completed: false })).toBe(false);
    expect(isRequiredMissing(row, { now: at("10:01"), completed: false })).toBe(true);
    expect(isRequiredMissing(row, { now: at("09:00"), completed: true })).toBe(true);
  });

  it("never flags optional or recorded milestones", () => {
    const optional = { ...row, milestone: milestones[2] };
    const recorded = { ...row, actual: at("10:02") };
    expect(isRequiredMissing(optional, { now: at("12:00"), completed: true })).toBe(false);
    expect(isRequiredMissing(recorded, { now: at("12:00"), completed: true })).toBe(false);
  });
});

describe("helpers", () => {
  it("adds minutes", () => {
    expect(addMinutes(at("10:00"), -30)).toEqual(at("09:30"));
  });
});
