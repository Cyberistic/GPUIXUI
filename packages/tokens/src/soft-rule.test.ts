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

const flat = (text: string): string => text.replaceAll(/\s+/g, " ");

const catalogue = flat(read("../../../docs/tokens.md"));
const designSystem = flat(read("../../../docs/design-system.md"));
const packageReadme = flat(read("../README.md"));
const inventory = flat(read("../../../.agents/slop/COMPONENTS.md"));
const recipe = read("../../tw/src/recipes.ts");
const painter = read("../../components/src/menu/item.tsx");

const ruleParagraph =
  "A menu's rule between two groups is the same role painted at half strength";

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

const softRules = (
  surfaces: ReadonlyArray<DecorativeSurface>,
): ReadonlyArray<DecorativeSurface> =>
  surfaces.filter(({ surface }) => surface === "softDivider");

const paintedRule = (theme: Theme): string | undefined => {
  const { border, popover } = theme.colors;
  return border === undefined || popover === undefined
    ? undefined
    : blend(popover, border, softDividerAlpha);
};

const ruleRatio = (theme: Theme): number | undefined =>
  contrastRatio(paintedRule(theme), theme.colors.popover);

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
    const shared = decorativeSurfaces.filter(
      ({ surface, alpha }) => surface === "divider" && alpha !== undefined,
    );

    expect(shared).toEqual([]);
  });

  it("reads the painter that puts the rule on the menu surface", () => {
    expect(recipe).toMatch(/MENU_CONTENT\s*=\s*\n?\s*"bg-popover/);
    expect(painter).toContain("overlaySurfaceStyle(MENU_SEPARATOR");
  });

  it("clears the perceptibility floor in every shipped style", () => {
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

    expect(Number(tightest.ratio?.toFixed(3))).toBe(1.068);
    expect(catalogue).toContain(
      `the tightest soft rule is Dark's at **${tightest.ratio?.toFixed(3)}:1**`,
    );
  });

  it("reports a brand whose quiet edge halves into its own menu", () => {
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
    const floor = `${decorativeFloor}:1`;

    expect(catalogue).toContain(ruleParagraph);
    expect(designSystem).toContain(ruleParagraph);
    expect(catalogue).toContain(floor);
    expect(designSystem).toContain(floor);
  });

  it("teaches the rule where a reader meets it", () => {
    const documents = [catalogue, designSystem, packageReadme, inventory];

    documents.forEach((document) => {
      expect(document).toContain("softDivider");
      expect(document).toContain("MENU_SEPARATOR");
    });
    expect(catalogue).toContain("| softDivider |");
  });
});
