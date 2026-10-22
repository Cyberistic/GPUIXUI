/**
 * The painted-child press rule, held where a grid is designed.
 *
 * `press-routing-lifecycle` measured that GPUI's hit test stops at the first
 * child that paints a fill — not at the innermost handler. The consequence for
 * a data grid is the one this package has to record: a `TableCell` paints no
 * fill, so a press on it reaches its row, while a composed control inside a
 * cell swallows the press unless it declares `pointerEvents: "none"`.
 *
 * The bug this guards is a record that goes quiet: the rule was absent from
 * both the source and the Tier 3 rows while every table plan re-derived it.
 * The recipe suite holds the cell's own paint; this suite holds the sentence a
 * reader (and the next grid plan) depends on.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";

const source = readFileSync(new URL("./table.tsx", import.meta.url), "utf8");

const inventory = readFileSync(
  new URL("../../../../COMPONENTS.md", import.meta.url),
  "utf8",
);

/** One Tier 3 row, by its first cell. */
const row = (name: string): string => {
  const rows = Arr.filter(Arr.fromIterable(inventory.split("\n")), (line) =>
    line.startsWith(`| ${name} |`),
  );
  expect(rows.length).toBe(1);
  return rows[0] ?? "";
};

describe("the painted-child press rule", () => {
  it("stays in the row and cell docs", () => {
    expect(source).toContain("press-routing-lifecycle");
    expect(source).toContain("first child that paints a fill");
    // The declaration a composed control makes when the row must hear the press.
    expect(source).toContain('pointerEvents: "none"');
    expect(source).toContain("paints no fill");
  });

  it("stays in the Tables and Row selection rows", () => {
    const tables = row("Tables");
    const selection = row("Row selection");

    expect(tables).toContain("press-routing-lifecycle");
    expect(tables).toContain('pointerEvents: "none"');
    expect(selection).toContain("press-routing-lifecycle");
  });
});
