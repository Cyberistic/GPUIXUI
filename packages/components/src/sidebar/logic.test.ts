/**
 * The sidebar's arithmetic and its guards.
 *
 * The bug these guard: shadcn states the gap, the panel width and the inset's
 * margin in CSS variables and parent selectors, so the port has to compute them
 * from one layout value. If the gap and the panel disagree, the content jumps by
 * a width the panel does not lose; if a stored name is read raw, a renamed
 * variant paints an undefined box.
 */

import { describe, expect, it } from "vitest";
import {
  collapsibleOf,
  isIconCollapsed,
  isMobileWidth,
  sidebarGap,
  sidebarInsetBox,
  sidebarOffset,
  sidebarWidth,
  sideOf,
  skeletonWidth,
  variantOf,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
  SIDEBAR_WIDTH_MOBILE,
  type SidebarCollapsible,
  type SidebarLayout,
  type SidebarVariant,
} from "./logic.js";

const layout = (
  open: boolean,
  variant: SidebarVariant = "sidebar",
  collapsible: SidebarCollapsible = "icon",
): SidebarLayout => ({ open, variant, collapsible });

describe("sidebar geometry", () => {
  it("keeps shadcn's three widths", () => {
    expect([SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON, SIDEBAR_WIDTH_MOBILE]).toEqual([
      256, 48, 288,
    ]);
  });

  it("pays the gap the panel loses", () => {
    expect(sidebarGap(layout(true))).toBe(256);
    expect(sidebarGap(layout(false))).toBe(48);
    expect(sidebarGap(layout(false, "inset"))).toBe(64);
    expect(sidebarGap(layout(false, "floating"))).toBe(64);
    expect(sidebarGap(layout(false, "sidebar", "offcanvas"))).toBe(0);
    expect(sidebarGap(layout(false, "sidebar", "none"))).toBe(256);
  });

  it("keeps an offcanvas panel its full width while it is off screen", () => {
    expect(sidebarWidth(layout(false, "sidebar", "offcanvas"))).toBe(256);
    expect(sidebarOffset(layout(false, "sidebar", "offcanvas"))).toBe(-256);
    expect(sidebarOffset(layout(true, "sidebar", "offcanvas"))).toBe(0);
    expect(sidebarOffset(layout(false, "inset", "icon"))).toBe(0);
  });

  it("gives the floating and inset variants their gutter on both sides", () => {
    expect(sidebarWidth(layout(false, "inset"))).toBe(64);
    expect(sidebarWidth(layout(false, "sidebar"))).toBe(48);
    expect(sidebarWidth(layout(false, "sidebar", "none"))).toBe(256);
  });

  it("floats only the inset variant beside the panel", () => {
    expect(sidebarInsetBox(layout(true), "left")).toEqual({
      margin: 0,
      marginLeft: 0,
      marginRight: 0,
      radius: 0,
    });
    expect(sidebarInsetBox(layout(true, "inset"), "left")).toMatchObject({
      margin: 8,
      marginLeft: 0,
      marginRight: 8,
      radius: 12,
    });
    expect(sidebarInsetBox(layout(false, "inset"), "left").marginLeft).toBe(8);
    expect(sidebarInsetBox(layout(false, "inset"), "right").marginRight).toBe(
      8,
    );
    expect(sidebarInsetBox(layout(true, "inset"), "right").marginLeft).toBe(8);
  });

  it("calls a window narrow below the breakpoint", () => {
    expect(isMobileWidth(767)).toBe(true);
    expect(isMobileWidth(768)).toBe(false);
    expect(isMobileWidth(Number.NaN)).toBe(false);
  });

  it("reads a collapsed icon rail as icon mode only", () => {
    expect(isIconCollapsed(layout(false))).toBe(true);
    expect(isIconCollapsed(layout(true))).toBe(false);
    expect(isIconCollapsed(layout(false, "sidebar", "offcanvas"))).toBe(false);
  });
});

describe("a caller's widths", () => {
  it("replaces the open panel and the icon rail", () => {
    const wide = {
      open: true,
      variant: "sidebar" as const,
      collapsible: "icon" as const,
      width: 304,
      iconWidth: 56,
    };

    expect(sidebarWidth(wide)).toBe(304);
    expect(sidebarGap(wide)).toBe(304);
    expect(sidebarWidth({ ...wide, open: false })).toBe(56);
    expect(sidebarGap({ ...wide, open: false })).toBe(56);
    // A floating rail pays its gutter on both sides of the caller's icon width.
    expect(sidebarWidth({ ...wide, open: false, variant: "floating" })).toBe(
      56 + 8 * 2,
    );
  });

  it("falls back to shadcn's numbers when the layout names none", () => {
    expect(
      sidebarWidth({
        open: true,
        variant: "sidebar",
        collapsible: "offcanvas",
      }),
    ).toBe(256);
  });
});

describe("stored names", () => {
  it("reads a name this release does not ship as the documented default", () => {
    expect(sideOf("right")).toBe("right");
    expect(sideOf("start")).toBe("left");
    expect(variantOf("floating")).toBe("floating");
    expect(variantOf("rail")).toBe("sidebar");
    expect(collapsibleOf("icon")).toBe("icon");
    expect(collapsibleOf(null)).toBe("offcanvas");
  });
});

describe("skeleton width", () => {
  it("is stable for one seed and inside shadcn's 50–90% range", () => {
    const first = skeletonWidth(":r1:");
    expect(first).toBe(skeletonWidth(":r1:"));
    for (const seed of [":r1:", ":r2:", ":r3:", "sidebar-skeleton"]) {
      const percent = Number(skeletonWidth(seed).slice(0, -1));
      expect(percent).toBeGreaterThanOrEqual(50);
      expect(percent).toBeLessThanOrEqual(90);
    }
    expect(skeletonWidth(":r1:")).not.toBe(skeletonWidth(":r2:"));
  });
});
