/**
 * Guards the defect plan 649 fixes: `themeHighlightFailures` measured the find
 * wash over the code block's 3.5% ink, but the pinned runtime paints a changed
 * diff row directly on `bg` under a 5.5% tint of `diffAdd`/`diffDel`
 * (`nativeSyntaxTints`). On Aero light the active match over those tints put
 * `mutedForeground` at 4.437:1 and `primaryText` at 4.481:1 on the quiet panel,
 * under the 4.5:1 secondary floor, while `themeHighlightFailures` and
 * `themeFailures` returned `[]`. The check now walks both tints for both washes
 * and the step, and Aero light's two inks take one designed step.
 *
 * This file fails without the check change (the planted Aero theme returns no
 * failure) and without the two Aero values (the direct walk finds seven).
 */
import { describe, expect, it } from "vitest";
import {
  alpha,
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  getPlatformRecipeTheme,
  nativeHighlight,
  nativeHighlightPairs,
  nativeSyntaxTints,
  nativeTextRoles,
  nativeTextSurfaces,
  shippedThemes,
  themeFailures,
  themeHighlightFailures,
  type Theme,
  type ThemeColors,
} from "./index.js";
import { nativeInk, nativeInkOpacity } from "./native-ink.js";

/** Aero light before plan 649: the values the code-ink-only check accepted. */
const preFixAero = extendTheme(getPlatformRecipeTheme("aero", "light"), {
  colors: { mutedForeground: "#3D4C5F", primaryText: "#0C4A8C" },
});

/** The row tint the runtime paints over a document tone. */
const tinted = (
  theme: Theme,
  tint: keyof ThemeColors,
  surface: keyof ThemeColors,
  opacity = 0.055,
): string =>
  compositeOver(alpha(theme.colors[tint], opacity), theme.colors[surface]);

