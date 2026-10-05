import {
  CookieJar,
  LOADTEST_GOAL,
  maxPassingUsers,
  nowFormFields,
  parseStages,
  stagePasses,
  summarize,
  taskLinks,
  userFor,
  type Sample,
  type StageResult,
} from "@/lib/ops/loadtest";

// The load generator (CLAUDE.md, 13. mérföldkő, utómunka, "Terhelési próba"):
// virtual users sign in and use the app the way people do, with a pause
// between clicks, in growing stages, and it tells how many users the server
// takes while 95% of the requests stay under a second. No outside tool: Node
// and fetch. Run it from another machine than the server, so it does not take
// the server's strength:
//   LOADTEST_PASSWORD=… npx tsx scripts/loadtest.ts --url https://beosztas.example.com --agents 200 --leads 10
// Options: --stages 10,25,50,100,200,400,800  --stage-seconds 60  --think 10-30
//          --insecure (accept the self-signed certificate of a local trial)

function arg(name: string, fallback?: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? process.argv[at + 1] : fallback;
}

const BASE = (arg("url") ?? "").replace(/\/+$/, "");
const PASSWORD = arg("password") ?? process.env.LOADTEST_PASSWORD ?? "";
const AGENTS = Number(arg("agents", "200"));
const LEADS = Number(arg("leads", String(Math.max(1, Math.ceil(AGENTS / 20)))));
const STAGES = parseStages(arg("stages", "10,25,50,100,200,400,800")!);
const STAGE_SECONDS = Number(arg("stage-seconds", "60"));
const [THINK_MIN, THINK_MAX] = (arg("think", "10-30") ?? "").split("-").map(Number);
const TIMEOUT_MS = 30_000;

if (!BASE || !PASSWORD || !STAGES || !(STAGE_SECONDS > 0) || !(THINK_MIN >= 0 && THINK_MAX >= THINK_MIN)) {
  console.error("Használat: LOADTEST_PASSWORD=… npx tsx scripts/loadtest.ts --url https://… [--agents 200] [--leads 10] [--stages 10,25,50] [--stage-seconds 60] [--think 10-30] [--insecure]");
  process.exit(1);
}
if (process.argv.includes("--insecure")) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const samples: (Sample & { at: number })[] = [];
let stopped = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const think = () => sleep((THINK_MIN + Math.random() * (THINK_MAX - THINK_MIN)) * 1000);

/** Runs one request and keeps its time; a thrown error or a timeout is a failure. */
async function timed<T>(kind: string, run: () => Promise<{ ok: boolean; value: T }>): Promise<T | null> {
  const started = performance.now();
  try {
    const { ok, value } = await run();
    samples.push({ kind, ms: performance.now() - started, ok, at: Date.now() });
    return ok ? value : null;
  } catch {
    samples.push({ kind, ms: performance.now() - started, ok: false, at: Date.now() });
    return null;
  }
}

class VirtualUser {
  private readonly jar = new CookieJar();
  readonly role: "agent" | "lead";
  private readonly username: string;

  constructor(index: number) {
    ({ role: this.role, username: this.username } = userFor(index, AGENTS, LEADS));
  }

