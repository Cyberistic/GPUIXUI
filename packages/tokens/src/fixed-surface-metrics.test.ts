/**
 * Bug guarded: the design system promised that a brand could widen a dialog
 * through `theme.dimensions`, while `packages/components/src/dialog.tsx` kept
 * the three surface widths as a local `MAX_WIDTH` (360/480/640). The same audit
 * of the fixed metrics found the calendar day cell (34), the time segment (26)
 * and the avatar presence dot (10) as the same class of literal, and none of
 * the relationships those components rely on were in `themeMetricFailures`.
 *
 * Plan 556 adds the six members and four rules. The relationship cases below
 * return `[]` on the pre-rule implementation and one diagnostic each after it;
 * the shipped and merge cases guard that the members did not disturb any other
 * metric.
 */
import { describe, expect, it } from "vitest";
import {
  dimensions,
  extendTheme,
  lightTheme,
  shippedThemes,
  themeMetricFailures,
} from "./index.js";

describe("fixed surface and mark metrics", () => {
  it("ships the dialog ladder, calendar cell, time segment and presence dot", () => {
    expect(dimensions.dialogWidthSm).toBe(360);
    expect(dimensions.dialogWidthMd).toBe(480);
    expect(dimensions.dialogWidthLg).toBe(640);
    expect(dimensions.calendarCellSize).toBe(34);
    expect(dimensions.timeSegmentWidth).toBe(26);
    expect(dimensions.avatarPresenceDotSize).toBe(10);
  });

  it("gives every shipped set the same fixed metrics", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(theme.dimensions.dialogWidthSm, theme.name).toBe(
        dimensions.dialogWidthSm,
      );
      expect(theme.dimensions.dialogWidthMd, theme.name).toBe(
        dimensions.dialogWidthMd,
      );
      expect(theme.dimensions.dialogWidthLg, theme.name).toBe(
        dimensions.dialogWidthLg,
      );
      expect(theme.dimensions.calendarCellSize, theme.name).toBe(
        dimensions.calendarCellSize,
      );
      expect(theme.dimensions.timeSegmentWidth, theme.name).toBe(
        dimensions.timeSegmentWidth,
      );
      expect(theme.dimensions.avatarPresenceDotSize, theme.name).toBe(
        dimensions.avatarPresenceDotSize,
      );
    });
  });

  it("widens one dialog size and keeps the rest of the ladder", () => {
    const themed = extendTheme(lightTheme, {
      dimensions: { dialogWidthMd: 520 },
    });

    expect(themed.dimensions.dialogWidthSm).toBe(360);
    expect(themed.dimensions.dialogWidthMd).toBe(520);
    expect(themed.dimensions.dialogWidthLg).toBe(640);
    expect(themeMetricFailures(themed)).toEqual([]);
  });

  it("reports a dialog size narrower than the one before it", () => {
    const themed = extendTheme(lightTheme, {
      dimensions: { dialogWidthMd: 300 },
    });

    expect(themeMetricFailures(themed)).toEqual([
      {
        group: "dimensions",
        member: "dialogWidthMd",
        rule: "increasing",
        actual: 300,
        bound: 360,
      },
    ]);
  });

  it("reports a day cell below the smallest control", () => {
    const themed = extendTheme(lightTheme, {
      dimensions: { calendarCellSize: 20 },
    });

    expect(themeMetricFailures(themed)).toEqual([
      {
        group: "dimensions",
        member: "calendarCellSize",
        rule: "at-least",
        actual: 20,
        bound: lightTheme.density.controlHeight.sm,
      },
    ]);
  });

  it("reports a time segment narrower than two digits", () => {
    const themed = extendTheme(lightTheme, {
      dimensions: { timeSegmentWidth: 12 },
    });

    expect(themeMetricFailures(themed)).toEqual([
      {
        group: "dimensions",
        member: "timeSegmentWidth",
        rule: "at-least",
        actual: 12,
        bound: 19,
      },
    ]);
  });

  it("reports a presence dot larger than half the smallest avatar", () => {
    const themed = extendTheme(lightTheme, {
      dimensions: { avatarPresenceDotSize: 11 },
    });

    expect(themeMetricFailures(themed)).toEqual([
      {
        group: "dimensions",
        member: "avatarPresenceDotSize",
        rule: "at-most",
        actual: 11,
        bound: lightTheme.avatarSize.xs / 2,
      },
    ]);
  });

  it("leaves the other fixed metrics alone when a dialog widens", () => {
    const themed = extendTheme(lightTheme, {
      dimensions: { dialogWidthLg: 720 },
    });

    expect(themed.dimensions.calendarCellSize).toBe(
      dimensions.calendarCellSize,
    );
    expect(themed.dimensions.timeSegmentWidth).toBe(
      dimensions.timeSegmentWidth,
    );
    expect(themed.dimensions.avatarPresenceDotSize).toBe(
      dimensions.avatarPresenceDotSize,
    );
    expect(themeMetricFailures(themed)).toEqual([]);
  });
});
