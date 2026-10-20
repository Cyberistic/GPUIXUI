/**
 * Guards the defect plan 794 fixes: `themeOverrides` walked arrays as member
 * maps, so a defined `overlay` level was refused by the edit artifact. The
 * identity ships `overlay` empty and the metric contract governs it once
 * defined (plan 369), so a brand's only way to use the level is the 0 → 1
 * transition the diff rejected: `themeFailures` accepted the theme,
 * `elevationShadow` painted it, and `themeEdit` returned `undefined`, losing
 * the edit. A level is replaced whole, so its entries are a value, not a member
 * set; the record walk still owns the member boundary.
 */
import { describe, expect, it } from "vitest";
import {
  alpha,
  applyThemeEdit,
  elevationShadow,
  extendTheme,
  getTheme,
  lightTheme,
  spacing,
  themeEdit,
  themeFailures,
  themeOverrides,
  type ElevationShape,
  type Theme,
  type ThemeOverrides,
} from "./index.js";
import {
  exportedOverlayOverrides,
  exportedOverlayShape,
  exportedOverlayTheme,
} from "./theme-diff.example.js";

const base = getTheme("light");

const overlayShape: ElevationShape = {
  offsetX: 0,
  offsetY: 28,
  blurRadius: 64,
  spreadRadius: -12,
  alpha: 0.24,
};

const withOverlay = (theme: Theme): Theme =>
  extendTheme(theme, { elevation: { overlay: [overlayShape] } });

/** The overrides for a same-mode pair, failing the test on an unexpected absence. */
const overridesOf = (from: Theme, to: Theme): ThemeOverrides => {
  const overrides = themeOverrides(from, to);
  if (overrides === undefined) {
    throw new Error("themeOverrides returned undefined for a same-mode pair");
  }
  return overrides;
};

describe("a defined overlay level is an edit the artifact can carry", () => {
  it("is a theme the checks and the painter accept", () => {
    const edited = withOverlay(base);

    expect(themeFailures(edited)).toEqual([]);
    expect(elevationShadow(edited, "overlay")).toEqual({
      offsetX: 0,
      offsetY: 28,
      blurRadius: 64,
      spreadRadius: -12,
      color: alpha(base.colors.shadow, overlayShape.alpha),
    });
  });

  it("is the one-group diff that produced it", () => {
    const edited = withOverlay(base);

    expect(themeOverrides(base, edited)).toEqual({
      elevation: { overlay: [overlayShape] },
    });
    expect(extendTheme(base, overridesOf(base, edited))).toEqual(edited);
  });

  it("stores as an edit whose replay is the edited theme", () => {
    const edited = withOverlay(base);
    const edit = themeEdit({ mode: "light" }, edited);

    expect(edit).toEqual({
      base: { mode: "light" },
      overrides: { elevation: { overlay: [overlayShape] } },
    });
    if (edit === undefined) {
      throw new Error("themeEdit refused a defined overlay");
    }
    expect(applyThemeEdit(edit)).toEqual(edited);
  });

  it("empties the level again on the way back to the identity", () => {
    const edited = withOverlay(base);

    expect(themeOverrides(edited, base)).toEqual({
      elevation: { overlay: [] },
    });
    expect(extendTheme(edited, overridesOf(edited, base))).toEqual(base);
  });

  it("keeps the member boundary a widened scale still crosses", () => {
    const widened = { ...spacing, "6xl": 96 };
    const edited = extendTheme(lightTheme, { spacing: widened });

    expect(themeFailures(edited)).toEqual([]);
    expect(themeOverrides(lightTheme, edited)).toBeUndefined();
  });

  it("runs the executed example", () => {
    expect(exportedOverlayOverrides).toEqual({
      elevation: { overlay: [exportedOverlayShape] },
    });
    expect(extendTheme(base, overridesOf(base, exportedOverlayTheme))).toEqual(
      exportedOverlayTheme,
    );
  });
});
