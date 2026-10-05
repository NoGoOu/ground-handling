import { describe, expect, it } from "vitest";
import {
  CookieJar,
  maxPassingUsers,
  nowFormFields,
  parseStages,
  percentile,
  stagePasses,
  summarize,
  taskLinks,
  userFor,
  type Sample,
} from "@/lib/ops/loadtest";

// The load generator's helpers (CLAUDE.md, 13. mérföldkő, utómunka, 5. pont).

describe("cookies", () => {
  it("keeps what the server sets and drops what it clears", () => {
    const jar = new CookieJar();
    jar.take(["__Host-authjs.csrf-token=abc%7Cdef; Path=/; HttpOnly; Secure; SameSite=Lax", "authjs.callback-url=https%3A%2F%2Fx; Path=/"]);
    jar.take(["__Secure-authjs.session-token=token.value; Path=/; HttpOnly; Secure"]);
    expect(jar.get("__Host-authjs.csrf-token")).toBe("abc%7Cdef");
    expect(jar.header()).toBe("__Host-authjs.csrf-token=abc%7Cdef; authjs.callback-url=https%3A%2F%2Fx; __Secure-authjs.session-token=token.value");
    jar.take(["authjs.callback-url=; Path=/; Max-Age=0"]);
    expect(jar.get("authjs.callback-url")).toBeUndefined();
  });
});

describe("reading the pages", () => {
  // The form Next.js renders for the "Most" button, as a browser without JavaScript gets it.
  const taskPage = `
    <a href="/tasks/cmuqtw095005w2jmhys81ktol">ZZ1101</a><a href="/tasks/cmuqtw095005w2jmhys81ktol">again</a><a href="/tasks/cmabc">other</a>
    <form class="x" action="" encType="multipart/form-data" method="POST"><input type="hidden" name="$ACTION_REF_3"/><input type="hidden" name="$ACTION_3:0" value="{&quot;id&quot;:&quot;7f00aa&quot;,&quot;bound&quot;:&quot;$@1&quot;}"/><input type="hidden" name="$ACTION_KEY" value="k123"/><button type="submit" class="btn">Javítás</button></form>
    <form class="flex-1" action="" encType="multipart/form-data" method="POST"><input type="hidden" name="$ACTION_REF_9"/><input type="hidden" name="$ACTION_9:0" value="{&quot;id&quot;:&quot;6088&quot;,&quot;bound&quot;:&quot;$@1&quot;}"/><input type="hidden" name="$ACTION_9:1" value="[&quot;task&quot;,&quot;milestone&quot;]"/><input type="hidden" name="$ACTION_KEY" value="k5eeb"/><button type="submit" class="btn btn-primary">Most</button></form>`;

  it("finds the linked tasks once each", () => {
    expect(taskLinks(taskPage)).toEqual(["/tasks/cmuqtw095005w2jmhys81ktol", "/tasks/cmabc"]);
  });

  it("takes the hidden fields of the first Most form, decoded", () => {
    expect(nowFormFields(taskPage)).toEqual([
      ["$ACTION_REF_9", ""],
      ["$ACTION_9:0", '{"id":"6088","bound":"$@1"}'],
      ["$ACTION_9:1", '["task","milestone"]'],
      ["$ACTION_KEY", "k5eeb"],
    ]);
    expect(nowFormFields("<form><button>Javítás</button></form>")).toBeNull();
  });
});

describe("statistics", () => {
  const samples = (times: number[], failed = 0): Sample[] => times.map((ms, i) => ({ kind: "agent", ms, ok: i >= failed }));

  it("takes percentiles by the nearest rank", () => {
    const sorted = Array.from({ length: 100 }, (_, i) => i + 1);
    expect([percentile(sorted, 50), percentile(sorted, 95), percentile(sorted, 99), percentile(sorted, 100)]).toEqual([50, 95, 99, 100]);
    expect(percentile([7], 95)).toBe(7);
    expect(percentile([], 95)).toBe(0);
  });

  it("sums a stage up, and passes it while 95% is under a second and under 1% fails", () => {
    const fast = summarize(50, samples(Array.from({ length: 200 }, (_, i) => 100 + i)), 60);
    expect(fast).toMatchObject({ users: 50, requests: 200, p50: 199, p95: 289, errorRate: 0 });
    expect(fast.perSecond).toBeCloseTo(3.33, 2);
    expect(stagePasses(fast)).toBe(true);
    const slow = summarize(400, samples([...Array(90).fill(300), ...Array(10).fill(1500)]), 60);
    expect(slow.p95).toBe(1500);
    expect(stagePasses(slow)).toBe(false);
    const failing = summarize(100, samples(Array(100).fill(200), 2), 60);
    expect(failing.errorRate).toBe(0.02);
    expect(stagePasses(failing)).toBe(false);
    expect(stagePasses(summarize(10, [], 60))).toBe(false);
  });

  it("gives the most users before the first failing stage", () => {
    const stage = (users: number, p95: number) => ({ users, requests: 10, perSecond: 1, p50: 1, p95, p99: p95, errorRate: 0 });
    expect(maxPassingUsers([stage(10, 100), stage(25, 300), stage(50, 1200), stage(100, 400)])).toBe(25);
    expect(maxPassingUsers([stage(10, 2000)])).toBeNull();
  });
});

describe("the stages and the users", () => {
  it("reads growing whole numbers only", () => {
    expect(parseStages("10, 25,50")).toEqual([10, 25, 50]);
    expect(parseStages("10,5")).toBeNull();
    expect(parseStages("10,x")).toBeNull();
    expect(parseStages("0")).toBeNull();
  });

  it("signs nine agents in for every shift lead, and goes round when there are fewer users", () => {
    const first = Array.from({ length: 20 }, (_, i) => userFor(i, 1000, 5));
    expect(first.filter((u) => u.role === "lead").map((u) => u.username)).toEqual(["lt-lead-01", "lt-lead-02"]);
    expect(first.slice(0, 3).map((u) => u.username)).toEqual(["lt-agent-0001", "lt-agent-0002", "lt-agent-0003"]);
    expect(first[10].username).toBe("lt-agent-0010");
    expect(new Set(first.filter((u) => u.role === "agent").map((u) => u.username)).size).toBe(18);
    expect(userFor(3, 2, 0).username).toBe("lt-agent-0002");
  });
});
