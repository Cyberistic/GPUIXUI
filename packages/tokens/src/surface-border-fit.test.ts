/**
 * Guards the defect plan 627 fixes: plan 384 established that a size which must
 * fit must fit the container's **content box**, and the control, field, keycap
 * and date-trigger rules subtract `2 * borderWidth.thin` for that reason. The
 * fixed-surface bounds that landed later (plans 598–625) compared the outer
 * surface, while every one of those surfaces paints its border inside its own
 * width or height: the menu surface, the Toast card, the notification inbox, and
 * the dialog and drawer shells.
 *
 * A coherent theme with `borderWidth.thin: 12`, `dialogWidthSm: 88` — exactly
 * the plan-625 bound — and `toastWidth: 80` against its 66px bound returned `[]`
 * from `themeMetricFailures` and `themeFailures`, while the dialog painted a
 * 72px padding-and-close-control chrome into a 64px content box and the Toast a
 * 66px row into 56px.
 *
 * The seven bounds now include the surface's two borders. Every shipped set
 * clears them, so no value moves; the identity bounds are 63/111/52/90/90/98
 * and the inbox's 335 (its header above the list, plan 629); the Toast's 111
 * also holds its `toastToneBarWidth` bar and square `sm` dismiss control (plans
 * 631 and 636).
 */
import { describe, expect, it } from "vitest";
import { themeMetricFailures, type MetricFailure } from "./metrics.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme, type Theme } from "./theme.js";
import { themeFailures } from "./theme-check.js";
import type { Dimensions } from "./scale.js";

const base = getTheme("light");

/** The menu's minimum width: the surface's padding, a row's chrome and two borders. */
const overlayBound = (theme: Theme): number =>
  2 * theme.spacing.xs +
  2 * theme.spacing.md +
  theme.iconSize.md +
  theme.spacing.md +
  theme.typography.label.fontSize +
  2 * theme.borderWidth.thin;

/** The Toast card: its tone bar, content row, dismiss control and two borders. */
const toastBound = (theme: Theme): number =>
  2 * theme.spacing.lg +
  theme.dimensions.toastToneBarWidth +
  theme.iconSize.md +
  theme.spacing.lg +
  theme.typography.bodyStrong.fontSize +
  theme.spacing.lg +
  theme.density.controlHeight.sm +
  2 * theme.borderWidth.thin;

/** The inbox's width: a notification row plus its two borders. */
const panelWidthBound = (theme: Theme): number =>
  2 * theme.spacing.lg +
  theme.dimensions.notificationUnreadDotSize +
  theme.spacing.sm +
  theme.typography.bodyStrong.fontSize +
  2 * theme.borderWidth.thin;

/** The inbox's height: its header, the list and the panel's two borders. */
const panelHeightBound = (theme: Theme): number =>
  theme.dimensions.notificationListMaxHeight +
  2 * theme.spacing.lg +
  theme.density.controlHeight.sm +
  3 * theme.borderWidth.thin;

/** A dialog's and a drawer's width: their shell chrome plus two borders. */
const shellWidthBound = (theme: Theme): number =>
  2 * theme.borderWidth.thin +
  theme.spacing["2xl"] +
  theme.typography.h3.fontSize +
  Math.max(
    2 * theme.spacing["2xl"],
    theme.spacing.lg + theme.density.controlHeight.sm,
  );

/** A bottom drawer's height: the close zone, one row, padding and two borders. */
const shellHeightBound = (theme: Theme): number =>
  Math.max(
    theme.spacing["2xl"],
    theme.spacing.lg + theme.density.controlHeight.sm,
  ) +
  theme.density.rowHeight +
  theme.spacing["2xl"] +
  2 * theme.borderWidth.thin;

const dimensionFailures = (theme: Theme): ReadonlyArray<MetricFailure> =>
  themeMetricFailures(theme).filter(({ group }) => group === "dimensions");

/**
 * A 12px border trips the control, keycap, calendar, timeline and fixed-mark
 * rules, so a case that isolates a fixed surface starts from a coherent theme
 * rather than from the shipped density. The border is deliberately thicker than
 * the slack between each bound and its chrome, which is what makes the missing
 * term observable at all.
 */
