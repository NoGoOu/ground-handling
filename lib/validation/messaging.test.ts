import { describe, expect, it } from "vitest";
import { fieldErrors } from "@/lib/validation/form";
import { addressSchema, senderSchema } from "@/lib/validation/messaging";

const base = { airlineId: "a1", messageType: "MVT", channel: "EMAIL", address: " Ops@Example.INVALID " };

describe("the address book (7. mérföldkő)", () => {
  it("takes an email address or a SITA Type B address", () => {
    expect(addressSchema.parse(base)).toEqual({ airlineId: "a1", messageType: "MVT", channel: "EMAIL", address: "ops@example.invalid" });
    expect(addressSchema.parse({ ...base, channel: "SITA", address: "budxxzz" }).address).toBe("BUDXXZZ");
  });

  it("refuses an address that does not fit its channel", () => {
    const errors = (input: Record<string, string>) => {
      const result = addressSchema.safeParse({ ...base, ...input });
      return result.success ? {} : fieldErrors(result.error);
    };
    expect(errors({ address: "not an email" })).toHaveProperty("address");
    expect(errors({ channel: "SITA", address: "BUDXX" })).toHaveProperty("address");
    expect(errors({ channel: "SITA", address: "ops@example.invalid" })).toHaveProperty("address");
    expect(errors({ messageType: "PTM" })).toHaveProperty("messageType");
    expect(errors({ channel: "FAX" })).toHaveProperty("channel");
  });
});

describe("the sender", () => {
  it("may be left empty, or be an email and a Type B address", () => {
    expect(senderSchema.parse({ senderEmail: " ", senderTypeB: "" })).toEqual({ senderEmail: null, senderTypeB: null });
    expect(senderSchema.parse({ senderEmail: "GH@example.invalid", senderTypeB: "budghzz" })).toEqual({
      senderEmail: "gh@example.invalid",
      senderTypeB: "BUDGHZZ",
    });
    expect(senderSchema.safeParse({ senderEmail: "x", senderTypeB: "" }).success).toBe(false);
    expect(senderSchema.safeParse({ senderEmail: "", senderTypeB: "BUD" }).success).toBe(false);
  });
});
