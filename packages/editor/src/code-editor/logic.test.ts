/**
 * The editing decisions a code editor makes.
 *
 * The bug these guard: an indentation helper that reads past the leading
 * whitespace (a new line must inherit only the spaces and tabs that begin the
 * line above it, never a letter that follows them), and a Tab mode decision
 * that reports the wrong meaning.
 */

import { describe, expect, it } from "vitest";
import {
  enterIndent,
  leadingIndent,
  TAB_INDENT,
  tabIndent,
  tabInserts,
} from "./logic.js";

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

  it("keeps the traversal when the indent inserts nothing", () => {
    // The bug guarded: an empty indent still swallowed Tab, so the field was a
    // keyboard trap — every Tab inserted "" and none moved the focus.
    expect(tabInserts("insert", "")).toBe(false);
    expect(tabInserts("insert", TAB_INDENT)).toBe(true);
    expect(tabInserts("focus", "\t")).toBe(false);
  });
});

describe("tabIndent", () => {
  it("reads an indent it cannot store as the default", () => {
    // The bug guarded: a preference restored as `null` was concatenated into
    // the document, so Tab typed the word "null".
    expect(tabIndent("    ")).toBe("    ");
    expect(tabIndent("\t")).toBe("\t");
    expect(tabIndent("")).toBe("");
    expect(tabIndent(null)).toBe(TAB_INDENT);
    expect(tabIndent(undefined)).toBe(TAB_INDENT);
    expect(tabIndent(4)).toBe(TAB_INDENT);
  });
});

describe("enterIndent", () => {
  it("carries the last line's indentation, and nothing for an empty value", () => {
    expect(enterIndent("if (x) {\n  const a = 1;")).toBe("  ");
    expect(enterIndent("plain")).toBe("");
    expect(enterIndent("")).toBe("");
  });
});
