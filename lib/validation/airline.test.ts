import { describe, expect, it } from "vitest";
import { airlineSchema } from "@/lib/validation/airline";

describe("airline form validation", () => {
  it("normalises the IATA code to upper case", () => {
    expect(airlineSchema.parse({ name: " Demo ", iataCode: " zz " })).toEqual({ name: "Demo", iataCode: "ZZ" });
  });

  it("accepts two letters or digits, or three letters", () => {
    expect(airlineSchema.safeParse({ name: "X", iataCode: "W6" }).success).toBe(true);
    expect(airlineSchema.safeParse({ name: "X", iataCode: "WZZ" }).success).toBe(true);
    expect(airlineSchema.safeParse({ name: "X", iataCode: "W" }).success).toBe(false);
    expect(airlineSchema.safeParse({ name: "X", iataCode: "W6Z" }).success).toBe(false);
    expect(airlineSchema.safeParse({ name: "X", iataCode: "WZZZ" }).success).toBe(false);
    expect(airlineSchema.safeParse({ name: "X", iataCode: "W-" }).success).toBe(false);
  });

  it("requires a name", () => {
    expect(airlineSchema.safeParse({ name: " ", iataCode: "ZZ" }).success).toBe(false);
  });
});
