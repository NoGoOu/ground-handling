import { describe, expect, it } from "vitest";
import { fieldErrors } from "@/lib/validation/form";
import { editUserSchema, isSelfLockout, newUserSchema, type UserFormInput } from "@/lib/validation/user";

const input: UserFormInput = {
  name: " Teszt Elek ",
  username: " Teszt.Elek ",
  role: "AGENT",
  password: "titkos123",
  active: "on",
};

describe("user form validation", () => {
  it("normalises the name and username", () => {
    const data = newUserSchema.parse(input);
    expect(data).toMatchObject({ name: "Teszt Elek", username: "teszt.elek", role: "AGENT", active: true });
  });

  it("reads an unticked checkbox as inactive", () => {
    expect(newUserSchema.parse({ ...input, active: "" }).active).toBe(false);
  });

  it("rejects bad usernames, roles and short passwords", () => {
    const result = newUserSchema.safeParse({ ...input, username: "a b", role: "PILOT", password: "short" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(fieldErrors(result.error)).sort()).toEqual(["password", "role", "username"]);
    }
  });

  it("keeps the password when it is left empty on edit", () => {
    expect(editUserSchema.parse({ ...input, password: "" }).password).toBeNull();
    expect(editUserSchema.parse(input).password).toBe("titkos123");
    expect(editUserSchema.safeParse({ ...input, password: "short" }).success).toBe(false);
  });
});

describe("self lockout", () => {
  const admin = { id: "a" };

  it("stops admins from deactivating or demoting themselves", () => {
    expect(isSelfLockout(admin, admin, { role: "ADMIN", active: false })).toBe(true);
    expect(isSelfLockout(admin, admin, { role: "SHIFT_LEAD", active: true })).toBe(true);
    expect(isSelfLockout(admin, admin, { role: "ADMIN", active: true })).toBe(false);
  });

  it("allows changing other users", () => {
    expect(isSelfLockout(admin, { id: "b" }, { role: "AGENT", active: false })).toBe(false);
  });
});
