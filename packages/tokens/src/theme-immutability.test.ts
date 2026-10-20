/**
 * Guards the promise the catalogue, the design system and the README make: a
 * builder never mutates its base, so a theme can be created once at startup and
 * shared by every screen.
 *
 * `theme-merge.test.ts` holds one `extendTheme` path; this file holds every
 * public builder and resolver to a deep-frozen theme and a deep-frozen style. A
 * merge that wrote into its base — `Object.assign(base, …)` succeeds silently on
 * a plain object — would corrupt every screen sharing that theme, and this file
 * is where that defect throws instead.
 */

import { describe, expect, it } from "vitest";
import {
  applyPlatformStyle,
  contrastRing,
  createTheme,
  disabledControl,
  elevationLevels,
  elevationShadow,
  extendTheme,
  filledControl,
  filledControlFamilies,
  focusRing,
  insetFocusRing,
  invalidFocusRing,
  nativeHighlight,
  nativeTextTheme,
  platformRecipes,
  platformStyles,
  selectionStyle,
  shippedThemes,
  softAction,
  statusTone,
  statusTones,
  themeContrasts,
  themeFailures,
  themeOverrides,
  type Theme,
} from "./index.js";

/** Freeze a value and every object below it, so a write throws in strict mode. */
const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

/** A frozen copy: the shipped singletons stay writable for other suites. */
const frozen = <T>(value: T): T => deepFreeze(structuredClone(value));

const bases: ReadonlyArray<Theme> = shippedThemes.map(({ theme }) =>
  frozen(theme),
);

const styles = [
  ...Object.entries(platformStyles),
  ...Object.entries(platformRecipes),
].map(([name, style]) => [name, frozen(style)] as const);

describe("a theme is a value the builders leave alone", () => {
  it("extendTheme and createTheme do not write to a frozen base", () => {
    bases.forEach((base) => {
      const before = structuredClone(base);
      expect(() =>
        extendTheme(base, {
          name: "Edited",
          colors: { primary: "#123456" },
          typography: { sans: "Inter" },
          spacing: { md: 21 },
          radius: { md: 9 },
          density: "compact",
          dimensions: { toastWidth: 400 },
          elevation: { md: base.elevation.md },
          motion: { fast: 90 },
          borderWidth: { thin: 2 },
          iconSize: { md: 18 },
          avatarSize: { md: 30 },
        }),
      ).not.toThrow();
      expect(() =>
        createTheme({
          mode: base.mode,
          contrast: base.contrast,
          colors: { primary: "#123456" },
        }),
      ).not.toThrow();
      expect(base).toEqual(before);
    });
  });

  it("applies every shipped style to a frozen base without writing to it", () => {
    bases.forEach((base) => {
      const before = structuredClone(base);
      styles.forEach(([name, style]) => {
        themeContrasts.forEach((level) => {
          expect(
            () => applyPlatformStyle(base, style, level),
            `${name} @${level}`,
          ).not.toThrow();
        });
      });
      expect(base).toEqual(before);
    });
  });

  it("round-trips an edit through themeOverrides without writing to either side", () => {
    bases.forEach((base) => {
      const edited = extendTheme(base, { radius: { md: 9 } });
      const beforeBase = structuredClone(base);
      const beforeEdited = structuredClone(edited);

      const overrides = themeOverrides(base, edited);
      expect(overrides).toBeDefined();
      if (overrides === undefined) {
        return;
      }
      expect(() => extendTheme(base, overrides)).not.toThrow();
      expect(base).toEqual(beforeBase);
      expect(edited).toEqual(beforeEdited);
    });
  });

  it("reads a frozen theme through every resolver", () => {
    bases.forEach((theme) => {
      expect(() => {
        focusRing(theme);
        invalidFocusRing(theme);
        contrastRing(theme);
        softAction(theme);
        disabledControl(theme);
        selectionStyle(theme);
        selectionStyle(theme, "fill");
        nativeTextTheme(theme);
        nativeHighlight(theme);
        themeFailures(theme);
        filledControlFamilies.forEach((family) => {
          filledControl(theme, family);
          insetFocusRing(theme, family);
        });
        statusTones.forEach((tone) => statusTone(theme, tone));
        elevationLevels.forEach((level) => elevationShadow(theme, level));
      }).not.toThrow();
    });
  });
});
