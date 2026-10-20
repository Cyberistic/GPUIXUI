/**
 * Bug guarded: two catalogue passages are *half* derived, so the page looks
 * owned while the figures a reader compares are prose.
 *
 * - §*Text selection* states the accent wash's ratios on a filled surface —
 *   `1.000:1` on a `primary` fill and five chip figures — while
 *   `selection-on-fill.test.ts` holds only the *set* of shipped fills the wash
 *   is under the floor on. A palette edit that keeps a composition in that list
 *   but moves its ratio leaves the page quoting a number the palette no longer
 *   produces.
 * - §*Numeric metrics* states the chip's own `44px` bound and the `1.82×` a
 *   theme compares its `chipMinWidth` against, after a clause `docs.test.ts`
 *   derives and stops before. `chip-chrome-fit.test.ts` proves the rule reads
 *   the theme's metrics, but never reads the page.
 *
 * Replacing all eight figures (`1.000`, `1.046`, `1.026`, `1.027`, `1.011`
 * twice, `44px` and `1.82`) left 220 files / 7130 tests green.
 *
 * `node:fs` is deliberate, like `platform-claims.test.ts`: this is a
 * documentation test over the catalogue, and the package ships zero runtime
 * dependencies.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compositeOver, contrastFloors, contrastRatio } from "./contrast.js";
import { getPlatformRecipeTheme } from "./platform-recipes.js";
import { getPlatformTheme, getTheme, type Theme } from "./theme.js";

const markdown = (): string =>
  readFileSync(new URL("../../../docs/tokens.md", import.meta.url), "utf8")
    .replace(/\s+/g, " ")
    .trim();

/** The accent wash composited over a filled surface, held to that surface. */
const wash = (theme: Theme, fill: "primary" | "info" | "success"): string =>
  contrastRatio(
    compositeOver(theme.colors.selection, theme.colors[fill]),
    theme.colors[fill],
  ).toFixed(3);

/** The chip's own bound: two insets, the gap, a caption glyph and the remove control. */
const chipBound = (theme: Theme): number =>
  2 * theme.spacing.sm +
  theme.spacing.xs +
  theme.typography.caption.fontSize +
  theme.dimensions.fieldAdornmentSize;

/** Whether a page holds a sentence — asserted with the sentence, not the page. */
const holds = (text: string, sentence: string): boolean =>
  text.includes(sentence);

const light = getTheme("light");
const dark = getTheme("dark");

describe("figures stated beside a derived claim", () => {
  it("derives the accent wash's ratios on the fills it erases", () => {
    const fills = [
      [dark, "primary", "1.000"],
      [light, "success", "1.046"],
      [getPlatformTheme("darwin", "light"), "success", "1.026"],
      [getPlatformTheme("linux", "light"), "success", "1.027"],
      [getPlatformTheme("win32", "light"), "info", "1.011"],
      [getPlatformRecipeTheme("aero", "light"), "info", "1.011"],
    ] as const;

    fills.forEach(([theme, fill, figure]) => {
      const measured = wash(theme, fill);
      expect(measured, `${theme.name} ${fill}`).toBe(figure);
      expect(Number(measured)).toBeLessThan(
        contrastFloors[theme.contrast].surface,
      );
    });
  });

  it("holds the catalogue's wash sentences", () => {
    const text = markdown();
    const primary =
      "The accent-tinted wash *is* the accent, so on a `primary` fill it " +
      `composites to **${wash(dark, "primary")}:1**`;
    const chips =
      "It is just as lost on a solid status chip: identity light `success` " +
      `measures **${wash(light, "success")}:1**, ` +
      `macOS light ${wash(getPlatformTheme("darwin", "light"), "success")}:1, ` +
      `Linux light ${wash(getPlatformTheme("linux", "light"), "success")}:1, ` +
      `Windows light \`info\` ${wash(getPlatformTheme("win32", "light"), "info")}:1 ` +
      `and Windows 7 light ${wash(getPlatformRecipeTheme("aero", "light"), "info")}:1`;

    expect(holds(text, primary), primary).toBe(true);
    expect(holds(text, chips), chips).toBe(true);
  });

  it("derives the chip's own clearance", () => {
    const bound = chipBound(light);
    const multiple = (light.dimensions.chipMinWidth / bound).toFixed(2);
    const sentence = `the chip's own ${bound}px bound passes at ${multiple} times`;

    expect(bound).toBe(44);
    expect(multiple).toBe("1.82");
    expect(light.dimensions.chipMinWidth).toBeGreaterThanOrEqual(bound);
    expect(holds(markdown(), sentence), sentence).toBe(true);
  });

  it("measures rather than prints", () => {
    const opaque: Theme = {
      ...light,
      colors: { ...light.colors, selection: light.colors.success },
    };
    expect(wash(opaque, "success")).toBe("1.000");

    const multiple = (theme: Theme): string =>
      (theme.dimensions.chipMinWidth / chipBound(theme)).toFixed(2);
    const roomier: Theme = {
      ...light,
      dimensions: { ...light.dimensions, chipMinWidth: 88 },
    };

    expect(multiple(roomier)).toBe("2.00");
    expect(multiple(roomier)).not.toBe(multiple(light));
  });
});
