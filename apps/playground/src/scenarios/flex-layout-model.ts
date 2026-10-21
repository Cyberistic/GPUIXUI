/**
 * Flex distribution (plan `833`).
 *
 * The bug being guarded: `flexGrow` appears in 64 shipped call sites,
 * `alignItems: "center"` in 163 and `justifyContent` in 89, and no scenario in
 * either registry measured one of them. A runtime that ignored grow, grew from
 * zero instead of from the basis, treated `space-between` as `flex-start`, or
 * never stretched a default cross-axis child passed the whole suite.
 *
 * This module owns the arithmetic the scenario asserts — free space, the grow
 * split, the justification gaps and the cross-axis offset — so the view, the
 * checks and the unit tests read one rule, and the rounding is decided once.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** One flex item's declared shape. */
export interface FlexItem {
  readonly basis: number;
  readonly grow: number;
}

export const justifyModes = ["flex-start", "center", "space-between"] as const;

export type JustifyMode = (typeof justifyModes)[number];

export const crossAligns = ["stretch", "center", "flex-start"] as const;

export type CrossAlign = (typeof crossAligns)[number];

/** The space left after every basis, floored at zero. */
export const freeSpace = (
  total: number,
  items: ReadonlyArray<FlexItem>,
): number =>
  Math.max(0, total - Arr.reduce(items, 0, (sum, item) => sum + item.basis));

/**
 * The widths a row hands out: each basis plus its share of the free space.
 *
 * The remainder goes to the **last** growing item, so the widths always sum to
 * the total exactly instead of drifting by the fractional pixel a proportional
 * split leaves behind.
 */
export const growWidths = (
  total: number,
  items: ReadonlyArray<FlexItem>,
): ReadonlyArray<number> => {
  const free = freeSpace(total, items);
  const weights = Arr.map(items, (item) => item.grow);
  const weightSum = Arr.reduce(weights, 0, (sum, weight) => sum + weight);
  if (weightSum === 0) {
    return Arr.map(items, (item) => item.basis);
  }
  const shares = Arr.map(items, (item) =>
    item.grow === 0 ? 0 : (free * item.grow) / weightSum,
  );
  const lastGrowing = Option.getOrElse(
    Arr.findLastIndex(weights, (weight) => weight > 0),
    () => -1,
  );
  return Arr.map(items, (item, index) => {
    const share = shares[index] ?? 0;
    const assigned =
      index === lastGrowing
        ? free - Arr.reduce(shares, 0, (sum, value) => sum + value) + share
        : share;
    return item.basis + assigned;
  });
};

/**
 * The widths a row hands out when its bases overflow: each shrinkable item
 * gives up a share of the overflow in proportion to its `shrink` weight.
 *
 * `shrink: 0` keeps its basis, which is the whole point of the guard: an
 * overflowing row must not squeeze a fixed chrome strip.
 */
export const shrinkWidths = (
  total: number,
  items: ReadonlyArray<{ readonly basis: number; readonly shrink: number }>,
): ReadonlyArray<number> => {
  const bases = Arr.reduce(items, 0, (sum, item) => sum + item.basis);
  const overflow = Math.max(0, bases - total);
  const weightSum = Arr.reduce(items, 0, (sum, item) => sum + item.shrink);
  if (overflow === 0 || weightSum === 0) {
    return Arr.map(items, (item) => item.basis);
  }
  return Arr.map(items, (item) =>
    item.shrink === 0
      ? item.basis
      : item.basis - (overflow * item.shrink) / weightSum,
  );
};

/** The blank space `justifyContent` leaves between consecutive items. */ export const justifyGaps =
  (
    mode: JustifyMode,
    total: number,
    widths: ReadonlyArray<number>,
  ): ReadonlyArray<number> => {
    const count = Arr.length(widths);
    if (count < 2) {
      return [];
    }
    const leftover = total - Arr.reduce(widths, 0, (sum, width) => sum + width);
    const share = Match.value(mode).pipe(
      Match.when("space-between", () => Math.max(0, leftover) / (count - 1)),
      Match.orElse(() => 0),
    );
    return Arr.makeBy(count - 1, () => share);
  };

/** The leading space `justifyContent` leaves before the first item. */
export const justifyOffset = (
  mode: JustifyMode,
  total: number,
  widths: ReadonlyArray<number>,
): number => {
  const leftover = total - Arr.reduce(widths, 0, (sum, width) => sum + width);
  return mode === "center" ? Math.max(0, leftover) / 2 : 0;
};

/** Every item's left edge, from the leading offset and the gaps. */
export const rowPositions = (
  widths: ReadonlyArray<number>,
  gaps: ReadonlyArray<number>,
  offset = 0,
): ReadonlyArray<number> =>
  Arr.map(
    widths,
    (_width, index) =>
      offset +
      Arr.reduce(Arr.take(widths, index), 0, (sum, width) => sum + width) +
      Arr.reduce(Arr.take(gaps, index), 0, (sum, gap) => sum + gap),
  );

/**
 * A child's top offset inside a row.
 *
 * `stretch` and `flex-start` both start at the row's top: a stretched child is
 * measured by its own box, and centring a child **taller** than the row clamps
 * at zero rather than moving it above the row.
 */
export const crossOffset = (
  align: CrossAlign,
  rowHeight: number,
  childHeight: number,
): number =>
  align === "center" ? Math.max(0, (rowHeight - childHeight) / 2) : 0;

/** Measured widths match the model within a device-independent tolerance. */
export const widthsMatch = (
  measured: ReadonlyArray<number>,
  predicted: ReadonlyArray<number>,
  tolerance: number,
): boolean =>
  Arr.length(measured) === Arr.length(predicted) &&
  Arr.every(
    measured,
    (width, index) =>
      Math.abs(width - (predicted[index] ?? Number.NaN)) <= tolerance,
  );

/** The gaps between consecutive measured widths, for a failure's readout. */
export const measuredGaps = (
  measured: ReadonlyArray<{ readonly x: number; readonly width: number }>,
): ReadonlyArray<number> =>
  Arr.map(
    Arr.zip(Arr.drop(measured, 1), measured),
    ([later, earlier]) => later.x - (earlier.x + earlier.width),
  );

export const describeNumbers = (values: ReadonlyArray<number>): string =>
  Arr.match(values, {
    onEmpty: () => "none",
    onNonEmpty: (numbers) =>
      Arr.join(
        Arr.map(numbers, (value) => `${Math.round(value * 100) / 100}`),
        ",",
      ),
  });
