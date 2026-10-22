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
 * The scale is held to three contracts and this file measures all of them:
 * every swatch is perceivable against the surfaces a plot is drawn on, no two
 * swatches read as the same colour, and no two collapse for a reader with
 * protanopia, deuteranopia or tritanopia. The second cannot be a contrast ratio
 * — two hues of one lightness differ plainly yet measure near 1:1 — so it is an
 * OKLab distance; the third repeats that distance after simulating each
 * deficiency, because a red and a green 0.286 apart for a full-colour reader
 * are 0.027 apart to a deuteranope. The failure cases below build a brand whose
 * scale is too pale to see, a brand whose scale repeats a colour and a brand
 * whose red/green pair separates only for a full-colour reader.
 */

import { describe, expect, it } from "vitest";
import { auditTheme } from "./audit.js";
import {
  contrastFloors,
  contrastRatio,
  highContrastFloors,
} from "./contrast.js";
import { platformNames } from "./platforms.js";
import { lunaSeries, retroNames, retroStyles, retroTheme } from "./retro.js";
import {
  brandChartTheme,
  brandSeries,
  houseLook,
  houseSeries,
  houseTheme,
  legend,
  seriesReport,
} from "./series.example.js";
import {
  colorVisionDeficiencies,
  darkSeries,
  highContrastDarkSeries,
  highContrastLightSeries,
  lightSeries,
  type SeriesColors,
  seriesColors,
  seriesDeficiencyFloor,
  seriesDistinctnessFloor,
  seriesFailures,
  seriesSurfaces,
  simulateColorVision,
} from "./series.js";
import {
  applyStyle,
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
    // The one look that repaints the strips a plot is drawn on owns its table.
    expect(seriesColors(retroTheme(lightTheme, "luna"))).toBe(lunaSeries);
  });

  it("follows the scale a look declares for its own plot surfaces", () => {
    const themed = houseTheme("light");

    expect(themed.series).toBe(houseSeries);
    expect(seriesColors(themed)).toBe(houseSeries);
    expect(seriesColors(lightTheme)).toBe(lightSeries);
    // A mode the look does not name keeps the base's table, and a style that
    // declares none is the platform case above.
    expect(houseTheme("dark").series).toBeUndefined();
    expect(seriesColors(houseTheme("dark"))).toBe(darkSeries);
    expect(retroStyles.luna.series?.light).toBe(lunaSeries);
    expect(retroTheme(lightTheme, "luna").series).toBe(lunaSeries);
  });

  it("keeps a high-contrast base's own scale", () => {
    // Same rule as the palette: a scale designed for a look's strips is not an
    // AAA one, so accessibility outranks the look.
    const accessible = applyStyle(highContrastLightTheme, houseLook);

    expect(accessible.series).toBeUndefined();
    expect(seriesColors(accessible)).toBe(highContrastLightSeries);
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

  it("keeps every pair apart for a colour-vision-deficient reader", () => {
    const failing = passing.flatMap((theme) =>
      seriesFailures(theme).deficiencies.map(
        ({ deficiency, index, other, distance }) =>
          `${theme.name} ${deficiency} series ${index + 1}/${other + 1} is ${distance ?? "unmeasurable"}`,
      ),
    );

    expect(failing).toEqual([]);
  });

  it("audits a real set, so a scan that stopped iterating cannot pass", () => {
    expect(passing.length).toBeGreaterThanOrEqual(16);
    // The quiet strip is a default because the library's own plots land there.
    expect(seriesSurfaces).toEqual(["background", "card", "popover", "muted"]);
  });

  it("names the tightest plot placement over every shipped style", () => {
    const measured = passing.flatMap((theme) =>
      seriesColors(theme).flatMap((color, index) =>
        seriesSurfaces.flatMap((surface) => {
          const ratio = contrastRatio(color, theme.colors[surface]);
          return ratio === undefined
            ? []
            : [{ label: theme.name, index, surface, ratio }];
        }),
      ),
    );
    const tightest = measured.reduce((lowest, placement) =>
      placement.ratio < lowest.ratio ? placement : lowest,
    );

    expect(tightest).toEqual({
      label: "Light · Windows 7 (Aero)",
      index: 3,
      surface: "muted",
      ratio: expect.closeTo(3.047, 2),
    });
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
      ...seriesSurfaces,
    ]);
    expect(failing).toHaveLength(seriesSurfaces.length * 5);
    expect(failing[0]?.floor).toBe(4.5);
  });

  it("lets a caller tighten the surface floor", () => {
    const report = seriesFailures(lightTheme, { surface: 5 });
    const onBackground = report.surfaces
      .filter(({ surface }) => surface === "background")
      .map(({ index }) => index);

    expect(onBackground).toEqual([2, 3]);
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

    expect(surfaces).toHaveLength(seriesSurfaces.length);
    expect(surfaces.every(({ ratio }) => ratio === undefined)).toBe(true);
    expect(distinctness.some(({ distance }) => distance === undefined)).toBe(
      true,
    );
  });
});

describe("the strips a plot is drawn on", () => {
  it("measures the quiet strip by default and names any other", () => {
    // A dark window whose sidebar is white: the shared dark scale is clean on
    // the page, the card and the popover, and four of its five swatches are
    // gone on the toolbar the chart in that sidebar is actually drawn on.
    const whiteSidebar = extendTheme(darkTheme, {
      colors: { muted: "#FFFFFF" },
    });

    expect(
      seriesFailures(whiteSidebar, {
        surfaces: ["background", "card", "popover"],
      }).surfaces,
    ).toEqual([]);

    const measured = seriesFailures(whiteSidebar);
    expect(
      measured.surfaces.map(
        ({ index, surface, ratio }) =>
          `${index + 1} on ${surface} is ${ratio?.toFixed(2)}`,
      ),
    ).toEqual([
      "1 on muted is 2.15",
      "2 on muted is 2.67",
      "4 on muted is 1.31",
      "5 on muted is 1.97",
    ]);
    expect(measured.surfaces.every(({ floor }) => floor === 3)).toBe(true);
    expect(seriesSurfaces).toEqual(["background", "card", "popover", "muted"]);
  });
});

