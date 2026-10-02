import { publicBaseUrl } from "@/lib/calendar/public-url";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";

// Production mode (CLAUDE.md, 13. mérföldkő, "Telepítés"): the settings are
// checked before the app starts, and nothing starts while one is missing or
// wrong. Pure functions over the environment; a problem names the setting,
// never its value, so no secret reaches the log.

export type Env = Readonly<Record<string, string | undefined>>;

const c = messages.ops.config;

/** The demo values of docker-compose.yml, which must not reach production. */
const DEMO_AUTH_SECRET = "insecure-demo-secret-change-me";
const DEMO_DB_PASSWORD = "ground_handling";

export const MIN_AUTH_SECRET_LENGTH = 32;
export const MIN_DB_PASSWORD_LENGTH = 16;

export function isProduction(env: Env): boolean {
  return env.APP_ENV === "production";
}

const value = (env: Env, name: string) => env[name]?.trim() ?? "";

/** A host name like "beosztas.example.com": no scheme, no port, no path. */
const HOST_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;

/** Every problem with the production settings, as "NAME: what is wrong"; empty when all is well. */
export function productionConfigProblems(env: Env): string[] {
  const problems: string[] = [];
  const add = (name: string, text: string) => problems.push(fmt(c.problem, { name, text }));

  const domain = value(env, "DOMAIN");
  if (!domain) add("DOMAIN", c.missing);
  else if (!HOST_RE.test(domain)) add("DOMAIN", c.domain);

  const publicUrl = value(env, "APP_PUBLIC_URL");
  const base = publicBaseUrl(publicUrl);
  if (!publicUrl) add("APP_PUBLIC_URL", c.missing);
  else if (!base || !base.startsWith("https://")) add("APP_PUBLIC_URL", c.publicUrl);
  else if (domain && new URL(base).hostname !== domain.toLowerCase()) add("APP_PUBLIC_URL", c.publicUrlDomain);

  const secret = value(env, "AUTH_SECRET");
  if (!secret) add("AUTH_SECRET", c.missing);
  else if (secret === DEMO_AUTH_SECRET) add("AUTH_SECRET", c.demoValue);
  else if (secret.length < MIN_AUTH_SECRET_LENGTH) add("AUTH_SECRET", fmt(c.tooShort, { min: MIN_AUTH_SECRET_LENGTH }));

  const dbPassword = value(env, "POSTGRES_PASSWORD");
  if (!dbPassword) add("POSTGRES_PASSWORD", c.missing);
  else if (dbPassword === DEMO_DB_PASSWORD) add("POSTGRES_PASSWORD", c.demoValue);
  else if (dbPassword.length < MIN_DB_PASSWORD_LENGTH) add("POSTGRES_PASSWORD", fmt(c.tooShort, { min: MIN_DB_PASSWORD_LENGTH }));

  if (!value(env, "DATABASE_URL")) add("DATABASE_URL", c.missing);

  // SMTP is optional: without it nothing is sent, only logged (7. mérföldkő).
  if (value(env, "SMTP_HOST")) {
    const port = value(env, "SMTP_PORT");
    if (port && !(/^\d+$/.test(port) && Number(port) >= 1 && Number(port) <= 65535)) add("SMTP_PORT", c.port);
    const secure = value(env, "SMTP_SECURE");
    if (secure && secure !== "true" && secure !== "false") add("SMTP_SECURE", c.trueFalse);
  }
  return problems;
}

/** The demo seed replaces every row with demo data, so production refuses it. */
export function seedAllowed(env: Env): boolean {
  return !isProduction(env);
}
