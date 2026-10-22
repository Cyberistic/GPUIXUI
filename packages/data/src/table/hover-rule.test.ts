/**
 * The painted-child **hover** rule, held where a data grid is designed.
 *
 * `hover-routing-lifecycle` measured that the native `hover` refinement's
 * hovered set comes from the same hit test the press takes: an unfilled label
 * leaves a row both its wash and its enter, a `<text>` or `<div>` that paints a
 * fill takes both, and `pointerEvents: "none"` puts the row back in the pointer's
 * path while the child still runs its own listener.
 *
 * The bug this guards is a record that taught only the pressed half: a
 * decorative badge in a cell or a file tree's row silently took the row's hover
 * wash, and a data-grid plan reading the package had no reason to opt the child
 * out. The sentences a reader depends on live in the source, the README rule
 * table, the tree page and the two Tier 3 rows.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

const read = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

const tableSource = read("./table.tsx");
const treeSource = read("../tree/tree-view.tsx");
const readme = read("../../README.md");
const treePage = read("../../docs/tree-view.mdx");
const inventory = read("../../../../COMPONENTS.md");
const capabilityRecord = read("../../../../docs/gpuix-capabilities.md");

/** One Tier 3 row, by its first cell. */
const row = (name: string): string => {
  const rows = Arr.filter(Arr.fromIterable(inventory.split("\n")), (line) =>
    line.startsWith(`| ${name} |`),
  );
  expect(rows.length).toBe(1);
  return rows[0] ?? "";
};

describe("the painted-child hover rule", () => {
  it("stays in the row docs, the README and the tree page", () => {
    Arr.forEach([tableSource, treeSource, readme, treePage], (text) => {
      expect(text).toContain("hover-routing-lifecycle");
      expect(text).toContain('pointerEvents: "none"');
    });
    // The mechanism, not only the id: hover is the press's own hit test.
    expect(tableSource).toContain("same hit test");
    expect(treePage).toContain("same hit test");
  });

  it("stays in the Tables, Row selection and Tree views rows", () => {
    Arr.forEach(["Tables", "Row selection", "Tree views"], (name) => {
      expect(row(name)).toContain("hover-routing-lifecycle");
    });
    // The record a page cites still carries the row it names.
    const measured = Option.getOrUndefined(
      Arr.findFirst(Arr.fromIterable(capabilityRecord.split("\n")), (line) =>
        line.startsWith("| Composite-row hover routing |"),
      ),
    );
    expect(measured).toBeDefined();
    expect(measured ?? "").toContain("hover-routing-lifecycle");
    expect(measured ?? "").toContain("supported, with limits");
  });
});
