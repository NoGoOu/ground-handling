import { describe, expect, it } from "vitest";
import { buildInfographic, type CurrentMessage } from "@/lib/telex/infographic";
import { parseMessage } from "@/lib/telex/parse";
import { CPM_LH, LDM_LH, PSM_LH, PSM_TK, PTM_TK, SAM, SRM } from "@/lib/telex/samples.fixture";
import { siLines } from "@/lib/telex/si";
import { splitMessages } from "@/lib/telex/split";

// The infographic of the 8. mérföldkő: the SI on top as it came, positions
// with their items and free quarters, urgent cargo and crew bags apart, PSM,
// PTM and the slot.

function current(text: string, id: string, at: string): CurrentMessage {
  const [message] = splitMessages(text).messages;
  return { ...parseMessage(message), id, receivedAt: new Date(at) } as CurrentMessage;
}

describe("the infographic of the Lufthansa arrival", () => {
  const lh = buildInfographic([
    current(LDM_LH, "ldm", "2026-09-27T10:40:00Z"),
    current(CPM_LH, "cpm", "2026-09-27T10:41:00Z"),
    current(PSM_LH, "psm", "2026-09-27T10:00:00Z"),
  ]);

  it("shows the SI of the LDM and the CPM on top, as it came, with the framed instruction and the DAA", () => {
    expect(lh.si.map((s) => s.type)).toEqual(["LDM", "CPM"]);
    const lines = siLines(lh.si[0].text);
    expect(lines.find((l) => l.kind === "daa")?.line).toBe("SI DAA/52/2/BUD//2 STROLLER.");
    expect(lines.filter((l) => l.kind === "instruction").map((l) => l.line)).toEqual([
      "TAILTIPPING CRITICAL AIRCRAFT  DO NOT START UNLOADING OF THE",
      "FORWARD HOLD BEFORE DEBOARDING HAS FINISHED.",
    ]);
    expect(lines.filter((l) => l.kind === "frame")).toHaveLength(2);
    expect(lines.at(-1)).toEqual({ line: "DHC/0/0", kind: "plain" });
  });

  it("gives each position its items, free quarters and urgent cargo", () => {
    const at = (position: string) => lh.ulds!.positions.find((p) => p.position === position)!;
    expect(at("52")).toMatchObject({
      items: [
        { weight: 47, category: "BC" },
        { weight: 187, category: "BY" },
      ],
      freeQuarters: 3,
      urgent: false,
    });
    expect(at("11")).toMatchObject({ freeQuarters: 0, uld: "AKH42390LH" });
    expect(at("42")).toMatchObject({ urgent: true, codes: ["XOM"] });
  });

  it("keeps the crew bags apart from the load and its categories", () => {
    expect(lh.load).toMatchObject({ total: 3336, crewBags: 30, source: { messageId: "ldm" } });
    expect(lh.load!.byCategory.map((c) => c.key)).not.toContain("D");
    expect(lh.load!.byCategory).toContainEqual({ key: "Q", value: 179 });
  });

  it("counts the special needs of the PSM per code and class", () => {
    expect(lh.specialNeeds).toEqual({
      codes: [{ code: "WCHR", byClass: [{ cls: "C", count: 1 }] }],
      sources: [{ messageId: "psm", type: "PSM", receivedAt: new Date("2026-09-27T10:00:00Z") }],
    });
    expect(lh.warnings).toEqual([]);
  });
});

describe("the infographic of the Turkish departure", () => {
  const tk = buildInfographic([
    current(PSM_TK, "psm", "2026-09-26T12:00:00Z"),
    current(PTM_TK, "ptm2", "2026-09-26T12:05:00Z"),
    // Another part of the PTM: the parts together give the state.
    current(PTM_TK.replace("PART2", "PART1").replace(/TK0720 BOM 1Y 1B11K MINTA\/A\n/, ""), "ptm1", "2026-09-26T12:04:00Z"),
  ]);

  it("adds the parts of the PTM together per onward flight", () => {
    expect(tk.transfers?.rows.find((r) => r.flight === "TK720")).toEqual({
      flight: "TK720",
      destination: "BOM",
      cls: "Y",
      pax: 3,
      bags: 1,
      weight: 11,
    });
    expect(tk.transfers?.sources.map((s) => s.messageId)).toEqual(["ptm2", "ptm1"]);
    expect(tk.specialNeeds?.codes).toEqual([{ code: "WCHS", byClass: [{ cls: "Y", count: 1 }] }]);
  });
});

describe("the slot on the infographic", () => {
  it("shows the latest slot of the flight plan with its target off-block", () => {
    const srm = SRM.replace("AA87996388", "AA87995557");
    const info = buildInfographic([current(SAM, "sam", "2026-09-27T10:00:00Z"), current(srm, "srm", "2026-09-27T10:30:00Z")]);
    expect(info.slot).toMatchObject({
      title: "SRM",
      ctot: new Date("2026-09-27T13:00:00Z"),
      targetOffBlock: new Date("2026-09-27T12:48:00Z"),
      source: { messageId: "srm", type: "SRM" },
    });
  });
});
