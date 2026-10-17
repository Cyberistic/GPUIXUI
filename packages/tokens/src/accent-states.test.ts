/**
 * Guards the bug plan 327 fixes: `accent` is a filled surface with a
 * foreground — the paint of a toggle that is on and the selected surface of a
 * row — but it was the one family plan 097 left as an alpha composite. The
 * shipped `togglePressedBase` hovers at `alpha(accent, 0.9)` and presses at
 * `alpha(accent, 0.8)`, so the state took its colour from the surface behind the
 * control, moved *toward* the canvas in dark mode, could not be tuned in a
 * copied platform style, and had no pair the contrast contract could measure.
 *
 * This suite holds the fourth family to the contract the other three already
 * have: designed opaque steps in every shipped set, a perceivable step in each
 * direction, `accentForeground` on every step, the outlined toggle's `border`
 * edge on the new fills, and a public checker that reports an unreadable step.
 */
import { describe, expect, it } from "vitest";
import { toggleOnPaints } from "./accent-states.example.js";
import { colorRoles } from "./color.js";
import { contrastFloors, contrastPairs, contrastRatio } from "./contrast.js";
import {
  getPlatformRecipeTheme,
  getPlatformTheme,
  platformNames,
  platformRecipeNames,
  platformRecipes,
  platformStyles,
  themes,
  themeContrastFailures,
  themeContrasts,
  themeModes,
  getTheme,
  extendTheme,
  highContrastThemes,
  type Theme,
} from "./index.js";

const realPlatforms = platformNames.filter(
  (platform) => platform !== "default",
);

const steps = (theme: Theme): readonly [string, string, string] => [
  theme.colors.accent,
  theme.colors.accentHover,
  theme.colors.accentActive,
];

const shipped: ReadonlyArray<{
  readonly label: string;
  readonly theme: Theme;
}> = [
  ...themeContrasts.flatMap((contrast) =>
    themeModes.map((mode) => ({
      label: `identity ${mode} ${contrast}`,
      theme: getTheme(mode, contrast),
    })),
  ),
  ...realPlatforms.flatMap((platform) =>
    themeModes.map((mode) => ({
      label: `${platform} ${mode}`,
      theme: getPlatformTheme(platform, mode),
    })),
  ),
  ...platformRecipeNames.flatMap((recipe) =>
    themeModes.map((mode) => ({
      label: `${recipe} ${mode}`,
      theme: getPlatformRecipeTheme(recipe, mode),
    })),
  ),
];

/** WCAG relative luminance, derived from the public ratio against black. */
const luminance = (color: string): number =>
  (contrastRatio(color, "#000000") - 1) * 0.05;

describe("the accent family's states", () => {
  it("lists the family in role order beside the other filled families", () => {
    const start = colorRoles.indexOf("accent");

    expect(start).toBeGreaterThan(-1);
    expect(colorRoles.slice(start, start + 4)).toEqual([
      "accent",
      "accentForeground",
      "accentHover",
      "accentActive",
    ]);
    expect(Object.keys(themes.light.colors)).toHaveLength(colorRoles.length);
    expect(Object.keys(highContrastThemes.dark.colors)).toHaveLength(
      colorRoles.length,
    );
  });

  it("gives every shipped set its own designed steps", () => {
    realPlatforms.forEach((platform) => {
      themeModes.forEach((mode) => {
        (["accentHover", "accentActive"] as const).forEach((role) => {
          expect(
            platformStyles[platform].colors[mode][role],
            `${platform} ${mode} ${role}`,
          ).toBeDefined();
        });
      });
    });

    platformRecipeNames.forEach((recipe) => {
      (["accentHover", "accentActive"] as const).forEach((role) => {
        expect(
          platformRecipes[recipe].colors.light[role],
          `${recipe} light ${role}`,
        ).toBeDefined();
        // A recipe's dark half is the Windows dark interpretation, so it
        // inherits the identity family rather than inventing one.
        expect(platformRecipes[recipe].colors.dark[role]).toBeUndefined();
      });
    });
  });

  shipped.forEach(({ label, theme }) => {
    it(`${label}: steps away from the canvas`, () => {
      const [resting, hover, pressed] = steps(theme);

      expect(new Set([resting, hover, pressed]).size, label).toBe(3);
      expect(
        contrastRatio(resting, hover),
        `${label} hover`,
      ).toBeGreaterThanOrEqual(1.05);
      expect(
        contrastRatio(hover, pressed),
        `${label} press`,
      ).toBeGreaterThanOrEqual(1.05);

      const direction = theme.mode === "light" ? -1 : 1;
      expect(Math.sign(luminance(hover) - luminance(resting)), label).toBe(
        direction,
      );
      expect(Math.sign(luminance(pressed) - luminance(hover)), label).toBe(
        direction,
      );
    });

    it(`${label}: keeps its foreground on every step`, () => {
      const floor = contrastFloors[theme.contrast].secondary;

      steps(theme).forEach((step, index) => {
        expect(
          contrastRatio(theme.colors.accentForeground, step),
          `${label} step ${index}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });

    it(`${label}: keeps the outlined toggle's edge`, () => {
      const floor = contrastFloors[theme.contrast].divider;

      [theme.colors.accentHover, theme.colors.accentActive].forEach((fill) => {
        expect(
          contrastRatio(theme.colors.border, fill),
          `${label} ${fill}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });

    it(`${label}: measures both steps in the contract`, () => {
      (["accentHover", "accentActive"] as const).forEach((fill) => {
        expect(
          contrastPairs.some(
            ([foreground, background]) =>
              foreground === "accentForeground" && background === fill,
          ),
          fill,
        ).toBe(true);
        expect(
          contrastPairs.some(
            ([foreground, background, pairClass]) =>
              foreground === fill &&
              background === "background" &&
              pairClass === "surface",
          ),
          `${fill} on the canvas`,
        ).toBe(true);
      });
    });
  });

  it("reports an unreadable accent step through the public checker", () => {
    const base = getTheme("light");
    const regressed = extendTheme(base, {
      colors: { accentHover: base.colors.accentForeground },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, background }) =>
        foreground === "accentForeground" && background === "accentHover",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("secondary");
    expect(failures[0]?.floor).toBe(contrastFloors.default.secondary);
    expect(failures[0]?.ratio).toBe(1);
  });

  it("paints the designed roles, not an alpha composite", () => {
    const theme = getTheme("dark");
    const paints = toggleOnPaints(theme);

    expect(paints.rest.backgroundColor).toBe(theme.colors.accent);
    expect(paints.hover.backgroundColor).toBe(theme.colors.accentHover);
    expect(paints.press.backgroundColor).toBe(theme.colors.accentActive);
    expect(
      [paints.rest, paints.hover, paints.press].map((paint) => paint.color),
    ).toEqual([
      theme.colors.accentForeground,
      theme.colors.accentForeground,
      theme.colors.accentForeground,
    ]);
  });
});
