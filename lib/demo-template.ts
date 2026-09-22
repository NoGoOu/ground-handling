import type { MilestoneDef, TemplateParams } from "@/lib/turnaround";

// The first template from CLAUDE.md ("Első sablon"). Used by the seed and by tests.

export const DEMO_TEMPLATE_PARAMS: TemplateParams = {
  minTurnaroundMinutes: 25,
  travelMinutes: 5,
  postDepartureMinutes: 15,
  departureReportMinutes: 40,
  minBreakMinutes: 15,
};

export const DEMO_MILESTONES: Omit<MilestoneDef, "id">[] = [
  { order: 1, code: "ATA", name: "ATA", anchor: "ARRIVAL", offsetMinutes: 0, required: true, part: "ARRIVAL_PART" },
  { order: 2, code: "FRONT_DOOR_OPEN", name: "Front door open", anchor: "ARRIVAL", offsetMinutes: 1, required: true, part: "ARRIVAL_PART" },
  { order: 3, code: "BACK_DOOR_OPEN", name: "Back door open", anchor: "ARRIVAL", offsetMinutes: 1, required: false, part: "ARRIVAL_PART" },
  { order: 4, code: "FIRST_PAX_OUT", name: "First pax out", anchor: "ARRIVAL", offsetMinutes: 2, required: true, part: "ARRIVAL_PART" },
  { order: 5, code: "LAST_PAX_OUT", name: "Last pax out", anchor: "ARRIVAL", offsetMinutes: 10, required: true, part: "ARRIVAL_PART" },
  { order: 6, code: "FIRST_PAX_IN", name: "First pax in", anchor: "DEPARTURE", offsetMinutes: -30, required: true, part: "DEPARTURE_PART" },
  { order: 7, code: "LAST_PAX_IN", name: "Last pax in", anchor: "DEPARTURE", offsetMinutes: -5, required: true, part: "DEPARTURE_PART" },
  { order: 8, code: "CABIN_DOOR_CLOSE", name: "Cabin door close", anchor: "DEPARTURE", offsetMinutes: -3, required: true, part: "DEPARTURE_PART" },
  { order: 9, code: "ALL_DOOR_CLOSE", name: "All door close", anchor: "DEPARTURE", offsetMinutes: -1, required: true, part: "DEPARTURE_PART" },
  { order: 10, code: "ATD", name: "Off-block (ATD)", anchor: "DEPARTURE", offsetMinutes: 0, required: true, part: "DEPARTURE_PART" },
];
