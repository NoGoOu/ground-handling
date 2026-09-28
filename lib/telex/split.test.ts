import { describe, expect, it } from "vitest";
import { FIRST_SAMPLES, PACK_2026_09_27, PTM_TK, SAM, SAMPLES, SRM, UCM_P7_OUT } from "@/lib/telex/samples.fixture";
import { isSupported, normaliseForHash, slotTitleOfLine, splitMessages, typeOfLine } from "@/lib/telex/split";

describe("splitting a received text", () => {
  it("finds the eight samples in one text, each with its type and verbatim text", () => {
    const samples = FIRST_SAMPLES;
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

  it("recognises PTM and PSM, supported since the 8. mérföldkő (counts only)", () => {
    const { messages } = splitMessages("PTM\nFR1027/16.EIDCL.BUD\nPSM\nFR1027/16\nMVT\nFR1027/16.EIDCL.BUD");
    expect(messages.map((m) => [m.type, isSupported(m.type)])).toEqual([
      ["PTM", true],
      ["PSM", true],
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

describe("the sample pack of 27 September 2026 (8. mérföldkő)", () => {
  const TYPES = ["MVT", "LDM", "PSM", "CPM", "MVT", "PSM", "PTM", "SAM", "SRM"];

  for (const [name, glue] of [
    ["with empty lines between", "\n\n"],
    ["with nothing between", "\n"],
  ] as const) {
    it(`splits into nine messages ${name}`, () => {
      const { envelope, messages } = splitMessages(PACK_2026_09_27.join(glue));
      expect(envelope).toBeNull();
      expect(messages.map((m) => m.type)).toEqual(TYPES);
      expect(messages.map((m) => m.text)).toEqual(PACK_2026_09_27);
    });
  }

  it("gives the COR line to the TK1034 MVT as a correction", () => {
    const { messages } = splitMessages(PACK_2026_09_27.join("\n"));
    const cor = messages[4];
    expect(messages.map((m) => m.correction)).toEqual([false, false, false, false, true, false, false, false, false]);
    expect(cor.text.split("\n")[0]).toBe("COR");
    expect(cor.lines[0]).toBe("MVT");
    expect(cor.lines[1]).toBe("TK1034/26.TCJSO.IST");
  });

  it("keeps the slot messages apart from the PTM before them, as ADEXP", () => {
    const { messages } = splitMessages(`${PTM_TK}\n${SAM}\n${SRM}`);
    expect(messages.map((m) => [m.type, m.family])).toEqual([
      ["PTM", "TYPE_B"],
      ["SAM", "ADEXP"],
      ["SRM", "ADEXP"],
    ]);
    expect(messages[0].text).toBe(PTM_TK);
    expect(messages[0].text).not.toContain("-TITLE");
  });

  it("takes a COR line before the first message out of the envelope", () => {
    const { envelope, messages } = splitMessages(`QU BUDKKXH\n.ISTKKTK 261430\nCOR\n\nMVT\nTK1034/26.TCJSO.IST\nAA261421/261429`);
    expect(envelope).toBe("QU BUDKKXH\n.ISTKKTK 261430");
    expect(messages[0]).toMatchObject({ type: "MVT", correction: true });
    expect(messages[0].text.startsWith("COR\n")).toBe(true);
  });

  it("recognises a slot message of another title", () => {
    expect(slotTitleOfLine("-TITLE SLC")).toBe("SLC");
    expect(slotTitleOfLine("-TITLES")).toBeNull();
    expect(slotTitleOfLine("-ARCID RYR48VM")).toBeNull();
  });
});
