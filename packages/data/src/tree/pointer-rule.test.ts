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

const read = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

const rowSource = read("./row.tsx");
const page = read("../../docs/tree-view.mdx");
describe("the tree page's pointer rule and shipped forms", () => {
  it("derives the press over the wash each row replaces", () => {
    expect(rowSource).toContain('pointerWash(theme, "active", "accent")');
    expect(rowSource).toContain('pointerWash(theme, "active", "hover")');
    expect(rowSource).toContain("hover: { backgroundColor: hoverFill }");
    expect(rowSource).toContain("active: { backgroundColor: pressFill }");
  });

  it("names the windowed tree instead of claiming the plain one virtualizes", () => {
    expect(page).toContain("`VirtualTree` is the windowed form");
    expect(page).not.toContain("does not virtualize itself");
  });
});
