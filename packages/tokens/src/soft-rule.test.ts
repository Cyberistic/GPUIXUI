/**
 * Guards the rule a menu draws between two groups of actions.
 *
 * The bug this holds: `@gpuixui/tw`'s `MENU_SEPARATOR` paints `bg-border/50` —
 * the `border` role at half strength — and `MenuSeparator` draws it inside the
 * menu surface (`popover`). The decorative table measured `border` as the role,
 * on four strips, so the one divider that is a **share** rather than the role
 * was measured by nothing: a brand whose edge is quiet enough that half of it
 * lands inside the surface paints two groups of actions as one list, while the
 * report — which compares the full role against the same strip — stayed empty.
 *
 * The softer rule is a design decision, not an accident: a rule that ends a
 * region is the full role, while a rule that only separates groups inside a
 * floating surface steps back so it does not compete with that surface's own
 * edge. The contract therefore names the share (`softDividerAlpha`) and the
 * painter writes it, and this file holds the two together.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blend } from "./color.js";
import { contrastRatio } from "./contrast.js";
import {
  decorativeFailures,
  decorativeFloor,
  decorativeSurfaces,
  softDividerAlpha,
  type DecorativeSurface,
} from "./decorative.js";
import { report, softRuleBrand } from "./decorative.example.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import {
  darkTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  platformTheme,
  themes,
  type Theme,
} from "./theme.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** A page's prose, with its line wrapping flattened so a phrase is one string. */
const flat = (text: string): string => text.replaceAll(/\s+/g, " ");

const catalogue = flat(read("../../../docs/tokens.md"));
const designSystem = flat(read("../../../docs/design-system.md"));
const packageReadme = flat(read("../README.md"));
const inventory = flat(read("../../../COMPONENTS.md"));
const recipe = read("../../tw/src/recipes.ts");
const painter = read("../../components/src/menu/item.tsx");

/**
 * The sentence both pages carry, so a reader is told the rule is a share rather
 * than inferring it from the placement table.
 */
const ruleParagraph =
  "A menu's rule between two groups is the same role painted at half strength";

/** Every shipped, high-contrast, platform and authored style, named. */
const everyStyle: ReadonlyArray<readonly [string, Theme]> = [
  [lightTheme.name, lightTheme],
  [darkTheme.name, darkTheme],
  [highContrastLightTheme.name, highContrastLightTheme],
  [highContrastDarkTheme.name, highContrastDarkTheme],
  ...platformNames.flatMap(
    (name) =>
      [
        [
          platformTheme(themes.light, name).name,
          platformTheme(themes.light, name),
        ],
        [
          platformTheme(themes.dark, name).name,
          platformTheme(themes.dark, name),
        ],
      ] as const,
  ),
  ...retroNames.flatMap(
    (name) =>
      [
        [retroTheme(themes.light, name).name, retroTheme(themes.light, name)],
        [retroTheme(themes.dark, name).name, retroTheme(themes.dark, name)],
      ] as const,
  ),
];

/** The placements that measure the softer rule. */
const softRules = (
  surfaces: ReadonlyArray<DecorativeSurface>,
): ReadonlyArray<DecorativeSurface> =>
  surfaces.filter(({ surface }) => surface === "softDivider");

/**
 * The paint the rule lands as, and the ratio a reader sees — the report's own
 * composite (`blend` the surface toward the role by the share it paints).
 */
const paintedRule = (theme: Theme): string | undefined => {
  const { border, popover } = theme.colors;
  return border === undefined || popover === undefined
    ? undefined
    : blend(popover, border, softDividerAlpha);
};

const ruleRatio = (theme: Theme): number | undefined =>
  contrastRatio(paintedRule(theme), theme.colors.popover);

/** The share the recipe's own class string writes, `bg-border/50` → `0.5`. */
const recipeShare = (): number => {
  const classString = /MENU_SEPARATOR\s*=\s*"([^"]*)"/.exec(recipe)?.[1];
  const percent = /(?:^|\s)bg-border\/(\d+)(?:\s|$)/.exec(
    classString ?? "",
  )?.[1];
  return percent === undefined ? Number.NaN : Number(percent) / 100;
};

