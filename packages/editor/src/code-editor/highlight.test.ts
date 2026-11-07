import { describe, expect, it } from "vitest";
import { codeLines, codeRuns } from "./highlight.js";

describe("codeRuns", () => {
  it("splits a TypeScript snippet into its token boundaries and roles", () => {
    expect(codeRuns("const answer = 42;", "ts")).toEqual([
      { text: "const", role: "keyword" },
      { text: " answer = " },
      { text: "42", role: "number" },
      { text: ";" },
    ]);
  });

  it("falls back to one plain run for an unknown language", () => {
    expect(codeRuns("foo bar baz", "madeuplang")).toEqual([
      { text: "foo bar baz" },
    ]);
  });

  it("reads a language that is not text as the plain fallback", () => {
    const source = "const a = 1;\nconst b = 2;";
    expect(codeRuns(source, 42)).toEqual([{ text: source }]);
    expect(codeRuns(source, { id: "ts" })).toEqual([{ text: source }]);
    expect(codeRuns(source, null)).toEqual([{ text: source }]);
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
});

describe("codeLines", () => {
  it("paints the field's own lines, empty ones included", () => {
    expect(codeLines("", "plaintext")).toEqual([[]]);
    expect(codeLines("a\n", "plaintext")).toEqual([[{ text: "a" }], []]);
    expect(codeLines("\n", "plaintext")).toEqual([[], []]);
    expect(codeLines("a\n\n", "plaintext")).toEqual([[{ text: "a" }], [], []]);
  });

  it("a trailing newline is a line, not a stray row (negative control)", () => {
    expect(codeLines("a\n", "plaintext")).not.toEqual([[{ text: "a" }]]);
  });

  it("paints one plain row per line for a language that is not text", () => {
    expect(codeLines("a\nb", 42)).toEqual([[{ text: "a" }], [{ text: "b" }]]);
  });
});
