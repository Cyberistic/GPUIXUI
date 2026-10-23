/**
 * The tree page's pointer rule and the shipped forms it names.
 *
 * Two defects this guards:
 *
 * 1. The tree's row answered only the hover for a while. `packages/tokens`
 *    derives the press a row wears (`pointerWash`) because a palette's raw
 *    `active` role can sit under the 1.05:1 floor beside the wash it replaces,
 *    and the table's row paints it — so a press on a tree row looked exactly
 *    like the hover it already had and no document said otherwise.
 * 2. The page's limitations said the tree "does not virtualize itself" while
 *    `VirtualTree` ships as the windowed form.
 *
 * A row that goes back to the recipe's single `hover` class, or a page that
 * stops teaching the derived press or the windowed tree, fails by name.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";

const read = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

const rowSource = read("./row.tsx");
const page = read("../../docs/tree-view.mdx");
const readme = read("../../README.md");
const inventory = read("../../../../COMPONENTS.md");

/** One Tier 3 row, by its first cell. */
const row = (name: string): string => {
  const rows = Arr.filter(Arr.fromIterable(inventory.split("\n")), (line) =>
    line.startsWith(`| ${name} |`),
  );
  expect(rows.length).toBe(1);
  return rows[0] ?? "";
};

describe("the tree page's pointer rule and shipped forms", () => {
  it("derives the press over the wash each row replaces", () => {
    expect(rowSource).toContain('pointerWash(theme, "active", "accent")');
    expect(rowSource).toContain('pointerWash(theme, "active", "hover")');
    expect(rowSource).toContain("hover: { backgroundColor: hoverFill }");
    expect(rowSource).toContain("active: { backgroundColor: pressFill }");
  });

  it("stays in the page, the README rule table and the Tree views row", () => {
    expect(page).toContain("## Measured rules");
    expect(page).toContain('pointerWash(theme, "active", …)');
    expect(readme).toContain("A row's press is derived over its hover");
    expect(row("Tree views")).toContain("pointerWash");
    expect(row("Tree views")).toContain("over the wash it replaces");
  });

  it("names the windowed tree instead of claiming the plain one virtualizes", () => {
    expect(page).toContain("`VirtualTree` is the windowed form");
    expect(page).not.toContain("does not virtualize itself");
  });
});