const bordered = (overrides: Partial<Dimensions> = {}): Theme =>
  extendTheme(getTheme("light"), {
    borderWidth: { thin: 12, strong: 12 },
    density: {
      controlHeight: { sm: 48, md: 52, lg: 56 },
      rowHeight: 56,
    },
    // A 12px hairline is the stroke every fixed mark must reach (plan 643).
    avatarSize: { xs: 24, sm: 26, md: 32, lg: 40 },
    dimensions: {
      keycapSize: 40,
      calendarCellSize: 48,
      timelineMarkerSize: 12,
      toastToneBarWidth: 12,
      notificationUnreadDotSize: 12,
      carouselIndicatorSize: 12,
      avatarPresenceDotSize: 12,
      // The 12px border, bar, 48px `sm` control and dismiss control put the
      // Toast's own bound at 162, so the fixture's card must rise above it.
      toastWidth: 200,
      // The 12px border and 48px `sm` control put the inbox's own bound at 388,
      // so the fixture's panel must rise above the shipped 380.
      notificationPanelMaxHeight: 400,
      ...overrides,
    },
  });

describe("fixed surfaces fit their own border", () => {
  it("passes every shipped set", () => {
    let tightestOverlay = Number.POSITIVE_INFINITY;
    let tightestToast = Number.POSITIVE_INFINITY;
    let tightestPanelWidth = Number.POSITIVE_INFINITY;
    let tightestPanelHeight = Number.POSITIVE_INFINITY;
    let tightestShellWidth = Number.POSITIVE_INFINITY;
    let tightestShellHeight = Number.POSITIVE_INFINITY;
    const failures = shippedThemes.flatMap(({ theme }) => {
      const overlay = overlayBound(theme);
      const toast = toastBound(theme);
      const panelWidth = panelWidthBound(theme);
      const panelHeight = panelHeightBound(theme);
      const shellWidth = shellWidthBound(theme);
      const shellHeight = shellHeightBound(theme);
      expect(
        theme.dimensions.overlayMinWidth,
        theme.name,
      ).toBeGreaterThanOrEqual(overlay);
      expect(theme.dimensions.toastWidth, theme.name).toBeGreaterThanOrEqual(
        toast,
      );
      expect(
        theme.dimensions.notificationPanelWidth,
        theme.name,
      ).toBeGreaterThanOrEqual(panelWidth);
      expect(
        theme.dimensions.notificationPanelMaxHeight,
        theme.name,
      ).toBeGreaterThanOrEqual(panelHeight);
      expect(theme.dimensions.dialogWidthSm, theme.name).toBeGreaterThanOrEqual(
        shellWidth,
      );
      expect(theme.dimensions.drawerWidthSm, theme.name).toBeGreaterThanOrEqual(
        shellWidth,
      );
      expect(
        theme.dimensions.drawerHeightSm,
        theme.name,
      ).toBeGreaterThanOrEqual(shellHeight);
      tightestOverlay = Math.min(
        tightestOverlay,
        theme.dimensions.overlayMinWidth / overlay,
      );
      tightestToast = Math.min(
        tightestToast,
        theme.dimensions.toastWidth / toast,
      );
      tightestPanelWidth = Math.min(
        tightestPanelWidth,
        theme.dimensions.notificationPanelWidth / panelWidth,
      );
      tightestPanelHeight = Math.min(
        tightestPanelHeight,
        theme.dimensions.notificationPanelMaxHeight / panelHeight,
      );
      tightestShellWidth = Math.min(
        tightestShellWidth,
        theme.dimensions.dialogWidthSm / shellWidth,
        theme.dimensions.drawerWidthSm / shellWidth,
      );
      tightestShellHeight = Math.min(
        tightestShellHeight,
        theme.dimensions.drawerHeightSm / shellHeight,
      );
      return dimensionFailures(theme);
    });
    expect(failures).toEqual([]);
    expect(tightestOverlay).toBeCloseTo(180 / 63, 4);
    expect(tightestToast).toBeCloseTo(380 / 111, 4);
    expect(tightestPanelWidth).toBeCloseTo(320 / 52, 4);
    expect(tightestPanelHeight).toBeCloseTo(380 / 335, 4);
    expect(tightestShellWidth).toBeCloseTo(320 / 90, 4);
    expect(tightestShellHeight).toBeCloseTo(240 / 98, 4);
  });

  it("states the shipped identity bounds", () => {
    expect(overlayBound(base)).toBe(63);
    expect(toastBound(base)).toBe(111);
    expect(panelWidthBound(base)).toBe(52);
    expect(panelHeightBound(base)).toBe(335);
    expect(shellWidthBound(base)).toBe(90);
    expect(shellHeightBound(base)).toBe(98);

    expect(base.dimensions.overlayMinWidth).toBe(180);
    expect(base.dimensions.toastWidth).toBe(380);
    expect(base.dimensions.notificationPanelWidth).toBe(320);
    expect(base.dimensions.notificationPanelMaxHeight).toBe(380);
    expect(base.dimensions.dialogWidthSm).toBe(360);
    expect(base.dimensions.drawerWidthSm).toBe(320);
    expect(base.dimensions.drawerHeightSm).toBe(240);
  });

  it("reports a dialog narrower than its chrome plus borders", () => {
    const theme = bordered({
      dialogWidthSm: 88,
      dialogWidthMd: 200,
      dialogWidthLg: 300,
    });
    expect(dimensionFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "dialogWidthSm",
        rule: "at-least",
        actual: 88,
        bound: shellWidthBound(theme),
      },
    ]);
  });

  it("reports a drawer narrower than its chrome plus borders", () => {
    const theme = bordered({
      drawerWidthSm: 88,
      drawerWidthMd: 200,
      drawerWidthLg: 300,
    });
    expect(dimensionFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "drawerWidthSm",
        rule: "at-least",
        actual: 88,
        bound: shellWidthBound(theme),
      },
    ]);
  });

  it("reports a bottom drawer shorter than its chrome plus borders", () => {
    const theme = bordered({
      drawerHeightSm: 140,
      drawerHeightMd: 200,
      drawerHeightLg: 300,
    });
    expect(dimensionFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "drawerHeightSm",
        rule: "at-least",
        actual: 140,
        bound: 164,
      },
    ]);
  });

  it("reports a Toast narrower than its chrome plus borders", () => {
    const theme = bordered({ toastWidth: 80 });
    expect(dimensionFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "toastWidth",
        rule: "at-least",
        actual: 80,
        bound: toastBound(theme),
      },
    ]);
  });

  it("reports an overlay narrower than its row plus borders", () => {
    // Still below its `overlayWidth` sibling, so the ladder stays silent.
    const theme = bordered({ overlayMinWidth: 53 });
    expect(dimensionFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "overlayMinWidth",
        rule: "at-least",
        actual: 53,
        bound: 85,
      },
    ]);
  });

  it("reports an inbox narrower than its row plus borders", () => {
    const theme = bordered({ notificationPanelWidth: 50 });
    expect(dimensionFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "notificationPanelWidth",
        rule: "at-least",
        actual: 50,
        bound: panelWidthBound(theme),
      },
    ]);
  });

  it("reports an inbox shorter than its header and list plus borders", () => {
    const theme = bordered({ notificationPanelMaxHeight: 280 });
    expect(dimensionFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "notificationPanelMaxHeight",
        rule: "at-least",
        actual: 280,
        bound: 388,
      },
    ]);
  });

  it("reads the theme's own border, not the fixture's 12", () => {
    const theme = extendTheme(getTheme("light"), {
      borderWidth: { thin: 4, strong: 4 },
      dimensions: {
        keycapSize: 24,
        toastToneBarWidth: 4,
        dialogWidthSm: 88,
        dialogWidthMd: 200,
        dialogWidthLg: 300,
      },
    });
    expect(shellWidthBound(theme)).toBe(96);
    expect(dimensionFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "dialogWidthSm",
        rule: "at-least",
        actual: 88,
        bound: 96,
      },
    ]);
  });

  it("carries the failure through the total check", () => {
    const theme = bordered({
      dialogWidthSm: 88,
      dialogWidthMd: 200,
      dialogWidthLg: 300,
    });
    expect(
      themeFailures(theme).filter((failure) => failure.kind === "metric"),
    ).toContainEqual({
      kind: "metric",
      group: "dimensions",
      member: "dialogWidthSm",
      rule: "at-least",
      actual: 88,
      bound: shellWidthBound(theme),
    });
  });
});