  private async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const response = await fetch(`${BASE}${path}`, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { ...(init.headers as Record<string, string>), cookie: this.jar.header() },
    });
    this.jar.take(response.headers.getSetCookie());
    return response;
  }

  /** Signs in through Auth.js, as the sign-in form does. */
  login(): Promise<boolean | null> {
    return timed("login", async () => {
      const csrf = await this.fetch("/api/auth/csrf");
      const { csrfToken } = (await csrf.json()) as { csrfToken: string };
      const response = await this.fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrfToken, username: this.username, password: PASSWORD, callbackUrl: `${BASE}/` }),
      });
      await response.arrayBuffer();
      const signedIn = [...this.jar.header().matchAll(/session-token=/g)].length > 0 && !(response.headers.get("location") ?? "").includes("error=");
      return { ok: signedIn, value: true };
    });
  }

  /** A page, as HTML; a redirect (e.g. to the sign-in page) is a failure. */
  page(kind: string, path: string): Promise<string | null> {
    return timed(kind, async () => {
      const response = await this.fetch(path);
      const html = await response.text();
      return { ok: response.status === 200, value: html };
    });
  }

  /** Records the next milestone with the task page's "Most" form, as a browser without JavaScript. */
  record(path: string, fields: [string, string][]): Promise<boolean | null> {
    return timed("record", async () => {
      const form = new FormData();
      for (const [name, value] of fields) form.append(name, value);
      const response = await this.fetch(path, { method: "POST", body: form });
      await response.arrayBuffer();
      return { ok: response.status < 400, value: true };
    });
  }

  /** An agent: their tasks, now and then a task, a record, their roster. A shift lead: the daily list and a task. */
  private async round(): Promise<void> {
    if (this.role === "lead") {
      const list = await this.page("flights", "/flights");
      const links = list ? taskLinks(list) : [];
      if (links.length && Math.random() < 0.5) {
        await think();
        await this.page("task", links[Math.floor(Math.random() * links.length)]);
      }
      return;
    }
    const mine = await this.page("agent", "/agent");
    const links = mine ? taskLinks(mine) : [];
    if (links.length && Math.random() < 0.6) {
      await think();
      const path = links[0];
      const task = await this.page("task", path);
      const fields = task ? nowFormFields(task) : null;
      if (fields && Math.random() < 0.3) {
        await think();
        await this.record(path, fields);
      }
    }
    if (Math.random() < 0.15) {
      await think();
      await this.page("roster", "/agent/roster");
    }
  }

  async run(startDelayMs: number): Promise<void> {
    await sleep(startDelayMs);
    while (!stopped && !(await this.login())) await think();
    while (!stopped) {
      await think();
      if (stopped) break;
      await this.round();
    }
  }
}

const ms = (value: number) => `${Math.round(value)} ms`.padStart(9);

async function main() {
  console.log(`Terhelési próba: ${BASE}, lépcsők: ${STAGES!.join(", ")} felhasználó, lépcsőnként ${STAGE_SECONDS} mp, gondolkodási idő ${THINK_MIN}–${THINK_MAX} mp.`);
  console.log(`Cél: a kérések 95%-a legfeljebb ${LOADTEST_GOAL.p95Ms} ms, a hibák aránya ${LOADTEST_GOAL.maxErrorRate * 100}% alatt.\n`);
  console.log("Felhasználó   Kérés   Kérés/mp       p50       p95       p99   Hiba");
  const users: VirtualUser[] = [];
  const running: Promise<void>[] = [];
  const results: StageResult[] = [];
  for (const target of STAGES!) {
    // The new users sign in spread over the first third of the stage.
    const spread = (STAGE_SECONDS * 1000) / 3;
    while (users.length < target) {
      const user = new VirtualUser(users.length);
      users.push(user);
      running.push(user.run(Math.random() * spread));
    }
    const start = Date.now();
    await sleep(STAGE_SECONDS * 1000);
    const inStage = samples.filter((s) => s.at >= start);
    const result = summarize(target, inStage, STAGE_SECONDS);
    results.push(result);
    const passes = stagePasses(result);
    console.log(
      `${String(target).padStart(11)} ${String(result.requests).padStart(7)} ${result.perSecond.toFixed(1).padStart(10)} ${ms(result.p50)} ${ms(result.p95)} ${ms(result.p99)} ${(result.errorRate * 100).toFixed(1).padStart(5)}%${passes ? "" : "  ← nem teljesül"}`,
    );
    if (!passes) break;
  }
  stopped = true;
  const best = maxPassingUsers(results);
  // Which page is slow: the requests of every kind, with their times.
  console.log("\nFajtánként         Kérés       p50       p95   Hiba");
  for (const kind of [...new Set(samples.map((s) => s.kind))]) {
    const own = summarize(0, samples.filter((s) => s.kind === kind), STAGE_SECONDS);
    console.log(`${kind.padEnd(14)} ${String(own.requests).padStart(8)} ${ms(own.p50)} ${ms(own.p95)} ${(own.errorRate * 100).toFixed(1).padStart(5)}%`);
  }
  console.log(
    best === null
      ? "Eredmény: már az első lépcső sem teljesítette a célt."
      : best === STAGES![STAGES!.length - 1] && results.length === STAGES!.length
        ? `Eredmény: mind a(z) ${best} egyidejű felhasználónál teljesült a cél (a határ ennél magasabb; a próba bővíthető: --stages).`
        : `Eredmény: legfeljebb ${best} egyidejű felhasználónál teljesül a cél.`,
  );
  await Promise.race([Promise.all(running), sleep(THINK_MAX * 1000 + TIMEOUT_MS)]);
  process.exit(0);
}

void main();
