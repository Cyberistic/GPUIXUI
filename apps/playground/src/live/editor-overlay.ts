import type { StyleDesc } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { textStyle, type Theme } from "@gpuixui/tokens";
import { Pixels, type Smoke } from "@gpuixui/testing";

export const OVERLAY_PAGE = { width: 680, height: 300 } as const;

export const OVERLAY_FRAME = { width: 300, height: 180 } as const;

export const OVERLAY_GAP = 16;

export const OVERLAY_SOURCE = [
  "const total = add(1, 2);",
  "export const doubled = total * 2;",
  "function add(a: number, b: number) {",
  "  return a + b;",
  "}",
  "console.log(doubled);",
].join("\n");

export const OVERLAY_MARK = "zz";

export const OVERLAY_ENTER_COUNT = 12;

export type OverlayInk = "transparent" | "visible";

export const overlayMetrics = (theme: Theme): StyleDesc =>
  textStyle(theme, "code");

export const overlayCodeStyle = (theme: Theme): StyleDesc => ({
  ...overlayMetrics(theme),
  color: theme.colors.foreground,
  padding: OVERLAY_GAP / 2,
  whiteSpace: "nowrap",
});

export const overlayFieldStyle = (
  theme: Theme,
  ink: OverlayInk,
): StyleDesc => ({
  ...overlayMetrics(theme),
  color: ink === "transparent" ? "transparent" : theme.colors.destructive,
  backgroundColor: "transparent",
  padding: OVERLAY_GAP / 2,
});

export const overlayReadout = (value: string, ink: OverlayInk): string =>
  `ink=${ink} chars=${Str.length(value)} lines=${Arr.length(Str.split("\n")(value))}`;

export const overlayRegion = (
  box: Smoke.Bounds,
  scale: number,
): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round(box.x * scale),
    y: Math.round(box.y * scale),
    width: Math.round(box.width * scale),
    height: Math.round(box.height * scale),
  });
