/**
 * Guards the gap this plan closes: the token set had no group for the fixed
 * surface metrics components share, so an overlay width, a toast width, a
 * field's adornment and a preview card's range lived as literals in
 * `packages/components` and could not be changed through a theme. The same
 * concept had two values — field adornments were 16px in three components and
 * 18px in two.
 *
 * Without the group on `Theme`, every case below fails to type-check; without
 * the `mergeDefined` entry in `extendTheme`, the merge and undefined cases
 * fail; the inheritance case fails if a platform override ever stops carrying
 * the identity group.
 *
 * Plan 530 extends the group with the surfaces plan 353's audit had not
 * reached: the drawer width and height ladders, the message viewport and the
 * carousel marks. The coherence and merge cases below fail without those
 * members, and the example case proves the field-by-field merge on a resolved
 * theme that passes the total check.
 */
import { describe, expect, it } from "vitest";
import {
  dimensionsBaseTheme,
  narrowDrawerTheme,
} from "./dimensions.example.js";
import { shippedThemes } from "./shipped-themes.js";
import { controlHeight } from "./styles.js";
import { dimensions } from "./scale.js";
import { themeFailures } from "./theme-check.js";
import { extendTheme, lightTheme } from "./theme.js";

describe("component dimensions", () => {
  it("ships a positive whole-pixel metric for every dimension", () => {
    Object.entries(dimensions).forEach(([name, pixels]) => {
      expect(Number.isInteger(pixels), name).toBe(true);
      expect(pixels, name).toBeGreaterThan(0);
    });
  });

  it("keeps the overlay range coherent", () => {
    expect(dimensions.overlayMinWidth).toBeLessThan(dimensions.overlayWidth);
    expect(dimensions.previewCardMinWidth).toBeLessThan(
      dimensions.previewCardMaxWidth,
    );
    // An overlay must fit at least one control row at the largest density.
    expect(dimensions.overlayMaxHeight).toBeGreaterThanOrEqual(
      controlHeight(lightTheme, "lg"),
    );
    expect(dimensions.overlayMaxHeight).toBeGreaterThan(
      dimensions.overlayWidth,
    );
  });

  it("keeps the drawer ladders and the carousel mark coherent", () => {
    expect(dimensions.drawerWidthSm).toBeLessThan(dimensions.drawerWidthMd);
    expect(dimensions.drawerWidthMd).toBeLessThan(dimensions.drawerWidthLg);
    expect(dimensions.drawerHeightSm).toBeLessThan(dimensions.drawerHeightMd);
    expect(dimensions.drawerHeightMd).toBeLessThan(dimensions.drawerHeightLg);
    expect(dimensions.carouselIndicatorActiveWidth).toBeGreaterThanOrEqual(
      dimensions.carouselIndicatorSize,
    );
    expect(dimensions.chatViewportMinHeight).toBeGreaterThanOrEqual(
      lightTheme.density.rowHeight,
    );
  });

  it("keeps the dialog, calendar, time and presence metrics coherent", () => {
    expect(dimensions.dialogWidthSm).toBeLessThan(dimensions.dialogWidthMd);
    expect(dimensions.dialogWidthMd).toBeLessThan(dimensions.dialogWidthLg);
    expect(dimensions.calendarCellSize).toBeGreaterThanOrEqual(
      controlHeight(lightTheme, "sm"),
    );
    expect(dimensions.timeSegmentWidth).toBeGreaterThanOrEqual(
      lightTheme.typography.body.fontSize,
    );
    expect(dimensions.avatarPresenceDotSize).toBeLessThanOrEqual(
      lightTheme.avatarSize.xs / 2,
    );
  });

  it("gives every shipped theme the identity dimensions", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(theme.dimensions, theme.name).toEqual(dimensions);
    });
  });

  it("merges one metric without losing the rest", () => {
    const wider = extendTheme(lightTheme, {
      dimensions: { toastWidth: 420 },
    });
    expect(wider.dimensions).toEqual({ ...dimensions, toastWidth: 420 });
  });

  it("merges one drawer width and the chat viewport field by field", () => {
    const themed = extendTheme(lightTheme, {
      dimensions: { drawerWidthMd: 360, chatViewportMinHeight: 200 },
    });
    expect(themed.dimensions).toEqual({
      ...dimensions,
      drawerWidthMd: 360,
      chatViewportMinHeight: 200,
    });
  });

  it("runs the copy-and-own example through the total check", () => {
    expect(narrowDrawerTheme.dimensions.drawerWidthMd).toBe(360);
    expect(narrowDrawerTheme.dimensions.dialogWidthMd).toBe(520);
    expect(narrowDrawerTheme.dimensions.dialogWidthSm).toBe(360);
    expect(narrowDrawerTheme.dimensions.dialogWidthLg).toBe(640);
    expect(narrowDrawerTheme.dimensions.chatViewportMinHeight).toBe(200);
    expect(narrowDrawerTheme.dimensions.dateFieldWidth).toBe(240);
    expect(narrowDrawerTheme.dimensions.notificationPanelWidth).toBe(360);
    expect(narrowDrawerTheme.dimensions.notificationListMaxHeight).toBe(320);
    expect(dimensionsBaseTheme.dimensions).toEqual(dimensions);
    expect(themeFailures(narrowDrawerTheme)).toEqual([]);
  });

  it("treats an explicit undefined as omitted", () => {
    const themed = extendTheme(lightTheme, {
      dimensions: {
        toastWidth: undefined,
        drawerWidthSm: undefined,
        overlayWidth: 240,
      },
    });
    expect(themed.dimensions.toastWidth).toBe(dimensions.toastWidth);
    expect(themed.dimensions.drawerWidthSm).toBe(dimensions.drawerWidthSm);
    expect(themed.dimensions.overlayWidth).toBe(240);
    expect(themed.dimensions.overlayMinWidth).toBe(dimensions.overlayMinWidth);
  });

  it("does not mutate the base theme", () => {
    const before = lightTheme.dimensions;
    extendTheme(lightTheme, { dimensions: { toastWidth: 420 } });
    expect(lightTheme.dimensions).toBe(before);
    expect(lightTheme.dimensions.toastWidth).toBe(380);
  });
});
