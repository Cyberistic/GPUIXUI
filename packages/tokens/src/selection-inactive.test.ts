/**
 * Guards the defect plan 510 fixes: `disabledForeground` was measured on the
 * thirteen surfaces an unavailable label paints, but never through the
 * text-selection wash `selectionColor` inherits over that same text. With the
 * shipped palette a selected disabled label measured **2.586:1** on Windows
 * light's `selected` fill, 2.604–2.945:1 on the other default light sets and
 * 3.430 / 4.357:1 in the two AAA sets — under the 3:1 / 4.5:1 `inactive` floor —
 * while every `themeFailures` check returned `[]`, because no pair painted the
 * composition. The list is `selectionInactivePairs`; the three values that moved
 * are `#545D6C`, `#444444` and `#D0D0D0` (the last one again in plan 520, for the
 * disabled panel action's inverse veil).
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  inactiveSurfaces,
  lightTheme,
  selectionInactivePairs,
  themeContrastFailures,
  themes,
  type Theme,
} from "./index.js";

const shipped: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

const washedRatio = (theme: Theme, surface: keyof Theme["colors"]): number =>
  contrastRatio(
    theme.colors.disabledForeground,
    compositeOver(theme.colors.selection, theme.colors[surface]),
  );

describe("the unavailable label under the selection wash", () => {
  it("holds every shipped set to the inactive floor through the wash", () => {
    shipped.forEach(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].inactive;
      inactiveSurfaces.forEach((surface) => {
        expect(
          washedRatio(theme, surface),
          `${label}: disabledForeground over selection on ${surface}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("publishes one washed pair per surface an inactive label paints on", () => {
    expect(selectionInactivePairs).toEqual(
      inactiveSurfaces.map((surface) => [
        "disabledForeground",
        surface,
        "inactive",
      ]),
    );
  });

  it("reports the shipped light value through the public checker", () => {
    const old = extendTheme(themes.light, {
      colors: { disabledForeground: "#6E7787" },
    });
    const failures = themeContrastFailures(old).filter(
      ({ foreground }) => foreground === "disabledForeground",
    );

    expect(failures).toHaveLength(6);
    failures.forEach(({ wash, pairClass }) => {
      expect(wash).toBe("selection");
      expect(pairClass).toBe("inactive");
    });
    expect(failures).toContainEqual(
      expect.objectContaining({
        background: "destructiveSoft",
        wash: "selection",
        pairClass: "inactive",
        floor: 3,
      }),
    );
    expect(washedRatio(old, "destructiveSoft")).toBeCloseTo(2.635, 2);
  });

  it("reports the AAA values one step lighter than the shipped ones", () => {
    const light = extendTheme(highContrastLightTheme, {
      colors: { disabledForeground: "#5A5A5A" },
    });
    const lightFailures = themeContrastFailures(light).filter(
      ({ foreground }) => foreground === "disabledForeground",
    );
    expect(lightFailures).toHaveLength(10);
    expect(washedRatio(light, "destructiveSoft")).toBeCloseTo(3.43, 2);

    const dark = extendTheme(highContrastDarkTheme, {
      colors: { disabledForeground: "#A9A9A9" },
    });
    const darkFailures = themeContrastFailures(dark).filter(
      ({ foreground }) => foreground === "disabledForeground",
    );
    expect(darkFailures).toHaveLength(2);
    expect(darkFailures).toContainEqual(
      expect.objectContaining({
        background: "active",
        wash: "selection",
        pairClass: "inactive",
        floor: 4.5,
      }),
    );
    expect(darkFailures).toContainEqual(
      expect.objectContaining({
        background: "softAction",
        wash: "selectionOnFill",
        pairClass: "inactive",
        floor: 4.5,
      }),
    );
    expect(washedRatio(dark, "active")).toBeCloseTo(4.357, 2);
  });

  it("fails only through the wash, not on the surfaces at rest", () => {
    const old = extendTheme(lightTheme, {
      colors: { disabledForeground: "#6E7787" },
    });

    inactiveSurfaces.forEach((surface) => {
      expect(
        contrastRatio(old.colors.disabledForeground, old.colors[surface]),
        surface,
      ).toBeGreaterThanOrEqual(contrastFloors.default.inactive);
    });
    expect(
      themeContrastFailures(old).every(({ wash }) => wash === "selection"),
    ).toBe(true);
  });

  it("keeps the AAA floor live one step below the shipped light value", () => {
    const lighter = extendTheme(highContrastLightTheme, {
      colors: { disabledForeground: "#4A4A4A" },
    });
    const failures = themeContrastFailures(lighter).filter(
      ({ foreground }) => foreground === "disabledForeground",
    );

    expect(failures.map(({ background }) => background)).toEqual([
      "active",
      "destructiveSoft",
    ]);
    failures.forEach(({ floor }) => {
      expect(floor).toBe(contrastFloors.high.inactive);
    });
  });
});
