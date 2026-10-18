/**
 * Guards the defect plan 505 fixes: every high-contrast dark set shipped
 * `shadow: #000000` over `background: #000000`, so `elevationShadow` painted a
 * shadow that measured **1.000:1** on the canvas at every level (1.030:1 at the
 * tightest on the card) while `docs/design-system.md` §7 claimed the AAA modal
 * was separated by "a light wash, its own edge and elevation". Nothing caught
 * it because `shadow` was the last role in the contract's exemption list — plan
 * 371 held only its hex form — so a copied palette could erase every shadow
 * while all checks returned `[]`.
 *
 * The fix follows the AAA scrim (plan 099): that set paints with light and its
 * own alphas. The platform path needed the same care. Plan 345 applies a
 * platform's elevation at high contrast, and a dark-mode platform's 0.4–0.8
 * opacity over the new light tint would paint a near-white halo, so at high
 * contrast a style lends the level's geometry and the base keeps the opacity
 * its tint was designed with.
 *
 * Every case below fails on the pre-fix tree: the shipped AAA dark sets measure
 * 1.000:1 on `background`, `themeContrastFailures` has no elevation pair, and a
 * high-contrast platform resolves the style's own alpha.
 *
 * Plan 509 replaces this suite's hand-typed four-surface list with the public
 * `elevationSurfaces`, which now derives from the six persistent page surfaces:
 * a context menu or preview card opens over a selected row and a flipped
 * popover over its trigger's field, so the shadow is measured on `selected` and
 * `input` too. Every shipped set clears 1.05:1 (1.109:1 at the tightest), so no
 * colour moves.
 */

import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import { quietShadowTheme } from "./contrast.example.js";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  elevationShadow,
  themeContrastFailures,
  themeFailures,
  extendTheme,
  getPlatformTheme,
  getTheme,
  platformStyles,
  elevationSurfaces,
} from "./index.js";
import { elevationLevels } from "./elevation.js";

const paintedLevels = elevationLevels.filter((level) => level !== "overlay");

