import { DEMO_MILESTONES, DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import { localToUtc, parseLocalDate } from "@/lib/time";

// Demo data for one day (CLAUDE.md, MVP point 3). Pure, so it can be tested without a database.

export const DEMO_PASSWORD = "demo1234";

export const SEED_USERS = [
  { username: "admin", name: "Admin Adél", role: "ADMIN" },
  { username: "vezeto", name: "Vezető Viktor", role: "SHIFT_LEAD" },
  { username: "ugynok1", name: "Kiss Péter", role: "AGENT" },
  { username: "ugynok2", name: "Nagy Eszter", role: "AGENT" },
] as const;

export type SeedUsername = (typeof SEED_USERS)[number]["username"];

export const SEED_AIRLINE = { name: "Demo Fapados", iataCode: "ZZ" };
export const SEED_TEMPLATE = { name: "Alap", ...DEMO_TEMPLATE_PARAMS };
export const SEED_MILESTONES = DEMO_MILESTONES;

export interface SeedFlight {
  inboundFlightNumber: string;
  outboundFlightNumber: string;
  stand: string;
  sta: Date;
  eta: Date | null;
  std: Date;
  etd: Date | null;
  ata: Date | null;
  atd: Date | null;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED";
  arrivalAgent: SeedUsername | null;
  departureAgent: SeedUsername | null;
  /** Agent records by milestone code. */
  records: { code: string; time: Date; by: SeedUsername }[];
}

export function buildSeedFlights(localDate: string): SeedFlight[] {
  const day = parseLocalDate(localDate);
  if (!day) throw new Error(`Invalid seed date: ${localDate}`);
  const at = (hhmm: string) => {
    const [hour, minute] = hhmm.split(":").map(Number);
    return localToUtc(day.year, day.month, day.day, hour, minute);
  };
  const recordsBy = (by: SeedUsername, entries: [string, string][]) =>
    entries.map(([code, hhmm]) => ({ code, time: at(hhmm), by }));

  return [
    {
      // Quick turnaround, completed, with ATA/ATD from the external system
      // that differ from the agent's own records.
      inboundFlightNumber: "ZZ1101",
      outboundFlightNumber: "ZZ1102",
      stand: "31",
      sta: at("07:30"),
      eta: null,
      std: at("07:55"),
      etd: null,
      ata: at("07:34"),
      atd: at("08:01"),
      status: "COMPLETED",
      arrivalAgent: "ugynok1",
      departureAgent: "ugynok1",
      records: recordsBy("ugynok1", [
        ["ATA", "07:35"],
        ["FRONT_DOOR_OPEN", "07:35"],
        ["BACK_DOOR_OPEN", "07:36"],
        ["FIRST_PAX_OUT", "07:37"],
        ["LAST_PAX_OUT", "07:45"],
        ["FIRST_PAX_IN", "07:50"],
        ["LAST_PAX_IN", "07:55"],
        ["CABIN_DOOR_CLOSE", "07:57"],
        ["ALL_DOOR_CLOSE", "07:59"],
        ["ATD", "08:00"],
      ]),
    },
    {
      // Long turnaround with two agents.
      inboundFlightNumber: "ZZ1203",
      outboundFlightNumber: "ZZ1204",
      stand: "33",
      sta: at("10:00"),
      eta: at("10:10"),
      std: at("12:30"),
      etd: null,
      ata: null,
      atd: null,
      status: "PLANNED",
      arrivalAgent: "ugynok1",
      departureAgent: "ugynok2",
      records: [],
    },
    {
      // Quick turnaround overlapping the next one.
      inboundFlightNumber: "ZZ1305",
      outboundFlightNumber: "ZZ1306",
      stand: "35",
      sta: at("16:00"),
      eta: null,
      std: at("16:30"),
      etd: null,
      ata: null,
      atd: null,
      status: "PLANNED",
      arrivalAgent: "ugynok2",
      departureAgent: "ugynok2",
      records: [],
    },
    {
      // Quick turnaround overlapping the previous one, not yet assigned.
      inboundFlightNumber: "ZZ1407",
      outboundFlightNumber: "ZZ1408",
      stand: "37",
      sta: at("16:20"),
      eta: null,
      std: at("17:00"),
      etd: at("17:10"),
      ata: null,
      atd: null,
      status: "PLANNED",
      arrivalAgent: null,
      departureAgent: null,
      records: [],
    },
  ];
}
