import type { FieldKind } from "@/lib/equipment/status";
import { addDays } from "@/lib/time";
import type { FieldValueData } from "@/lib/validation/equipment";

// Demo ground equipment and faults (CLAUDE.md, 11. mérföldkő, 8. lépés).
// Pure, so it can be tested without a database: the deadlines are days from
// the seed's day, so every state (valid, expiring soon, expired, missing) can
// be tried whenever the seed runs.

/** The technical staff's demo user; also listed among the seed users. */
export const SEED_TECHNICIAN = "muszaki";

interface SeedField {
  name: string;
  kind: FieldKind;
  unit?: string;
}

// The base fields of CLAUDE.md: the roadworthiness test (deadline), the service
// due (a deadline and the counter's due value, approved decision 1), and the
// operating hours or kilometres (counter).
const INSPECTION: SeedField = { name: "Műszaki vizsga lejárata", kind: "DEADLINE" };
const SERVICE: SeedField = { name: "Szerviz esedékessége", kind: "DEADLINE" };
const HOURS: SeedField = { name: "Üzemóra", kind: "COUNTER", unit: "üzemóra" };
const KILOMETRES: SeedField = { name: "Kilométeróra", kind: "COUNTER", unit: "km" };

export const SEED_EQUIPMENT_TYPES: readonly { name: string; code: string; fields: readonly SeedField[] }[] = [
  { name: "Pushback", code: "PBK", fields: [INSPECTION, SERVICE, HOURS, { name: "Gyári szám", kind: "TEXT" }] },
  { name: "Szalagkocsi", code: "BLT", fields: [INSPECTION, SERVICE, HOURS] },
  { name: "Utasbusz", code: "BUS", fields: [INSPECTION, SERVICE, KILOMETRES] },
  // Not motorised: only a service deadline.
  { name: "Utaslépcső", code: "STR", fields: [SERVICE] },
];

/** A deadline in days from the seed's day, a counter reading with its due value, or a text. */
export type SeedValue = { days: number } | { value: number; due: number | null } | { text: string };

export interface SeedEquipment {
  identifier: string;
  type: string;
  plate?: string;
  description?: string;
  values: Readonly<Record<string, SeedValue>>;
  /** An earlier reading of a counter, so the value log shows a change. */
  earlier?: { field: string; value: number; due: number | null };
  retired?: string;
  document?: { fileName: string; lines: readonly string[] };
}

export const SEED_EQUIPMENT: readonly SeedEquipment[] = [
  {
    identifier: "PB-01",
    type: "PBK",
    plate: "ZZP-001",
    description: "Vonórudas pushback, keskenytörzsű gépekhez",
    values: {
      "Műszaki vizsga lejárata": { days: 200 },
      "Szerviz esedékessége": { days: 12 },
      Üzemóra: { value: 1480, due: 1500 },
      "Gyári szám": { text: "TUG-2019-0457" },
    },
    earlier: { field: "Üzemóra", value: 1420, due: 1500 },
    document: {
      fileName: "PB-01 szervizlap (minta).pdf",
      lines: ["PB-01 pushback - szervizlap (minta)", "", "Utolso szerviz: olajcsere, szurok, fekek ellenorzese.", "Kovetkezo szerviz: 1500 uzemora."],
    },
  },
  {
    identifier: "PB-02",
    type: "PBK",
    plate: "ZZP-002",
    values: {
      "Műszaki vizsga lejárata": { days: -5 },
      "Szerviz esedékessége": { days: 90 },
      Üzemóra: { value: 2012, due: 2000 },
      "Gyári szám": { text: "TUG-2020-0611" },
    },
  },
  {
    identifier: "BLT-01",
    type: "BLT",
    values: {
      "Műszaki vizsga lejárata": { days: 25 },
      "Szerviz esedékessége": { days: 150 },
      Üzemóra: { value: 640, due: 1000 },
    },
  },
  {
    // The roadworthiness test is not recorded yet: "nincs megadva".
    identifier: "BLT-02",
    type: "BLT",
    values: {
      "Szerviz esedékessége": { days: -20 },
      Üzemóra: { value: 310, due: null },
    },
  },
  {
    identifier: "BUS-01",
    type: "BUS",
    plate: "ZZB-101",
    description: "Apron busz, 80 fő",
    values: {
      "Műszaki vizsga lejárata": { days: 300 },
      "Szerviz esedékessége": { days: 3 },
      Kilométeróra: { value: 84250, due: 90000 },
    },
  },
  {
    // Retired: its expired deadline does not show on the expiring list.
    identifier: "BUS-02",
    type: "BUS",
    plate: "ZZB-102",
    values: {
      "Műszaki vizsga lejárata": { days: -60 },
      "Szerviz esedékessége": { days: -90 },
      Kilométeróra: { value: 412800, due: 400000 },
    },
    retired: "Selejtezve, alkatrésznek megtartva.",
  },
  {
    identifier: "STR-01",
    type: "STR",
    values: { "Szerviz esedékessége": { days: 40 } },
  },
];

export interface SeedFault {
  equipment: string;
  reportedBy: string;
  description: string;
  outOfService: boolean;
  /** Hours before the seed ran. */
  reportedHoursAgo: number;
  taken?: { hoursAgo: number };
  comments?: readonly { text: string; hoursAgo: number }[];
  closed?: { hoursAgo: number; resolution: "FIXED" | "NOT_A_FAULT"; restore: boolean };
}

/** One open, one in progress and one closed fault (8. lépés). */
export const SEED_FAULTS: readonly SeedFault[] = [
  {
    equipment: "STR-01",
    reportedBy: "ugynok2",
    description: "A bal oldali korlát rögzítése laza, mozog, ha nekidőlnek.",
    outOfService: false,
    reportedHoursAgo: 1,
  },
  {
    equipment: "PB-02",
    reportedBy: "ugynok1",
    description: "Indításkor erősen füstöl, a motor egyenetlenül jár. Leállítottam, a 3-as állóhely mögött áll.",
    outOfService: true,
    reportedHoursAgo: 4,
    taken: { hoursAgo: 3 },
    comments: [{ text: "Átvettem. Üzemanyagszűrő-csere, ma délután kész lesz; addig ne használjátok.", hoursAgo: 3 }],
  },
  {
    equipment: "BUS-01",
    reportedBy: "vezeto",
    description: "Az első ajtó nagyon lassan nyílik, utasokkal nem használható.",
    outOfService: true,
    reportedHoursAgo: 50,
    taken: { hoursAgo: 48 },
    comments: [
      { text: "Ajtómotor és véghelyzet-kapcsoló beállítva.", hoursAgo: 27 },
      { text: "Kipróbálva, rendben nyit és zár.", hoursAgo: 26 },
    ],
    closed: { hoursAgo: 26, resolution: "FIXED", restore: true },
  },
];

/** The value of a field as the data functions take it. */
export function seedFieldValue(kind: FieldKind, value: SeedValue | undefined, localDate: string): FieldValueData {
  if (kind === "DEADLINE") return { kind, date: value && "days" in value ? addDays(localDate, value.days) : null };
  if (kind === "COUNTER") return { kind, value: value && "value" in value ? value.value : null, due: value && "due" in value ? value.due : null };
  return { kind, text: value && "text" in value ? value.text : null };
}
