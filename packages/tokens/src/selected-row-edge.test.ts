/**
 * Guards the gap plan 335 closed. A selectable list or tree row paints
 * `selected` behind arbitrary children (`list.tsx`), and the `outline` Button
 * variant paints no fill at rest — only a `border` edge — so an outline action,
 * or a separator, inside a selected row paints the divider directly on the
 * persistent row fill. `contrastPairs` measured `border` on `hover`, `active`
 * and `accent` but not on `selected`, so a copied platform style could set the
 * two equal and erase the only outline an action has while
 * `themeContrastFailures` returned `[]`.
 *
 * The pair is a guard, not a palette fix: every shipped set already clears its
 * divider floor (1.081:1 on Windows light at the tightest), so no colour moves.
 * The same plan replaces the documentation guard's hand-typed six-fill list
 * with one derived from the contract — it was that list which let plan 327's
 * `accentHover`/`accentActive` pairs stay out of the verification paragraph.
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

const rowFills = ["hover", "active", "accent", "selected"] as const;

const borderPairs = contrastPairs.filter(
  ([foreground]) => foreground === "border",
);

const selectedFailures = (theme: Theme) =>
  themeContrastFailures(theme).filter(
    ({ foreground, background }) =>
      foreground === "border" && background === "selected",
  );

describe("the control edge on the selected row fill", () => {
  it("names the edge on every row fill a control sits on", () => {
    expect(
      borderPairs
        .filter(([, background]) =>
          rowFills.some((fill) => fill === background),
        )
        .map(([, background, pairClass]) => [background, pairClass]),
    ).toEqual([
      ["hover", "divider"],
      ["active", "divider"],
      ["accent", "divider"],
      ["selected", "divider"],
    ]);
  });

  it("keeps every shipped theme above its declared divider floor", () => {
    const failures = themes.flatMap(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].divider;
      const ratio = contrastRatio(theme.colors.border, theme.colors.selected);
      return ratio >= floor
        ? []
        : [`${label}: border on selected at ${ratio} < ${floor}`];
    });

    expect(failures).toEqual([]);
  });

  it("reports an outline action erased inside a selected light row", () => {
    const light = getTheme("light");
    const regressed = extendTheme(light, {
      colors: { selected: light.colors.border },
    });
    const failures = selectedFailures(regressed);

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("divider");
    expect(failures[0]?.floor).toBe(contrastFloors.default.divider);
    expect(failures[0]?.ratio).toBeCloseTo(1, 5);
  });

  it("checks the AAA theme at the level it declares", () => {
    const accessible = getTheme("dark", "high");
    const regressed = extendTheme(accessible, {
      colors: { selected: accessible.colors.border },
    });
    const failures = selectedFailures(regressed);

    expect(failures).toHaveLength(1);
    expect(failures[0]?.floor).toBe(contrastFloors.high.divider);
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
              contrastRatio(theme.colors.border, theme.colors.selected),
            ] as const,
        )
        .reduce((tightest, current) =>
          current[1] < tightest[1] ? current : tightest,
        );

    const [defaultLabel, defaultRatio] = worst("default");
    const [highLabel, highRatio] = worst("high");

    expect([defaultLabel, Number(defaultRatio.toFixed(3))]).toEqual([
      "win32 light default",
      1.081,
    ]);
    expect([highLabel, Number(highRatio.toFixed(3))]).toEqual([
      "identity dark high",
      4.762,
    ]);
  });
});
