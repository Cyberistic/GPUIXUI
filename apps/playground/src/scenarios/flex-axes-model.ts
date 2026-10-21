/**
 * The flex box's remaining axes (plan `841`).
 *
 * The bug being guarded: plan `833` measured grow, basis, `justifyContent` and
 * the cross-axis alignment, and plan `341` one `alignContent` value — the rest
 * of the axes were unmeasured. `tw`'s `flex-col-reverse` emits a value the
 * pinned `apply_styles` has no arm for (so it lays out as a row), `wrap-reverse`
 * was never read, every `alignContent` mode but `flex-start` was unread, and the
 * per-axis gaps override the `gap` shorthand with no check.
 *
 * This module owns the line, gap and order arithmetic the scenario asserts.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";

/** The `alignContent` modes the runtime accepts. */
export type AlignContentMode =
  | "flex-start"
  | "center"
  | "space-between"
  | "space-around"
  | "space-evenly"
  | "stretch";

/** A flex direction, including the reversed values. */
export type FlexDirection = "row" | "row-reverse" | "column" | "column-reverse";

/** The indices `0 … count - 1`. */
const indices = (count: number): ReadonlyArray<number> =>
  count <= 0 ? [] : Arr.range(0, count - 1);

/** The leading edge of every box in `sizes` laid out in order with `gap`. */
export const starts = (
  sizes: ReadonlyArray<number>,
  gap: number,
): ReadonlyArray<number> =>
  Arr.map(
    sizes,
    (_size, index) =>
      Arr.reduce(Arr.take(sizes, index), 0, (sum, size) => sum + size) +
      gap * index,
  );

/**
 * The gap an axis gets: its own longhand, else the `gap` shorthand.
 *
 * For a row the main axis is x (`columnGap`) and the cross axis is y
 * (`rowGap`); for a column the roles swap.
 */
export const axisGap = (
  axis: "main" | "cross",
  direction: "row" | "column",
  gap: number,
  rowGap?: number,
  columnGap?: number,
): number => {
  const horizontal = axis === (direction === "row" ? "main" : "cross");
  const longhand = horizontal ? columnGap : rowGap;
  return longhand ?? gap;
};

/**
 * The cross-axis offset of a sized item inside its (stretched) line.
 *
 * `wrap-reverse` flips the line's start, so the item sits at the **end** of its
 * line rather than at the line's origin — measured in plan `841`.
 */
export const itemInLine = (
  lineSize: number,
  itemSize: number,
  reverse: boolean,
): number => (reverse ? lineSize - itemSize : 0);

/** The line a wrapped item with `index` lands on, `perLine` items per line. */
export const lineOf = (index: number, perLine: number): number =>
  Math.floor(index / perLine);

/**
 * The start of every line under `mode`.
 *
 * `count` lines of `size` sit in `extent` across the cross axis, `gap` between
 * them; the free space is distributed the CSS way, and `stretch` (the runtime
 * default) grows each line to fill it.
 */
export const lineStarts = (
  mode: AlignContentMode,
  count: number,
  size: number,
  extent: number,
  gap = 0,
): ReadonlyArray<number> => {
  const gaps = gap * Math.max(0, count - 1);
  const used = count * size + gaps;
  const free = Math.max(0, extent - used);
  const paint = (offset: (index: number) => number): ReadonlyArray<number> =>
    Arr.map(indices(count), offset);

  return Match.value(mode).pipe(
    Match.when("flex-start", () => paint((index) => index * (size + gap))),
    Match.when("center", () =>
      paint((index) => free / 2 + index * (size + gap)),
    ),
    Match.when("space-between", () => {
      const between = count === 1 ? 0 : free / (count - 1);
      return paint((index) => index * (size + gap + between));
    }),
    Match.when("space-around", () => {
      const each = free / count;
      return paint((index) => each / 2 + index * (size + gap + each));
    }),
    Match.when("space-evenly", () => {
      const each = free / (count + 1);
      return paint((index) => each + index * (size + gap + each));
    }),
    Match.when("stretch", () => {
      const each = (extent - gaps) / count;
      return paint((index) => index * (each + gap));
    }),
    Match.exhaustive,
  );
};
