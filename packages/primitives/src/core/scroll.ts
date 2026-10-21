/**
 * Keyboard scrolling, as decisions rather than handlers.
 *
 * The runtime's scroll offset is **negative**: 0 at the start and more negative
 * as the content moves (`getScrollOffset`, the pair `onScrollChange` reports).
 * `scrollTo` clamps an overshoot to the content's real end, measured in
 * `runtime/layout.runtime.test.tsx`, so a move is plain arithmetic in that space
 * and "End" is an overshoot the runtime resolves.
 *
 * The keys mirror a native scroll region: an arrow moves one row, PageUp/PageDown
 * one measured viewport, Home returns to the start and End goes to the end.
 */

import { Match } from "effect";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import type { ScrollSpec } from "./style.js";

/** A scroll offset in the runtime's coordinate space: 0 at the start, negative after. */
export interface ScrollOffset {
  readonly x: number;
  readonly y: number;
}

/** Where a line and a page step come from: the theme's row, the scroller's own box. */
export interface ScrollMetrics {
  /** One row of content — the theme's `rowHeight`. */
  readonly line: number;
  /** One viewport — the scroller's measured height. */
  readonly page: number;
}

/**
 * A far overshoot past any content, which the runtime clamps to the real end.
 *
 * Not `Infinity`: the runtime takes an `f32`, and an infinite pixel offset is
 * not a position. This is only a key's intent — the painted position is always
 * inside the content.
 */
export const SCROLL_END = -1e7;

interface Move {
  /** The x direction (-1 further right, 0 to the start, 1 back). */
  readonly x: -1 | 0 | 1;
  /** The y direction (-1 further down, 0 to the start, 1 back). */
  readonly y: -1 | 0 | 1;
  readonly size: "line" | "page" | "end" | "start";
}

const MOVES: Record<string, Move> = {
  up: { x: 0, y: 1, size: "line" },
  down: { x: 0, y: -1, size: "line" },
  pageup: { x: 0, y: 1, size: "page" },
  pagedown: { x: 0, y: -1, size: "page" },
  left: { x: 1, y: 0, size: "line" },
  right: { x: -1, y: 0, size: "line" },
  home: { x: 0, y: 0, size: "start" },
  end: { x: -1, y: -1, size: "end" },
};

const scrolls = (axis: ScrollSpec["axis"], side: "x" | "y"): boolean =>
  axis === "both" || axis === (side === "x" ? "horizontal" : "vertical");

/** The next offset on one axis; never past the start, and the runtime clamps the end. */
const next = (
  current: number,
  direction: -1 | 0 | 1,
  move: Move,
  metrics: ScrollMetrics,
): number =>
  Match.value(move.size).pipe(
    Match.when("end", () => SCROLL_END),
    Match.when("start", () => 0),
    Match.when("page", () => Math.min(0, current + direction * metrics.page)),
    Match.when("line", () => Math.min(0, current + direction * metrics.line)),
    Match.exhaustive,
  );

/**
 * Where a key sends a scroll region, given where it is.
 *
 * `None` means the key is not a scroll key, or it asks for an axis this container
 * does not scroll — a caller must leave that event alone rather than swallow a
 * key it did not use.
 */
export const scrollTarget = (
  key: string,
  axis: ScrollSpec["axis"],
  current: ScrollOffset,
  metrics: ScrollMetrics,
): Option.Option<ScrollOffset> =>
  Option.flatMap(R.get(MOVES, key), (move) => {
    const scrollsX = scrolls(axis, "x");
    const scrollsY = scrolls(axis, "y");
    const acts =
      move.size === "start" ||
      (move.x !== 0 && scrollsX) ||
      (move.y !== 0 && scrollsY);
    return acts
      ? Option.some({
          x: scrollsX ? next(current.x, move.x, move, metrics) : current.x,
          y: scrollsY ? next(current.y, move.y, move, metrics) : current.y,
        })
      : Option.none();
  });
