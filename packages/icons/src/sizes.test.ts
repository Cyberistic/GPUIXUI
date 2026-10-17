import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import { iconSize } from "@gpuixui/tokens";
import { ICON_SIZES, iconPixels } from "./sizes.js";

/**
 * Guards the size scale.
 *
 * A named size is the only way an icon lines up with the text next to it, so a
 * size that resolves to `0`, `NaN` or a negative number is a rendering bug, and
 * a scale that is not monotonically increasing means "larger" stopped meaning
 * larger.
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
    expect(ICON_SIZES).toBe(iconSize);
  });
});
