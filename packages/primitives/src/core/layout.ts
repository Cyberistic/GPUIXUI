/**
 * Layout resolvers: the geometry GPUix's single box primitive draws.
 *
 * The runtime has flexbox plus a fixed-size grid and nothing else, so a Stack,
 * a Grid and a Box are all the same `div` with different resolved numbers. They
 * live here, pure and theme-driven, so every layout in the library takes its
 * spacing from the theme's scale instead of a hand-picked pixel value.
 */

import type { StyleDesc } from "@gpuix/react";
import type { PrimitiveTheme, SpaceStep } from "./theme.js";
import { surfaceStyle, type SurfaceSpec } from "./style.js";

export const STACK_DIRECTIONS = ["row", "column"] as const;
export type StackDirection = (typeof STACK_DIRECTIONS)[number];

/** Where children sit across the axis. */
export const STACK_ALIGNS = [
  "start",
  "center",
  "end",
  "stretch",
  "baseline",
] as const;
export type StackAlign = (typeof STACK_ALIGNS)[number];

/** How children are distributed along the axis. */
export const STACK_JUSTIFIES = [
  "start",
  "center",
  "end",
  "between",
  "around",
] as const;
export type StackJustify = (typeof STACK_JUSTIFIES)[number];

const alignToFlex: Record<StackAlign, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
};

const justifyToFlex: Record<StackJustify, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
};

export interface StackSpec {
  readonly direction: StackDirection;
  /** Distance between children, on the theme's spacing scale. */
  readonly gap?: SpaceStep;
  readonly align?: StackAlign;
  readonly justify?: StackJustify;
  readonly wrap?: boolean;
  /** Take the leftover space along the parent's main axis. */
  readonly grow?: boolean;
  readonly fullWidth?: boolean;
  readonly fullHeight?: boolean;
}

/** A one-dimensional flex stack. */
export const stackStyle = (
  spec: StackSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const style: StyleDesc = {
    display: "flex",
    flexDirection: spec.direction,
  };
  if (spec.gap !== undefined) style.gap = theme.spacing[spec.gap];
  if (spec.align !== undefined) style.alignItems = alignToFlex[spec.align];
  if (spec.justify !== undefined)
    style.justifyContent = justifyToFlex[spec.justify];
  if (spec.wrap === true) style.flexWrap = "wrap";
  if (spec.grow === true) style.flexGrow = 1;
  if (spec.fullWidth === true) style.width = "100%";
  if (spec.fullHeight === true) style.height = "100%";
  return style;
};

export interface GridSpec {
  /** Fixed column count. GPUix's grid is numeric — there are no track strings. */
  readonly columns: number;
  readonly rows?: number;
  readonly gap?: SpaceStep;
  readonly grow?: boolean;
}

/**
 * A track count the runtime can draw.
 *
 * The runtime's grid takes a whole number of equal tracks, so a fractional count
 * floors and a count below one is one. A count that is not a number at all —
 * `NaN` from a measurement that never arrived, or an infinity from a bad
 * division — is one track rather than a number the runtime silently drops: the
 * element would otherwise paint as a block, not a grid, with nothing to say so.
 */
export const trackCount = (count: number): number =>
  Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;

/**
 * A fixed-size grid.
 *
 * GPUix exposes `gridTemplateColumns`/`gridTemplateRows` as **numbers** and has
 * no auto-flow or named areas (see `docs/gpuix-capabilities.md`), so a grid is always `columns`
 * equal tracks; anything raggedy uses a wrapping Stack.
 */
export const gridStyle = (spec: GridSpec, theme: PrimitiveTheme): StyleDesc => {
  const style: StyleDesc = {
    display: "grid",
    gridTemplateColumns: trackCount(spec.columns),
  };
  if (spec.rows !== undefined) {
    style.gridTemplateRows = trackCount(spec.rows);
  }
  if (spec.gap !== undefined) style.gap = theme.spacing[spec.gap];
  if (spec.grow === true) style.flexGrow = 1;
  return style;
};

export interface BoxSpec extends SurfaceSpec {
  /** Take the leftover space along the parent's main axis. */
  readonly grow?: boolean;
  /**
   * Allow the box to shrink below its content. Off by default: chrome must not
   * squash, which is the opposite of the browser default and the right one for
   * application layout.
   */
  readonly shrink?: boolean;
  readonly fullWidth?: boolean;
  readonly fullHeight?: boolean;
}

/** A container: the surface resolvers plus the flex facts a layout needs. */
export const boxStyle = (spec: BoxSpec, theme: PrimitiveTheme): StyleDesc => {
  const style: StyleDesc = {
    ...surfaceStyle(spec, theme),
    flexShrink: spec.shrink === true ? 1 : 0,
  };
  if (spec.grow === true) style.flexGrow = 1;
  if (spec.fullWidth === true) style.width = "100%";
  if (spec.fullHeight === true) style.height = "100%";
  return style;
};
