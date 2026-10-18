/**
 * Layout resolvers: the geometry GPUix's single box primitive draws.
 *
 * The runtime has flexbox plus a fixed-size grid and nothing else, so a Stack,
 * a Grid and a Box are all the same `div` with different resolved numbers. They
 * live here, pure and theme-driven, so every layout in the library takes its
 * spacing from the theme's scale instead of a hand-picked pixel value.
 */

import type { StyleDesc } from "@gpuix/react";
import { Match } from "effect";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Str from "effect/String";
import type { KeyName, Orientation } from "./keyboard.js";
import type { PrimitiveTheme, SpaceStep } from "./theme.js";
import { surfaceStyle, type SurfaceSpec } from "./style.js";

/** The two axes a `Stack` lays its children out on. */
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
  /**
   * How each column's minimum is sized. `max-content` fits every column to its
   * widest cell — a table-like grid; `min-content` is the smallest the content
   * can take; `zero` is the runtime's equal-track default.
   */
  readonly columnMin?: GridTrackMin;
  /** The same rule on the row axis. */
  readonly rowMin?: GridTrackMin;
}

/** The runtime's three track minimums, mirrored verbatim. */
export const GRID_TRACK_MINS = ["zero", "min-content", "max-content"] as const;
export type GridTrackMin = (typeof GRID_TRACK_MINS)[number];

/** A track count must be a whole, positive number; a nonsense count is one. */
const tracks = (count: number): number =>
  Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;

/**
 * A fixed-size grid.
 *
 * The track **counts** are numbers — there is no auto-flow, no named area and no
 * track string (plan 020 §1.2). The track **minimum** is the runtime's own
 * `gridColumnMin`/`gridRowMin`: `max-content` earns a table-like grid (measured,
 * a label column at 33 px beside a 235 px value, plan 376), and the grid then
 * hugs its content instead of filling its parent.
 */
export const gridStyle = (spec: GridSpec, theme: PrimitiveTheme): StyleDesc => {
  const style: StyleDesc = {
    display: "grid",
    gridTemplateColumns: tracks(spec.columns),
  };
  if (spec.rows !== undefined) {
    style.gridTemplateRows = tracks(spec.rows);
  }
  if (spec.columnMin !== undefined) style.gridColumnMin = spec.columnMin;
  if (spec.rowMin !== undefined) style.gridRowMin = spec.rowMin;
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

/** Which way a keyboard scroll moves; the pixels are resolved separately. */
export const SCROLL_DIRECTIONS = [
  "line-back",
  "line-forward",
  "page-back",
  "page-forward",
  "start",
  "end",
] as const;

export type ScrollDirection = (typeof SCROLL_DIRECTIONS)[number];

/**
 * One keyboard scroll.
 *
 * `axis: "both"` exists only for `Home`/`End`, which act on every axis the
 * container scrolls; an arrow or page key moves exactly one.
 */
export interface ScrollMove {
  readonly axis: Orientation | "both";
  readonly direction: ScrollDirection;
}

/**
 * One line of keyboard scrolling: three body lines.
 *
 * GPUix has no line-height-per-key notion, so the step follows the type scale
 * rather than a pixel literal — a denser theme scrolls in smaller steps.
 */
export const scrollLine = (theme: PrimitiveTheme): number =>
  3 * theme.typography.body.lineHeight;

interface KeyMove {
  readonly axis: Orientation;
  readonly direction: ScrollDirection;
}

const KEY_MOVES: Readonly<Record<string, KeyMove>> = {
  up: { axis: "vertical", direction: "line-back" },
  down: { axis: "vertical", direction: "line-forward" },
  left: { axis: "horizontal", direction: "line-back" },
  right: { axis: "horizontal", direction: "line-forward" },
  pageup: { axis: "vertical", direction: "page-back" },
  pagedown: { axis: "vertical", direction: "page-forward" },
  home: { axis: "vertical", direction: "start" },
  end: { axis: "vertical", direction: "end" },
};

/**
 * The scroll a key asks for, if any.
 *
 * The runtime reports key names lower-cased (measured: plan 072 §1), and a key
 * for an axis this container does not scroll is not handled. `None` means "this
 * key is not a scroll key here", so a caller never guesses from a sentinel.
 */
export const decideScroll = (
  key: KeyName,
  axis: "vertical" | "horizontal" | "both",
): Option.Option<ScrollMove> => {
  const vertical = axis !== "horizontal";
  const horizontal = axis !== "vertical";
  return Option.flatMap(
    R.get(KEY_MOVES, Str.toLowerCase(key)),
    (move): Option.Option<ScrollMove> => {
      if (move.direction === "start" || move.direction === "end") {
        const both = vertical && horizontal;
        return Option.some({
          axis: both ? "both" : axis,
          direction: move.direction,
        });
      }
      return (move.axis === "vertical" ? vertical : horizontal)
        ? Option.some({ axis: move.axis, direction: move.direction })
        : Option.none();
    },
  );
};

/** What the runtime reports about the container a scroll happens in. */
export interface ScrollGeometry {
  /** The current offset, in the runtime's convention (negative scrolls down). */
  readonly offset: { readonly x: number; readonly y: number };
  readonly viewport: { readonly width: number; readonly height: number };
  /** One line in pixels — `scrollLine(theme)`. */
  readonly line: number;
}

const scrollTarget = (
  current: number,
  viewport: number,
  direction: ScrollDirection,
  line: number,
): number => {
  const page = Math.max(viewport - line, line);
  return Match.value(direction).pipe(
    Match.when("line-back", () => current + line),
    Match.when("line-forward", () => current - line),
    Match.when("page-back", () => current + page),
    Match.when("page-forward", () => current - page),
    Match.when("start", () => 0),
    // The runtime clamps to the content's end (measured: plan 072 §1), so no
    // content height is invented here.
    Match.when("end", () => -Number.MAX_SAFE_INTEGER),
    Match.exhaustive,
  );
};

/** The absolute offset a scroll moves to; the untouched axis keeps its offset. */
export const resolveScroll = (
  move: ScrollMove,
  { offset, viewport, line }: ScrollGeometry,
): { readonly x: number; readonly y: number } => {
  const step = Math.max(1, line);
  return {
    x:
      move.axis === "vertical"
        ? offset.x
        : scrollTarget(offset.x, viewport.width, move.direction, step),
    y:
      move.axis === "horizontal"
        ? offset.y
        : scrollTarget(offset.y, viewport.height, move.direction, step),
  };
};
