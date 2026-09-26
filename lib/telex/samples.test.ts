import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SAMPLES } from "@/lib/telex/samples.fixture";

// The samples are the first test cases of the processing (docs/messages.md,
// "Minták"); a change in the document shows here.

describe("the sample fixture", () => {
  it("matches the samples of docs/messages.md, verbatim", () => {
    const doc = readFileSync(path.join(process.cwd(), "docs", "messages.md"), "utf8").replace(/\r\n/g, "\n");
    const section = doc.slice(doc.indexOf("## Minták"));
    const blocks = [...section.matchAll(/```\n([\s\S]*?)\n```/g)].map((m) => m[1]);
    expect(blocks).toEqual(Object.values(SAMPLES));
  });
});
