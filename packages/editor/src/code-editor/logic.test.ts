import { describe, expect, it } from "vitest";
import {
  enterIndent,
  leadingIndent,
  TAB_INDENT,
  tabIndent,
  tabInserts,
  tabModeOf,
  visibleRows,
} from "./logic.js";

describe("leadingIndent", () => {
  it("reads only the leading whitespace", () => {
    expect(leadingIndent("    const a = 1;")).toBe("    ");
    expect(leadingIndent("\t\treturn;")).toBe("\t\t");
    expect(leadingIndent("plain")).toBe("");
    expect(leadingIndent("")).toBe("");
  });

  it("stops at the first non-whitespace character (negative control)", () => {
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
    expect(tabInserts("insert", "")).toBe(false);
    expect(tabInserts("insert", TAB_INDENT)).toBe(true);
    expect(tabInserts("focus", "\t")).toBe(false);
  });
});

describe("tabModeOf", () => {
  it("keeps the two modes this release ships", () => {
    expect(tabModeOf("insert")).toBe("insert");
    expect(tabModeOf("focus")).toBe("focus");
  });

  it("reads a stored mode name it does not ship as the documented default", () => {
    expect(tabModeOf("indent")).toBe("insert");
    expect(tabModeOf("INSERT")).toBe("insert");
    expect(tabModeOf(" insert")).toBe("insert");
    expect(tabModeOf(undefined)).toBe("insert");
    expect(tabModeOf(null)).toBe("insert");
    expect(tabModeOf(4)).toBe("insert");
  });
});

describe("tabIndent", () => {
  it("reads an indent it cannot store as the default", () => {
    expect(tabIndent("    ")).toBe("    ");
    expect(tabIndent("\t")).toBe("\t");
    expect(tabIndent("")).toBe("");
    expect(tabIndent(null)).toBe(TAB_INDENT);
    expect(tabIndent(undefined)).toBe(TAB_INDENT);
    expect(tabIndent(4)).toBe(TAB_INDENT);
  });
});

describe("visibleRows", () => {
  it("keeps the document's rows and paints the floor above them", () => {
    expect(visibleRows(1, undefined)).toBe(1);
    expect(visibleRows(5, undefined)).toBe(5);
    expect(visibleRows(1, 3)).toBe(3);
    expect(visibleRows(5, 3)).toBe(5);
  });

  it("reads a floor it cannot lay out as no floor", () => {
    expect(visibleRows(2, 0)).toBe(2);
    expect(visibleRows(2, -4)).toBe(2);
    expect(visibleRows(2, Number.NaN)).toBe(2);
    expect(visibleRows(Number.NaN, undefined)).toBe(1);
  });
});

describe("enterIndent", () => {
  it("carries the last line's indentation, and nothing for an empty value", () => {
    expect(enterIndent("if (x) {\n  const a = 1;")).toBe("  ");
    expect(enterIndent("plain")).toBe("");
    expect(enterIndent("")).toBe("");
  });
});
