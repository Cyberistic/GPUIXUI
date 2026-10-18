/**
 * Guards the defect plan 384 fixes: the numeric contract promised that an icon
 * and a field adornment "fit the smallest control" and that a chip "fits in a
 * field", but compared each against the **outer** metric. A control paints its
 * two borders inside its height and a field paints its borders and horizontal
 * padding inside its minimum width, so a glyph or chip equal to the outer size
 * overflows the content box while `themeMetricFailures` returned `[]`:
 *
 * - `fieldAdornmentSize: 24` on a 24px control: an 18px content box holding a
 *   24px glyph;
 * - `chipMinWidth: 80` in a `fieldMinWidth: 90`: a 68px content box holding an
 *   80px chip;
 * - `iconSize.md: 24` on a 24px control: the same overflow as the adornment.
 *
 * Every case below fails without its content-box bound. The shipped-set case
 * fails if a token edit makes a shipped value stop fitting.
 */
import { describe, expect, it } from "vitest";
import { themeMetricFailures } from "./metrics.js";
import {
  getPlatformRecipeTheme,
  platformRecipeNames,
} from "./platform-recipes.js";
import { platformNames } from "./platforms.js";
import {
  extendTheme,
  getPlatformTheme,
  getTheme,
  lightTheme,
  themeContrasts,
  themeModes,
  type Theme,
} from "./theme.js";

/** Every shipped set: identity, platform variant and recipe, in both modes. */
const shipped: ReadonlyArray<readonly [string, Theme]> = [
  ...themeModes.flatMap((mode) =>
    themeContrasts.map(
      (contrast) => [`${mode}/${contrast}`, getTheme(mode, contrast)] as const,
    ),
  ),
  ...platformNames.flatMap((platform) =>
    themeModes.map(
      (mode) =>
        [`${platform}/${mode}`, getPlatformTheme(platform, mode)] as const,
    ),
  ),
  ...platformRecipeNames.flatMap((recipe) =>
    themeModes.map(
      (mode) =>
        [
          `recipe:${recipe}/${mode}`,
          getPlatformRecipeTheme(recipe, mode),
        ] as const,
    ),
  ),
];

describe("content-box fit", () => {
  it("reports an adornment as tall as the control", () => {
    const theme = extendTheme(lightTheme, {
      density: { controlHeight: { sm: 24 } },
      dimensions: { fieldAdornmentSize: 24 },
    });
    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "density",
        member: "controlHeight.sm",
        rule: "at-least",
        actual: 24,
        bound: 26,
      },
    ]);
  });

  it("passes the shipped adornment", () => {
    const theme = extendTheme(lightTheme, {
      dimensions: { fieldAdornmentSize: 16 },
    });
    expect(themeMetricFailures(theme)).toEqual([]);
  });

  it("reports a chip as wide as the field", () => {
    const theme = extendTheme(lightTheme, {
      dimensions: { fieldMinWidth: 200, chipMinWidth: 200 },
    });
    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "fieldMinWidth",
        rule: "at-least",
        actual: 200,
        bound: 222,
      },
    ]);
  });

  it("holds the chip to the field's content box, not its outer width", () => {
    // The 80px chip is narrower than the 90px field, which the pre-384 rule
    // accepted, while the field's borders and padding leave 68px of content.
    const theme = extendTheme(lightTheme, {
      dimensions: { fieldMinWidth: 90, chipMinWidth: 80 },
    });
    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "fieldMinWidth",
        rule: "at-least",
        actual: 90,
        bound: 102,
      },
    ]);
  });

  it("passes the shipped chip in the shipped field", () => {
    const theme = extendTheme(lightTheme, {
      dimensions: { fieldMinWidth: 200, chipMinWidth: 80 },
    });
    expect(themeMetricFailures(theme)).toEqual([]);
  });

  it("reports an icon as tall as the control", () => {
    const theme = extendTheme(lightTheme, {
      density: { controlHeight: { sm: 24 } },
      iconSize: { md: 23, lg: 24, xl: 25 },
    });
    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "density",
        member: "controlHeight.sm",
        rule: "at-least",
        actual: 24,
        bound: 25,
      },
    ]);
  });

  it("passes every shipped set", () => {
    expect(shipped).toHaveLength(
      themeModes.length * themeContrasts.length +
        platformNames.length * themeModes.length +
        platformRecipeNames.length * themeModes.length,
    );
    shipped.forEach(([label, theme]) => {
      expect(themeMetricFailures(theme), label).toEqual([]);
    });
  });
});
