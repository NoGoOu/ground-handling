// The load test (CLAUDE.md, 13. mérföldkő, utómunka, "Terhelési próba"):
// pure helpers of the load generator (scripts/loadtest.ts), so they can be
// tested on their own: cookies, reading the pages, statistics, the verdict.

/** The cookies of one virtual user, as a browser keeps them (no expiry, no paths: one site). */
export class CookieJar {
  private readonly cookies = new Map<string, string>();

  /** Takes the Set-Cookie headers of a response; an emptied cookie is dropped. */
  take(setCookies: readonly string[]): void {
    for (const header of setCookies) {
      const [pair] = header.split(";");
      const at = pair.indexOf("=");
      if (at <= 0) continue;
      const name = pair.slice(0, at).trim();
      const value = pair.slice(at + 1).trim();
      const expired = /;\s*max-age=0/i.test(header) || /;\s*expires=Thu, 01 Jan 1970/i.test(header);
      if (!value || expired) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  get(name: string): string | undefined {
    return this.cookies.get(name);
  }

  /** The Cookie header to send. */
  header(): string {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  }
}

const decode = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/** The task pages a page links to, each once. */
export function taskLinks(html: string): string[] {
  return [...new Set([...html.matchAll(/href="(\/tasks\/[a-z0-9]+)"/g)].map((m) => m[1]))];
}

/**
 * The hidden fields of the first "Most" form on a task page: posting them
 * records the milestone, as a browser without JavaScript would. Null when the
 * page has no such button (everything recorded, or not the user's part).
 */
export function nowFormFields(html: string, label = "Most"): [string, string][] | null {
  for (const match of html.matchAll(/<form[^>]*>([\s\S]*?)<\/form>/g)) {
    const body = match[1];
    if (!body.includes(`>${label}</button>`)) continue;
    return [...body.matchAll(/<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?\/?>/g)].map((m) => [decode(m[1]), decode(m[2] ?? "")]);
  }
  return null;
}

export interface Sample {
  /** What was asked: "login", "agent", "task", "record", "roster", "flights". */
  kind: string;
  ms: number;
  ok: boolean;
}

/** The p-th percentile (0–100) of sorted values, by the nearest rank. */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1];
}

export interface StageResult {
  users: number;
  requests: number;
  perSecond: number;
  p50: number;
  p95: number;
  p99: number;
  /** Share of the failed requests, 0–1. */
  errorRate: number;
}

export function summarize(users: number, samples: readonly Sample[], seconds: number): StageResult {
  const times = samples.map((s) => s.ms).sort((a, b) => a - b);
  const failed = samples.filter((s) => !s.ok).length;
  return {
    users,
    requests: samples.length,
    perSecond: seconds > 0 ? samples.length / seconds : 0,
    p50: percentile(times, 50),
    p95: percentile(times, 95),
    p99: percentile(times, 99),
    errorRate: samples.length ? failed / samples.length : 0,
  };
}

/** The goal (placeholders): 95% of the requests under a second, and under 1% of them failing. */
export const LOADTEST_GOAL = { p95Ms: 1000, maxErrorRate: 0.01 } as const;

export function stagePasses(stage: StageResult, goal: { p95Ms: number; maxErrorRate: number } = LOADTEST_GOAL): boolean {
  return stage.requests > 0 && stage.p95 <= goal.p95Ms && stage.errorRate < goal.maxErrorRate;
}

/** The most users of a passing stage before the first failing one; null when even the first fails. */
export function maxPassingUsers(stages: readonly StageResult[], goal = LOADTEST_GOAL): number | null {
  let best: number | null = null;
  for (const stage of stages) {
    if (!stagePasses(stage, goal)) break;
    best = stage.users;
  }
  return best;
}

/** "10,25,50" → [10, 25, 50]: whole, growing numbers. */
export function parseStages(text: string): number[] | null {
  const stages = text.split(",").map((part) => Number(part.trim()));
  const valid = stages.length > 0 && stages.every((n, i) => Number.isInteger(n) && n > 0 && (i === 0 || n > stages[i - 1]));
  return valid ? stages : null;
}

/** Who the i-th virtual user (from 0) signs in as: nine agents, then a shift lead. */
export function userFor(index: number, agents: number, leads: number): { role: "agent" | "lead"; username: string } {
  if (leads > 0 && index % 10 === 9) {
    const n = (Math.floor(index / 10) % leads) + 1;
    return { role: "lead", username: `lt-lead-${String(n).padStart(2, "0")}` };
  }
  const agentIndex = index - Math.floor((index + 1) / 10) * (leads > 0 ? 1 : 0);
  const n = (agentIndex % agents) + 1;
  return { role: "agent", username: `lt-agent-${String(n).padStart(4, "0")}` };
}

/** The test data of the load test (scripts/loadtest-data.ts); everything is removed afterwards. */
export const LOADTEST_AIRLINE = { name: "Terhelési próba", iataCode: "9Z" } as const;
export const LOADTEST_TEAM = "Terhelési próba";
export const LOADTEST_USER_PREFIX = "lt-";
