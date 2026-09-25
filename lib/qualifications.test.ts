import { describe, expect, it } from "vitest";
import {
  addMonths,
  agentQualifications,
  defaultValidUntil,
  isUsable,
  latestPassed,
  shortfalls,
  statusOn,
  taskShortfalls,
  usableOn,
  windowRequirement,
  type QualificationInfo,
  type QualificationRecord,
} from "@/lib/qualifications";

// Qualifications of the agents (CLAUDE.md, 6. mérföldkő, "Fogalmak").

let seq = 0;
function record(overrides: Partial<QualificationRecord>): QualificationRecord {
  seq += 1;
  return {
    id: `r${seq}`,
    qualificationId: "prm",
    completedOn: "2026-01-10",
    passed: true,
    validUntil: "2027-01-10",
    createdAt: new Date(Date.UTC(2026, 0, 1) + seq * 1000),
    ...overrides,
  };
}

const qualifications: QualificationInfo[] = [
  { id: "prm", code: "PRM", name: "PRM", validityMonths: 12, active: true },
  { id: "dg", code: "DG", name: "DG", validityMonths: 24, active: true },
  { id: "alt", code: "ALT", name: "Altéa", validityMonths: null, active: true },
  { id: "old", code: "OLD", name: "Régi", validityMonths: 12, active: false },
];

describe("the end of validity", () => {
  it("is the completion day plus the months", () => {
    expect(addMonths("2026-03-15", 12)).toBe("2027-03-15");
    expect(addMonths("2026-11-20", 3)).toBe("2027-02-20");
  });

  it("falls on the last day of a shorter month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("does not exist for a qualification that does not expire", () => {
    expect(defaultValidUntil("2026-03-15", 24)).toBe("2028-03-15");
    expect(defaultValidUntil("2026-03-15", null)).toBeNull();
  });
});

describe("the latest passed record", () => {
  it("counts, and a later failed attempt does not take it away", () => {
    const pass = record({ completedOn: "2026-01-10", validUntil: "2027-01-10" });
    const failed = record({ completedOn: "2026-06-01", passed: false, validUntil: null });
    expect(latestPassed([pass, failed], "prm")).toBe(pass);
    expect(statusOn(latestPassed([pass, failed], "prm"), "2026-09-25", 30)).toBe("VALID");
  });

  it("is the newest pass, even when an older one ran longer", () => {
    const older = record({ completedOn: "2025-05-01", validUntil: "2028-01-01" });
    const newer = record({ completedOn: "2026-01-10", validUntil: "2027-01-10" });
    expect(latestPassed([newer, older], "prm")).toBe(newer);
  });

  it("is the one recorded later when two fall on the same day", () => {
    const first = record({ completedOn: "2026-01-10", validUntil: "2026-12-01" });
    const second = record({ completedOn: "2026-01-10", validUntil: "2027-01-10" });
    expect(latestPassed([second, first], "prm")).toBe(second);
  });
});

describe("the status on a day", () => {
  const pass = record({ validUntil: "2026-10-20" });

  it("is usable up to and on the last day, expired the day after", () => {
    expect(isUsable(statusOn(pass, "2026-10-19", 0))).toBe(true);
    // On the last day at most 0 days are left: expiring, still usable.
    expect(statusOn(pass, "2026-10-20", 0)).toBe("EXPIRING");
    expect(isUsable(statusOn(pass, "2026-10-20", 0))).toBe(true);
    expect(statusOn(pass, "2026-10-21", 0)).toBe("EXPIRED");
  });

  it("is expiring within the warning days", () => {
    // September has 30 days: from the 20th on, 30 days are left.
    expect(statusOn(pass, "2026-09-19", 30)).toBe("VALID");
    expect(statusOn(pass, "2026-09-20", 30)).toBe("EXPIRING");
    expect(statusOn(pass, "2026-10-20", 30)).toBe("EXPIRING");
  });

  it("is always valid without an end, and missing without a pass", () => {
    expect(statusOn(record({ validUntil: null }), "2099-01-01", 30)).toBe("VALID");
    expect(statusOn(null, "2026-09-25", 30)).toBe("MISSING");
  });
});

