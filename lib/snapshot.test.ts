import { describe, expect, it } from "vitest";
import { DEMO_MILESTONES, DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import { buildTemplateSnapshot, parseTemplateSnapshot } from "@/lib/snapshot";

const template = {
  ...DEMO_TEMPLATE_PARAMS,
  name: "extra fields are dropped",
  milestones: DEMO_MILESTONES.map((m) => ({ ...m, id: m.code, templateId: "t1" })),
};

describe("template snapshot", () => {
  it("survives a JSON round trip", () => {
    const snapshot = buildTemplateSnapshot(template);
    const parsed = parseTemplateSnapshot(JSON.parse(JSON.stringify(snapshot)));
    expect(parsed).toEqual(snapshot);
    expect(parsed?.milestones[0]).not.toHaveProperty("templateId");
  });

  it("rejects missing or malformed values", () => {
    expect(parseTemplateSnapshot(null)).toBeNull();
    expect(parseTemplateSnapshot({ params: {}, milestones: [] })).toBeNull();
  });
});
