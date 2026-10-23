/**
 * The split arithmetic the dock preview and its guard share.
 *
 * `@gpuixui/dock`'s `SplitPane` owns this rule in the library (`sizeBounds`,
 * `resizeByKey`, `DIVIDER_WIDTH`, `DIVIDER_STEP`). The browser preview restates
 * it so a reader can drag the divider and press the arrows without a native
 * window, and `dock-preview.test.ts` holds the numbers to the package's own —
 * a preview may approximate the paint, never the rule.
 */

/** The divider's width, in pixels (`split-pane.tsx`'s 6px box). */
export const DOCK_DIVIDER_WIDTH = 6;

/** One arrow press, in pixels (`resizeByKey`'s step). */
export const DOCK_STEP = 16;

/** The preview's caller-owned bounds for the sized pane. */
export const DOCK_BOUNDS = { min: 220, max: 380 } as const;

/** The width the preview opens at — inside the bounds, so both ends are reachable. */
export const DOCK_INITIAL = 312;

export interface DockBounds {
  readonly min: number;
  readonly max: number;
}

/** A width inside the caller's bounds. */
export const clampWidth = (width: number, bounds: DockBounds): number =>
  Math.min(Math.max(width, bounds.min), bounds.max);

/** The width a drag reports: the width the press found plus its delta. */
export const dragWidth = (
  start: number,
  delta: number,
  bounds: DockBounds,
): number => clampWidth(start + delta, bounds);

/** The keys the divider answers, in the package's names. */
export const dockKeys = ["left", "right", "home", "end"] as const;

export type DockKey = (typeof dockKeys)[number];

const widths: Readonly<Record<DockKey, (width: number, bounds: DockBounds) => number>> = {
  left: (width, bounds) => clampWidth(width - DOCK_STEP, bounds),
  right: (width, bounds) => clampWidth(width + DOCK_STEP, bounds),
  home: (_width, bounds) => bounds.min,
  end: (_width, bounds) => bounds.max,
};

/** The width a divider key produces. */
export const keyWidth = (
  width: number,
  key: DockKey,
  bounds: DockBounds,
): number => widths[key](width, bounds);

const browserKeys: Readonly<Record<string, DockKey | undefined>> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  Home: "home",
  End: "end",
};

/** The divider key a browser `KeyboardEvent.key` names, if any.
 *
 * Absence is `undefined` because this is the DOM boundary — a
 * `KeyboardEvent.key` the divider does not answer — and the docs app does not
 * depend on `effect`. */
export const dockKeyOf = (key: string): DockKey | undefined => browserKeys[key];
