import { describe, expect, it } from "vitest";
import { messages } from "@/lib/messages";
import { balanceText, rosterNote } from "@/lib/staffing/texts";

const t = messages.staffing;

describe("the words of the staffing views", () => {
  it("says what the roster of a day is, when it is not the actual one", () => {
    expect(rosterNote({ rosterLayer: "ACTUAL", hasRoster: true })).toBeNull();
    expect(rosterNote({ rosterLayer: "ACTUAL", hasRoster: false })).toBe(t.noRoster);
    expect(rosterNote({ rosterLayer: "DRAFT", hasRoster: true })).toBe(t.draftNote);
    expect(rosterNote({ rosterLayer: "DRAFT", hasRoster: false })).toBe(t.draftEmpty);
    // Whoever may not see the draft: only the demand of the day not yet published.
    expect(rosterNote({ rosterLayer: null, hasRoster: false })).toBe(t.unpublished);
  });

  it("gives the shortage and the surplus of a band, and a dash without a roster", () => {
    expect(balanceText({ hasRoster: true }, { balance: -2 })).toBe("−2 hiány");
    expect(balanceText({ hasRoster: true }, { balance: 1 })).toBe("+1 többlet");
    expect(balanceText({ hasRoster: true }, { balance: 0 })).toBe("0");
    expect(balanceText({ hasRoster: false }, { balance: -2 })).toBe("–");
  });
});
