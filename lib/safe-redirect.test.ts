import { describe, expect, it } from "vitest";
import { safeCallbackPath } from "@/lib/safe-redirect";

describe("safeCallbackPath", () => {
  it("keeps relative paths", () => {
    expect(safeCallbackPath("/tasks/abc?x=1")).toBe("/tasks/abc?x=1");
  });

  it("falls back to / for anything that could leave the site", () => {
    for (const value of ["https://evil.example", "//evil.example", "/\\evil.example", "tasks", "", null, 42]) {
      expect(safeCallbackPath(value)).toBe("/");
    }
  });
});
