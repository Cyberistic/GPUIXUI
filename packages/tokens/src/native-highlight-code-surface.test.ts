/**
 * Guards the defect plan 582 fixes: a find highlight was measured on the plain
 * document tone, but the pinned runtime paints a native code block on `bg` under
 * a fixed 3.5% ink wash (`ink()` in `text/render.rs`). A match inside fenced
 * code therefore sits behind the highlight **and** the ink. On Aero light the
 * inherited `successText` and `destructiveText` measured 4.445:1 on the canvas
 * and 4.429:1 on the quiet panel through the active match — under the 4.5:1
 * secondary floor — while `themeHighlightFailures`, `themeFailures` and every
 * contrast check returned `[]`. The check now composites the wash over
 * `nativeInk`, and Aero light names the XP recipe's own ink steps.
 *
 * This file fails without the check change (the planted Aero theme returns no
 * failure) and without the Aero values (the painted walk finds four).
 */
import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  getPlatformRecipeTheme,
  nativeHighlight,
  nativeHighlightPairs,
  nativeTextSurfaces,
  shippedThemes,
  themeFailures,
  themeHighlightFailures,
  type Theme,
  type ThemeColors,
} from "./index.js";
import { nativeInk } from "./native-ink.js";

/** The two Aero light inks the identity palette shipped before plan 582. */
const inheritedAeroInks = {
  successText: "#0E5739",
  destructiveText: "#8F2126",
} as const;

const preFixAero = extendTheme(getPlatformRecipeTheme("aero", "light"), {
  colors: inheritedAeroInks,
});

const painted = (
  paint: string,
  surface: keyof ThemeColors,
  theme: Theme,
): string => compositeOver(paint, nativeInk(theme, surface));

describe("the find highlight on the painted code surface", () => {
  it("reports the four Aero pairs the opaque check missed", () => {
    const failures = themeHighlightFailures(preFixAero);
    const text = failures.filter(
      (failure) => failure.pairClass === "secondary",
    );

    expect(text).toHaveLength(4);
    expect(
      text.map((failure) => [
        failure.foreground,
        failure.surface,
        failure.wash,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["successText", "background", "active"],
        ["successText", "muted", "active"],
        ["destructiveText", "background", "active"],
        ["destructiveText", "muted", "active"],
      ]),
    );
    text.forEach((failure) => {
      expect(failure.floor).toBe(contrastFloors.default.secondary);
      expect(failure.ratio).toBeLessThan(failure.floor);
    });

    const ratios = Object.fromEntries(
      text.map((failure) => [
        `${String(failure.foreground)}/${String(failure.surface)}`,
        failure.ratio,
      ]),
    );
    expect(ratios["successText/background"]).toBeCloseTo(4.445, 3);
    expect(ratios["successText/muted"]).toBeCloseTo(4.429, 3);
    expect(ratios["destructiveText/background"]).toBeCloseTo(4.496, 3);
    expect(ratios["destructiveText/muted"]).toBeCloseTo(4.479, 3);

    // The defect is the one the painted surface adds; nothing else is wrong.
    const all = themeFailures(preFixAero);
    expect(all).toHaveLength(4);
    expect(all.every((failure) => failure.kind === "highlight")).toBe(true);
  });

  it("ships the XP status inks in Aero light", () => {
    const aero = getPlatformRecipeTheme("aero", "light");
    const xp = getPlatformRecipeTheme("xp", "light");

    expect(aero.colors.successText).toBe(xp.colors.successText);
    expect(aero.colors.destructiveText).toBe(xp.colors.destructiveText);
    expect(themeFailures(aero)).toEqual([]);
  });

  it("holds every matchable role on the painted surface", () => {
    shippedThemes.forEach(({ theme }) => {
      const floors = contrastFloors[theme.contrast];
      const highlight = nativeHighlight(theme);
      const washes = [highlight.color, highlight.activeColor] as const;

      nativeTextSurfaces.forEach((surface) => {
        washes.forEach((wash) => {
          nativeHighlightPairs.forEach(([role, pairSurface, pairClass]) => {
            if (pairSurface !== surface) {
              return;
            }
            expect(
              contrastRatio(theme.colors[role], painted(wash, surface, theme)),
              `${theme.name} ${role} on ${surface}`,
            ).toBeGreaterThanOrEqual(floors[pairClass]);
          });
        });
      });

      expect(themeHighlightFailures(theme), theme.name).toEqual([]);
    });
  });

  it("holds the active step on the painted surface", () => {
    shippedThemes.forEach(({ theme }) => {
      const highlight = nativeHighlight(theme);
      nativeTextSurfaces.forEach((surface) => {
        expect(
          contrastRatio(
            painted(highlight.activeColor, surface, theme),
            painted(highlight.color, surface, theme),
          ),
          `${theme.name} ${surface}`,
        ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].step);
      });
    });
  });
});
