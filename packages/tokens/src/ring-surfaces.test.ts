/**
 * Guards the defect fixed in plan 086: the focus ring was measured on six of the
 * eight surfaces a focused control can sit on — `074` added the three state
 * washes but not the `muted` panel a sidebar control sits on or the `accent`
 * wash a selectable row paints. Both shipped pairs passed, so no colour moves;
 * this suite keeps them measured, and keeps the eight-surface list from being
 * edited by accident.
 */

import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  platformNames,
  themeContrastFailures,
  type Theme,
  type ThemeContrast,
} from "./index.js";

const ringSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "accent",
  "hover",
  "active",
  "selected",
] as const;

const variant = (
  label: string,
  theme: Theme,
  contrast: ThemeContrast,
): readonly [string, Theme, ThemeContrast] => [label, theme, contrast];

const shipped: ReadonlyArray<readonly [string, Theme, ThemeContrast]> = [
  variant("light", getTheme("light"), "default"),
  variant("dark", getTheme("dark"), "default"),
  variant("high-contrast light", getTheme("light", "high"), "high"),
  variant("high-contrast dark", getTheme("dark", "high"), "high"),
  ...platformNames.flatMap((platform) => [
    variant(
      `${platform} light`,
      getPlatformTheme(platform, "light"),
      "default",
    ),
    variant(`${platform} dark`, getPlatformTheme(platform, "dark"), "default"),
    variant(
      `${platform} high-contrast light`,
      getPlatformTheme(platform, "light", "high"),
      "high",
    ),
    variant(
      `${platform} high-contrast dark`,
      getPlatformTheme(platform, "dark", "high"),
      "high",
    ),
  ]),
];

describe("the focus ring", () => {
  it("keeps the ring visible on every shipped surface", () => {
    const misses = shipped.flatMap(([label, theme, contrast]) =>
      themeContrastFailures(theme, contrast)
        .filter(({ foreground }) => foreground === "ring")
        .map(({ background, ratio }) => `${label} · ${background}: ${ratio}`),
    );

    expect(misses).toEqual([]);
  });

  it("publishes the eight ring surfaces in documented order", () => {
    const backgrounds = contrastPairs
      .filter(([foreground]) => foreground === "ring")
      .map(([, background]) => background);

    expect(backgrounds).toEqual([...ringSurfaces]);
    expect(new Set(backgrounds).size).toBe(backgrounds.length);
  });

  it("holds the quiet panel and the accent wash to the boundary floor", () => {
    const quietSurfaces = ["muted", "accent"] as const;
    shipped.forEach(([label, theme, contrast]) => {
      const floor = contrastFloors[contrast].boundary;
      quietSurfaces.forEach((surface) => {
        const ratio = contrastRatio(theme.colors.ring, theme.colors[surface]);
        expect(ratio, `${label} · ${surface}`).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("reports a ring that vanishes into every surface", () => {
    const invisible = extendTheme(getTheme("light"), {
      colors: { ring: getTheme("light").colors.background },
    });
    const failures = themeContrastFailures(invisible)
      .filter(({ foreground }) => foreground === "ring")
      .map(({ background, pairClass, floor }) => ({
        background,
        pairClass,
        floor,
      }));

    expect(failures).toEqual(
      ringSurfaces.map((background) => ({
        background,
        pairClass: "boundary",
        floor: 3,
      })),
    );
  });
});