describe("the rule a menu draws between groups", () => {
  it("measures the soft rule at the share the recipe paints", () => {
    expect(recipeShare()).toBe(softDividerAlpha);
    expect(softRules(decorativeSurfaces)).toEqual([
      {
        surface: "softDivider",
        role: "border",
        over: "popover",
        alpha: softDividerAlpha,
      },
    ]);
  });

  it("keeps the share on the soft rule alone", () => {
    // A rule that ends a region is the whole role: a region divider that gained a
    // share would quietly measure a paint no `Separator` draws.
    const shared = decorativeSurfaces.filter(
      ({ surface, alpha }) => surface === "divider" && alpha !== undefined,
    );

    expect(shared).toEqual([]);
  });

  it("reads the painter that puts the rule on the menu surface", () => {
    // The placement names `popover`, so the surface the rule is drawn in and the
    // element that draws it are read from the components package rather than
    // assumed: a menu surface that stops painting the popover fill, or a
    // separator that stops spreading the recipe, fails here.
    expect(recipe).toMatch(/MENU_CONTENT\s*=\s*\n?\s*"bg-popover/);
    expect(painter).toContain("overlaySurfaceStyle(MENU_SEPARATOR");
  });

  it("clears the perceptibility floor in every shipped style", () => {
    // The half rule is the weakest line the library draws, so it is the one that
    // needs the floor most: a palette can carry a `border` that reads at full
    // strength and disappears at half.
    const measured = everyStyle.map(([name, theme]) => ({
      name,
      ratio: ruleRatio(theme),
      failures: softRules(decorativeFailures(theme)),
    }));
    const missed = measured
      .filter(({ failures }) => failures.length > 0)
      .map(({ name }) => name);
    const tightest = measured
      .filter(({ ratio }) => ratio !== undefined)
      .reduce((low, entry) =>
        (entry.ratio ?? 0) < (low.ratio ?? 0) ? entry : low,
      );

    expect(missed).toEqual([]);
    expect(tightest.name).toBe("Dark");
    // The page prints three decimals, so an exact read is the comparison: a
    // palette that moves by a thousandth is a different rule and fails.
    expect(Number(tightest.ratio?.toFixed(3))).toBe(1.068);
    expect(catalogue).toContain(
      `the tightest soft rule is Dark's at **${tightest.ratio?.toFixed(3)}:1**`,
    );
  });

  it("reports a brand whose quiet edge halves into its own menu", () => {
    // The opaque rule on the same strip passes: only the share loses it, which is
    // the placement the old table could not see.
    expect(report(softRuleBrand)).toContain(
      `softDivider: border on popover is ${ruleRatio(softRuleBrand)?.toFixed(2)}`,
    );
    expect(
      decorativeFailures(softRuleBrand).some(
        ({ surface, over }) => surface === "divider" && over === "popover",
      ),
    ).toBe(false);
    expect(softRules(decorativeFailures(softRuleBrand))).toHaveLength(1);
    expect(report(lightTheme)).toEqual([]);
  });

  it("states the floor the rule is held to", () => {
    // A rule is decorative: it is not the 3:1 a control boundary gets, and both
    // pages print the floor they mean rather than leaving a reader to find it in
    // the table.
    const floor = `${decorativeFloor}:1`;

    expect(catalogue).toContain(ruleParagraph);
    expect(designSystem).toContain(ruleParagraph);
    expect(catalogue).toContain(floor);
    expect(designSystem).toContain(floor);
  });

  it("teaches the rule where a reader meets it", () => {
    // The catalogue's surface table gains the row, and the four documents name
    // the share and the painter that writes it.
    const documents = [catalogue, designSystem, packageReadme, inventory];

    documents.forEach((document) => {
      expect(document).toContain("softDivider");
      expect(document).toContain("MENU_SEPARATOR");
    });
    expect(catalogue).toContain("| softDivider |");
  });
});
