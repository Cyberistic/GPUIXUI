/**
 * The shipped `Drawer` as a window can measure it.
 *
 * The component's own behaviour suite drives the offscreen renderer, which
 * reports boxes and focus but never hit-tests a press or paints a pixel. A
 * drawer is the one modal whose edge, veil and dismissal are all paint: the
 * surface must sit against the window edge it names, the veil must dim the page
 * outside it, and a press aimed at the veil must reach the dismiss layer while
 * a press inside the surface must not. This module owns the arithmetic a check
 * compares against and the app state the fixture keeps, so the window's
 * readings have one spelling.
 */
import { Match } from "effect";
import type { DrawerSide, DrawerSize } from "@gpuixui/components";

/** The surface's painted box. */
export interface DrawerBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The window a drawer is measured in. */
export interface DrawerWindow {
  readonly width: number;
  readonly height: number;
}

/**
 * The column widths `drawer.tsx` gives each size.
 *
 * Copied rather than exported because the component keeps them private; the
 * fixture's guard reads them back out of the source, so a size the component
 * moves fails the probe's own test instead of a window's geometry.
 */
export const DRAWER_WIDTHS: Readonly<Record<DrawerSize, number>> = {
  sm: 320,
  md: 400,
  lg: 560,
};

/** The sheet heights `drawer.tsx` gives a bottom drawer. */
export const DRAWER_HEIGHTS: Readonly<Record<DrawerSize, number>> = {
  sm: 240,
  md: 320,
  lg: 420,
};

/**
 * The box the component lays the surface out in.
 *
 * A column takes the size's width (never wider than the window) and the whole
 * window's height; a sheet takes the whole width and the size's height, capped
 * at the window. The edge decides the origin.
 */
export const drawerBox = (
  side: DrawerSide,
  size: DrawerSize,
  window: DrawerWindow,
): DrawerBox => {
  const column = {
    width: Math.min(DRAWER_WIDTHS[size], window.width),
    height: window.height,
  };
  const sheet = {
    width: window.width,
    height: Math.min(DRAWER_HEIGHTS[size], window.height),
  };
  return Match.value(side).pipe(
    Match.when("left", () => ({ x: 0, y: 0, ...column })),
    Match.when("right", () => ({
      x: window.width - column.width,
      y: 0,
      ...column,
    })),
    Match.when("bottom", () => ({
      x: 0,
      y: window.height - sheet.height,
      ...sheet,
    })),
    Match.when("top", () => ({ x: 0, y: 0, ...sheet })),
    Match.exhaustive,
  );
};

/** A box as the one comparable string a check names. */
export const boxText = (box: DrawerBox): string =>
  `${box.x},${box.y},${box.width},${box.height}`;

/** The controls the probe drives, beside the ids the component paints. */
export const DRAWER_IDS = {
  probe: "drawer-probe",
  opener: "drawer-open",
  readout: "drawer-readout",
  surface: "drawer-surface",
  title: "drawer-title",
  cancel: "drawer-cancel",
  apply: "drawer-apply",
  sideRight: "drawer-side-right",
  sideLeft: "drawer-side-left",
  sideBottom: "drawer-side-bottom",
  sizeSm: "drawer-size-sm",
  sizeMd: "drawer-size-md",
  sizeLg: "drawer-size-lg",
  dismissibleOn: "drawer-dismissible-on",
  dismissibleOff: "drawer-dismissible-off",
} as const;

/** What the fixture has recorded: the state and every path's count. */
export interface DrawerFlow {
  readonly open: boolean;
  readonly opens: number;
  readonly closes: number;
  readonly side: DrawerSide;
  readonly size: DrawerSize;
  readonly dismissible: boolean;
}

/** The state before the reader has pressed anything. */
export const initialDrawerFlow: DrawerFlow = {
  open: false,
  opens: 0,
  closes: 0,
  side: "right",
  size: "md",
  dismissible: true,
};

/** Every input the probe's controls send. */
export type DrawerEvent =
  | "open"
  | "close"
  | "side-right"
  | "side-left"
  | "side-bottom"
  | "size-sm"
  | "size-md"
  | "size-lg"
  | "dismissible-on"
  | "dismissible-off";

/**
 * One step of the caller's state.
 *
 * A close is the component's `onOpenChange(false)`, whether it came from
 * Escape, the backdrop or the close control, so every dismissal increments the
 * same count — the probe's way of proving which path the surface took.
 */
export const drawerFlow = (flow: DrawerFlow, event: DrawerEvent): DrawerFlow =>
  Match.value(event).pipe(
    Match.when("open", () => ({
      ...flow,
      open: true,
      opens: flow.opens + 1,
    })),
    Match.when("close", () => ({
      ...flow,
      open: false,
      closes: flow.closes + 1,
    })),
    Match.when("side-right", () => ({ ...flow, side: "right" as const })),
    Match.when("side-left", () => ({ ...flow, side: "left" as const })),
    Match.when("side-bottom", () => ({ ...flow, side: "bottom" as const })),
    Match.when("size-sm", () => ({ ...flow, size: "sm" as const })),
    Match.when("size-md", () => ({ ...flow, size: "md" as const })),
    Match.when("size-lg", () => ({ ...flow, size: "lg" as const })),
    Match.when("dismissible-on", () => ({ ...flow, dismissible: true })),
    Match.when("dismissible-off", () => ({ ...flow, dismissible: false })),
    Match.exhaustive,
  );

/** The `key=value` line the checks read. */
export const drawerReadout = (flow: DrawerFlow): string =>
  `open=${flow.open} opens=${flow.opens} closes=${flow.closes} side=${flow.side} size=${flow.size} dismissible=${flow.dismissible}`;
