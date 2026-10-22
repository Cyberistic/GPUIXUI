/**
 * The editing decisions a code editor makes.
 *
 * The bug these guard: an indentation helper that reads past the leading
 * whitespace (a new line must inherit only the spaces and tabs that begin the
 * line above it, never a letter that follows them), and a Tab mode decision
 * that reports the wrong meaning.
 */

import { describe, expect, it } from "vitest";
import { enterIndent, leadingIndent, tabInserts } from "./logic.js";

describe("leadingIndent", () => {
  it("reads only the leading whitespace", () => {
    expect(leadingIndent("    const a = 1;")).toBe("    ");
    expect(leadingIndent("\t\treturn;")).toBe("\t\t");
    expect(leadingIndent("plain")).toBe("");
    expect(leadingIndent("")).toBe("");
  });

  it("stops at the first non-whitespace character (negative control)", () => {
    // Taking every leading space *and* the first letter would over-indent;
    // the helper must not include the letter.
    expect(leadingIndent("  x")).toBe("  ");
    expect(leadingIndent("  x")).not.toBe("  x");
  });
});

describe("tabInserts", () => {
  it("inserts only in insert mode", () => {
    expect(tabInserts("insert")).toBe(true);
    expect(tabInserts("focus")).toBe(false);
  });
});

describe("enterIndent", () => {
  it("carries the last line's indentation, and nothing for an empty value", () => {
    expect(enterIndent("if (x) {\n  const a = 1;")).toBe("  ");
    expect(enterIndent("plain")).toBe("");
    expect(enterIndent("")).toBe("");
  });
});
