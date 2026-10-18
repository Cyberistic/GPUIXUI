/**
 * Guards the gap plan 338 closes: the package ships an opaque hover and press
 * for every filled family, and the contract measures the label on all three
 * steps, but the two consumers still composite an alpha fill for the state.
 *
 * The bug being guarded: `components/internal/button.tsx` hovers at
 * `alpha(primary, 0.5)` while the label stays `primaryForeground`, and
 * `primitives` hovers and presses at `alpha(fill, 0.9)` / `alpha(fill, 0.8)`.
 * A translucent fill takes its colour from the surface behind the control, so
 * the label was measured against a fill the component does not paint: it falls
 * to **2.06:1** on a Linux light card at 50% and **3.40:1** at 80%, under the
 * 4.5:1 on-colour floor every designed step clears. No palette can repair the
 * 50% case, so the package ships `filledControl` — the three designed fills and
 * their one foreground in a single call — and this suite proves both
 * directions: the designed trio passes, the alpha composite fails.
 */
import { describe, expect, it } from "vitest";
import { alpha } from "./color.js";
import { compositeOver, contrastFloors, contrastRatio } from "./contrast.js";
import { filledControlPaints } from "./filled-control.example.js";
import {
  getPlatformRecipeTheme,
  platformRecipeNames,
} from "./platform-recipes.js";
import { platformNames } from "./platforms.js";
import {
  filledControl,
  filledControlFamilies,
  type FilledControlFamily,
} from "./styles.js";
import {
  darkTheme,
  getPlatformTheme,
  getTheme,
  lightTheme,
  themeContrasts,
  themeModes,
  type Theme,
} from "./theme.js";

const platformLabels: Readonly<Record<string, string>> = {
  darwin: "macOS",
  linux: "Linux",
  win32: "Windows",
};

const recipeLabels: Readonly<Record<string, string>> = {
  xp: "XP",
  aero: "Aero",
};

/** Every shipped colour set, labelled the way the reference names it. */
const themes: ReadonlyArray<readonly [string, Theme]> = [
  ...themeModes.flatMap((mode) =>
    themeContrasts.map((contrast): readonly [string, Theme] => [
      contrast === "high" ? `identity ${mode} high` : `identity ${mode}`,
      getTheme(mode, contrast),
    ]),
  ),
  ...platformNames
    .filter((platform) => platform !== "default")
    .flatMap((platform) =>
      themeModes.map((mode): readonly [string, Theme] => [
        `${platformLabels[platform] ?? platform} ${mode}`,
        getPlatformTheme(platform, mode),
      ]),
    ),
  ...platformRecipeNames.flatMap((recipe) =>
    themeModes.map((mode): readonly [string, Theme] => [
      `${recipeLabels[recipe] ?? recipe} ${mode}`,
      getPlatformRecipeTheme(recipe, mode),
    ]),
  ),
];

const surfaces = ["background", "card", "popover", "muted"] as const;

const worstAlpha = (
  family: FilledControlFamily,
  opacity: number,
): {
  readonly label: string;
  readonly surface: string;
  readonly ratio: number;
} =>
  themes
    .flatMap(([label, theme]) =>
      surfaces.map((surface) => ({
        label,
        surface,
        ratio: contrastRatio(
          theme.colors[`${family}Foreground`],
          compositeOver(
            alpha(theme.colors[family], opacity),
            theme.colors[surface],
          ),
        ),
      })),
    )
    .reduce((worst, current) =>
      current.ratio < worst.ratio ? current : worst,
    );

describe("filledControl", () => {
  it("resolves a distinct resting fill for every family", () => {
    const backgrounds = filledControlFamilies.map(
      (family) => filledControl(lightTheme, family).background,
    );

    expect(new Set(backgrounds).size).toBe(filledControlFamilies.length);
  });

  it("holds the label to the on-colour floor on all three designed fills", () => {
    themes.forEach(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].secondary;

      filledControlFamilies.forEach((family) => {
        const { background, foreground, hover, active } = filledControl(
          theme,
          family,
        );

        [background, hover, active].forEach((fill) => {
          expect(
            contrastRatio(foreground, fill),
            `${label} ${family} foreground on ${fill}`,
          ).toBeGreaterThanOrEqual(floor);
        });
      });
    });
  });

  it("the executed example paints the helper's states", () => {
    [lightTheme, darkTheme].forEach((set) => {
      filledControlFamilies.forEach((family) => {
        const states = filledControl(set, family);
        const paints = filledControlPaints(set, family);

        expect(paints.rest).toEqual({
          backgroundColor: states.background,
          color: states.foreground,
        });
        expect(paints.hover).toEqual({
          backgroundColor: states.hover,
          color: states.foreground,
        });
        expect(paints.press).toEqual({
          backgroundColor: states.active,
          color: states.foreground,
        });
      });
    });
  });
});

describe("the alpha composite the consumers still paint", () => {
  it("misses the floor on a surface in every shipped set at 50%", () => {
    themes.forEach(([label, set]) => {
      const worst = surfaces
        .map((surface) =>
          contrastRatio(
            set.colors.primaryForeground,
            compositeOver(alpha(set.colors.primary, 0.5), set.colors[surface]),
          ),
        )
        .reduce((low, current) => (current < low ? current : low));

      expect(worst, label).toBeLessThan(4.5);
    });
  });

  it("quotes the worst label each consumer produces", () => {
    const quoted = [
      ["primary", 0.5, "Linux light", "card", 2.06],
      ["destructive", 0.5, "identity light", "card", 2.24],
      ["primary", 0.9, "macOS light", "card", 4.02],
      ["primary", 0.8, "Linux light", "card", 3.4],
      ["destructive", 0.9, "identity light", "card", 4.43],
      ["destructive", 0.8, "identity light", "card", 3.75],
    ] as const;

    quoted.forEach(([family, opacity, label, surface, value]) => {
      const worst = worstAlpha(family, opacity);

      expect(
        [worst.label, worst.surface, Number(worst.ratio.toFixed(2))],
        `${family} at ${opacity}`,
      ).toEqual([label, surface, value]);
      expect(worst.ratio).toBeLessThan(4.5);
    });
  });

  it("cannot pass at 50% even with a black fill on a white card", () => {
    const ceiling = contrastRatio(
      "#FFFFFF",
      compositeOver(alpha("#000000", 0.5), "#FFFFFF"),
    ).toFixed(2);

    expect(ceiling).toBe("4.00");
    expect(Number(ceiling)).toBeLessThan(4.5);
  });
});
