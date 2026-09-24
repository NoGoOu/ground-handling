import { describe, expect, it } from "vitest";
import { delayPartErrors, delaySchema } from "@/lib/validation/delay";

const turnaround = {
  sta: new Date("2026-09-24T08:00:00Z"),
  std: new Date("2026-09-24T09:00:00Z"),
  arrivalCancelled: false,
  departureCancelled: false,
};

describe("delay form validation", () => {
  it("takes a new ETA and/or ETD with a source note", () => {
    const data = delaySchema.parse({ eta: "2026-09-24T10:20", etd: "", note: " email a légitársaságtól " });
    expect(data.eta?.toISOString()).toBe("2026-09-24T08:20:00.000Z");
    expect(data.etd).toBeNull();
    expect(data.note).toBe("email a légitársaságtól");
  });

  it("needs at least one new estimate", () => {
    expect(delaySchema.safeParse({ eta: "", etd: "", note: "email" }).success).toBe(false);
  });

  it("keeps the note short", () => {
    expect(delaySchema.safeParse({ eta: "2026-09-24T10:20", etd: "", note: "x".repeat(201) }).success).toBe(false);
  });
});

describe("which parts can be delayed", () => {
  const eta = new Date("2026-09-24T08:20:00Z");
  const etd = new Date("2026-09-24T09:20:00Z");

  it("accepts estimates for both parts of a turnaround", () => {
    expect(delayPartErrors({ eta, etd }, turnaround)).toEqual({});
  });

  it("refuses an estimate for a part the flight does not have", () => {
    expect(delayPartErrors({ eta, etd: null }, { ...turnaround, sta: null })).toHaveProperty("eta");
    expect(delayPartErrors({ eta: null, etd }, { ...turnaround, std: null })).toHaveProperty("etd");
  });

  it("refuses an estimate for a cancelled part", () => {
    expect(delayPartErrors({ eta, etd: null }, { ...turnaround, arrivalCancelled: true })).toHaveProperty("eta");
    expect(delayPartErrors({ eta: null, etd }, { ...turnaround, departureCancelled: true })).toHaveProperty("etd");
  });
});
