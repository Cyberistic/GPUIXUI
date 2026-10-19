/**
 * Guards the defect plan 620 fixes: the numeric contract held three fixed
 * surfaces only as positive sizes, so a copied platform style could set a value
 * narrower than the chrome the component paints inside it while
 * `themeMetricFailures` returned `[]`:
 *
 * - `toastWidth: 20` — the Toast's content row is `spacing.lg` padding on both
 *   sides, a `md` tone icon, the `lg` gap and a `bodyStrong` title;
 * - `notificationPanelWidth: 20` — a notification row is `spacing.lg` padding,
 *   the unread dot, the `sm` gap and a `bodyStrong` title;
 * - `overlayMinWidth: 20` — a menu row is `spacing.md` padding, a `md` leading
 *   icon, the `md` gap and a `label` glyph.
 *
 * Each rule derives its bound from the theme's own spacing, icon, type and
 * border metrics, so case 6 fails if the rule becomes a hardcoded number. The
 * shipped set passes at 380/320/180 against 111/52/55, the surface's two
 * `borderWidth.thin` edges and the Toast's own tone bar included (plans 627,
 * 631 and 636), so no value moves.
 */
import { describe, expect, it } from "vitest";
import { themeMetricFailures, type MetricFailure } from "./metrics.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme, type Theme } from "./theme.js";
import { themeFailures } from "./theme-check.js";

/** The shipped identity in light mode: spacing 12/8/6, icon 16, body 14, label 13. */
const base = getTheme("light");

const toastBound = (theme: Theme): number =>
  2 * theme.spacing.lg +
  theme.dimensions.toastToneBarWidth +
  theme.iconSize.md +
  theme.spacing.lg +
  theme.typography.bodyStrong.fontSize +
  theme.spacing.lg +
  theme.density.controlHeight.sm +
  2 * theme.borderWidth.thin;

const panelBound = (theme: Theme): number =>
  2 * theme.spacing.lg +
  theme.dimensions.notificationUnreadDotSize +
  theme.spacing.sm +
  theme.typography.bodyStrong.fontSize +
  2 * theme.borderWidth.thin;

const overlayBound = (theme: Theme): number =>
  2 * theme.spacing.md +
  theme.iconSize.md +
  theme.spacing.md +
  theme.typography.label.fontSize +
  2 * theme.borderWidth.thin;

const dimensionFailures = (theme: Theme): ReadonlyArray<MetricFailure> =>
  themeMetricFailures(theme).filter(({ group }) => group === "dimensions");

describe("fixed-surface chrome fit", () => {
  it("passes every shipped set", () => {
    const tightest = {
      toast: Number.POSITIVE_INFINITY,
      panel: Number.POSITIVE_INFINITY,
      overlay: Number.POSITIVE_INFINITY,
    };
    const failures = shippedThemes.flatMap(({ theme }) => {
      expect(theme.dimensions.toastWidth).toBeGreaterThanOrEqual(
        toastBound(theme),
      );
      expect(theme.dimensions.notificationPanelWidth).toBeGreaterThanOrEqual(
        panelBound(theme),
      );
      expect(theme.dimensions.overlayMinWidth).toBeGreaterThanOrEqual(
        overlayBound(theme),
      );
      tightest.toast = Math.min(
        tightest.toast,
        theme.dimensions.toastWidth / toastBound(theme),
      );
      tightest.panel = Math.min(
        tightest.panel,
        theme.dimensions.notificationPanelWidth / panelBound(theme),
      );
      tightest.overlay = Math.min(
        tightest.overlay,
        theme.dimensions.overlayMinWidth / overlayBound(theme),
      );
      return themeMetricFailures(theme).filter(
        ({ group }) => group === "dimensions",
      );
    });
    expect(failures).toEqual([]);
    expect(tightest.toast).toBeCloseTo(380 / 111, 4);
    expect(tightest.panel).toBeCloseTo(6.15, 2);
    expect(tightest.overlay).toBeCloseTo(3.27, 2);
  });

  it("states the shipped bounds", () => {
    expect(toastBound(base)).toBe(111);
    expect(panelBound(base)).toBe(52);
    expect(overlayBound(base)).toBe(55);
  });

  it("reports a toast narrower than its chrome", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: { toastWidth: 40 },
    });
    expect(dimensionFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "toastWidth",
        rule: "at-least",
        actual: 40,
        bound: 111,
      },
    ]);
  });

  it("reports a notification panel narrower than its chrome", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: { notificationPanelWidth: 40 },
    });
    expect(dimensionFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "notificationPanelWidth",
        rule: "at-least",
        actual: 40,
        bound: 52,
      },
    ]);
  });

  it("reports an overlay narrower than its chrome", () => {
    // Still below its `overlayWidth` sibling, so the ladder rule stays silent.
    const theme = extendTheme(getTheme("light"), {
      dimensions: { overlayMinWidth: 40 },
    });
    expect(dimensionFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "overlayMinWidth",
        rule: "at-least",
        actual: 40,
        bound: 55,
      },
    ]);
  });

  it("reads the theme's own spacing, not a hardcoded bound", () => {
    const roomy = extendTheme(getTheme("light"), {
      dimensions: { toastWidth: 120 },
    });
    expect(dimensionFailures(roomy)).toEqual([]);

    // `lg` moves from 12 to 24 (and the steps above it keep the ladder), so
    // the toast's own bound rises from 111 to 159 and 120 no longer fits.
    const tightened = extendTheme(roomy, {
      spacing: {
        lg: 24,
        xl: 24,
        "2xl": 32,
        "3xl": 40,
        "4xl": 56,
        "5xl": 72,
      },
    });
    expect(dimensionFailures(tightened)).toContainEqual({
      group: "dimensions",
      member: "toastWidth",
      rule: "at-least",
      actual: 120,
      bound: 159,
    });
  });

  it("carries the failures through the total check", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: {
        toastWidth: 40,
        notificationPanelWidth: 40,
        overlayMinWidth: 40,
      },
    });
    const metrics = themeFailures(theme).filter(
      (failure) => failure.kind === "metric",
    );
    expect(metrics.map((failure) => failure.member)).toEqual([
      "toastWidth",
      "notificationPanelWidth",
      "overlayMinWidth",
    ]);
  });
});
