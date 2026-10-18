/**
 * Bug guarded: the two format checks accept an opaque role spelled with its
 * redundant `FF` byte (`themeColorFailures` and `themeOpacityFailures` both
 * return `[]`), but the colour maths read only six digits. A theme with
 * `foreground: "#191D25FF"` therefore reported **23 contrast failures** (35 in
 * total, ratio `NaN`) and `card: "#191D25FF"` in dark **62** (67 total), while
 * both format checks said the theme was fine. The opaque parser now reads the
 * paint-identical suffix; a partial alpha stays the opacity check's failure.
 */
import { describe, expect, it } from "vitest";
import { darkColors, lightColors } from "./color.js";
import {
  compositeOver,
  contrastRatio,
  relativeLuminance,
  themeColorFailures,
  themeContrastFailures,
} from "./contrast.js";
import { themeOpacityFailures } from "./opacity.js";
import { shippedThemes } from "./shipped-themes.js";
import { themeFailures } from "./theme-check.js";
import { darkTheme, extendTheme, lightTheme } from "./theme.js";

const lightSuffixed = extendTheme(lightTheme, {
  colors: { foreground: `${lightColors.foreground}FF` },
});

const darkSuffixed = extendTheme(darkTheme, {
  colors: { card: `${darkColors.card}FF` },
});

describe("the opaque alpha suffix", () => {
  it("is measured as the six-digit colour it paints", () => {
    expect(relativeLuminance("#FFFFFFff")).toBe(1);
    expect(contrastRatio("#000000FF", "#FFFFFFFF")).toBe(21);
    expect(
      contrastRatio(
        `${lightColors.foreground}FF`,
        `${lightColors.background}FF`,
      ),
    ).toBe(contrastRatio(lightColors.foreground, lightColors.background));
  });

  it("still refuses a partial alpha", () => {
    expect(
      contrastRatio(`${lightColors.foreground}80`, lightColors.background),
    ).toBeNaN();
    expect(compositeOver("#00000080", "#FFFFFF80")).toBe("#00000080");
  });

  it("passes the total check on a measured role", () => {
    expect(themeFailures(lightSuffixed)).toEqual([]);
    expect(themeFailures(darkSuffixed)).toEqual([]);
  });

  it("already passed both format checks, which is the contradiction", () => {
    [lightSuffixed, darkSuffixed].forEach((theme) => {
      expect(themeColorFailures(theme)).toEqual([]);
      expect(themeOpacityFailures(theme)).toEqual([]);
    });
  });

  it("keeps a partial alpha failing both halves", () => {
    const partial = extendTheme(lightTheme, {
      colors: { foreground: `${lightColors.foreground}80` },
    });
    expect(themeOpacityFailures(partial)).toContainEqual({
      role: "foreground",
      value: `${lightColors.foreground}80`,
      expected: "opaque",
    });
    const failures = themeContrastFailures(partial);
    expect(failures.length).toBeGreaterThan(0);
    expect(
      failures.some(({ ratio }) => Number.isNaN(ratio)),
      "a partial alpha is not a measurable paint",
    ).toBe(true);
  });

  it("leaves every shipped set passing", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeFailures(theme), theme.name).toEqual([]);
    });
  });

  it("composites an opaque suffixed base like its six-digit paint", () => {
    expect(compositeOver("#00000080", `${lightColors.card}FF`)).toBe("#7F7F7F");
    expect(compositeOver("#00000080", `${lightColors.card}FF`)).toBe(
      compositeOver("#00000080", lightColors.card),
    );
  });
});
