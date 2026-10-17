/**
 * Guards the public contrast contract (plan 071).
 *
 * The bug these catch: the WCAG maths and the 48 documented pairs lived in
 * test-only code, so a consumer editing a copied platform style could not hold
 * their theme to the floors the library promises. These tests prove the public
 * check is the same one the suites run — known ratios, the shipped themes
 * passing, and a brand theme, an opaque selection wash and a malformed role
 * each failing with the pair named.
 *
 * It also holds the `compositeOver` JSDoc example to the function (plan 075):
 * the example printed `#808080` for `#00000080`, which composites to `#7F7F7F`,
 * so a reader copying it wrote an assertion the library itself would fail.
 *
 * Plan 076 closes the two checks the suites ran outside the contract: the soft
 * status surfaces (plan 073's audit found nine platform pairs below the 1.05:1
 * floor, the worst being Linux dark's `destructiveSoft` at 1.005:1 on its card)
 * and the high-contrast decorative divider. Both are `contrastPairs` now.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastFloors,
  contrastPairs,
  contrastRatio,
  darkTheme,
  extendTheme,
  getTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  themeContrastFailures,
  type Theme,
  type ThemeContrast,
} from "./index.js";
import {
  quietBrandFailures,
  quietBrandTheme,
  quietHighContrastFailures,
  quietHighContrastTheme,
  quietRingFailures,
  quietRingTheme,
} from "./contrast.example.js";

describe("contrastRatio", () => {
  it("returns the WCAG extremes", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBe(21);
    expect(contrastRatio("#123456", "#123456")).toBe(1);
  });

  it("places a colour on either side of the 4.5 floor", () => {
    expect(contrastRatio("#767676", "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeLessThan(4.5);
  });

  it("returns NaN for a value it cannot measure", () => {
    ["#00000080", "#FFF", "transparent", "rgb(0, 0, 0)"].forEach((value) => {
      expect(Number.isNaN(contrastRatio(value, "#FFFFFF")), value).toBe(true);
    });
  });
});

describe("compositeOver", () => {
  it("blends a translucent overlay onto an opaque base", () => {
    expect(compositeOver("#0000007F", "#FFFFFF")).toBe("#808080");
    expect(compositeOver("#FFFFFF7F", "#000000")).toBe("#7F7F7F");
  });

  it("keeps its JSDoc example at the value the function returns", () => {
    const source = readFileSync(
      new URL("./contrast.ts", import.meta.url),
      "utf8",
    );
    const composited = compositeOver("#00000080", "#FFFFFF");

    expect(composited).toBe("#7F7F7F");
    expect(source).toContain(
      `compositeOver("#00000080", "#FFFFFF"); // "${composited}"`,
    );
  });

  it("keeps the base when the overlay is fully transparent", () => {
    expect(compositeOver("#FFFFFF00", "#123456")).toBe("#123456");
  });

  it("returns a value it cannot parse unchanged", () => {
    expect(compositeOver("#FFFFFF", "#000000")).toBe("#FFFFFF");
    expect(compositeOver("transparent", "#000000")).toBe("transparent");
  });
});

describe("contrastFloors", () => {
  it("states the documented floors by level and pair class", () => {
    expect(contrastFloors).toEqual({
      default: {
        body: 7,
        secondary: 4.5,
        boundary: 3,
        surface: 1.05,
        divider: 1.05,
      },
      high: { body: 7, secondary: 7, boundary: 4.5, surface: 1.05, divider: 3 },
    });
  });
});

const shipped: ReadonlyArray<readonly [string, Theme, ThemeContrast]> = [
  ["light", lightTheme, "default"],
  ["dark", darkTheme, "default"],
  ["high-contrast light", highContrastLightTheme, "high"],
  ["high-contrast dark", highContrastDarkTheme, "high"],
];

describe("themeContrastFailures", () => {
  it("passes every shipped theme at the level it declares", () => {
    shipped.forEach(([label, theme, contrast]) => {
      expect(theme.contrast, label).toBe(contrast);
      expect(themeContrastFailures(theme), label).toEqual([]);
    });
  });

  it("reads the level a theme declares, not a laxer default", () => {
    // `#6B6B6B` is 5.33:1 on the AAA canvas (under 7:1) but 4.76:1 on the AAA
    // muted surface, so only the declared high-contrast floors catch it.
    expect(quietHighContrastFailures).toHaveLength(4);
    expect(
      quietHighContrastFailures.every(
        ({ foreground, floor }) =>
          foreground === "mutedForeground" && floor === 7,
      ),
    ).toBe(true);
    expect(themeContrastFailures(quietHighContrastTheme, "default")).toEqual(
      [],
    );
  });

  it("names every pair a brand theme misses, and only those", () => {
    const failures = themeContrastFailures(quietBrandTheme);
    expect(failures).toHaveLength(4);
    expect(
      failures.every(({ foreground }) => foreground === "mutedForeground"),
    ).toBe(true);
    expect(failures.map(({ background }) => background).toSorted()).toEqual(
      ["background", "card", "muted", "popover"].toSorted(),
    );
    expect(
      failures.every(
        ({ pairClass, floor }) => pairClass === "secondary" && floor === 4.5,
      ),
    ).toBe(true);
    expect(failures.every(({ ratio }) => ratio < 4.5)).toBe(true);
  });

  it("is the example's check, not a separate path", () => {
    expect(quietBrandFailures).toEqual(themeContrastFailures(quietBrandTheme));
  });

  it("reports an opaque selection wash over both surfaces", () => {
    const opaque = extendTheme(getTheme("light"), {
      colors: { selection: "#000000" },
    });
    const failures = themeContrastFailures(opaque).filter(
      ({ wash }) => wash === "selection",
    );
    expect(failures.map(({ background }) => background)).toEqual([
      "background",
      "card",
    ]);
    expect(
      failures.every(({ foreground }) => foreground === "foreground"),
    ).toBe(true);
  });

  it("accepts a transparent wash, because it paints the base", () => {
    const transparent = extendTheme(getTheme("light"), {
      colors: { selection: "#00000000" },
    });
    expect(themeContrastFailures(transparent)).toEqual([]);
  });

  it("reports a role it cannot measure instead of skipping it", () => {
    const typo = extendTheme(getTheme("dark"), {
      colors: { placeholder: "not-a-colour" },
    });
    const failures = themeContrastFailures(typo);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.background).toBe("input");
    expect(Number.isNaN(failures[0]?.ratio)).toBe(true);
  });

  it("covers every documented pair", () => {
    expect(contrastPairs.length).toBe(63);
    expect(new Set(contrastPairs).size).toBe(contrastPairs.length);
  });

  it("reports a soft status surface that vanishes into its canvas", () => {
    const white = "#FFFFFF";
    const invisible = extendTheme(getTheme("light"), {
      colors: {
        background: white,
        card: white,
        popover: white,
        successSoft: white,
      },
    });
    const failures = themeContrastFailures(invisible).filter(
      ({ pairClass }) => pairClass === "surface",
    );

    expect(
      failures.map(({ foreground, background }) => [foreground, background]),
    ).toEqual([
      ["successSoft", "background"],
      ["successSoft", "card"],
      ["successSoft", "popover"],
    ]);
    expect(
      failures.every(({ floor, ratio }) => floor === 1.05 && ratio === 1),
    ).toBe(true);
  });

  it("reports an invisible divider at the level it declares", () => {
    const invisible = extendTheme(getTheme("light", "high"), {
      colors: { border: getTheme("light", "high").colors.background },
    });
    const failures = themeContrastFailures(invisible).filter(
      ({ pairClass }) => pairClass === "divider",
    );

    expect(failures.map(({ background }) => background)).toEqual([
      "background",
      "card",
      "popover",
    ]);
    expect(
      failures.every(({ floor, ratio }) => floor === 3 && ratio === 1),
    ).toBe(true);
  });

  it("checks the focus ring on the washes a focused row paints", () => {
    expect(quietRingTheme.colors.ring).toBe("#EFF4FF");
    const ringFailures = quietRingFailures
      .filter(({ foreground }) => foreground === "ring")
      .map(({ background, pairClass, floor }) => ({
        background,
        pairClass,
        floor,
      }));
    expect(ringFailures).toEqual(
      ["hover", "active", "selected", "background", "card", "popover"].map(
        (background) => ({ background, pairClass: "boundary", floor: 3 }),
      ),
    );
  });
});
