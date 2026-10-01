import { describe, expect, it } from "vitest";
import { faultSchema, photosOf } from "@/lib/validation/faults";

describe("the fault report form", () => {
  it("takes the equipment, the description and the out-of-service mark", () => {
    expect(faultSchema.parse({ equipmentId: "e1", description: " Szivárog a hidraulika ", outOfService: "on" })).toEqual({
      equipmentId: "e1",
      description: "Szivárog a hidraulika",
      outOfService: true,
    });
    expect(faultSchema.parse({ equipmentId: "e1", description: "Kopott kerék", outOfService: "" }).outOfService).toBe(false);
  });

  it("needs the equipment and a description", () => {
    expect(faultSchema.safeParse({ equipmentId: "", description: "x", outOfService: "" }).success).toBe(false);
    expect(faultSchema.safeParse({ equipmentId: "e1", description: "  ", outOfService: "" }).success).toBe(false);
    expect(faultSchema.safeParse({ equipmentId: "e1", description: "x".repeat(2001), outOfService: "" }).success).toBe(false);
  });

  it("keeps only the photos that hold something", () => {
    const form = new FormData();
    form.append("photos", new File([new Uint8Array([1, 2, 3])], "a.jpg"));
    form.append("photos", new File([], ""));
    expect(photosOf(form).map((file) => file.name)).toEqual(["a.jpg"]);
  });
});
