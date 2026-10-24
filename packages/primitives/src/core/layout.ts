/**
 * Layout resolvers: the geometry GPUix's single box primitive draws.
 *
 * The runtime has flexbox plus a fixed-size grid and nothing else, so a Stack,
 * a Grid and a Box are all the same `div` with different resolved numbers. They
 * live here, pure and theme-driven, so every layout in the library takes its
 * spacing from the theme's scale instead of a hand-picked pixel value.
 */

import type { StyleDesc } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import { storedNumber } from "./stored.js";
import { spaceValue, type PrimitiveTheme, type SpaceStep } from "./theme.js";
import { surfaceStyle, type SurfaceSpec } from "./style.js";

export const STACK_DIRECTIONS = ["row", "column"] as const;
export type StackDirection = (typeof STACK_DIRECTIONS)[number];

/** Whether a value names a stack axis. */
export const isStackDirection = (value: unknown): value is StackDirection =>
  P.isString(value) && Arr.contains(STACK_DIRECTIONS, value);

/**
 * The axis a Stack paints.
 *
 * A direction is stored with the layout that draws it — a saved workspace
 * records the axis each pane runs on — so a name this release renamed or
 * dropped arrives as a string the union no longer names. Read twice, the two
 * paint paths disagreed: the class recipe drew a **column** for anything that
 * was not `row`, while the core resolver handed the runtime the stored string,
 * which its flex grammar does not carry and quietly laid out as a row. The name
 * is resolved once here, as the column the shipped painter already drew.
 */
export const stackDirection = (value: unknown): StackDirection =>
  isStackDirection(value) ? value : "column";

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
  /**
   * The main axis. A stored name this release does not carry paints a
   * **column**, the axis the class recipe has always fallen back to
   * ({@link stackDirection}).
   */
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
    flexDirection: stackDirection(spec.direction),
  };
  if (spec.gap !== undefined) style.gap = spaceValue(theme, spec.gap);
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

/** The rows a text area paints: a floor it shows and a cap it scrolls at. */
export interface FieldRows {
  readonly minRows?: number;
  readonly maxRows?: number;
}

/**
 * A saved row count: a real number is a count, anything else is absence.
 *
 * A text area's row floor and cap are saved with the form that draws them, and
 * JSON keeps a field a record never carried as `null` rather than absent. Read
 * with `=== undefined`, that `null` reached the whole-row rule as **one row** —
 * and a cap of one made a six-line field collapse to a single row (measured in a
 * window: 38px against the 128px the same field paints with no cap). Only a
 * number is a count, the rule `storedNumber` follows; what a number then means
 * is {@link trackCount}'s decision.
 */
const rowCount = (count: unknown): Option.Option<number> =>
  Option.map(storedNumber(count), trackCount);

/**
 * The row floor and cap a text area hands the runtime.
 *
 * `minRows`/`maxRows` are caller arithmetic — a measured height divided by a
 * line — and the runtime reads them as **whole** rows: a fractional count is
 * dropped entirely rather than floored, so a `2.5` row floor painted one row
 * (fewer than `minRows={2}`) and a `2.5` row cap painted the whole six-line
 * field. Both go through {@link trackCount}, the package's whole-count rule, so
 * a fraction floors, a count below one is one, and a count that is there but
 * cannot be laid out (`NaN`, an infinity) is one. An absent count — omitted,
 * `null`, or text a store wrote — stays absent: the field's own height control
 * is the answer there ({@link rowCount}). A cap never sits below its floor,
 * because the runtime paints the floor anyway — raising it states the box the
 * field actually draws.
 */
export const fieldRows = (minRows: unknown, maxRows: unknown): FieldRows => {
  const floor = rowCount(minRows);
  const cap = rowCount(maxRows);
  const raised = Option.match(Option.all([floor, cap]), {
    onNone: () => cap,
    onSome: ([floorRows, capRows]) => Option.some(Math.max(capRows, floorRows)),
  });
  return {
    minRows: Option.getOrUndefined(floor),
    maxRows: Option.getOrUndefined(raised),
  };
};

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
  if (spec.gap !== undefined) style.gap = spaceValue(theme, spec.gap);
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
