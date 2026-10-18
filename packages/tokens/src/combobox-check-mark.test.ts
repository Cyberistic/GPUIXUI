/**
 * Guards the gap plan 341 closed. `ComboboxItem` marks the selected option with
 * a check glyph painted from `theme.colors.primary`, and `rowStyle` paints the
 * `hover` wash behind a highlighted row — so on a highlighted selected option
 * the check is `primary` on `hover`. `markPairs` (plan 332) measured `primary`
 * as a glyph on the plain surfaces and on the slider thumb's own `input` fill,
 * but not on the row wash, so a copied platform style could set `primary` close
 * to `hover` and erase the selection check exactly while the pointer is on the
 * row, while `themeContrastFailures` returned `[]`.
 *
 * The pair is a guard, not a palette fix: every shipped set already clears its
 * declared mark floor (3.111:1 on macOS dark at the tightest), so no colour
 * moves. The menu checkbox's `accent` glyph is a different defect — the wrong
 * role, recorded cross-team by plan 339.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformRecipeTheme,
  getPlatformTheme,
  getTheme,
  markPairs,
  platformNames,
  platformRecipeNames,
  themeContrastFailures,
  themeContrasts,
  themeModes,
  type Theme,
} from "./index.js";

const realPlatforms = platformNames.filter((name) => name !== "default");

const themes: ReadonlyArray<readonly [string, Theme]> = [
  ...themeModes.flatMap((mode) =>
    themeContrasts.flatMap(
      (contrast): ReadonlyArray<readonly [string, Theme]> => [
        [`identity ${mode} ${contrast}`, getTheme(mode, contrast)],
        ...realPlatforms.map((platform): readonly [string, Theme] => [
          `${platform} ${mode} ${contrast}`,
          getPlatformTheme(platform, mode, contrast),
        ]),
      ],
    ),
  ),
  ...themeModes.flatMap((mode) =>
    themeContrasts.flatMap((contrast) =>
      platformRecipeNames.map((recipe): readonly [string, Theme] => [
        `${recipe} ${mode} ${contrast}`,
        getPlatformRecipeTheme(recipe, mode, contrast),
      ]),
    ),
  ),
];

const checkFailures = (theme: Theme) =>
  themeContrastFailures(theme).filter(
    ({ foreground, background, pairClass }) =>
      foreground === "primary" &&
      background === "hover" &&
      pairClass === "mark",
  );

describe("the combobox check on a highlighted option", () => {
  it("names the check on its row wash once", () => {
    const pair = ["primary", "hover", "mark"] as const;
    expect(
      contrastPairs.filter(
        ([foreground, background, pairClass]) =>
          foreground === pair[0] &&
          background === pair[1] &&
          pairClass === pair[2],
      ),
    ).toEqual([pair]);
    expect(
      markPairs.some(
        ([foreground, background, pairClass]) =>
          foreground === pair[0] &&
          background === pair[1] &&
          pairClass === pair[2],
      ),
    ).toBe(true);
  });

  it("keeps every shipped theme above its declared mark floor", () => {
    const failures = themes.flatMap(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].mark;
      const ratio = contrastRatio(theme.colors.primary, theme.colors.hover);
      return ratio >= floor
        ? []
        : [`${label}: primary on hover at ${ratio} < ${floor}`];
    });

    expect(failures).toEqual([]);
  });

  it("reports a check erased on the light hover wash", () => {
    const light = getTheme("light");
    const regressed = extendTheme(light, {
      colors: { primary: light.colors.hover },
    });
    const failures = checkFailures(regressed);

    expect(failures).toHaveLength(1);
    expect(failures[0]?.floor).toBe(contrastFloors.default.mark);
    expect(failures[0]?.ratio).toBeCloseTo(1, 5);
  });

  it("checks the AAA theme at the level it declares", () => {
    const accessible = getTheme("dark", "high");
    const regressed = extendTheme(accessible, {
      colors: { primary: accessible.colors.hover },
    });
    const failures = checkFailures(regressed);

    expect(failures).toHaveLength(1);
    expect(failures[0]?.floor).toBe(contrastFloors.high.mark);
    expect(failures[0]?.ratio).toBeCloseTo(1, 5);
  });

  it("pins the tightest figures the catalogue quotes", () => {
    const worst = (contrast: "default" | "high") =>
      themes
        .filter(([, theme]) => theme.contrast === contrast)
        .map(
          ([label, theme]) =>
            [
              label,
              contrastRatio(theme.colors.primary, theme.colors.hover),
            ] as const,
        )
        .reduce((tightest, current) =>
          current[1] < tightest[1] ? current : tightest,
        );

    const [defaultLabel, defaultRatio] = worst("default");
    const [highLabel, highRatio] = worst("high");

    expect([defaultLabel, Number(defaultRatio.toFixed(3))]).toEqual([
      "darwin dark default",
      3.111,
    ]);
    expect([highLabel, Number(highRatio.toFixed(3))]).toEqual([
      "identity dark high",
      8.675,
    ]);
  });
});
