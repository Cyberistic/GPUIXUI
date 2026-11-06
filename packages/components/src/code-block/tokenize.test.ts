import { lightTheme, syntaxColors } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { codeLines, codeRuns, tokenRole } from "./tokenize.js";

describe("codeRuns", () => {
  it("splits a TypeScript snippet into its token boundaries and roles", () => {
    expect(codeRuns("const answer = 42;", "ts")).toEqual([
      { text: "const", role: "keyword" },
      { text: " answer = " },
      { text: "42", role: "number" },
      { text: ";" },
    ]);
  });

  it("resolves every token class to the colour the palette paints for its role", () => {
    const colors = syntaxColors(lightTheme);
    expect(tokenRole.keyword).toBe("keyword");
    expect(colors[tokenRole.keyword]).toBe("#3B2C8F");
    expect(tokenRole.number).toBe("number");
    expect(colors[tokenRole.number]).toBe("#2A1B00");
    expect(tokenRole.string).toBe("string");
    expect(colors[tokenRole.string]).toBe("#0E5135");
  });

  it("falls back to one plain run for an unknown language", () => {
    expect(codeRuns("foo bar baz", "madeuplang")).toEqual([
      { text: "foo bar baz" },
    ]);
  });

  it("never loses a character: the runs concatenate to the source", () => {
    const source = 'const a = 1;\nconst b = "two";\n// end\n';
    const joined = codeRuns(source, "ts")
      .map((run) => run.text)
      .join("");
    expect(joined).toBe(source);
  });

  it("loses a character when a run is dropped (negative control)", () => {
    const source = 'const a = 1;\nconst b = "two";\n';
    const dropped = codeRuns(source, "ts").slice(0, -1);
    const joined = dropped.map((run) => run.text).join("");
    expect(joined).not.toBe(source);
  });

  it("tokenizes with no DOM globals in the node environment", () => {
    expect("document" in globalThis).toBe(false);
    expect("window" in globalThis).toBe(false);
    expect(codeRuns("const a = 1;", "ts").length).toBeGreaterThan(0);
  });
});

describe("codeLines", () => {
  it("splits a run that crosses a line ending into two rows", () => {
    expect(codeLines("const a = 41;\nconst b = 42;", "ts")).toEqual([
      [
        { text: "const", role: "keyword" },
        { text: " a = " },
        { text: "41", role: "number" },
        { text: ";" },
      ],
      [
        { text: "const", role: "keyword" },
        { text: " b = " },
        { text: "42", role: "number" },
        { text: ";" },
      ],
    ]);
  });

  it("drops the single empty row a trailing newline would make", () => {
    expect(codeLines("a\n", "plaintext")).toEqual([[{ text: "a" }]]);
    expect(codeLines("a\n\n", "plaintext")).toEqual([[{ text: "a" }], []]);
  });
});
