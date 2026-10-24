/**
 * The tokenizer half of the editor's highlight layer.
 *
 * The bugs these guard: a run that loses a character of the source (the flat
 * runs must concatenate back to the input, newlines included); an unknown
 * language painting through the wrong grammar instead of plain text; and a row
 * list that disagrees with the field it sits behind — an empty document is one
 * empty line, and a trailing newline opens another.
 *
 * The suite runs under `environment: "node"` (no jsdom), which is itself the
 * proof `@tanstack/highlight` needs no DOM.
 */

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
    // The bug guarded: a language is a preference an app persists beside its
    // draft, and the tokenizer reads the id through `.trim()`, so a stored
    // number or object threw `value.trim is not a function` out of the render
    // instead of painting the plain fallback an unknown id gets.
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
    // The bug guarded: the final row was read away, so an empty editor painted
    // its two borders and nothing else, and the line the caret sits on after
    // Enter fell outside the box the field fills (`CodeEditor` has no other
    // thing to size it — the field is absolutely positioned over this layer).
    expect(codeLines("", "plaintext")).toEqual([[]]);
    expect(codeLines("a\n", "plaintext")).toEqual([[{ text: "a" }], []]);
    expect(codeLines("\n", "plaintext")).toEqual([[], []]);
    expect(codeLines("a\n\n", "plaintext")).toEqual([[{ text: "a" }], [], []]);
  });

  it("a trailing newline is a line, not a stray row (negative control)", () => {
    // The row list is the field's line box: reading the final row away is the
    // defect `paints the field's own lines` guards, so this holds the exact
    // difference rather than only the shape.
    expect(codeLines("a\n", "plaintext")).not.toEqual([[{ text: "a" }]]);
  });

  it("paints one plain row per line for a language that is not text", () => {
    expect(codeLines("a\nb", 42)).toEqual([[{ text: "a" }], [{ text: "b" }]]);
  });
});
