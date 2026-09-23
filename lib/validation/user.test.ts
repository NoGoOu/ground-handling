import { describe, expect, it } from "vitest";
import { fieldErrors } from "@/lib/validation/form";
import { editUserSchema, newUserSchema } from "@/lib/validation/user";

const input = {
  name: " Teszt Elek ",
  username: " Teszt.Elek ",
  password: "titkos123",
  active: "on",
};

describe("user form validation", () => {
  it("normalises the name and username", () => {
    expect(newUserSchema.parse(input)).toMatchObject({ name: "Teszt Elek", username: "teszt.elek", active: true });
  });

  it("reads an unticked checkbox as inactive", () => {
    expect(newUserSchema.parse({ ...input, active: "" }).active).toBe(false);
  });

  it("rejects bad usernames and short passwords", () => {
    const result = newUserSchema.safeParse({ ...input, username: "a b", password: "short" });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(fieldErrors(result.error)).sort()).toEqual(["password", "username"]);
  });

  it("keeps the password when it is left empty on edit", () => {
    expect(editUserSchema.parse({ ...input, password: "" }).password).toBeNull();
    expect(editUserSchema.parse(input).password).toBe("titkos123");
    expect(editUserSchema.safeParse({ ...input, password: "short" }).success).toBe(false);
  });
});
