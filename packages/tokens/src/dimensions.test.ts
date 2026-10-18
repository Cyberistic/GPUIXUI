/**
 * Guards the gap this plan closes: the token set had no group for the fixed
 * surface metrics components share, so an overlay width, a toast width, a
 * field's adornment and a preview card's range lived as literals in
 * `packages/components` and could not be changed through a theme. The same
 * concept had two values — field adornments were 16px in three components and
 * 18px in two.
 *
 * Without the group on `Theme`, every case below fails to type-check; without
 * the `mergeDefined` entry in `extendTheme`, the merge and undefined cases
 * fail; the inheritance case fails if a platform override ever stops carrying
 * the identity group.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import { controlHeight } from "./styles.js";
import { dimensions } from "./scale.js";
import { extendTheme, lightTheme } from "./theme.js";

describe("component dimensions", () => {
  it("ships a positive whole-pixel metric for every dimension", () => {
    Object.entries(dimensions).forEach(([name, pixels]) => {
      expect(Number.isInteger(pixels), name).toBe(true);
      expect(pixels, name).toBeGreaterThan(0);
    });
  });

  it("keeps the overlay range coherent", () => {
    expect(dimensions.overlayMinWidth).toBeLessThan(dimensions.overlayWidth);
    expect(dimensions.previewCardMinWidth).toBeLessThan(
      dimensions.previewCardMaxWidth,
    );
    // An overlay must fit at least one control row at the largest density.
    expect(dimensions.overlayMaxHeight).toBeGreaterThanOrEqual(
      controlHeight(lightTheme, "lg"),
    );
    expect(dimensions.overlayMaxHeight).toBeGreaterThan(
      dimensions.overlayWidth,
    );
  });

  it("gives every shipped theme the identity dimensions", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(theme.dimensions, theme.name).toEqual(dimensions);
    });
  });

  it("merges one metric without losing the rest", () => {
    const wider = extendTheme(lightTheme, {
      dimensions: { toastWidth: 420 },
    });
    expect(wider.dimensions).toEqual({ ...dimensions, toastWidth: 420 });
  });

  it("treats an explicit undefined as omitted", () => {
    const themed = extendTheme(lightTheme, {
      dimensions: { toastWidth: undefined, overlayWidth: 240 },
    });
    expect(themed.dimensions.toastWidth).toBe(dimensions.toastWidth);
    expect(themed.dimensions.overlayWidth).toBe(240);
    expect(themed.dimensions.overlayMinWidth).toBe(dimensions.overlayMinWidth);
  });

  it("does not mutate the base theme", () => {
    const before = lightTheme.dimensions;
    extendTheme(lightTheme, { dimensions: { toastWidth: 420 } });
    expect(lightTheme.dimensions).toBe(before);
    expect(lightTheme.dimensions.toastWidth).toBe(380);
  });
});
