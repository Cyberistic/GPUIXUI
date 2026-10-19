/**
 * Guards the defect plan 347 fixes: a value indicator's unfilled groove was
 * painted with `muted`, a **surface** role. Identity dark's `muted` is its
 * `popover`, and every platform dark style's `muted` is its `card` and
 * `popover` — all at **1.000:1** — so an indeterminate `Progress` (which is only
 * its track, because the fill is zero-width) painted nothing on a dark card, and
 * a slider's unfilled span had no shape.
 *
 * Plan 503 closes the surfaces 347 left out. A row is hovered and pressed before
 * it is used, and the four soft status fills are first-class surfaces an Alert's
 * progress or slider sits on, so a groove that disappears on `hover`, `active`
 * or a tint erases the value indicator exactly while the reader interacts with
 * it. The audit found identity light `track` on `destructiveSoft` at **1.009:1**,
 * macOS light on `active` at **1.020:1**, XP light on `warningSoft` at
 * **1.007:1**, and every AAA dark set on `active` at **1.047:1**.
 *
 * `track` is the designed groove. These tests prove the old role was invisible
 * on the surfaces a value indicator paints, that every shipped theme carries a
 * track that clears the surface floor on those surfaces and the persistent row
 * fills, and that the four progress fills stay marks against it. They also hold
 * the role to the palette: a platform cannot inherit the identity's groove and
 * call itself a preview.
 */

import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  platformNames,
  platformRecipeNames,
  platformRecipes,
  platformStyles,
  themeContrastFailures,
  trackMarkPairs,
  trackSurfacePairs,
  type Theme,
} from "./index.js";

const realPlatforms = platformNames.filter((name) => name !== "default");

const variants: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

const trackSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
  "selectedActive",
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;

const progressMarks = [
  "primary",
  "success",
  "destructive",
  "mutedForeground",
] as const;

describe("the value indicator's track", () => {
  it("publishes twelve surface pairs and four mark pairs", () => {
    expect(
      trackSurfacePairs.map(([foreground, background, pairClass]) => [
        foreground,
        background,
        pairClass,
      ]),
    ).toEqual(trackSurfaces.map((surface) => ["track", surface, "surface"]));
    expect(
      trackMarkPairs.map(([foreground, background, pairClass]) => [
        foreground,
        background,
        pairClass,
      ]),
    ).toEqual(progressMarks.map((role) => [role, "track", "mark"]));
    expect(contrastPairs).toEqual(
      expect.arrayContaining([...trackSurfacePairs, ...trackMarkPairs]),
    );
  });

  it("the surface role it replaced was invisible on the same surfaces", () => {
    const identityDark = getTheme("dark");
    expect(
      contrastRatio(identityDark.colors.muted, identityDark.colors.popover),
    ).toBe(1);

    // The platform dark palettes set the quiet panel to the card itself, so a
    // progress bar in a dialog or on a card painted nothing in any of them.
    realPlatforms.forEach((platform) => {
      const theme = getPlatformTheme(platform, "dark");
      expect(
        contrastRatio(theme.colors.muted, theme.colors.card),
        platform,
      ).toBe(1);
      expect(
        contrastRatio(theme.colors.muted, theme.colors.popover),
        platform,
      ).toBe(1);
    });
  });
  it("keeps every shipped track perceivable on the surfaces it paints on", () => {
    const failures = variants.flatMap(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].surface;
      return trackSurfaces.flatMap((surface) => {
        const ratio = contrastRatio(theme.colors.track, theme.colors[surface]);
        return ratio >= floor
          ? []
          : [`${label}: track on ${surface} at ${ratio} < ${floor}`];
      });
    });

    expect(failures).toEqual([]);
  });

  it("keeps every progress fill a mark on the track", () => {
    const failures = variants.flatMap(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].mark;
      return progressMarks.flatMap((role) => {
        const ratio = contrastRatio(theme.colors[role], theme.colors.track);
        return ratio >= floor
          ? []
          : [`${label}: ${role} on track at ${ratio} < ${floor}`];
      });
    });

    expect(failures).toEqual([]);
  });

  it("gives every platform its own track in both modes", () => {
    const identityLight = getTheme("light").colors.track;
    const identityDark = getTheme("dark").colors.track;

    realPlatforms.forEach((platform) => {
      const light = platformStyles[platform].colors.light?.track;
      const dark = platformStyles[platform].colors.dark?.track;
      expect(light, `${platform} light`).toBeDefined();
      expect(dark, `${platform} dark`).toBeDefined();
      expect(light, `${platform} light`).not.toBe(identityLight);
      expect(dark, `${platform} dark`).not.toBe(identityDark);
    });

    // The recipes are editions of Windows: their dark halves carry the Windows
    // palette, and their light halves carry their own beige/blue groove.
    const windows = platformStyles.win32.colors;
    platformRecipeNames.forEach((recipe) => {
      const style = platformRecipes[recipe];
      expect(style.colors.light?.track, recipe).toBeDefined();
      expect(style.colors.dark, recipe).toBe(windows.dark);
      expect(style.colors.light?.track, recipe).not.toBe(identityLight);
    });
  });

  it("reports a track that matches the card it sits on", () => {
    const base = getTheme("light");
    const regressed = extendTheme(base, {
      colors: { track: base.colors.card },
    });

    const failures = themeContrastFailures(regressed).filter(
      ({ foreground }) => foreground === "track",
    );
    expect(failures.map(({ background }) => background)).toContain("card");
    expect(failures.every(({ pairClass }) => pairClass === "surface")).toBe(
      true,
    );
  });

  it("reports a track that disappears under the pointer or on a status panel", () => {
    const base = getTheme("light");
    (["hover", "active", "infoSoft"] as const).forEach((surface) => {
      const regressed = extendTheme(base, {
        colors: { track: base.colors[surface] },
      });

      const failures = themeContrastFailures(regressed).filter(
        ({ foreground, background }) =>
          foreground === "track" && background === surface,
      );
      expect(
        failures.map(({ pairClass }) => pairClass),
        surface,
      ).toEqual(["surface"]);
    });
  });

  it("merges a track override without moving the rest of the palette", () => {
    const base = getTheme("dark");
    const edited = extendTheme(base, {
      colors: { track: base.colors.hover },
    });

    expect(edited.colors.track).toBe(base.colors.hover);
    expect(edited.colors.background).toBe(base.colors.background);
    expect(edited.colors.skeleton).toBe(base.colors.skeleton);
  });
});
