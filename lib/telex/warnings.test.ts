import { describe, expect, it } from "vitest";
import { messages } from "@/lib/messages";
import { WARNING_CODES } from "@/lib/telex/warnings";

describe("warning texts", () => {
  it("has a Hungarian text for every warning", () => {
    const texts: Record<string, string> = messages.telex.warnings;
    expect(WARNING_CODES.filter((code) => !texts[code])).toEqual([]);
  });
});