describe("the find highlight on the native diff's row tint", () => {
  it("reports the seven Aero pairs the code-ink check missed", () => {
    const failures = themeHighlightFailures(preFixAero);
    const text = failures.filter(
      (failure) => failure.pairClass === "secondary",
    );

    expect(text).toHaveLength(7);
    expect(
      text.map((failure) => [
        failure.foreground,
        failure.tint,
        failure.surface,
        failure.wash,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["mutedForeground", "destructiveText", "muted", "active"],
        ["mutedForeground", "successText", "muted", "active"],
        ["mutedForeground", "destructiveText", "background", "active"],
        ["primaryText", "destructiveText", "muted", "active"],
        ["primaryText", "successText", "muted", "active"],
        ["mutedForeground", "successText", "background", "active"],
        ["primaryText", "destructiveText", "background", "active"],
      ]),
    );
    text.forEach((failure) => {
      expect(failure.floor).toBe(contrastFloors.default.secondary);
      expect(failure.ratio).toBeLessThan(failure.floor);
      expect(failure.tintOpacity).toBe(0.055);
      expect(failure.ink).toBeUndefined();
    });
  });

  it("tags the tint rows as highlight failures in the total check", () => {
    const all = themeFailures(preFixAero);
    const highlights = all.filter((failure) => failure.kind === "highlight");

    expect(highlights).toHaveLength(7);
    highlights.forEach((failure) => {
      if (failure.kind !== "highlight") return;
      expect(failure.pairClass).toBe("secondary");
      expect(failure.tint).toBeDefined();
      expect(failure.tintOpacity).toBe(0.055);
    });
  });

  it("ships the two Aero inks one designed step darker", () => {
    const aero = getPlatformRecipeTheme("aero", "light");

    expect(aero.colors.mutedForeground).toBe("#36455A");
    expect(aero.colors.primaryText).toBe("#0A417A");
    expect(themeHighlightFailures(aero)).toEqual([]);
    expect(themeFailures(aero)).toEqual([]);
  });

  it("holds every shipped set on both diff tints", () => {
    shippedThemes.forEach(({ theme }) => {
      const floors = contrastFloors[theme.contrast];
      const highlight = nativeHighlight(theme);
      const washes = [
        ["match", highlight.color],
        ["active", highlight.activeColor],
      ] as const;

      nativeSyntaxTints.forEach(({ wash, opacity }) => {
        const tintRole = nativeTextRoles[wash];
        nativeTextSurfaces.forEach((surface) => {
          washes.forEach(([, washColor]) => {
            nativeHighlightPairs.forEach(
              ([foreground, pairSurface, pairClass]) => {
                if (pairSurface !== surface) return;
                expect(
                  contrastRatio(
                    theme.colors[foreground],
                    compositeOver(
                      washColor,
                      tinted(theme, tintRole, surface, opacity),
                    ),
                  ),
                  `${theme.name} ${foreground} on ${tintRole} over ${surface}`,
                ).toBeGreaterThanOrEqual(floors[pairClass]);
              },
            );
          });
          expect(
            contrastRatio(
              compositeOver(
                highlight.activeColor,
                tinted(theme, tintRole, surface, opacity),
              ),
              compositeOver(
                highlight.color,
                tinted(theme, tintRole, surface, opacity),
              ),
            ),
            `${theme.name} step on ${tintRole} over ${surface}`,
          ).toBeGreaterThanOrEqual(floors.step);
        });
      });

      expect(themeHighlightFailures(theme), theme.name).toEqual([]);
      expect(themeFailures(theme), theme.name).toEqual([]);
    });
  });

  it("quotes the tightest active match on a diff tint", () => {
    const tintRatios = shippedThemes.flatMap(({ theme }) => {
      const highlight = nativeHighlight(theme);
      return nativeSyntaxTints.flatMap(({ wash, opacity }) => {
        const tintRole = nativeTextRoles[wash];
        return nativeTextSurfaces.flatMap((surface) =>
          nativeHighlightPairs
            .filter(([, pairSurface]) => pairSurface === surface)
            .map(([foreground]) =>
              contrastRatio(
                theme.colors[foreground],
                compositeOver(
                  highlight.activeColor,
                  tinted(theme, tintRole, surface, opacity),
                ),
              ),
            ),
        );
      });
    });

    expect(Math.min(...tintRatios)).toBeCloseTo(4.586, 3);
  });

  it("keeps the code ink the harder text surface", () => {
    shippedThemes.forEach(({ theme }) => {
      const highlight = nativeHighlight(theme);
      [highlight.color, highlight.activeColor].forEach((wash) => {
        nativeHighlightPairs.forEach(([foreground, surface]) => {
          const plain = contrastRatio(
            theme.colors[foreground],
            compositeOver(wash, theme.colors[surface]),
          );
          const inked = contrastRatio(
            theme.colors[foreground],
            compositeOver(wash, nativeInk(theme, surface)),
          );
          expect(
            plain,
            `${theme.name} ${foreground} on ${surface}`,
          ).toBeGreaterThanOrEqual(inked);
        });
      });
    });
  });

  it("names the code ink on the code-block rows", () => {
    const planted = extendTheme(getPlatformRecipeTheme("aero", "light"), {
      colors: { successText: "#0E5739", destructiveText: "#8F2126" },
    });
    const inkRows = themeHighlightFailures(planted).filter(
      (failure) =>
        failure.pairClass === "secondary" && failure.ink !== undefined,
    );

    expect(inkRows).toHaveLength(4);
    inkRows.forEach((failure) => {
      expect(failure.ink).toBe(nativeInkOpacity);
      expect(failure.tint).toBeUndefined();
      expect(failure.ratio).toBeLessThan(failure.floor);
    });
  });

  it("reports the active step on a diff tint", () => {
    const nearOpaque = extendTheme(getPlatformRecipeTheme("aero", "light"), {
      colors: { selection: "#C9D6EAFC" },
    });
    const steps = themeHighlightFailures(nearOpaque).filter(
      (failure) => failure.pairClass === "step" && failure.tint !== undefined,
    );

    expect(steps.length).toBeGreaterThan(0);
    steps.forEach((failure) => {
      expect(failure.tintOpacity).toBe(0.055);
      expect(failure.ratio).toBeLessThan(failure.floor);
    });
  });
});
