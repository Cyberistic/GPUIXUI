/**
 * Guards the categorical scale data marks are painted in.
 *
 * The bug this prevents: the design system had no colour a chart could use for
 * "this series is different from that one". A chart author therefore either
 * borrowed a semantic role — a revenue bar painted `warning` — or hard-coded a
 * palette, which is exactly what the docs dashboard's `PALETTE` does today
 * (`#8b5cf6`, `#3b82f6`, … with a comment claiming they are readable in both
 * themes and nothing measuring it). Neither follows a theme, so a brand's chart
 * cannot follow its palette.
 *
 * The scale is held to two contracts and this file measures both: every swatch
 * is perceivable against the surfaces a plot is drawn on, and no two swatches
 * read as the same colour. The second cannot be a contrast ratio — two hues of
 * one lightness differ plainly yet measure near 1:1 — so it is an OKLab
 * distance, and the failure cases below build a brand whose scale is too pale
 * to see and a brand whose scale repeats a colour.
 */

import { describe, expect, it } from "vitest";
import { auditTheme } from "./audit.js";
import { contrastFloors, highContrastFloors } from "./contrast.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import {
  brandChartTheme,
  brandSeries,
  legend,
  seriesReport,
} from "./series.example.js";
import {
  darkSeries,
  highContrastDarkSeries,
  highContrastLightSeries,
  lightSeries,
  type SeriesColors,
  seriesColors,
  seriesDistinctnessFloor,
  seriesFailures,
  seriesSurfaces,
} from "./series.js";
import {
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  platformTheme,
  themes,
} from "./theme.js";

const shipped = [
  lightTheme,
  darkTheme,
  highContrastLightTheme,
  highContrastDarkTheme,
] as const;

/** Every platform and authored look, in both modes. */
const styled = [
  ...platformNames.flatMap((name) =>
    Object.values(themes).map((theme) => platformTheme(theme, name)),
  ),
  ...retroNames.flatMap((look) =>
    Object.values(themes).map((theme) => retroTheme(theme, look)),
  ),
];

/** A scale that repeats one value in all five positions. */
const five = (color: string): SeriesColors => [
  color,
  color,
  color,
  color,
  color,
];

const auditPassed = (theme: Parameters<typeof auditTheme>[0]): boolean =>
  auditTheme(theme).passed;

describe("the shipped scale", () => {
  it("is five opaque colours in every variant", () => {
    const tables: ReadonlyArray<readonly [string, SeriesColors]> = [
      ["light", lightSeries],
      ["dark", darkSeries],
      ["high-contrast light", highContrastLightSeries],
      ["high-contrast dark", highContrastDarkSeries],
    ];
    const malformed = tables.flatMap(([name, colors]) =>
      colors.flatMap((color, index) =>
        /^#[0-9A-Fa-f]{6}$/.test(color) ? [] : [`${name} ${index}`],
      ),
    );

    expect(tables.every(([, colors]) => colors.length === 5)).toBe(true);
    expect(malformed).toEqual([]);
  });

  it("resolves a table by mode and contrast variant", () => {
    expect(seriesColors(lightTheme)).toBe(lightSeries);
    expect(seriesColors(darkTheme)).toBe(darkSeries);
    expect(seriesColors(highContrastLightTheme)).toBe(highContrastLightSeries);
    expect(seriesColors(highContrastDarkTheme)).toBe(highContrastDarkSeries);
  });

  it("follows the theme that carries its own scale", () => {
    expect(seriesColors(brandChartTheme)).toBe(brandSeries);
    expect(seriesColors(lightTheme)).not.toBe(brandSeries);
  });

  it("keeps the scale on a platform or authored look's base theme", () => {
    expect(seriesColors(platformTheme(lightTheme, "linux"))).toBe(lightSeries);
  });
});

describe("every shipped scale passes its contract", () => {
  const passing = [...shipped, ...styled];

  it("is perceivable on every plot surface", () => {
    const failing = passing.flatMap((theme) =>
      seriesFailures(theme).surfaces.map(
        ({ index, surface, ratio }) =>
          `${theme.name} series ${index + 1} on ${surface} is ${ratio ?? "unmeasurable"}`,
      ),
    );

    expect(failing).toEqual([]);
  });

  it("separates every pair of swatches", () => {
    const failing = passing.flatMap((theme) =>
      seriesFailures(theme).distinctness.map(
        ({ index, other, distance }) =>
          `${theme.name} series ${index + 1}/${other + 1} is ${distance ?? "unmeasurable"}`,
      ),
    );

    expect(failing).toEqual([]);
  });

  it("audits a real set, so a scan that stopped iterating cannot pass", () => {
    expect(passing.length).toBeGreaterThanOrEqual(16);
    expect(seriesSurfaces).toEqual(["background", "card", "popover"]);
  });
});

