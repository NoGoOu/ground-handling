import { describe, expect, it } from "vitest";
import { latestPassed, statusOn, type QualificationRecord, type QualificationStatus } from "@/lib/qualifications";
import { checkUpload } from "@/lib/training";
import { SEED_PLACEHOLDER_MILESTONES, SEED_PLACEHOLDER_TASK_TYPE, SEED_USERS } from "./seed-data";
import {
  buildSeedRecords,
  SEED_COURSES,
  SEED_QUALIFICATIONS,
  SEED_REQUIREMENTS,
  seedCertificatePdf,
} from "./seed-training";

// The warning days of the schema's default (lib/settings: DEFAULT_EXPIRY_WARNING_DAYS).
const WARNING_DAYS = 30;

function statusesOn(today: string): Map<string, QualificationStatus> {
  const records: (QualificationRecord & { agent: string })[] = buildSeedRecords(today).map((record, index) => ({
    id: String(index),
    agent: record.agent,
    qualificationId: SEED_COURSES.find((c) => c.name === record.course)!.qualification,
    completedOn: record.completedOn,
    passed: record.passed,
    validUntil: record.validUntil,
    createdAt: new Date(index),
  }));
  const statuses = new Map<string, QualificationStatus>();
  for (const agent of ["ugynok1", "ugynok2"]) {
    for (const { code } of SEED_QUALIFICATIONS) {
      const latest = latestPassed(
        records.filter((r) => r.agent === agent),
        code,
      );
      statuses.set(`${agent} ${code}`, statusOn(latest, today, WARNING_DAYS));
    }
  }
  return statuses;
}

describe("seed training", () => {
  it("has a training coordinator", () => {
    expect(SEED_USERS.filter((u) => (u.roles as readonly string[]).includes("Oktatási koordinátor"))).toHaveLength(1);
  });

  for (const today of ["2026-09-25", "2026-12-31", "2027-01-31", "2027-03-01", "2028-02-29"]) {
    it(`shows every status on ${today}`, () => {
      expect(Object.fromEntries(statusesOn(today))).toEqual({
        "ugynok1 HA": "EXPIRING",
        "ugynok1 HB": "VALID",
        "ugynok1 HC": "VALID",
        "ugynok2 HA": "EXPIRED",
        "ugynok2 HB": "VALID",
        "ugynok2 HC": "MISSING",
      });
    });
  }

  it("has a later failed attempt that keeps the qualification", () => {
    const attempts = buildSeedRecords("2026-09-25").filter((r) => r.agent === "ugynok1" && r.course === "Helyőrző A képzés");
    expect(attempts.map((r) => r.passed)).toEqual([true, false]);
    expect(attempts[1].completedOn > attempts[0].completedOn).toBe(true);
  });

  it("decides a pass from the exam result where there is an exam", () => {
    for (const record of buildSeedRecords("2026-09-25")) {
      const course = SEED_COURSES.find((c) => c.name === record.course)!;
      expect(record.examPercent !== null, record.course).toBe(course.hasExam);
    }
  });

  it("requires qualifications only on parts the templates have", () => {
    const placeholderParts = new Set(SEED_PLACEHOLDER_MILESTONES.map((m) => m.part));
    for (const requirement of SEED_REQUIREMENTS) {
      if (requirement.taskType === SEED_PLACEHOLDER_TASK_TYPE.code) expect(placeholderParts.has(requirement.part)).toBe(true);
    }
  });

  it("attaches a file the upload check accepts", () => {
    expect(checkUpload(seedCertificatePdf())).toEqual({ type: "application/pdf" });
  });
});
