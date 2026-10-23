/**
 * The tonal action's edge: one measured role, painted by two packages.
 *
 * The outlined (`secondary`) action is the one control in the library with a
 * boundary, so its edge is held to the 3:1 floor `contrastPairs` measures in
 * `borderStrong`. `@gpuixui/primitives` owns the recipe that paints it, and
 * this package's adapter carries the same class — a copy of a fact another
 * package owns. The copy used to justify itself with a premise that had
 * stopped being true ("the primitive's recipe paints `border-0`"): a reader
 * following it would have believed this file was the only painter, and a
 * change to the recipe would have looked harmless.
 *
 * This guard keeps the two paintings together, so neither package can drop the
 * edge alone and the comment cannot outlive the recipe again.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** The primitive's action recipes, which own the painted edge. */
const recipe = (): string => read("../../primitives/src/recipe/index.ts");

/** This package's adapter over the primitive's action. */
const adapter = (): string => read("./internal/button.tsx");

/** The adapter's prose, read as sentences rather than wrapped comment lines. */
const adapterProse = (): string =>
  adapter()
    .replace(/^\s*\*/gm, " ")
    .replace(/\s+/g, " ");

/** The recipe's `secondary` look, `@gpuixui/tw` class for class. */
const SECONDARY_RECIPE =
  "bg-secondary text-secondary-foreground border border-strong";

/** The adapter's copy of that edge. */
const SECONDARY_EDGE = 'secondary: "border border-strong"';

describe("the tonal action's edge", () => {
  it("is painted by the primitive's recipe", () => {
    expect(recipe()).toContain(SECONDARY_RECIPE);
  });

  it("is carried by the components adapter in the same role", () => {
    expect(adapter()).toContain(SECONDARY_EDGE);
  });

  it("names the recipe as the painter instead of the retired borderless premise", () => {
    const prose = adapterProse();

    // The sentences that taught the wrong decision, in both places they lived.
    expect(prose).not.toContain("has no border");
    expect(prose).not.toContain("recipe paints `border-0`");

    // What the reader is told now: the recipe paints the same edge, and the
    // class is this package's copy of a measured role.
    expect(prose).toContain("recipe paints `border border-strong`");
  });
});
