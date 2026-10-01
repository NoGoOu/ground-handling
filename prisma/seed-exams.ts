import type { QuestionData } from "@/lib/data/exams";
import type { SeedQualificationCode } from "./seed-training";

// Exam demo data (CLAUDE.md, 10. mérföldkő, 9. lépés): a training with both
// parts and a short question bank, a theory-only refresher, and the answers of
// the demo attempts. Pure, so it can be tested without a database. The
// questions are placeholders, written for the demo.

/** The parts of the demo trainings; the OJT requirement is lowered so that the demo can show it met. */
export const SEED_EXAM_TRAININGS = [
  { course: "Helyőrző A képzés", theoryPart: true, practicalPart: true, ojtRequiredCount: 2 },
  { course: "Helyőrző C képzés", theoryPart: true, practicalPart: false },
] as const;

export type SeedQuestionKey = "prm" | "dg" | "ata" | "noShow" | "quick";

export const SEED_QUESTIONS: Record<SeedQuestionKey, QuestionData> = {
  prm: {
    text: "Mit jelent a PRM rövidítés?",
    kind: "SINGLE",
    points: 2,
    topic: "Utaskiszolgálás",
    active: true,
    options: [
      { text: "Csökkent mozgásképességű utas", correct: true },
      { text: "Kiemelt ügyfél", correct: false },
      { text: "A személyzet tagja", correct: false },
    ],
  },
  dg: {
    text: "Melyek tartoznak a veszélyes áruk közé?",
    kind: "MULTIPLE",
    points: 3,
    topic: "Veszélyes áru",
    active: true,
    options: [
      { text: "Lítiumelem", correct: true },
      { text: "Gyúlékony folyadék", correct: true },
      { text: "Papírkönyv", correct: false },
      { text: "Sűrített gáz", correct: true },
    ],
  },
  ata: {
    text: "Mit jelent az ATA?",
    kind: "SINGLE",
    points: 1,
    topic: "Fordulókiszolgálás",
    active: true,
    options: [
      { text: "A tényleges érkezést (on-block)", correct: true },
      { text: "A menetrend szerinti érkezést", correct: false },
      { text: "A várható érkezést", correct: false },
    ],
  },
  noShow: {
    text: "Írd le röviden, mi a teendő, ha egy utas a beszállításkor nem jelenik meg a kapunál.",
    kind: "TEXT",
    points: 4,
    topic: "Utaskiszolgálás",
    active: true,
    options: [],
  },
  quick: {
    text: "Gyors fordulónál ki végzi az indulási részt?",
    kind: "SINGLE",
    points: 1,
    topic: "Fordulókiszolgálás",
    active: true,
    options: [
      { text: "Az érkezési ügynök", correct: true },
      { text: "Az indulási ügynök", correct: false },
      { text: "A műszakvezető", correct: false },
    ],
  },
};

export const SEED_SHEETS = [
  {
    name: "Helyőrző A – elméleti vizsga",
    course: "Helyőrző A képzés",
    timeLimitMinutes: 20,
    multipleScoring: "ALL_OR_NOTHING" as const,
    questions: ["prm", "dg", "ata", "noShow"] as SeedQuestionKey[],
  },
  {
    name: "Helyőrző C – ismétlő vizsga",
    course: "Helyőrző C képzés",
    timeLimitMinutes: null,
    multipleScoring: "ALL_OR_NOTHING" as const,
    questions: ["prm", "ata", "quick"] as SeedQuestionKey[],
  },
] as const;

export const SEED_CRITERIA = {
  course: "Helyőrző A képzés",
  texts: [
    "Biztonságos munkavégzés az előtéren",
    "A mérföldkövek pontos és időben történő rögzítése",
    "Kommunikáció a személyzettel és az utasokkal",
  ],
} as const;

/** One answer per question of a sheet, by the question's place. */
export type SeedAnswers = { choices: number[]; text: string | null }[];

/**
 * The demo attempts. Nagy Eszter's two-part training is half way: an attempt
 * that failed (the DG question half right, the written answer half scored),
 * and one opened for her to fill. Her theory-only refresher has a passed
 * attempt, so it is ready for release.
 */
export const SEED_ATTEMPTS = {
  failed: {
    sheet: "Helyőrző A – elméleti vizsga",
    answers: [
      { choices: [0], text: null },
      { choices: [0, 1], text: null },
      { choices: [0], text: null },
      { choices: [], text: "Szólok a kapunál, és megvárom a gépet." },
    ] satisfies SeedAnswers,
    /** The examiner's points for the written answer, and the notes. */
    writtenPoints: 2,
    graderNote: "A poggyász kirakodását és a műszakvezető értesítését nem említi.",
    feedback: "A veszélyes áruknál minden helyes választ jelölj meg; a no-show eljárást ismételd át.",
    internalNote: "A DG-témakört és a no-show eljárást a következő kísérlet előtt át kell venni vele.",
  },
  passed: {
    sheet: "Helyőrző C – ismétlő vizsga",
    answers: [
      { choices: [0], text: null },
      { choices: [0], text: null },
      { choices: [0], text: null },
    ] satisfies SeedAnswers,
    feedback: "Hibátlan.",
  },
} as const;

/** The practice of the half-way process: on the completed quick turnaround, next to Kiss Péter. */
export const SEED_PRACTICE = {
  flight: "ZZ1101",
  /** The milestones the trainee recorded herself. */
  traineeRecords: ["FRONT_DOOR_OPEN", "FIRST_PAX_OUT", "LAST_PAX_OUT", "FIRST_PAX_IN", "LAST_PAX_IN"],
  comment: "Önállóan és pontosan rögzített; a beszállításnál még segítséget kért.",
} as const;

/** The examiner's own records: the qualifications they judge, valid on any run day. */
export const SEED_EXAMINER_QUALIFICATIONS: SeedQualificationCode[] = ["HA", "HC"];