describe("the surface floor follows the theme's variant", () => {
  /** Grey on white: 3.95:1 — past the default floor, short of the high one. */
  const plainGrey = five("#808080");

  it("passes the default variant and fails the high-contrast one", () => {
    const ordinary = extendTheme(lightTheme, { series: plainGrey });
    const accessible = extendTheme(highContrastLightTheme, {
      series: plainGrey,
    });

    expect(seriesFailures(ordinary).surfaces).toEqual([]);
    expect(contrastFloors.boundary).toBe(3);
    expect(highContrastFloors.boundary).toBe(4.5);
    const failing = seriesFailures(accessible).surfaces;
    expect([...new Set(failing.map(({ surface }) => surface))]).toEqual([
      "background",
      "card",
      "popover",
    ]);
    expect(failing).toHaveLength(15);
    expect(failing[0]?.floor).toBe(4.5);
  });

  it("lets a caller tighten the surface floor", () => {
    const report = seriesFailures(lightTheme, { surface: 5 });
    const onBackground = report.surfaces
      .filter(({ surface }) => surface === "background")
      .map(({ index }) => index);

    expect(onBackground).toEqual([2, 3, 4]);
  });
});

describe("the failures name the decision", () => {
  it("reports a swatch that is the card it is drawn on", () => {
    const invisible = extendTheme(lightTheme, {
      series: [
        "#5F4BDB",
        "#0E7490",
        lightTheme.colors.card,
        "#B57600",
        "#CC3439",
      ],
    });
    const [failure] = seriesFailures(invisible).surfaces;

    expect(failure?.index).toBe(2);
    expect(failure?.color).toBe(lightTheme.colors.card);
    expect(failure?.surface).toBe("background");
    expect(failure?.ratio).toBeCloseTo(1.06);
    expect(failure?.floor).toBe(contrastFloors.boundary);
  });

  it("reports two swatches a reader cannot tell apart", () => {
    const repeated = extendTheme(lightTheme, {
      series: ["#5F4BDB", "#5F4BDC", "#158754", "#B57600", "#CC3439"],
    });
    const [failure] = seriesFailures(repeated).distinctness;

    expect(failure?.index).toBe(0);
    expect(failure?.other).toBe(1);
    expect(failure?.distance).toBeLessThan(seriesDistinctnessFloor);
    expect(failure?.floor).toBe(seriesDistinctnessFloor);
  });

  it("reports an unmeasurable swatch instead of skipping it", () => {
    const translucent = extendTheme(lightTheme, {
      series: ["#5F4BDB80", "#0E7490", "#158754", "#B57600", "#CC3439"],
    });
    const { surfaces, distinctness } = seriesFailures(translucent);

    expect(surfaces).toHaveLength(3);
    expect(surfaces.every(({ ratio }) => ratio === undefined)).toBe(true);
    expect(distinctness.some(({ distance }) => distance === undefined)).toBe(
      true,
    );
  });
});

describe("the gate includes the scale", () => {
  it("fails an audit whose only defect is a chart swatch", () => {
    const invisible = extendTheme(lightTheme, {
      series: [
        lightTheme.colors.background,
        "#0E7490",
        "#158754",
        "#B57600",
        "#CC3439",
      ],
    });

    expect(seriesFailures(invisible).surfaces.length).toBeGreaterThan(0);
    expect(auditPassed(invisible)).toBe(false);
  });

  it("passes a brand that owns a readable scale", () => {
    expect(seriesFailures(brandChartTheme)).toEqual({
      surfaces: [],
      distinctness: [],
    });
    expect(auditPassed(brandChartTheme)).toBe(true);
  });
});

describe("the example is executable and its calls are the documented ones", () => {
  it("pairs labels with the theme's scale in order", () => {
    expect(legend(brandChartTheme, ["Kimi", "DeepSeek"])).toEqual([
      { label: "Kimi", color: brandSeries[0] },
      { label: "DeepSeek", color: brandSeries[1] },
    ]);
  });

  it("folds a sixth category into Other rather than reusing a colour", () => {
    const rows = legend(lightTheme, ["a", "b", "c", "d", "e", "f"]);

    expect(rows).toHaveLength(6);
    expect(rows.slice(0, 5).map(({ color }) => color)).toEqual([
      ...lightSeries,
    ]);
    expect(rows[5]).toEqual({
      label: "Other",
      color: lightTheme.colors.mutedForeground,
    });
  });

  it("writes a report a theme editor can show", () => {
    const broken = extendTheme(lightTheme, {
      series: five(lightTheme.colors.card),
    });

    expect(seriesReport(broken)[0]).toBe("series 1 on background is 1.06");
  });
});
