import { describe, expect, it } from "vitest";
import { DEMO_MILESTONES, DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import { DEFAULT_OJT_REQUIREMENT } from "@/lib/exams/defaults";
import { eligibility } from "@/lib/exams/eligibility";
import {
  completenessOf,
  effectiveTraineeId,
  isSuitable,
  metricsMeet,
  ojtMetrics,
  ojtProgress,
  onTimeOf,
  sessionParts,
  traineeShareOf,
  type OjtMetrics,
} from "@/lib/exams/ojt";
import { hasParts, latestPassedPercent, processParts, processState, releaseRecord } from "@/lib/exams/process";
import type { QualificationRecord } from "@/lib/qualifications";
import { computeTimeline, type MilestoneDef } from "@/lib/turnaround";

// On the job training, the process and who may mentor or examine (CLAUDE.md,
// 10. mérföldkő).

const milestones: MilestoneDef[] = DEMO_MILESTONES.map((m) => ({ ...m, id: m.code }));
/** Budapest is UTC+2 in October. */
const at = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(2026, 9, 1, h - 2, m));
};

describe("the parts of a practice", () => {
  it("is the part itself on a long turnaround and on a one-sided flight", () => {
    expect(sessionParts("DEPARTURE_PART", "LONG")).toEqual(["DEPARTURE_PART"]);
    expect(sessionParts("ARRIVAL_PART", null)).toEqual(["ARRIVAL_PART"]);
  });

  it("is the whole task for the arrival trainee of a quick turnaround, and nothing for a departure one", () => {
    expect(sessionParts("ARRIVAL_PART", "QUICK")).toEqual(["ARRIVAL_PART", "DEPARTURE_PART"]);
    expect(sessionParts("DEPARTURE_PART", "QUICK")).toBeNull();
  });

  it("gives both parts of a quick turnaround to the arrival trainee, like the agent", () => {
    const trainees = { arrival: "anna", departure: "bela" };
    expect(effectiveTraineeId("QUICK", "DEPARTURE_PART", trainees)).toBe("anna");
    expect(effectiveTraineeId("LONG", "DEPARTURE_PART", trainees)).toBe("bela");
    expect(effectiveTraineeId("LONG", "ARRIVAL_PART", trainees)).toBe("anna");
  });
});

describe("the metrics of a practice", () => {
  // A long turnaround: arrival 08:00, departure 11:00.
  const flight = { sta: at("08:00"), ata: at("08:00"), std: at("11:00") };
  const recorded = new Map<string, Date>([
    ["ATA", at("08:00")],
    ["FRONT_DOOR_OPEN", at("08:01")], // on time: green
    ["FIRST_PAX_OUT", at("08:05")], // 3 minutes late: yellow
    ["LAST_PAX_OUT", at("08:20")], // 10 minutes late: red
  ]);
  const timeline = computeTimeline({ flight, params: DEMO_TEMPLATE_PARAMS, milestones, recorded });
  const records = [...recorded.keys()].map((id) => ({ milestoneId: id, byTrainee: id !== "ATA" }));

  it("counts the required milestones done, the trainee's records and the colours of the part", () => {
    const metrics = ojtMetrics(timeline.rows, records, ["ARRIVAL_PART"]);
    // ATA, front door, first and last pax out are required; the back door is not.
    expect(metrics).toEqual({
      requiredTotal: 4,
      requiredDone: 4,
      recordedTotal: 4,
      byTrainee: 3,
      deviations: { green: 2, yellow: 1, red: 1 },
    });
    expect([completenessOf(metrics), traineeShareOf(metrics), onTimeOf(metrics)]).toEqual([100, 75, 75]);
  });

  it("counts only the parts of the practice", () => {
    const metrics = ojtMetrics(timeline.rows, records, ["DEPARTURE_PART"]);
    expect(metrics).toMatchObject({ requiredTotal: 5, requiredDone: 0, recordedTotal: 0 });
    expect([completenessOf(metrics), traineeShareOf(metrics), onTimeOf(metrics)]).toEqual([0, null, null]);
  });

  it("leaves a cancelled part out", () => {
    const cancelled = computeTimeline({ flight: { ...flight, arrivalCancelled: true }, params: DEMO_TEMPLATE_PARAMS, milestones, recorded });
    expect(ojtMetrics(cancelled.rows, records, ["ARRIVAL_PART"])).toMatchObject({ requiredTotal: 0, recordedTotal: 0 });
  });
});

