import { Match } from "effect";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { scrollAxis, type ScrollAxis } from "./style.js";

export interface ScrollOffset {
  readonly x: number;
  readonly y: number;
}

export interface ScrollMetrics {
  readonly line: number;

  readonly page: { readonly width: number; readonly height: number };
}

export interface ScrollRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const SCROLL_END = -1e7;

interface Move {
  readonly x: -1 | 0 | 1;

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

const scrolls = (axis: ScrollAxis, side: "x" | "y"): boolean =>
  axis === "both" || axis === (side === "x" ? "horizontal" : "vertical");

const pageAxis = (axis: ScrollAxis): Option.Option<"x" | "y"> =>
  scrolls(axis, "y")
    ? Option.some("y")
    : scrolls(axis, "x")
      ? Option.some("x")
      : Option.none();

const next = (
  current: number,
  move: Move,
  side: "x" | "y",
  metrics: ScrollMetrics,
): number => {
  const direction =
    move.size === "page" ? move.y : side === "x" ? move.x : move.y;
  return Match.value(move.size).pipe(
    Match.when("end", () => SCROLL_END),
    Match.when("start", () => 0),
    Match.when("page", () =>
      Math.min(
        0,
        current +
          direction * (side === "x" ? metrics.page.width : metrics.page.height),
      ),
    ),
    Match.when("line", () => Math.min(0, current + direction * metrics.line)),
    Match.exhaustive,
  );
};

export const scrollTarget = (
  key: string,
  axis: unknown,
  current: ScrollOffset,
  metrics: ScrollMetrics,
): Option.Option<ScrollOffset> => {
  const resolved = scrollAxis(axis);
  return Option.flatMap(R.get(MOVES, key), (move) => {
    const paged = move.size === "page" ? pageAxis(resolved) : Option.none();

    const takes = (side: "x" | "y"): boolean =>
      scrolls(resolved, side) &&
      Match.value(move.size).pipe(
        Match.when("start", () => true),
        Match.when("end", () => true),
        Match.when("page", () => Option.contains(paged, side)),
        Match.when("line", () => (side === "x" ? move.x !== 0 : move.y !== 0)),
        Match.exhaustive,
      );
    return takes("x") || takes("y")
      ? Option.some({
          x: takes("x") ? next(current.x, move, "x", metrics) : current.x,
          y: takes("y") ? next(current.y, move, "y", metrics) : current.y,
        })
      : Option.none();
  });
};

const outside = (
  row: ScrollRect,
  viewport: ScrollRect,
): { readonly above: number; readonly below: number } => ({
  above: row.y - viewport.y,
  below: row.y + row.height - (viewport.y + viewport.height),
});

export const revealScroll = (
  row: ScrollRect,
  viewport: ScrollRect,
  current: ScrollOffset,
): Option.Option<ScrollOffset> => {
  const { above, below } = outside(row, viewport);
  const shift =
    row.height > viewport.height
      ? above
      : above < 0
        ? above
        : below > 0
          ? below
          : 0;
  return shift === 0
    ? Option.none()
    : Option.some({ x: current.x, y: current.y - shift });
};
