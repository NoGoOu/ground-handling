import { describe, expect, it } from "vitest";
import { isProduction, productionConfigProblems, seedAllowed } from "@/lib/ops/config";
import { appVersion } from "@/lib/ops/version";
import { parseFirstAdmin } from "@/lib/ops/first-admin";

// Production mode (CLAUDE.md, 13. mérföldkő, "Telepítés").

const good = {
  APP_ENV: "production",
  DOMAIN: "beosztas.example.com",
  APP_PUBLIC_URL: "https://beosztas.example.com",
  AUTH_SECRET: "k3Jx9vQ2mLp7Rt4Wz8Yb1Nc6Hd5Fg0Sa2Ue7Io9",
  POSTGRES_PASSWORD: "c0rrect-h0rse-battery-staple",
  DATABASE_URL: "postgresql://ground_handling:secret@db:5432/ground_handling",
};

describe("the production settings", () => {
  it("accept a complete set, with or without SMTP", () => {
    expect(productionConfigProblems(good)).toEqual([]);
    expect(productionConfigProblems({ ...good, SMTP_HOST: "smtp.example.com", SMTP_PORT: "587", SMTP_SECURE: "false" })).toEqual([]);
  });

  it("name every missing setting", () => {
    expect(productionConfigProblems({ APP_ENV: "production" })).toEqual([
      "DOMAIN: hiányzik",
      "APP_PUBLIC_URL: hiányzik",
      "AUTH_SECRET: hiányzik",
      "POSTGRES_PASSWORD: hiányzik",
      "DATABASE_URL: hiányzik",
    ]);
    expect(productionConfigProblems({ ...good, AUTH_SECRET: "   " })).toEqual(["AUTH_SECRET: hiányzik"]);
  });

  it("refuse the demo values and short secrets, and never print a value", () => {
    const problems = productionConfigProblems({
      ...good,
      AUTH_SECRET: "insecure-demo-secret-change-me",
      POSTGRES_PASSWORD: "short-pass",
    });
    expect(problems).toEqual([
      "AUTH_SECRET: a demo értéke; éles módban saját érték kell",
      "POSTGRES_PASSWORD: legalább 16 karakter kell",
    ]);
    expect(problems.join(" ")).not.toContain("short-pass");
    expect(productionConfigProblems({ ...good, POSTGRES_PASSWORD: "ground_handling" })).toEqual([
      "POSTGRES_PASSWORD: a demo értéke; éles módban saját érték kell",
    ]);
    expect(productionConfigProblems({ ...good, AUTH_SECRET: "x".repeat(31) })).toEqual(["AUTH_SECRET: legalább 32 karakter kell"]);
    // The database password goes into DATABASE_URL as it is.
    expect(productionConfigProblems({ ...good, POSTGRES_PASSWORD: "p@ss:word/with#marks" })).toEqual([
      "POSTGRES_PASSWORD: csak betű, számjegy és a - _ . ~ jelek lehetnek benne (pl. openssl rand -hex 24)",
    ]);
  });

  it("want an https public address on the domain", () => {
    expect(productionConfigProblems({ ...good, APP_PUBLIC_URL: "http://beosztas.example.com" })).toEqual([
      "APP_PUBLIC_URL: https:// kezdetű nyilvános cím kell (pl. https://beosztas.example.com)",
    ]);
    // Plain http is for development on localhost, never for production.
    expect(productionConfigProblems({ ...good, DOMAIN: "localhost", APP_PUBLIC_URL: "http://localhost" })).toHaveLength(1);
    expect(productionConfigProblems({ ...good, APP_PUBLIC_URL: "https://other.example.com" })).toEqual([
      "APP_PUBLIC_URL: a gépneve nem egyezik a DOMAIN-nel",
    ]);
    expect(productionConfigProblems({ ...good, DOMAIN: "https://beosztas.example.com" })[0]).toMatch(/^DOMAIN: /);
    // The local trial of the production setup runs on https://localhost.
    expect(productionConfigProblems({ ...good, DOMAIN: "localhost", APP_PUBLIC_URL: "https://localhost" })).toEqual([]);
  });

  it("check the form of the SMTP settings only when SMTP is set", () => {
    expect(productionConfigProblems({ ...good, SMTP_PORT: "x" })).toEqual([]);
    expect(productionConfigProblems({ ...good, SMTP_HOST: "smtp.example.com", SMTP_PORT: "70000", SMTP_SECURE: "yes" })).toEqual([
      "SMTP_PORT: 1 és 65535 közötti szám kell",
      "SMTP_SECURE: true vagy false lehet",
    ]);
  });

  it("refuse the demo seed in production only", () => {
    expect(isProduction(good)).toBe(true);
    expect(seedAllowed(good)).toBe(false);
    expect(seedAllowed({})).toBe(true);
    expect(seedAllowed({ APP_ENV: "development" })).toBe(true);
  });
});

describe("the first admin", () => {
  it("follows the rules of the user form", () => {
    expect(parseFirstAdmin({ name: " Üzemeltető Ödön ", username: "Admin.Odon", password: "hosszu-jelszo" })).toEqual({
      ok: true,
      data: { name: "Üzemeltető Ödön", username: "admin.odon", password: "hosszu-jelszo" },
    });
    expect(parseFirstAdmin({ name: "", username: "admin", password: "hosszu-jelszo" }).ok).toBe(false);
    expect(parseFirstAdmin({ name: "Ödön", username: "a b", password: "hosszu-jelszo" }).ok).toBe(false);
    expect(parseFirstAdmin({ name: "Ödön", username: "admin", password: "rovid" }).ok).toBe(false);
  });
});

describe("the running version", () => {
  it("comes from the build, or is unknown", () => {
    expect(appVersion({ APP_COMMIT: "8df7a26", APP_BUILD_DATE: "2026-10-02T10:00:00Z" })).toEqual({ commit: "8df7a26", date: "2026-10-02T10:00:00Z" });
    expect(appVersion({})).toEqual({ commit: "unknown", date: "unknown" });
    expect(appVersion({ APP_COMMIT: " " })).toEqual({ commit: "unknown", date: "unknown" });
  });
});
