/**
 * Guards the designed states of every filled control.
 *
 * The bug this suite exists for: a filled control used to composite
 * `alpha(fill, 0.9)` for hover and `alpha(fill, 0.8)` for press, so the state
 * depended on the surface behind the control and moved in the wrong direction.
 * Measured on the shipped identity themes, the light primary's fake hover was
 * *lighter* than its resting fill (#6E5CDE over #5F4BDB) and its fake press
 * lighter still; the neutral secondary fill's hover was a 1.009:1 change, which
 * is invisible. Plan 097 replaced all of it with three opaque roles per family,
 * and this suite holds every shipped theme to the resulting contract: the three
 * steps exist, each is perceivable, the foreground keeps its floor on each, and
 * the direction follows the mode — away from the canvas, never toward it. Plan
 * 327 completes the matrix with the fourth filled family, `accent` — the paint
 * of a toggle that is on — which had been left as an alpha composite.
 */
import { describe, expect, it } from "vitest";
import { contrastFloors, contrastPairs, contrastRatio } from "./contrast.js";
import {
  getPlatformRecipeTheme,
  platformRecipeNames,
} from "./platform-recipes.js";
import { platformNames, platformStyles } from "./platforms.js";
import {
  getPlatformTheme,
  getTheme,
  themeContrasts,
  themeModes,
  type Theme,
} from "./theme.js";

const families = ["primary", "secondary", "destructive", "accent"] as const;

const modes = themeModes;

const contrasts = themeContrasts;

const realPlatforms = platformNames.filter(
  (platform) => platform !== "default",
);

const themes: ReadonlyArray<{ readonly label: string; readonly theme: Theme }> =
  [
    ...contrasts.flatMap((contrast) =>
      modes.map((mode) => ({
        label: `${contrast} ${mode}`,
        theme: getTheme(mode, contrast),
      })),
    ),
    ...realPlatforms.flatMap((platform) =>
      contrasts.flatMap((contrast) =>
        modes.map((mode) => ({
          label: `${platform} ${contrast} ${mode}`,
          theme: getPlatformTheme(platform, mode, contrast),
        })),
      ),
    ),
    ...platformRecipeNames.flatMap((recipe) =>
      modes.map((mode) => ({
        label: `${recipe} ${mode}`,
        theme: getPlatformRecipeTheme(recipe, mode),
      })),
    ),
  ];

/** WCAG relative luminance, derived from the public ratio against black. */
const luminance = (color: string): number =>
  (contrastRatio(color, "#000000") - 1) * 0.05;

const stepsOf = (theme: Theme, family: (typeof families)[number]) =>
  [
    theme.colors[family],
    theme.colors[`${family}Hover`],
    theme.colors[`${family}Active`],
  ] as const;

describe("filled control states", () => {
  themes.forEach(({ label, theme }) => {
    families.forEach((family) => {
      it(`${label}: ${family} steps through rest, hover and press`, () => {
        const [resting, hover, pressed] = stepsOf(theme, family);

        expect(new Set([resting, hover, pressed]).size, label).toBe(3);
        expect(
          contrastRatio(resting, hover),
          `${label} hover`,
        ).toBeGreaterThanOrEqual(1.05);
        expect(
          contrastRatio(hover, pressed),
          `${label} press`,
        ).toBeGreaterThanOrEqual(1.05);

        const [restingLight, hoverLight, pressedLight] = [
          luminance(resting),
          luminance(hover),
          luminance(pressed),
        ];

        // A filled control recedes from the canvas: darker in light mode,
        // lighter in dark mode, one perceivable step at a time.
        const direction = theme.mode === "light" ? -1 : 1;
        expect(Math.sign(hoverLight - restingLight), label).toBe(direction);
        expect(Math.sign(pressedLight - hoverLight), label).toBe(direction);
      });

      it(`${label}: ${family} keeps its foreground on every step`, () => {
        const floor = contrastFloors[theme.contrast].secondary;
        const foreground = theme.colors[`${family}Foreground`];

        stepsOf(theme, family).forEach((step, index) => {
          expect(
            contrastRatio(foreground, step),
            `${label} ${family} step ${index}`,
          ).toBeGreaterThanOrEqual(floor);
        });
      });
    });
  });

  it("measures every filled state role in the contrast contract", () => {
    families.forEach((family) => {
      ["", "Hover", "Active"].forEach((suffix) => {
        const background = `${family}${suffix}`;
        expect(
          contrastPairs.some(
            ([foreground, pairBackground]) =>
              foreground === `${family}Foreground` &&
              pairBackground === background,
          ),
          background,
        ).toBe(true);
      });
    });
  });

  it("moves the neutral fill, which had no visible hover before plan 097", () => {
    const light = getTheme("light");
    expect(
      contrastRatio(light.colors.secondaryHover, light.colors.secondary),
    ).toBeGreaterThanOrEqual(1.05);
    expect(
      contrastRatio(light.colors.secondaryActive, light.colors.secondaryHover),
    ).toBeGreaterThanOrEqual(1.05);
  });

  it("gives every real platform style its own filled-state steps", () => {
    const platformRoles = [
      "primaryActive",
      "secondaryHover",
      "secondaryActive",
      "accentHover",
      "accentActive",
    ] as const;

    realPlatforms.forEach((platform) => {
      modes.forEach((mode) => {
        platformRoles.forEach((role) => {
          expect(
            platformStyles[platform].colors[mode][role],
            `${platform} ${mode} ${role}`,
          ).toBeDefined();
        });
      });
    });
  });

  it("gives every recipe its filled-state roles", () => {
    platformRecipeNames.forEach((recipe) => {
      modes.forEach((mode) => {
        families.forEach((family) => {
          (["", "Hover", "Active"] as const).forEach((suffix) => {
            const role = `${family}${suffix}` as const;
            expect(
              getPlatformRecipeTheme(recipe, mode).colors[role],
              `${recipe} ${mode} ${role}`,
            ).toBeDefined();
          });
        });
      });
    });
  });
});