describe("the elevation contract", () => {
  it("keeps every shipped set's painted shadow above the surface floor", () => {
    const failures = shippedThemes.flatMap(({ theme }) =>
      paintedLevels.flatMap((level) => {
        const shadow = elevationShadow(theme, level);
        if (shadow === undefined) {
          return [];
        }
        return elevationSurfaces.flatMap((surface) =>
          contrastRatio(
            compositeOver(shadow.color, theme.colors[surface]),
            theme.colors[surface],
          ) >= contrastFloors[theme.contrast].surface
            ? []
            : [`${theme.name} ${level} on ${surface}`],
        );
      }),
    );

    expect(failures).toEqual([]);
  });

  it("paints the AAA dark set with light and its own alphas", () => {
    const highDark = getTheme("dark", "high");

    expect(highDark.colors.shadow).toBe("#FFFFFF");
    expect(
      paintedLevels.map((level) => elevationShadow(highDark, level)?.color),
    ).toEqual(["#FFFFFF1A", "#FFFFFF24", "#FFFFFF2E"]);
    // The AAA light set keeps the dark tint: its canvas is white.
    expect(getTheme("light", "high").colors.shadow).toBe("#000000");
  });

  it("reports the black tint that erased the AAA dark shadow", () => {
    const regressed = extendTheme(getTheme("dark", "high"), {
      colors: { shadow: "#000000" },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground }) => foreground === "shadow",
    );

    expect(
      failures
        .filter(({ background }) => background === "background")
        .map(({ level, opacity, ratio }) => [level, opacity, ratio]),
    ).toEqual([
      ["sm", 0.1, 1],
      ["md", 0.14, 1],
      ["lg", 0.18, 1],
    ]);
    expect(failures).toContainEqual({
      background: "card",
      level: "sm",
      wash: "shadow",
      foreground: "shadow",
      opacity: 0.1,
      pairClass: "surface",
      floor: contrastFloors.high.surface,
      ratio: expect.any(Number),
    });
  });

  it("reports a level whose alpha collapses to nothing", () => {
    const [md] = getTheme("light").elevation.md;
    if (md === undefined) {
      throw new Error("the shipped light theme has no md level");
    }
    const collapsed = extendTheme(getTheme("light"), {
      elevation: { md: [{ ...md, alpha: 0 }] },
    });

    expect(
      themeContrastFailures(collapsed)
        .filter(({ foreground }) => foreground === "shadow")
        .map(({ background, level, opacity, ratio }) => [
          level,
          background,
          opacity,
          ratio,
        ]),
    ).toEqual(elevationSurfaces.map((surface) => ["md", surface, 0, 1]));
  });

  it("reports a shadow that erases the persistent surfaces it opens over", () => {
    const base = getTheme("light");
    const themes = [
      ["selected", quietShadowTheme],
      ["input", extendTheme(base, { colors: { shadow: base.colors.input } })],
    ] as const;

    themes.forEach(([surface, theme]) => {
      const failures = themeContrastFailures(theme).filter(
        ({ foreground, background }) =>
          foreground === "shadow" && background === surface,
      );

      expect(
        failures.map(({ level, opacity, ratio, wash, pairClass }) => [
          level,
          opacity,
          ratio,
          wash,
          pairClass,
        ]),
        surface,
      ).toEqual([
        ["sm", 0.08, 1, "shadow", "surface"],
        ["md", 0.12, 1, "shadow", "surface"],
        ["lg", 0.16, 1, "shadow", "surface"],
      ]);
    });
  });

  it("keeps the AAA alpha while taking a platform's geometry", () => {
    const themed = getPlatformTheme("darwin", "dark", "high");
    const [shippedLg] = platformStyles.darwin.elevation.dark.lg ?? [];
    const [themedLg] = themed.elevation.lg;

    expect(themedLg).toBeDefined();
    expect(shippedLg).toBeDefined();
    expect(themedLg?.alpha).toBe(0.18);
    expect({
      offsetX: themedLg?.offsetX,
      offsetY: themedLg?.offsetY,
      blurRadius: themedLg?.blurRadius,
      spreadRadius: themedLg?.spreadRadius,
    }).toEqual({
      offsetX: shippedLg?.offsetX,
      offsetY: shippedLg?.offsetY,
      blurRadius: shippedLg?.blurRadius,
      spreadRadius: shippedLg?.spreadRadius,
    });
    expect(elevationShadow(themed, "lg")?.color).toBe("#FFFFFF2E");
    // Default contrast is untouched: the style's own tint, geometry and alpha.
    expect(getPlatformTheme("darwin", "dark").elevation.lg).toEqual(
      platformStyles.darwin.elevation.dark.lg,
    );
  });

  it("passes every check on every high-contrast platform and recipe", () => {
    const high = shippedThemes.filter(({ theme }) => theme.contrast === "high");

    expect(high.length).toBeGreaterThan(0);
    high.forEach(({ theme }) => {
      expect(themeFailures(theme), theme.name).toEqual([]);
    });
    high
      .filter(({ theme }) => theme.mode === "dark")
      .forEach(({ theme }) => {
        expect(theme.elevation.lg[0]?.alpha, theme.name).toBe(0.18);
      });
  });

  it("measures a defined overlay level and skips the empty one", () => {
    const [md] = getTheme("light").elevation.md;
    if (md === undefined) {
      throw new Error("the shipped light theme has no md level");
    }
    const withOverlay = extendTheme(getTheme("light"), {
      elevation: { md: [{ ...md, alpha: 0 }], overlay: [{ ...md }] },
    });
    const failures = themeContrastFailures(withOverlay).filter(
      ({ foreground }) => foreground === "shadow",
    );
    const levels = new Set(failures.map(({ level }) => level));

    expect(levels.has("md")).toBe(true);
    expect(levels.has("overlay")).toBe(false);
    expect(
      themeContrastFailures(getTheme("light")).filter(
        ({ foreground }) => foreground === "shadow",
      ),
    ).toEqual([]);
  });
});
