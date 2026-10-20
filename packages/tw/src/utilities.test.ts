/**
 * Guards the expanded shadcn utility table.
 *
 * Bug guarded: `ring-1` resolved through the spacing scale as 4px, and the
 * geometry/surface classes the Base UI and new-york-v4 recipes use had no
 * pinned values. Geometry is exact pixels; colours go through token roles.
 */

import { describe, expect, it } from "vitest";
import type { StyleDesc } from "@gpuix/react";
import { alpha, elevationShadow, lightTheme } from "@gpuixui/tokens";
import { classesToStyle } from "./classes.js";
import { resolveUtility } from "./utilities.js";
import { unsupportedReason } from "./unsupported.js";

const resolved = (name: string): StyleDesc | undefined =>
  resolveUtility(name, lightTheme);

const geometry: ReadonlyArray<readonly [string, StyleDesc]> = [
  ["p-4", { padding: 16 }],
  ["p-6", { padding: 24 }],
  ["gap-4", { gap: 16 }],
  ["gap-6", { gap: 24 }],
  ["flex-col", { flexDirection: "column" }],
  ["w-72", { width: 288 }],
  ["rounded-3xl", { borderRadius: 24 }],
  ["text-sm", { fontSize: 14, lineHeight: 20 }],
  ["text-xs", { fontSize: 12, lineHeight: 16 }],
  ["shadow-lg", { boxShadow: elevationShadow(lightTheme, "lg") }],
  ["shadow-xl", { boxShadow: elevationShadow(lightTheme, "lg") }],
  ["outline-hidden", {}],
];

const layout: ReadonlyArray<readonly [string, StyleDesc]> = [
  ["bottom-0", { bottom: 0 }],
  ["bottom-4", { bottom: 16 }],
  ["top-4", { top: 16 }],
  ["right-0", { right: 0 }],
  ["right-4", { right: 16 }],
  ["inset-x-4", { left: 16, right: 16 }],
  ["mx-0", { marginLeft: 0, marginRight: 0 }],
  ["w-auto", { width: "auto" }],
  ["h-full", { height: "100%" }],
  ["max-w-sm", { maxWidth: 384 }],
  ["max-w-md", { maxWidth: 448 }],
  ["flex-1", { flexGrow: 1, flexShrink: 1, flexBasis: 0 }],
  ["flex-col-reverse", { flexDirection: "column-reverse" }],
  ["overflow-hidden", { overflow: "hidden" }],
  ["leading-none", { lineHeight: 1 }],
  ["pointer-events-auto", { pointerEvents: "auto" }],
  ["grid-cols-3", { gridTemplateColumns: 3 }],
  ["grid-cols-12", { gridTemplateColumns: 12 }],
  ["grid-rows-2", { gridTemplateRows: 2 }],
  ["grid-rows-6", { gridTemplateRows: 6 }],
];

describe("expanded shadcn utilities", () => {
  it.each(geometry)("maps %s", (name, expected) => {
    expect(resolved(name)).toEqual(expected);
  });

  it.each(layout)("maps %s", (name, expected) => {
    expect(resolved(name)).toEqual(expected);
  });

  it("maps ring-1 to one pixel, not the 1 spacing step", () => {
    const result = classesToStyle("ring-1", lightTheme);
    expect(result.style.boxShadow).toEqual({
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadRadius: 1,
      color: lightTheme.colors.ring,
    });
    expect(
      classesToStyle("focus-visible:ring-3", lightTheme).focus.boxShadow,
    ).toEqual({
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadRadius: 3,
      color: lightTheme.colors.ring,
    });
  });

  it("keeps border-input on the border role", () => {
    expect(resolved("border-input")).toEqual({
      borderColor: lightTheme.colors.border,
    });
  });

  it("keeps bg-input on the field-fill role with its alpha", () => {
    expect(resolved("bg-input/50")).toEqual({
      backgroundColor: alpha(lightTheme.colors.input, 0.5),
    });
    expect(resolved("bg-input/30")).toEqual({
      backgroundColor: alpha(lightTheme.colors.input, 0.3),
    });
  });

  it.each([
    "duration-100",
    "data-[side=top]:slide-in-from-bottom-2",
    "data-[side=bottom]:slide-in-from-top-2",
    "data-[side=left]:slide-in-from-right-2",
    "data-[side=right]:slide-in-from-left-2",
  ])("records %s in the motion bucket", (token) => {
    expect(classesToStyle(token, lightTheme).motion).toContain(token);
  });

  it("records the responsive token without calling it unsupported", () => {
    const result = classesToStyle("sm:max-w-md", lightTheme);
    expect(result.responsive).toContain("sm:max-w-md");
    expect(result.unsupported).not.toContain("sm:max-w-md");
    expect(result.style.maxWidth).toBe(448);
  });

  it("resolves only integer track counts, never arbitrary templates", () => {
    expect(resolved("grid-cols-0")).toBeUndefined();
    expect(resolved("grid-cols-2.5")).toBeUndefined();
    expect(resolved("grid-rows-0")).toBeUndefined();
    expect(
      classesToStyle("grid-cols-[repeat(3,minmax(0,1fr))]", lightTheme)
        .unsupported,
    ).toContain("grid-cols-[repeat(3,minmax(0,1fr))]");
  });

  it.each([
    "origin-(--transform-origin)",
    "transition-opacity",
    "supports-backdrop-filter:backdrop-blur-sm",
    "[&_svg]:pointer-events-none",
    "ring-offset-background",
  ])("records %s as unsupported with a reason", (token) => {
    expect(classesToStyle(token, lightTheme).unsupported).toContain(token);
    expect(unsupportedReason(token)).toBeDefined();
  });
});
