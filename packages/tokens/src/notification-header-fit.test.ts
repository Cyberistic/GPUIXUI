/**
 * Guards the defect plan 629 fixes: plan 598 shipped the notification inbox's
 * fixed metrics and plan 627 added the panel's two borders to its height, but
 * the header above the list was never counted. `NotificationCentreHeader`
 * paints `spacing.lg` padding on both sides, a `sm` action (or a shorter `label`
 * title) and its own `borderWidth.thin` bottom rule, so the panel's content box
 * must hold the header and the documented list.
 *
 * A coherent theme with `notificationPanelMaxHeight: 300` and
 * `notificationListMaxHeight: 280` returned `[]` from `themeMetricFailures` and
 * `themeFailures` while the header and list need 335 inside the panel's borders;
 * the panel's `overflow: "hidden"` then squeezes the header or makes the
 * documented list viewport unreachable.
 *
 * No shipped value moves: the shipped 380 clears the corrected 335px bound.
 */
import { describe, expect, it } from "vitest";
import { themeMetricFailures, type MetricFailure } from "./metrics.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme, type Theme } from "./theme.js";
import { themeFailures } from "./theme-check.js";

const base = getTheme("light");

/** The inbox's maximum: its header, the list and the panel's two borders. */
const headerBound = (theme: Theme): number =>
  theme.dimensions.notificationListMaxHeight +
  2 * theme.spacing.lg +
  theme.density.controlHeight.sm +
  3 * theme.borderWidth.thin;

const dimensionFailures = (theme: Theme): ReadonlyArray<MetricFailure> =>
  themeMetricFailures(theme).filter(({ group }) => group === "dimensions");

describe("notification inbox holds its header", () => {
  it("passes every shipped set", () => {
    const tightest = shippedThemes.reduce((ratio, { theme }) => {
      expect(themeMetricFailures(theme), theme.name).toEqual([]);
      return Math.min(
        ratio,
        theme.dimensions.notificationPanelMaxHeight / headerBound(theme),
      );
    }, Number.POSITIVE_INFINITY);

    expect(tightest).toBeCloseTo(380 / 335, 4);
  });

  it("states the shipped header and bound", () => {
    const header =
      2 * base.spacing.lg +
      base.density.controlHeight.sm +
      base.borderWidth.thin;

    expect(header).toBe(53);
    expect(headerBound(base)).toBe(335);
    expect(base.dimensions.notificationPanelMaxHeight).toBe(380);
  });

  it("reports the old list-and-borders bound", () => {
    const theme = extendTheme(base, {
      dimensions: { notificationPanelMaxHeight: 282 },
    });

    expect(dimensionFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "notificationPanelMaxHeight",
        rule: "at-least",
        actual: 282,
        bound: 335,
      },
    ]);
  });

  it("holds the bound as a minimum", () => {
    expect(
      dimensionFailures(
        extendTheme(base, {
          dimensions: { notificationPanelMaxHeight: 335 },
        }),
      ),
    ).toEqual([]);

    expect(
      dimensionFailures(
        extendTheme(base, {
          dimensions: { notificationPanelMaxHeight: 334 },
        }),
      ),
    ).toEqual([
      {
        group: "dimensions",
        member: "notificationPanelMaxHeight",
        rule: "at-least",
        actual: 334,
        bound: 335,
      },
    ]);
  });

  it("reads the height of the header's action control", () => {
    // A lifted `sm` control is a coherent theme once the row, the calendar cell
    // and the two larger controls move with it.
    const theme = extendTheme(base, {
      density: {
        controlHeight: { sm: 40, md: 44, lg: 48 },
        rowHeight: 44,
      },
      dimensions: {
        calendarCellSize: 44,
        notificationPanelMaxHeight: 346,
      },
    });

    expect(dimensionFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "notificationPanelMaxHeight",
        rule: "at-least",
        actual: 346,
        bound: 347,
      },
    ]);
  });

  it("reads the theme's own border", () => {
    const theme = extendTheme(base, {
      borderWidth: { thin: 4, strong: 4 },
      dimensions: {
        keycapSize: 24,
        calendarCellSize: 28,
        notificationPanelMaxHeight: 343,
      },
    });

    expect(headerBound(theme)).toBe(344);
    expect(dimensionFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "notificationPanelMaxHeight",
        rule: "at-least",
        actual: 343,
        bound: 344,
      },
    ]);
  });

  it("carries the failure through the total check", () => {
    const theme = extendTheme(base, {
      dimensions: { notificationPanelMaxHeight: 282 },
    });

    expect(
      themeFailures(theme).filter((failure) => failure.kind === "metric"),
    ).toContainEqual({
      kind: "metric",
      group: "dimensions",
      member: "notificationPanelMaxHeight",
      rule: "at-least",
      actual: 282,
      bound: 335,
    });
  });
});
