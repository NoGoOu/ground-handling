import { describe, expect, it } from "vitest";
import { SAMPLES, UCM_P7_OUT } from "@/lib/telex/samples.fixture";
import { isSupported, normaliseForHash, splitMessages, typeOfLine } from "@/lib/telex/split";

describe("splitting a received text", () => {
  it("finds the eight samples in one text, each with its type and verbatim text", () => {
    const samples = Object.values(SAMPLES);
    const { envelope, messages } = splitMessages(samples.join("\n\n"));
    expect(envelope).toBeNull();
    expect(messages.map((m) => m.type)).toEqual(["UCM", "LDM", "CPM", "MVT", "UCM", "MVT", "LDM", "CPM"]);
    expect(messages.map((m) => m.text)).toEqual(samples);
  });

  it("does not start a new message at the IN or OUT line of an UCM, nor at CPM END", () => {
    const { messages } = splitMessages(`${UCM_P7_OUT}\n${SAMPLES.CPM_CZ}`);
    expect(messages).toHaveLength(2);
    expect(messages[0].lines[2]).toBe("OUT");
    expect(messages[1].lines.at(-1)).toBe("CPM END");
  });

  it("skips a Type B header and email text before the type line, keeping them as the envelope", () => {
    const text = `QU BUDKLXH\n.HDQRMFR 170720\n\nFrom: ops@example.invalid\n${SAMPLES.MVT_ET}\r\n`;
    const { envelope, messages } = splitMessages(text);
    expect(envelope).toBe("QU BUDKLXH\n.HDQRMFR 170720\n\nFrom: ops@example.invalid");
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe(SAMPLES.MVT_ET);
  });

  it("recognises PTM and PSM without supporting them", () => {
    const { messages } = splitMessages("PTM\nFR1027/16.EIDCL.BUD\nPSM\nFR1027/16\nMVT\nFR1027/16.EIDCL.BUD");
    expect(messages.map((m) => [m.type, isSupported(m.type)])).toEqual([
      ["PTM", false],
      ["PSM", false],
      ["MVT", true],
    ]);
  });

  it("finds no message in a text without a type line", () => {
    expect(splitMessages("Hello,\nplease see below.").messages).toEqual([]);
  });

  it("takes a type line only when it is the whole line", () => {
    expect(typeOfLine(" mvt ")).toBe("MVT");
    expect(typeOfLine("MVT FOLLOWS")).toBeNull();
    expect(typeOfLine("CPM END")).toBeNull();
  });
});

describe("the text a duplicate is recognised by", () => {
  it("ignores line ends, trailing spaces and surrounding empty lines", () => {
    const resent = `\r\n${UCM_P7_OUT.replace(/\n/g, "  \r\n")}\r\n\r\n`;
    expect(normaliseForHash(resent)).toBe(normaliseForHash(UCM_P7_OUT));
    expect(normaliseForHash(UCM_P7_OUT)).not.toContain(" \n");
  });

  it("still tells different messages apart", () => {
    expect(normaliseForHash(SAMPLES.MVT_P7)).not.toBe(normaliseForHash(SAMPLES.MVT_ET));
  });
});
