import { Match } from "effect";
import type { DrawerSide, DrawerSize } from "@gpuixui/components";

export interface DrawerBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface DrawerWindow {
  readonly width: number;
  readonly height: number;
}

export const DRAWER_WIDTHS: Readonly<Record<DrawerSize, number>> = {
  sm: 320,
  md: 400,
  lg: 560,
};

export const DRAWER_HEIGHTS: Readonly<Record<DrawerSize, number>> = {
  sm: 240,
  md: 320,
  lg: 420,
};

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

export const boxText = (box: DrawerBox): string =>
  `${box.x},${box.y},${box.width},${box.height}`;

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

export interface DrawerFlow {
  readonly open: boolean;
  readonly opens: number;
  readonly closes: number;
  readonly side: DrawerSide;
  readonly size: DrawerSize;
  readonly dismissible: boolean;
}

export const initialDrawerFlow: DrawerFlow = {
  open: false,
  opens: 0,
  closes: 0,
  side: "right",
  size: "md",
  dismissible: true,
};

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

export const drawerReadout = (flow: DrawerFlow): string =>
  `open=${flow.open} opens=${flow.opens} closes=${flow.closes} side=${flow.side} size=${flow.size} dismissible=${flow.dismissible}`;