describe("an agent's qualifications", () => {
  const records = [
    record({ qualificationId: "prm", validUntil: "2026-10-01" }),
    record({ qualificationId: "dg", validUntil: "2026-09-01" }),
    record({ qualificationId: "alt", validUntil: null }),
    record({ qualificationId: "old", validUntil: "2030-01-01" }),
  ];

  it("gives every active qualification a status, the inactive one none", () => {
    const result = agentQualifications(records, qualifications, "2026-09-25", 30);
    expect(Object.fromEntries([...result].map(([id, q]) => [id, q.status]))).toEqual({
      prm: "EXPIRING",
      dg: "EXPIRED",
      alt: "VALID",
    });
  });

  it("are usable when valid or expiring", () => {
    expect([...usableOn(records, "2026-09-25")].sort()).toEqual(["alt", "old", "prm"]);
  });
});

describe("what a task needs", () => {
  const requirements = [
    { part: "ARRIVAL_PART" as const, qualificationId: "prm", active: true },
    { part: "DEPARTURE_PART" as const, qualificationId: "dg", active: true },
    { part: "DEPARTURE_PART" as const, qualificationId: "old", active: false },
  ];

  it("is its part's qualifications; a quick turnaround needs both parts'", () => {
    expect(windowRequirement(requirements, "ARRIVAL_PART")).toEqual(["prm"]);
    expect(windowRequirement(requirements, "DEPARTURE_PART")).toEqual(["dg"]);
    expect(windowRequirement(requirements, "WHOLE")).toEqual(["dg", "prm"]);
  });

  it("names what the agent lacks on the day", () => {
    const records = [record({ qualificationId: "prm", validUntil: "2026-09-01" })];
    expect(shortfalls(["prm", "dg"], records, "2026-09-25")).toEqual([
      { qualificationId: "prm", status: "EXPIRED" },
      { qualificationId: "dg", status: "MISSING" },
    ]);
    expect(shortfalls(["prm"], records, "2026-08-31")).toEqual([]);
  });
});

describe("what the agents of a task lack", () => {
  const requirements = [
    { part: "ARRIVAL_PART" as const, qualificationId: "prm", active: true },
    { part: "DEPARTURE_PART" as const, qualificationId: "dg", active: true },
  ];
  const records: Record<string, QualificationRecord[]> = {
    anna: [record({ qualificationId: "prm", validUntil: "2026-12-31" })],
    bela: [record({ qualificationId: "dg", validUntil: "2026-09-24" })],
  };
  const dayOf = (instant: Date) => instant.toISOString().slice(0, 10);
  const at = (day: string) => new Date(`${day}T08:00:00Z`);

  it("checks each window against the agent of its part, on the window's day", () => {
    const result = taskShortfalls(
      [
        { part: "ARRIVAL_PART", start: at("2026-09-25") },
        { part: "DEPARTURE_PART", start: at("2026-09-25") },
      ],
      { arrivalAgentId: "anna", departureAgentId: "bela" },
      requirements,
      (id) => records[id] ?? [],
      dayOf,
    );
    // Anna has PRM; Béla's DG ended the day before.
    expect(result).toEqual([
      { agentId: "bela", part: "DEPARTURE_PART", day: "2026-09-25", shortfalls: [{ qualificationId: "dg", status: "EXPIRED" }] },
    ]);
  });

  it("gives a quick turnaround's window to the arrival agent, who needs both parts'", () => {
    const result = taskShortfalls(
      [{ part: "WHOLE", start: at("2026-09-25") }],
      { arrivalAgentId: "anna", departureAgentId: "anna" },
      requirements,
      (id) => records[id] ?? [],
      dayOf,
    );
    expect(result).toEqual([
      { agentId: "anna", part: "WHOLE", day: "2026-09-25", shortfalls: [{ qualificationId: "dg", status: "MISSING" }] },
    ]);
  });

  it("finds nothing for an unassigned part", () => {
    expect(
      taskShortfalls([{ part: "ARRIVAL_PART", start: at("2026-09-25") }], { arrivalAgentId: null, departureAgentId: null }, requirements, () => [], dayOf),
    ).toEqual([]);
  });
});
