/**
 * Guards the defect plan 598 fixes: the notification centre paints a fixed
 * 320×380 inbox around a 280px scrolling list and a 6px unread marker, all as
 * literals in `notification-centre.tsx`, so no theme or copied `PlatformStyle`
 * could own the inbox and `themeMetricFailures` returned `[]` for a panel
 * shorter than the list it clips — or for a list viewport that cannot show one
 * notification row.
 *
 * Case 1 pins the shipped values and proves no shipped set moves. Cases 2 and 3
 * fail without the two `atLeast` rules; case 4 proves one non-finite value keeps
 * one diagnostic instead of blaming the panel; case 5 holds the sign walk to the
 * two new sizes.
 */
import { describe, expect, it } from "vitest";
import { themeMetricFailures } from "./metrics.js";
import { dimensions } from "./scale.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, lightTheme } from "./theme.js";

describe("notification inbox metrics", () => {
  it("ships the literals the component paints and keeps every set valid", () => {
    expect(dimensions.notificationPanelWidth).toBe(320);
    expect(dimensions.notificationPanelMaxHeight).toBe(380);
    expect(dimensions.notificationListMaxHeight).toBe(280);
    expect(dimensions.notificationUnreadDotSize).toBe(6);

    shippedThemes.forEach(({ theme }) => {
      expect(themeMetricFailures(theme), theme.name).toEqual([]);
    });
  });

  it("reports an inbox panel shorter than the list it contains", () => {
    const plant = extendTheme(lightTheme, {
      dimensions: { notificationPanelMaxHeight: 240 },
    });

    expect(themeMetricFailures(plant)).toEqual([
      {
        group: "dimensions",
        member: "notificationPanelMaxHeight",
        rule: "at-least",
        actual: 240,
        bound: lightTheme.dimensions.notificationListMaxHeight,
      },
    ]);
  });

  it("reports a list viewport shorter than one row", () => {
    const plant = extendTheme(lightTheme, {
      dimensions: { notificationListMaxHeight: 20 },
    });

    expect(themeMetricFailures(plant)).toEqual([
      {
        group: "dimensions",
        member: "notificationListMaxHeight",
        rule: "at-least",
        actual: 20,
        bound: lightTheme.density.rowHeight,
      },
    ]);
  });

  it("keeps one diagnostic for a non-finite list height", () => {
    const plant = extendTheme(lightTheme, {
      dimensions: {
        notificationListMaxHeight: Number.POSITIVE_INFINITY,
        notificationPanelMaxHeight: 100,
      },
    });

    expect(themeMetricFailures(plant)).toEqual([
      {
        group: "dimensions",
        member: "notificationListMaxHeight",
        rule: "finite",
        actual: Number.POSITIVE_INFINITY,
        bound: 0,
      },
    ]);
  });

  it("holds the new sizes to the group's sign rule", () => {
    const zeroWidth = extendTheme(lightTheme, {
      dimensions: { notificationPanelWidth: 0 },
    });
    expect(themeMetricFailures(zeroWidth)).toEqual([
      {
        group: "dimensions",
        member: "notificationPanelWidth",
        rule: "positive",
        actual: 0,
        bound: 0,
      },
    ]);

    const zeroDot = extendTheme(lightTheme, {
      dimensions: { notificationUnreadDotSize: 0 },
    });
    expect(themeMetricFailures(zeroDot)).toEqual([
      {
        group: "dimensions",
        member: "notificationUnreadDotSize",
        rule: "positive",
        actual: 0,
        bound: 0,
      },
    ]);
  });
});
