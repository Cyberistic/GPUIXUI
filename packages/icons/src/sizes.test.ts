import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import * as Tokens from "@gpuixui/tokens";
import { ICON_SIZES, iconPixels } from "./sizes.js";

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
    expect(iconPixels(Number.NaN)).toBe(ICON_SIZES.md);
    expect(iconPixels(Number.POSITIVE_INFINITY)).toBe(ICON_SIZES.md);
    expect(iconPixels(0)).toBe(ICON_SIZES.md);
    expect(iconPixels(-8)).toBe(ICON_SIZES.md);
  });

  it("reads a name the scale does not carry as the default step", () => {
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
    Arr.forEach(Tokens.iconSizes, (step) => {
      expect(iconPixels(step), step).toBe(Tokens.iconSize[step]);
    });
    expect(Tokens.isIconSize("md")).toBe(true);
    expect(iconPixels("2xl")).toBe(ICON_SIZES.md);
  });

  it("carries no second step list or predicate of its own", () => {
    const source = readFileSync(new URL("./sizes.ts", import.meta.url), "utf8");
    expect(source).toContain(
      'import { iconSize, isIconSize } from "@gpuixui/tokens"',
    );
    expect(source).not.toContain("ICON_STEPS");
    expect(source).not.toMatch(/const\s+isIconSize\s*=/);
  });
});