describe("a suitable practice", () => {
  const metrics = (done: number, colours: [number, number, number]): OjtMetrics => ({
    requiredTotal: 4,
    requiredDone: done,
    recordedTotal: 4,
    byTrainee: 4,
    deviations: { green: colours[0], yellow: colours[1], red: colours[2] },
  });
  const requirement = { ...DEFAULT_OJT_REQUIREMENT };

  it("needs every required milestone by default, and no threshold on the colours", () => {
    expect(metricsMeet(metrics(4, [0, 0, 4]), requirement)).toBe(true);
    expect(metricsMeet(metrics(3, [4, 0, 0]), requirement)).toBe(false);
  });

  it("takes the thresholds of the training as parameters, compared exactly", () => {
    const strict = { ...requirement, minCompletenessPercent: 75, minOnTimePercent: 75 };
    expect(metricsMeet(metrics(3, [2, 1, 1]), strict)).toBe(true);
    expect(metricsMeet(metrics(3, [1, 1, 2]), strict)).toBe(false);
    expect(metricsMeet(metrics(2, [4, 0, 0]), strict)).toBe(false);
    // Nothing to colour cannot reach a threshold above zero.
    expect(metricsMeet(metrics(4, [0, 0, 0]), strict)).toBe(false);
  });

  it("needs the mentor's pass as well", () => {
    expect(isSuitable({ verdict: "PASS", metrics: metrics(4, [4, 0, 0]) }, requirement)).toBe(true);
    expect(isSuitable({ verdict: "FAIL", metrics: metrics(4, [4, 0, 0]) }, requirement)).toBe(false);
    expect(isSuitable({ verdict: null, metrics: null }, requirement)).toBe(false);
  });

  it("meets the requirement with enough suitable practices", () => {
    const good = { verdict: "PASS" as const, metrics: metrics(4, [4, 0, 0]) };
    const failed = { verdict: "FAIL" as const, metrics: metrics(4, [4, 0, 0]) };
    const waiting = { verdict: null, metrics: null };
    const sessions = [...Array(9).fill(good), failed, waiting];
    expect(ojtProgress(sessions, requirement)).toEqual({ suitable: 9, required: 10, met: false, evaluated: 10, waiting: 1 });
    expect(ojtProgress([...sessions, good], requirement)).toMatchObject({ suitable: 10, met: true });
    expect(ojtProgress(Array(3).fill(good), { ...requirement, requiredCount: 3 }).met).toBe(true);
  });
});

describe("the process", () => {
  const both = { theoryPart: true, practicalPart: true };
  const theoryOnly = { theoryPart: true, practicalPart: false };

  it("needs a training with at least one part", () => {
    expect(hasParts({ theoryPart: false, practicalPart: false })).toBe(false);
    expect(hasParts(theoryOnly)).toBe(true);
  });

  it("is ready for release when every prescribed part is passed", () => {
    const pending = processParts(both, { theoryPassed: true, ojt: { met: true }, practicalPassed: false });
    expect(pending).toEqual({ theory: "PASSED", ojt: "PASSED", practical: "PENDING" });
    expect(processState("IN_PROGRESS", pending)).toBe("IN_PROGRESS");
    const done = processParts(both, { theoryPassed: true, ojt: { met: true }, practicalPassed: true });
    expect(processState("IN_PROGRESS", done)).toBe("READY");
  });

  it("asks nothing of a part the training does not have", () => {
    const parts = processParts(theoryOnly, { theoryPassed: true, ojt: { met: false }, practicalPassed: false });
    expect(parts).toEqual({ theory: "PASSED", ojt: "NOT_REQUIRED", practical: "NOT_REQUIRED" });
    expect(processState("IN_PROGRESS", parts)).toBe("READY");
  });

  it("keeps a released or aborted process so", () => {
    const done = processParts(both, { theoryPassed: true, ojt: { met: true }, practicalPassed: true });
    expect(processState("RELEASED", done)).toBe("RELEASED");
    expect(processState("ABORTED", done)).toBe("ABORTED");
  });

  it("makes the record of the release with the latest passed e-exam", () => {
    const attempts = [
      { passed: false, percent: 60, submittedAt: at("08:00") },
      { passed: true, percent: 85, submittedAt: at("09:00") },
      { passed: true, percent: 92, submittedAt: at("10:00") },
      { passed: null, percent: null, submittedAt: at("11:00") },
    ];
    expect(latestPassedPercent(attempts)).toBe(92);
    expect(releaseRecord({ qualification: { validityMonths: 24 } }, "2026-10-01", 92)).toEqual({
      completedOn: "2026-10-01",
      examPercent: 92,
      passed: true,
      validUntil: "2028-10-01",
    });
    expect(releaseRecord({ qualification: { validityMonths: null } }, "2026-10-01", null).validUntil).toBeNull();
    expect(releaseRecord({ qualification: null }, "2026-10-01", null).validUntil).toBeNull();
  });
});

describe("who may mentor or examine", () => {
  const record = (validUntil: string | null, passed = true): QualificationRecord => ({
    id: "r",
    qualificationId: "dg",
    completedOn: "2025-01-01",
    passed,
    validUntil,
    createdAt: new Date("2025-01-01T10:00:00Z"),
  });
  const dg = { id: "dg", active: true };

  it("needs the permission", () => {
    expect(eligibility(false, null, [], "2026-10-01")).toBe("permission");
    expect(eligibility(true, null, [], "2026-10-01")).toBeNull();
  });

  it("needs the training's qualification valid on the day", () => {
    expect(eligibility(true, dg, [record("2026-12-31")], "2026-10-01")).toBeNull();
    expect(eligibility(true, dg, [record("2026-10-01")], "2026-10-01")).toBeNull();
    expect(eligibility(true, dg, [record("2026-09-30")], "2026-10-01")).toBe("qualification");
    expect(eligibility(true, dg, [record("2026-12-31", false)], "2026-10-01")).toBe("qualification");
    expect(eligibility(true, dg, [], "2026-10-01")).toBe("qualification");
  });

  it("passes over an inactive qualification (rule 33)", () => {
    expect(eligibility(true, { id: "dg", active: false }, [], "2026-10-01")).toBeNull();
  });
});
