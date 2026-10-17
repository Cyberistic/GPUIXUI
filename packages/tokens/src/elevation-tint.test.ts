/**
 * Guards the defect fixed in plan 085: `colors.shadow` was documented as the
 * elevation tint and every platform style set it, but no elevation level ever
 * read it — each level carried its own complete colour. A consumer editing the
 * documented tint in a copied platform style therefore changed no shadow, and
 * the same tint was duplicated three times per set. A level is now geometry plus
 * an alpha, and the painted shadow is composed from the role.
 */

import { describe, expect, it } from "vitest";
import {
  elevationShadow,
  elevationShadows,
  type ElevationLevel,
} from "./elevation.js";
import { platformNames } from "./platforms.js";
import {
  extendTheme,
  getPlatformTheme,
  getTheme,
  themes,
  type Theme,
} from "./theme.js";

const levels: readonly ElevationLevel[] = ["sm", "md", "lg"];

const variant = (label: string, theme: Theme): readonly [string, Theme] => [
  label,
  theme,
];

const shipped: ReadonlyArray<readonly [string, Theme]> = [
  variant("light", getTheme("light")),
  variant("dark", getTheme("dark")),
  variant("high-contrast light", getTheme("light", "high")),
  variant("high-contrast dark", getTheme("dark", "high")),
  ...platformNames.flatMap((platform) => [
    variant(`${platform} light`, getPlatformTheme(platform, "light")),
    variant(`${platform} dark`, getPlatformTheme(platform, "dark")),
  ]),
];

/** The hex each level painted before the tint moved into the role. */
const painted: ReadonlyArray<readonly [string, Theme, readonly string[]]> = [
  ["light", themes.light, ["#191D2514", "#191D251F", "#191D2529"]],
  ["dark", themes.dark, ["#00000066", "#000000A6", "#000000CC"]],
  [
    "darwin light",
    getPlatformTheme("darwin", "light"),
    ["#00000014", "#0000001F", "#00000029"],
  ],
  [
    "darwin dark",
    getPlatformTheme("darwin", "dark"),
    ["#00000066", "#00000099", "#000000CC"],
  ],
  [
    "linux light",
    getPlatformTheme("linux", "light"),
    ["#0000001A", "#00000024", "#00000030"],
  ],
  [
    "linux dark",
    getPlatformTheme("linux", "dark"),
    ["#00000066", "#000000A6", "#000000CC"],
  ],
  [
    "win32 light",
    getPlatformTheme("win32", "light"),
    ["#0000001A", "#00000029", "#00000033"],
  ],
  [
    "win32 dark",
    getPlatformTheme("win32", "dark"),
    ["#00000066", "#000000A6", "#000000CC"],
  ],
];

describe("the elevation tint", () => {
  it("retints every level from the theme's shadow role", () => {
    const retinted = extendTheme(themes.light, {
      colors: { shadow: "#FF0000" },
    });

    expect(
      levels.map((level) => elevationShadow(retinted, level)?.color),
    ).toEqual(["#FF000014", "#FF00001F", "#FF000029"]);
  });

  it("composes the documented tint into the runtime shadow", () => {
    expect(elevationShadow(themes.light, "md")).toEqual({
      offsetX: 0,
      offsetY: 4,
      blurRadius: 12,
      spreadRadius: -2,
      color: "#191D251F",
    });
    expect(elevationShadow(themes.dark, "lg")?.color).toBe("#000000CC");
  });

  it("keeps every pixel the pre-085 levels painted", () => {
    painted.forEach(([label, theme, expected]) => {
      expect(
        levels.map((level) => elevationShadow(theme, level)?.color),
        label,
      ).toEqual([...expected]);
    });
  });

  it("declares an opaque tint on every shipped theme", () => {
    shipped.forEach(([label, theme]) => {
      expect(theme.colors.shadow, label).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  it("resolves the whole level for a compositing renderer", () => {
    expect(elevationShadows(themes.light, "md")).toEqual([
      elevationShadow(themes.light, "md"),
    ]);
    expect(elevationShadows(themes.light, "overlay")).toEqual([]);
  });
});
