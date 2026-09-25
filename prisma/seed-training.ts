import { addMonths } from "@/lib/qualifications";
import { addDays } from "@/lib/time";
import { resolveRecord } from "@/lib/training";
import { SEED_PLACEHOLDER_TASK_TYPE, type SeedUsername } from "./seed-data";

// Training demo data (CLAUDE.md, 6. mérföldkő, 8. lépés). The qualifications,
// trainings and requirements are placeholders: the real GOU and HDS
// requirements come from the owner of the project. The records are relative to
// the run day, so the demo agents show every status on any day: valid,
// expiring soon, expired and missing.

export const SEED_QUALIFICATIONS = [
  { code: "HA", name: "Helyőrző A", validityMonths: 12 },
  { code: "HB", name: "Helyőrző B", validityMonths: 24 },
  // Does not expire.
  { code: "HC", name: "Helyőrző C", validityMonths: null },
] as const;

export type SeedQualificationCode = (typeof SEED_QUALIFICATIONS)[number]["code"];

export const SEED_COURSES = [
  { name: "Helyőrző A képzés", qualification: "HA", hasExam: true, passPercent: 80 },
  { name: "Helyőrző B képzés", qualification: "HB", hasExam: false, passPercent: null },
  { name: "Helyőrző C képzés", qualification: "HC", hasExam: true, passPercent: 75 },
] as const satisfies readonly { name: string; qualification: SeedQualificationCode; hasExam: boolean; passPercent: number | null }[];

/** What the demo airline's task types need, per part (placeholders). */
export const SEED_REQUIREMENTS = [
  // The "Alap" task type (lib/data/task-types).
  { taskType: "ALAP", part: "ARRIVAL_PART", qualification: "HA" },
  { taskType: "ALAP", part: "DEPARTURE_PART", qualification: "HB" },
  // The placeholder template has a departure part only.
  { taskType: SEED_PLACEHOLDER_TASK_TYPE.code, part: "DEPARTURE_PART", qualification: "HC" },
] as const satisfies readonly {
  taskType: string;
  part: "ARRIVAL_PART" | "DEPARTURE_PART";
  qualification: SeedQualificationCode;
}[];

export interface SeedRecord {
  agent: SeedUsername;
  course: (typeof SEED_COURSES)[number]["name"];
  completedOn: string;
  examPercent: number | null;
  passed: boolean;
  validUntil: string | null;
  note: string | null;
  /** A sample certificate is attached. */
  withFile?: boolean;
}

type RawRecord = Pick<SeedRecord, "agent" | "course" | "completedOn" | "note" | "withFile"> &
  ({ examPercent: number } | { passed: boolean });

/**
 * The records on the run day (Europe/Budapest):
 * - Kiss Péter: HA expires in about 20 days, and a renewal attempt 5 days ago
 *   failed, which does not take it away; HB and HC valid.
 * - Nagy Eszter: HA expired two months ago, HB valid, HC missing.
 */
export function buildSeedRecords(today: string): SeedRecord[] {
  const raw: RawRecord[] = [
    { agent: "ugynok1", course: "Helyőrző A képzés", completedOn: addMonths(addDays(today, 20), -12), examPercent: 88, note: null },
    {
      agent: "ugynok1",
      course: "Helyőrző A képzés",
      completedOn: addDays(today, -5),
      examPercent: 70,
      note: "Megújító próbálkozás; a korábbi jogosítás még érvényes.",
    },
    { agent: "ugynok1", course: "Helyőrző B képzés", completedOn: addMonths(today, -3), passed: true, note: null, withFile: true },
    { agent: "ugynok1", course: "Helyőrző C képzés", completedOn: addDays(today, -200), examPercent: 90, note: null },
    { agent: "ugynok2", course: "Helyőrző A képzés", completedOn: addMonths(today, -14), examPercent: 85, note: null },
    { agent: "ugynok2", course: "Helyőrző B képzés", completedOn: addMonths(today, -6), passed: true, note: null },
  ];
  return raw.map((record) => {
    const course = SEED_COURSES.find((c) => c.name === record.course)!;
    const qualification = SEED_QUALIFICATIONS.find((q) => q.code === course.qualification)!;
    const resolved = resolveRecord(
      { hasExam: course.hasExam, passPercent: course.passPercent, validityMonths: qualification.validityMonths },
      {
        completedOn: record.completedOn,
        examPercent: "examPercent" in record ? record.examPercent : null,
        passed: "passed" in record ? record.passed : false,
        validUntil: null,
        validUntilManual: false,
      },
    );
    if (typeof resolved === "string") throw new Error(`Seed record of ${record.course}: ${resolved}`);
    return {
      agent: record.agent,
      course: record.course,
      completedOn: record.completedOn,
      note: record.note,
      withFile: record.withFile,
      examPercent: resolved.examPercent,
      passed: resolved.passed,
      validUntil: resolved.validUntil,
    };
  });
}

export const SEED_FILE_NAME = "igazolas-minta.pdf";

/** A one-page PDF certificate placeholder, for trying the download. */
export function seedCertificatePdf(): Uint8Array {
  const text = "Minta igazolas (demo, helyorzo dokumentum)";
  const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
