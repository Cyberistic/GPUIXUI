/**
 * Guards the defect plan 517 fixes: `Keycap` paints the caption role inside a
 * fixed surface, but the box was the literals `minWidth: 20, height: 20` in
 * `packages/components/src/keyboard-shortcuts.tsx`. A copied theme that enlarges
 * the caption leading therefore clips every shortcut label while every check
 * returns `[]`: the keycap's 18px content box (20px less its two 1px borders)
 * cannot hold a 22px caption line, and no metric rule compared the two.
 *
 * The cases below fail without `dimensions.keycapSize`, its positive/finite
 * rules, or the content-box bound. The shipped-set case fails if a type-scale
 * edit makes a shipped keycap stop fitting.
 */
import { describe, expect, it } from "vitest";
import { themeContrastFailures } from "./contrast.js";
import { themeMetricFailures } from "./metrics.js";
import { dimensions } from "./scale.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, lightTheme, type Theme } from "./theme.js";

/** Every shipped set: identity, platform variant and recipe, in both modes. */
const shipped: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

describe("the keycap surface", () => {
  it("fits its caption in every shipped theme", () => {
    shipped.forEach(([name, theme]) => {
      const keycap = themeMetricFailures(theme).filter(
        (failure) => failure.member === "keycapSize",
      );
      expect(keycap, name).toEqual([]);
    });
  });

  it("reports a caption that outgrows the keycap's content box", () => {
    // A 22px caption line in the 18px content box of the shipped 20px keycap.
    const theme = extendTheme(lightTheme, {
      typography: { caption: { fontSize: 12, lineHeight: 22 } },
    });
    expect(themeContrastFailures(theme)).toEqual([]);
    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "keycapSize",
        rule: "at-least",
        actual: 20,
        bound: 24,
      },
    ]);
  });

  it("holds the keycap to its content box, not its outer height", () => {
    // 18px is the shipped outer height's content box: the caption fits exactly,
    // so the bound is the line plus the two borders rather than the outer box.
    const fits = extendTheme(lightTheme, { dimensions: { keycapSize: 18 } });
    expect(themeMetricFailures(fits)).toEqual([]);

    const clipped = extendTheme(lightTheme, { dimensions: { keycapSize: 17 } });
    expect(themeMetricFailures(clipped)).toEqual([
      {
        group: "dimensions",
        member: "keycapSize",
        rule: "at-least",
        actual: 17,
        bound: 18,
      },
    ]);
  });

  it("reports a zero keycap as a surface that cannot paint", () => {
    const theme = extendTheme(lightTheme, { dimensions: { keycapSize: 0 } });
    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "keycapSize",
        rule: "positive",
        actual: 0,
        bound: 0,
      },
      {
        group: "dimensions",
        member: "keycapSize",
        rule: "at-least",
        actual: 0,
        bound: 18,
      },
    ]);
  });

  it("reports a non-finite keycap", () => {
    const theme = extendTheme(lightTheme, {
      dimensions: { keycapSize: Number.POSITIVE_INFINITY },
    });
    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "keycapSize",
        rule: "finite",
        actual: Number.POSITIVE_INFINITY,
        bound: 0,
      },
    ]);
  });

  it("lets a theme own the keycap without disturbing the other dimensions", () => {
    const roomy = extendTheme(lightTheme, { dimensions: { keycapSize: 24 } });
    expect(roomy.dimensions).toEqual({ ...dimensions, keycapSize: 24 });
    expect(themeMetricFailures(roomy)).toEqual([]);

    shipped.forEach(([name, theme]) => {
      expect(theme.dimensions.keycapSize, name).toBe(dimensions.keycapSize);
    });
  });
});
