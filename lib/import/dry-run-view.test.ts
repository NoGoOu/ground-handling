import { describe, expect, it } from "vitest";
import { diffImport, planPeriod, type ExistingFlight } from "@/lib/import/diff";
import { dryRunView } from "@/lib/import/dry-run-view";
import { NETLINE_MAPPING, netlineTable } from "@/lib/import/netline.fixture";
import { planImport } from "@/lib/import/pairing";

const plan = planImport(netlineTable(), NETLINE_MAPPING);
const period = planPeriod(plan, null);
const airlines = [{ id: "fr", code: "FR", defaultTemplateId: "tpl" }];

describe("dry run of the sample", () => {
  const diff = diffImport({ plan, existing: [], airlines, profileId: "p", period });
  const view = dryRunView({ plan, diff, existing: [], period, profileId: "p" });

  it("counts new, unpaired and filtered rows", () => {
    expect(view.summary).toEqual({
      new: 50,
      changed: 0,
      repaired: 0,
      unchanged: 0,
      conflicts: 0,
      errors: 0,
      unpaired: 23,
      missing: 0,
    });
    expect(view.filteredRows).toBe(2);
    expect(view.totalRows).toBe(14);
    expect(view.period).toEqual({ start: "2024-09-10", end: "2025-01-07" });
  });

  it("lists the new flights with Budapest times", () => {
    const newGroup = view.groups.find((g) => g.kind === "new")!;
    expect(newGroup.rows).toHaveLength(50);
    // FR1659, departure-only, Tuesday 05:00 UTC = 07:00 in Budapest.
    expect(newGroup.rows[0]).toEqual(["FR1659", "–", "2024. 09. 10. 07:00 · STN", "Csak induló", ""]);
  });

  it("shortens long lists", () => {
    const short = dryRunView({ plan, diff, existing: [], period, profileId: null, limit: 10 });
    const newGroup = short.groups.find((g) => g.kind === "new")!;
    expect(newGroup.rows).toHaveLength(10);
    expect(newGroup.more).toBe(40);
    expect(short.missingChecked).toBe(false);
  });
});

describe("dry run with a flight missing from the file", () => {
  const gone: ExistingFlight = {
    id: "gone",
    airline: "FR",
    inboundFlightNumber: "FR9999",
    outboundFlightNumber: null,
    arrivalFlightDate: "2024-09-10",
    departureFlightDate: null,
    origin: "PMI",
    destination: null,
    sta: new Date("2024-09-10T09:50:00Z"),
    std: null,
    aircraftType: null,
    aircraftConfig: null,
    importProfileId: "p",
    operational: false,
  };
  const diff = diffImport({ plan, existing: [gone], airlines, profileId: "p", period });
  const view = dryRunView({ plan, diff, existing: [gone], period, profileId: "p" });

  it("lists it with its kind and the missing parts", () => {
    expect(view.summary.missing).toBe(1);
    const missing = view.groups.find((g) => g.kind === "missing")!;
    expect(missing.rows).toEqual([["FR9999", "2024. 09. 10. 11:50 · PMI", "–", "Csak érkező", "érkezés"]]);
  });
});
