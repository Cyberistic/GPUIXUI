/**
 * Guards the gap plan 308 closed: plan 300 declined a fill pair for a soft chip
 * on a row wash because the designed `xSoftBorder` edge carries the shape — but
 * the edge was measured only on its own fill, so the boundary a reader actually
 * sees was unmeasured. The macOS light `warningSoftBorder` measured 1.036:1 and
 * the Linux light one 1.042:1 on their own pressed washes, and with the fill at
 * 1.00–1.04:1 as well a warning Badge in a pressed row had no visible boundary
 * at all.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  platformNames,
  softBorderSurfacePairs,
  statusTones,
  themeContrastFailures,
  themes,
  highContrastThemes,
  type Theme,
} from "./index.js";

const chipSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

const shippedThemes = (): ReadonlyArray<Theme> => [
  ...Object.values(themes),
  ...Object.values(highContrastThemes),
  ...platformNames
    .filter((platform) => platform !== "default")
    .flatMap((platform) => [
      getPlatformTheme(platform, "light"),
      getPlatformTheme(platform, "dark"),
    ]),
];

describe("soft status edge on the surfaces a chip sits on", () => {
  it("measures every tone on the eight chip surfaces", () => {
    expect(softBorderSurfacePairs).toHaveLength(
      statusTones.length * chipSurfaces.length,
    );
    expect(
      softBorderSurfacePairs.map(([foreground, background]) => [
        foreground,
        background,
      ]),
    ).toEqual(
      statusTones.flatMap((tone) =>
        chipSurfaces.map((surface) => [`${tone}SoftBorder`, surface]),
      ),
    );
  });

  it("clears the divider floor on every shipped surface", () => {
    shippedThemes().forEach((theme) => {
      softBorderSurfacePairs.forEach(([foreground, background]) => {
        expect(
          contrastRatio(theme.colors[foreground], theme.colors[background]),
          `${theme.name}: ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].divider);
      });
    });
  });

  it("states the macOS and Linux light pressed-wash regression", () => {
    const oldEdge = "#FCD47B";
    (["darwin", "linux"] as const).forEach((platform) => {
      const theme = getPlatformTheme(platform, "light");
      expect(
        contrastRatio(oldEdge, theme.colors.active),
        `${platform}: the pre-308 edge on the pressed wash`,
      ).toBeLessThan(contrastFloors.default.divider);
      expect(
        contrastRatio(theme.colors.warningSoftBorder, theme.colors.active),
        `${platform}: the shipped edge on the pressed wash`,
      ).toBeGreaterThanOrEqual(contrastFloors.default.divider);
    });
  });

  it("reports an edge erased by the pressed wash through the public checker", () => {
    const macos = getPlatformTheme("darwin", "light");
    const erased = extendTheme(macos, {
      colors: { warningSoftBorder: macos.colors.active },
    });

    expect(themeContrastFailures(erased)).toContainEqual({
      foreground: "warningSoftBorder",
      background: "active",
      pairClass: "divider",
      floor: contrastFloors.default.divider,
      ratio: 1,
    });
  });

  it("accepts a copied style that designs its own edge", () => {
    const designed = extendTheme(getPlatformTheme("darwin", "light"), {
      colors: { warningSoftBorder: "#B57600" },
    });

    expect(themeContrastFailures(designed)).toEqual([]);
  });
});
