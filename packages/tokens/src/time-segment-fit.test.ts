/**
 * Guards the defect plan 621 fixes: `timeSegmentWidth` was held only to one
 * `body` em, but `TimePickerSegment` paints the padded two-digit `HH`/`MM`
 * value, so a copied theme with a 24px body and a 24px segment passed every
 * check while the segment could not show its own value.
 *
 * The bound is two tabular digits at a 0.65em advance, rounded up to a
 * paintable pixel. The raised-body cases also move the roles the contract holds
 * to that body line, so the only failure they can produce is the segment's.
 */
import { describe, expect, it } from "vitest";
import { themeMetricFailures, type MetricFailure } from "./metrics.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme, type Theme } from "./theme.js";
import { themeFailures } from "./theme-check.js";

/** The shipped identity in light mode: body 14, segment 26. */
const base = getTheme("light");

/** Two tabular digits at the 0.65em advance, rounded up to a pixel. */
const segmentBound = (theme: Theme): number =>
  Math.ceil(2 * 0.65 * theme.typography.body.fontSize);

const dimensionFailures = (theme: Theme): ReadonlyArray<MetricFailure> =>
  themeMetricFailures(theme).filter(({ group }) => group === "dimensions");

/**
 * A theme whose body role is 20px. The type ladder and the small control move
 * with it, because those are separate rules; this fixture isolates the segment.
 */
const largerBody = extendTheme(base, {
  typography: {
    display: { fontSize: 32, lineHeight: 40 },
    h1: { fontSize: 28, lineHeight: 36 },
    h2: { fontSize: 24, lineHeight: 32 },
    h3: { fontSize: 22, lineHeight: 30 },
    body: { fontSize: 20, lineHeight: 28 },
    bodyStrong: { fontSize: 20, lineHeight: 28 },
  },
  density: { controlHeight: { sm: 30, md: 32, lg: 36 } },
});

describe("time segment two-digit fit", () => {
  it("passes every shipped set", () => {
    let tightest = Number.POSITIVE_INFINITY;
    shippedThemes.forEach(({ theme }) => {
      expect(
        theme.dimensions.timeSegmentWidth,
        theme.name,
      ).toBeGreaterThanOrEqual(segmentBound(theme));
      tightest = Math.min(
        tightest,
        theme.dimensions.timeSegmentWidth / segmentBound(theme),
      );
      expect(dimensionFailures(theme), theme.name).toEqual([]);
    });
    expect(tightest).toBeCloseTo(1.37, 2);
  });

  it("states the shipped bound", () => {
    expect(segmentBound(base)).toBe(19);
    expect(base.dimensions.timeSegmentWidth).toBe(26);
  });

  it("reports a segment narrower than two digits at the shipped body", () => {
    const theme = extendTheme(base, { dimensions: { timeSegmentWidth: 18 } });
    expect(dimensionFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "timeSegmentWidth",
        rule: "at-least",
        actual: 18,
        bound: 19,
      },
    ]);
  });

  it("reads the theme's own body role", () => {
    const theme = extendTheme(largerBody, {
      dimensions: { timeSegmentWidth: 24 },
    });
    const failures = dimensionFailures(theme);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      group: "dimensions",
      member: "timeSegmentWidth",
      rule: "at-least",
      actual: 24,
    });
    expect(failures[0]?.bound).toBe(26);
  });

  it("fits exactly at the derived bound", () => {
    const theme = largerBody;
    expect(segmentBound(theme)).toBe(26);
    expect(dimensionFailures(theme)).toEqual([]);
  });

  it("carries the failure through the total check", () => {
    const theme = extendTheme(base, { dimensions: { timeSegmentWidth: 18 } });
    const metrics = themeFailures(theme).filter(
      (failure) => failure.kind === "metric",
    );
    expect(metrics.map((failure) => failure.member)).toEqual([
      "timeSegmentWidth",
    ]);
  });
});
