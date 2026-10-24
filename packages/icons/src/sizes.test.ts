import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import * as Tokens from "@gpuixui/tokens";
import { ICON_SIZES, iconPixels } from "./sizes.js";

/**
 * Guards the size scale.
 *
 * A named size is the only way an icon lines up with the text next to it, so a
 * size that resolves to `0`, `NaN` or a negative number is a rendering bug, and
 * a scale that is not monotonically increasing means "larger" stopped meaning
 * larger.
 *
 * The last case reads the module's own source: `node:fs` is deliberate, the
 * rule `docs.test.ts` states — the read happens once at suite load, this package
 * has no `FileSystem` layer to provide, and a copied step list is a fact about
 * the file. Nothing here is domain I/O.
 */
describe("icon sizes", () => {
  it("resolves every named size to a positive pixel count", () => {
    const bad = Arr.filter(
      R.toEntries(ICON_SIZES),
      ([, pixels]) => !Number.isFinite(pixels) || pixels <= 0,
    );
    expect(bad).toEqual([]);
  });

  it("increases with the name order", () => {
    const ascending = R.values(ICON_SIZES);
    expect(ascending).toEqual(Arr.sort(ascending, Order.Number));
  });

  it("passes a raw pixel count through unchanged", () => {
    expect(iconPixels(37)).toBe(37);
  });

  it("reads a raw count it cannot paint as the default step", () => {
    // The bug this guards: `size` also takes the number a caller measured, and a
    // count that is not a finite positive number reached `style.width`
    // verbatim. The runtime paints a `NaN` inset as nothing, so the icon
    // disappeared from a control that still had its box — the silent vanishing
    // the `skeletonSize` and `clampLines` rules already refuse.
    expect(iconPixels(Number.NaN)).toBe(ICON_SIZES.md);
    expect(iconPixels(Number.POSITIVE_INFINITY)).toBe(ICON_SIZES.md);
    expect(iconPixels(0)).toBe(ICON_SIZES.md);
    expect(iconPixels(-8)).toBe(ICON_SIZES.md);
  });

  it("reads a name the scale does not carry as the default step", () => {
    // The bug this guards: `size` is a stored preference as often as a literal,
    // so a name from a release that renamed or dropped a step reaches the
    // resolver as a string the scale no longer carries. The lookup answered
    // `undefined` and `Icon` wrote it to `style.width`/`style.height` — and the
    // runtime paints a sized SVG with no side as a full-width, zero-height box
    // (measured 1256 × 0 in `runtime/icons.runtime.test.tsx`), so a toolbar row
    // around a vanished icon stretched across the window. An unknown name takes
    // the same answer an unpaintable count does.
    expect(iconPixels("huge")).toBe(ICON_SIZES.md);
    expect(iconPixels("")).toBe(ICON_SIZES.md);
    expect(iconPixels(undefined)).toBe(ICON_SIZES.md);
    expect(iconPixels("2xs")).toBe(ICON_SIZES.md);
  });

  it("resolves a name to its declared pixels, not to a neighbour", () => {
    expect(iconPixels("xl")).toBe(ICON_SIZES.xl);
    expect(iconPixels("xs")).toBe(ICON_SIZES.xs);
  });

  it("keeps the default size in the middle of the scale", () => {
    expect(iconPixels("md")).toBeGreaterThan(iconPixels("xs"));
    expect(iconPixels("md")).toBeLessThan(iconPixels("xl"));
  });
});

describe("the scale's source", () => {
  it("is the token scale, not a second copy", () => {
    expect(ICON_SIZES).toBe(Tokens.iconSize);
  });

  it("narrows a stored step through the token index the release publishes", () => {
    // The bug this guards: this module kept its own `ICON_STEPS` list and a
    // private `isIconSize`, while `@gpuixui/tokens` owns both for every
    // persisted axis (`iconSizes`, held to the scale by the `EveryIconStepListed`
    // type guard). Two lists of the same names drift the moment a step is
    // renamed, and the copy here is the one a consumer cannot import. Every step
    // the index names must resolve, and one it does not must take the default.
    Arr.forEach(Tokens.iconSizes, (step) => {
      expect(iconPixels(step), step).toBe(Tokens.iconSize[step]);
    });
    expect(Tokens.isIconSize("md")).toBe(true);
    expect(iconPixels("2xl")).toBe(ICON_SIZES.md);
  });

  it("carries no second step list or predicate of its own", () => {
    // `node:fs` is deliberate, the rule `docs.test.ts` states: a document and a
    // source read at suite load are not domain I/O, and this package has no
    // platform dependency to provide a `FileSystem` layer from.
    const source = readFileSync(new URL("./sizes.ts", import.meta.url), "utf8");
    expect(source).toContain('import { iconSize, isIconSize } from "@gpuixui/tokens"');
    expect(source).not.toContain("ICON_STEPS");
    expect(source).not.toMatch(/const\s+isIconSize\s*=/);
  });
});
