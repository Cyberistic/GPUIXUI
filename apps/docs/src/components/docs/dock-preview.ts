/**
 * The split arithmetic the dock preview and its guard share.
 *
 * `@gpuixui/dock`'s `SplitPane` owns this rule in the library (`sizeBounds`,
 * `clampSize`, `dragSize`, `resizeByKey`), and the browser preview runs those
 * same functions rather than a second copy: the divider a reader drags on
 * `/workspace` and `/dock/split-pane` answers exactly what the shipped
 * control answers. `dock-preview.test.ts` holds the drawing's numbers to the
 * package's own over a matrix of sizes and bounds — a preview may approximate
 * the paint, never the rule.
 */

import {
  DIVIDER_STEP,
  DIVIDER_WIDTH,
  clampSize,
  dragSize,
  resizeByKey,
  sizeBounds,
  type DividerKey,
} from "@gpuixui/dock/logic";

/** The divider's width, in pixels (`SplitPane`'s 6px box). */
export const DOCK_DIVIDER_WIDTH = DIVIDER_WIDTH;

/** One arrow press, in pixels (`resizeByKey`'s step). */
export const DOCK_STEP = DIVIDER_STEP;

/** The preview's caller-owned bounds for the sized pane. */
export const DOCK_BOUNDS = { min: 220, max: 380 } as const;

/** The width the preview opens at — inside the bounds, so both ends are reachable. */
export const DOCK_INITIAL = 312;

export interface DockBounds {
  readonly min: number;
  readonly max: number;
}

/** The bounds the package's reducers take. */
const boundsOf = (bounds: DockBounds) => sizeBounds(bounds.min, bounds.max);

/** A width inside the caller's bounds. */
export const clampWidth = (width: number, bounds: DockBounds): number =>
  clampSize(width, boundsOf(bounds));

/** The width a drag reports: the width the press found plus its delta. */
export const dragWidth = (
  start: number,
  delta: number,
  bounds: DockBounds,
): number => dragSize(start, delta, boundsOf(bounds));

/** The keys the divider answers, in the package's names. */
export const dockKeys = [
  "left",
  "right",
  "home",
  "end",
] as const satisfies ReadonlyArray<DividerKey>;

export type DockKey = (typeof dockKeys)[number];

/** The width a divider key produces. */
export const keyWidth = (
  width: number,
  key: DockKey,
  bounds: DockBounds,
): number => resizeByKey(width, key, boundsOf(bounds));

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
 * depend on Effect here. */
export const dockKeyOf = (key: string): DockKey | undefined => browserKeys[key];
