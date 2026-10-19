/**
 * Bug guarded: `packages/components/src/timeline.tsx` paints its marker column
 * and its event dot as the literals `width: 16` and `width/height: 8`, so a
 * brand could not size the rail's mark through `theme.dimensions` while every
 * other fixed surface metric of the same class was already token-owned. The
 * relationship those two numbers encode was unmeasured as well: the dot is
 * centred in the column and its connector is `borderWidth.thin`, yet
 * `themeMetricFailures` returned `[]` for a 20px dot in a 16px column and for a
 * dot thinner than the rail it marks.
 *
 * The exact-array cases below return `[]` on the pre-rule implementation and
 * one diagnostic each after it; the shipped, merge and inheritance cases guard
 * that the two members disturb no other metric.
 */
import { describe, expect, it } from "vitest";
import {
  dimensions,
  extendTheme,
  lightTheme,
  shippedThemes,
  themeMetricFailures,
} from "./index.js";

describe("timeline marker metrics", () => {
  it("ships the marker and the column it sits in", () => {
    expect(dimensions.timelineMarkerSize).toBe(8);
    expect(dimensions.timelineMarkerColumnWidth).toBe(16);
  });

  it("gives every shipped set the identity marker metrics", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(theme.dimensions.timelineMarkerSize, theme.name).toBe(
        dimensions.timelineMarkerSize,
      );
      expect(theme.dimensions.timelineMarkerColumnWidth, theme.name).toBe(
        dimensions.timelineMarkerColumnWidth,
      );
    });
  });

  it("widens the column without disturbing the dot or the rest of the group", () => {
    const themed = extendTheme(lightTheme, {
      dimensions: { timelineMarkerColumnWidth: 24 },
    });

    expect(themed.dimensions.timelineMarkerColumnWidth).toBe(24);
    expect(themed.dimensions.timelineMarkerSize).toBe(8);
    expect(themed.dimensions.carouselIndicatorSize).toBe(
      dimensions.carouselIndicatorSize,
    );
    expect(themeMetricFailures(themed)).toEqual([]);
  });

  it("reports a dot wider than the column it is centred in", () => {
    const themed = extendTheme(lightTheme, {
      dimensions: { timelineMarkerSize: 20 },
    });

    expect(themeMetricFailures(themed)).toEqual([
      {
        group: "dimensions",
        member: "timelineMarkerColumnWidth",
        rule: "at-least",
        actual: 16,
        bound: 20,
      },
    ]);
  });

  it("reports a dot thinner than the rail it marks", () => {
    const themed = extendTheme(lightTheme, {
      dimensions: { timelineMarkerSize: 0.5 },
    });

    expect(themeMetricFailures(themed)).toEqual([
      {
        group: "dimensions",
        member: "timelineMarkerSize",
        rule: "at-least",
        actual: 0.5,
        bound: lightTheme.borderWidth.thin,
      },
    ]);
  });

  it("reports a zero dot once, without blaming its column", () => {
    const themed = extendTheme(lightTheme, {
      dimensions: { timelineMarkerSize: 0 },
    });

    expect(themeMetricFailures(themed)).toEqual([
      {
        group: "dimensions",
        member: "timelineMarkerSize",
        rule: "positive",
        actual: 0,
        bound: 0,
      },
    ]);
  });

  it("reports a zero column once, without blaming the dot", () => {
    const themed = extendTheme(lightTheme, {
      dimensions: { timelineMarkerColumnWidth: 0 },
    });

    expect(themeMetricFailures(themed)).toEqual([
      {
        group: "dimensions",
        member: "timelineMarkerColumnWidth",
        rule: "positive",
        actual: 0,
        bound: 0,
      },
    ]);
  });
});
