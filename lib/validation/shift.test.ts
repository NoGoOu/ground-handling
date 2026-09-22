import { describe, expect, it } from "vitest";
import { fieldErrors } from "@/lib/validation/form";
import { findOverlappingShift, shiftSchema, type ShiftFormInput } from "@/lib/validation/shift";

const valid: ShiftFormInput = {
  userId: "agent-1",
  startsAt: "2026-09-22T06:00",
  endsAt: "2026-09-22T14:00",
  note: "  Reggeles  ",
};

function errorsFor(input: Partial<ShiftFormInput>) {
  const result = shiftSchema.safeParse({ ...valid, ...input });
  return result.success ? {} : fieldErrors(result.error);
}

describe("shift form validation", () => {
  it("converts local times to UTC and trims the note", () => {
    const data = shiftSchema.parse(valid);
    expect(data.startsAt.toISOString()).toBe("2026-09-22T04:00:00.000Z");
    expect(data.endsAt.toISOString()).toBe("2026-09-22T12:00:00.000Z");
    expect(data.note).toBe("Reggeles");
  });

  it("treats an empty note as none", () => {
    expect(shiftSchema.parse({ ...valid, note: "" }).note).toBeNull();
  });

  it("requires an agent and valid times", () => {
    expect(errorsFor({ userId: "" })).toHaveProperty("userId");
    expect(errorsFor({ startsAt: "" })).toHaveProperty("startsAt");
    expect(errorsFor({ endsAt: "nem idő" })).toHaveProperty("endsAt");
  });

  it("requires the end to be after the start", () => {
    expect(errorsFor({ endsAt: "2026-09-22T06:00" })).toHaveProperty("endsAt");
  });

  it("allows a shift that crosses midnight", () => {
    const data = shiftSchema.parse({ ...valid, startsAt: "2026-09-22T22:00", endsAt: "2026-09-23T06:00" });
    expect(data.endsAt.getTime()).toBeGreaterThan(data.startsAt.getTime());
  });
});

describe("overlapping shifts", () => {
  const at = (iso: string) => new Date(iso);
  const existing = [
    { id: "a", start: at("2026-09-22T04:00:00Z"), end: at("2026-09-22T12:00:00Z") },
    { id: "b", start: at("2026-09-22T20:00:00Z"), end: at("2026-09-23T04:00:00Z") },
  ];

  it("finds a shift that overlaps the candidate", () => {
    const hit = findOverlappingShift(existing, { startsAt: at("2026-09-22T11:00:00Z"), endsAt: at("2026-09-22T13:00:00Z") });
    expect(hit?.id).toBe("a");
  });

  it("allows shifts that only touch", () => {
    const hit = findOverlappingShift(existing, { startsAt: at("2026-09-22T12:00:00Z"), endsAt: at("2026-09-22T20:00:00Z") });
    expect(hit).toBeNull();
  });

  it("ignores the shift being edited", () => {
    const candidate = { id: "a", startsAt: at("2026-09-22T05:00:00Z"), endsAt: at("2026-09-22T13:00:00Z") };
    expect(findOverlappingShift(existing, candidate)).toBeNull();
  });

  it("catches an overlap with a shift that crosses midnight", () => {
    const hit = findOverlappingShift(existing, { startsAt: at("2026-09-23T03:00:00Z"), endsAt: at("2026-09-23T07:00:00Z") });
    expect(hit?.id).toBe("b");
  });
});
