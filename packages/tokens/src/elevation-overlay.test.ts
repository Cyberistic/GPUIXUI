/**
 * Guards the defect plan 566 fixes: the design system publishes the elevation
 * level names as an order — "each level's painted feather is no smaller than
 * the level below it" — and plans 369/390 made a consumer-defined `overlay` a
 * governed level, but `featherLadder` walked a hand-typed `sm`/`md`/`lg`. A
 * defined `overlay` could therefore paint a 0px feather above the shipped 40px
 * `lg` while `themeMetricFailures` returned `[]`, making the topmost level the
 * shallowest one.
 */
import { describe, expect, it } from "vitest";
import { themeContrastFailures } from "./contrast.js";
import {
  elevationLevels,
  elevationShadow,
  type ElevationShape,
} from "./elevation.js";
import {
  commandPaletteShadow,
  commandPaletteTheme,
} from "./elevation-overlay.example.js";
import { themeMetricFailures } from "./metrics.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, lightTheme } from "./theme.js";

/** A complete overlay level, so a case varies only the feather. */
const overlay = (blurRadius: number): ElevationShape => ({
  offsetX: 0,
  offsetY: 32,
  blurRadius,
  spreadRadius: -12,
  alpha: 0.2,
});

/** The light theme with a defined `overlay` at the given feather. */
const withOverlay = (blurRadius: number) =>
  extendTheme(lightTheme, { elevation: { overlay: [overlay(blurRadius)] } });

/** The elevation failures a theme reports. */
const elevationFailures = (theme: Parameters<typeof themeMetricFailures>[0]) =>
  themeMetricFailures(theme).filter(({ group }) => group === "elevation");

/** The defined levels in the package's own order. */
const definedLevels = elevationLevels.filter(
  (level) => lightTheme.elevation[level].length > 0,
);

/** The level a defined `overlay` sits above, and its painted feather. */
const predecessor = definedLevels.at(-1);

const predecessorFeather =
  predecessor === undefined
    ? undefined
    : lightTheme.elevation[predecessor][0]?.blurRadius;

describe("elevation feather ladder", () => {
  it("reports a defined overlay that feathers below the level it sits above", () => {
    const [failure] = elevationFailures(withOverlay(0));
    expect(failure).toEqual({
      group: "elevation",
      member: "overlay[0].blurRadius",
      rule: "non-decreasing",
      actual: 0,
      bound: predecessorFeather,
    });
    expect(themeContrastFailures(withOverlay(0))).toEqual([]);
  });

  it("accepts an overlay that equals or exceeds the level below it", () => {
    expect(predecessorFeather).toBeTypeOf("number");
    expect(elevationFailures(withOverlay(predecessorFeather ?? 0))).toEqual([]);
    expect(
      elevationFailures(withOverlay((predecessorFeather ?? 0) + 8)),
    ).toEqual([]);
  });

  it("accepts the documented command-palette theme and paints its level", () => {
    expect(themeMetricFailures(commandPaletteTheme)).toEqual([]);
    expect(elevationShadow(commandPaletteTheme, "overlay")?.blurRadius).toBe(
      commandPaletteShadow.blurRadius,
    );
  });

  it("keeps the shipped empty overlay exempt", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeMetricFailures(theme), theme.name).toEqual([]);
      expect(theme.elevation.overlay, theme.name).toEqual([]);
    });
  });

  it("keeps one bad level to one diagnostic", () => {
    const failures = elevationFailures(withOverlay(Number.POSITIVE_INFINITY));
    expect(failures).toHaveLength(1);
    expect(failures[0]?.member).toBe("overlay[0].blurRadius");
    expect(failures[0]?.rule).toBe("finite");
  });
});
