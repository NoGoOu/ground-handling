import { describe, expect, it } from "vitest";
import { messages } from "@/lib/messages";

function collectEntries(node: unknown, path: string[] = []): [string, unknown][] {
  if (node !== null && typeof node === "object") {
    return Object.entries(node).flatMap(([key, value]) =>
      collectEntries(value, [...path, key]),
    );
  }
  return [[path.join("."), node]];
}

describe("messages", () => {
  it("contains only non-empty strings", () => {
    for (const [key, value] of collectEntries(messages)) {
      expect(typeof value, key).toBe("string");
      expect((value as string).trim(), key).not.toBe("");
    }
  });
});
