import { describe, expect, it } from "vitest";
import { malformedTypeTables, typeTableTargets } from "./type-tables";

/**
 * Guards plan 581: the parser that decides which API tables a page declares.
 * A defect here is silent in the same way an empty table is — the guard that
 * reads every page would see fewer tables and still pass.
 */

describe("type table targets", () => {
  it("reads both attribute orders and a multi-line tag", () => {
    const page = [
      '<auto-type-table path="../src/a.ts" name="AProps" />',
      "<auto-type-table",
      '  name="BProps"',
      '  path="../src/b.ts"',
      "/>",
    ].join("\n");

    expect(typeTableTargets(page)).toEqual([
      { path: "../src/a.ts", name: "AProps" },
      { path: "../src/b.ts", name: "BProps" },
    ]);
  });

  it("ignores a tag shown inside a fenced code block", () => {
    const page = [
      "```mdx",
      '<auto-type-table path="../src/a.ts" name="AProps" />',
      "```",
      '<auto-type-table path="../src/real.ts" name="RealProps" />',
    ].join("\n");

    expect(typeTableTargets(page)).toEqual([
      { path: "../src/real.ts", name: "RealProps" },
    ]);
    expect(malformedTypeTables(page)).toEqual([]);
  });

  it("reports a tag that carries no type name instead of dropping it", () => {
    const page = '<auto-type-table path="../src/a.ts" />';

    expect(typeTableTargets(page)).toEqual([]);
    expect(malformedTypeTables(page)).toEqual([page]);
  });

  it("keeps a type name without a path out of the resolved targets", () => {
    const page = '<auto-type-table name="AProps" />';

    expect(typeTableTargets(page)).toEqual([]);
    expect(malformedTypeTables(page)).toEqual([page]);
  });
});