describe("a look owns the scale its own strips need", () => {
  const luna = retroTheme(themes.light, "luna");

  it("measures the shared light table on Luna's toolbar", () => {
    // The measured case for the mechanism: a look that only repainted its page
    // resolved the table designed for a near-white one, and on Luna's `#E0DCCB`
    // toolbar the shared amber is 2.75:1 — one series nobody can find.
    const inherited = seriesFailures(
      { ...luna, series: lightSeries },
      { surfaces: ["muted"] },
    );

    expect(
      inherited.surfaces.map(
        ({ index, surface, ratio }) =>
          `series ${index + 1} on ${surface} is ${ratio?.toFixed(2)}`,
      ),
    ).toEqual(["series 4 on muted is 2.75"]);
  });

  it("ships the table its own toolbar needs", () => {
    expect(retroStyles.luna.series?.light).toBe(lunaSeries);
    expect(seriesColors(luna)).toBe(lunaSeries);
    expect(seriesFailures(luna)).toEqual({
      surfaces: [],
      distinctness: [],
      deficiencies: [],
    });
    // The dark edition keeps the shared dark table: its navy page separates it.
    expect(retroStyles.luna.series?.dark).toBeUndefined();
    expect(seriesColors(retroTheme(themes.dark, "luna"))).toBe(darkSeries);
  });

  it("is clean on every strip with a house table a consumer declares", () => {
    expect(seriesFailures(houseTheme("light"))).toEqual({
      surfaces: [],
      distinctness: [],
      deficiencies: [],
    });
  });
});

describe("the colour-vision contract", () => {
  /**
   * A brand's red and green: 0.286 apart for a full-colour reader, 0.024 apart
   * once deuteranopia is simulated.
   */
  const redGreen: SeriesColors = [
    "#C02B45",
    "#2E7D32",
    "#5F4BDB",
    "#1B45AC",
    "#B57600",
  ];

  it("reports a pair a deuteranope cannot tell apart", () => {
    const report = seriesFailures(
      extendTheme(lightTheme, { series: redGreen }),
    );
    const failure = report.deficiencies.find(
      ({ deficiency, index, other }) =>
        deficiency === "deuteranopia" && index === 0 && other === 1,
    );

    expect(report.surfaces).toEqual([]);
    expect(report.distinctness).toEqual([]);
    expect(failure?.distance).toBeCloseTo(0.024, 2);
    expect(failure?.floor).toBe(seriesDeficiencyFloor);
  });

  it("fails the audit when the deficiency pair is the only defect", () => {
    const brand = extendTheme(lightTheme, { series: redGreen });
    const audit = auditTheme(brand);

    expect(audit.series.deficiencies).toEqual(
      seriesFailures(brand).deficiencies,
    );
    expect([
      audit.invalidRoles,
      audit.contrast,
      audit.decorative,
      audit.series.surfaces,
      audit.series.distinctness,
      audit.selection,
    ]).toEqual([[], [], [], [], [], []]);
    expect(audit.passed).toBe(false);
  });

  it("reports a swatch it cannot simulate rather than skipping it", () => {
    const translucent = extendTheme(lightTheme, {
      series: ["#5F4BDB80", "#2E7D32", "#1B45AC", "#B57600", "#A5262B"],
    });
    const unmeasurable = seriesFailures(translucent).deficiencies.filter(
      ({ index, other }) => index === 0 && other === 1,
    );

    expect(unmeasurable).toHaveLength(colorVisionDeficiencies.length);
    expect(unmeasurable.every(({ distance }) => distance === undefined)).toBe(
      true,
    );
  });

  it("lets a caller tighten the deficiency floor", () => {
    const report = seriesFailures(lightTheme, { deficiency: 0.2 });

    expect(report.deficiencies.length).toBeGreaterThan(0);
    expect(report.deficiencies.every(({ floor }) => floor === 0.2)).toBe(true);
  });

  it("simulates each deficiency differently", () => {
    const seen = colorVisionDeficiencies.map((deficiency) =>
      simulateColorVision("#C02B45", deficiency),
    );

    expect(seen.every((color) => color !== undefined)).toBe(true);
    expect(new Set(seen).size).toBe(colorVisionDeficiencies.length);
  });
});

describe("simulateColorVision", () => {
  it("leaves an achromatic colour unchanged", () => {
    // Every matrix row sums to one, so grey has no hue for a deficiency to lose.
    expect(simulateColorVision("#808080", "deuteranopia")).toBe("#808080");
    expect(simulateColorVision("#FFFFFF", "tritanopia")).toBe("#FFFFFF");
  });

  it("returns undefined for a value it cannot read", () => {
    expect(simulateColorVision("#C02B4580", "protanopia")).toBeUndefined();
    expect(
      simulateColorVision("oklch(0.62 0.26 29.2)", "protanopia"),
    ).toBeUndefined();
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
      deficiencies: [],
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

  it("words a deficiency failure for the same readout", () => {
    const redGreen = extendTheme(lightTheme, {
      series: ["#C02B45", "#2E7D32", "#5F4BDB", "#1B45AC", "#B57600"],
    });

    expect(seriesReport(redGreen)).toContain(
      "deuteranopia: series 1 and 2 are 0.024 apart",
    );
  });
});
