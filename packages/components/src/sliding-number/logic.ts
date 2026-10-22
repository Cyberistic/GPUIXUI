/**
 * What a number paints as digits, and which column each digit belongs to.
 *
 * A sliding number is a row of clipped columns: each column stacks the ten
 * digits and raises its plate to the one it paints, because the runtime has no
 * `transform` (upstream issue #102) and cannot animate the characters of a text
 * node. This module owns the arithmetic — the digits, the point between them,
 * and the identity that keeps a column in place when the value grows — so the
 * renderer suite only has to prove the clock and the paint call it.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The most decimals a caller may ask for. */
export const slidingNumberDecimalsCap = 6;

/** The ten cells a column stacks, top to bottom. */
export const digitCells: ReadonlyArray<number> = Arr.range(0, 9);

/** A plain decimal string: the shape `toFixed` writes for a paintable value. */
const PLAIN = /^(-?)(\d+)(?:\.(\d+))?$/;

/** One column of the row. */
export interface NumberCell {
  /**
   * Stable by decimal place — `i0` is the ones digit, `f1` the tenths, `point`
   * the separator — so a value that gains a digit keeps the columns it had and
   * only the column whose digit changed rolls.
   */
  readonly key: string;
  /** The digit painted, `None` on the point between integer and fraction. */
  readonly digit: Option.Option<number>;
}

/** A value laid out as a row of cells. */
export interface NumberLayout {
  /** Whether the value paints a minus sign. */
  readonly negative: boolean;
  /** The columns in reading order, with the point among them. */
  readonly cells: ReadonlyArray<NumberCell>;
  /** The whole reading: prefix, sign, digits, point and suffix. */
  readonly text: string;
}

/** How a caller shapes the reading. */
export interface NumberFormat {
  /** Digits after the point. Default `0`; clamped to {@link slidingNumberDecimalsCap}. */
  readonly decimals?: number;
  /** Painted, and read, before the sign. */
  readonly prefix?: string;
  /** Painted, and read, after the last digit. */
  readonly suffix?: string;
}

/** `decimals` as a whole number of places a value can be cut to. */
export const decimalsOf = (decimals: number | undefined): number =>
  Option.fromNullishOr(decimals).pipe(
    Option.filter(Number.isFinite),
    Option.map((places) =>
      Math.min(slidingNumberDecimalsCap, Math.max(0, Math.floor(places))),
    ),
    Option.getOrElse(() => 0),
  );

/** The digit cells of one part, keyed by their place from the point. */
const placeCells = (
  part: string,
  placeOf: (index: number, length: number) => number,
  keyPrefix: "i" | "f",
): ReadonlyArray<NumberCell> =>
  Arr.map(Str.split("")(part), (digit, index) => ({
    key: `${keyPrefix}${placeOf(index, Str.length(part))}`,
    digit: Option.some(Number(digit)),
  }));

const pointCell: NumberCell = { key: "point", digit: Option.none() };

/**
 * Lay a value out as a row of digit columns.
 *
 * Digits and the point are read off `toFixed`, so the painted row and the
 * reading cannot disagree. A value no column can paint — `NaN`, an infinity, or
 * a magnitude `toFixed` writes in exponent form — has no cells and its text, so
 * the component paints it as one static run instead of ten blanks.
 */
export const numberLayout = (
  value: number,
  format: NumberFormat = {},
): NumberLayout => {
  const decimals = decimalsOf(format.decimals);
  const prefix = format.prefix ?? "";
  const suffix = format.suffix ?? "";
  const fixed = Number.isFinite(value) ? value.toFixed(decimals) : "";
  return Option.match(Option.fromNullishOr(PLAIN.exec(fixed)), {
    onNone: () => ({
      negative: false,
      cells: [],
      text: `${prefix}${String(value)}${suffix}`,
    }),
    onSome: (match) => {
      const sign = match[1] ?? "";
      const integers = match[2] ?? "";
      const fraction = match[3];
      const digits = `${integers}${fraction ?? ""}`;
      const cells = [
        ...placeCells(integers, (index, length) => length - 1 - index, "i"),
        ...Option.match(Option.fromNullishOr(fraction), {
          onNone: () => [],
          onSome: (places) => [
            pointCell,
            ...placeCells(places, (index) => index + 1, "f"),
          ],
        }),
      ];
      // A value that rounds to zero has no sign to paint: `-0.4` cut to no
      // decimals is `toFixed`'s `-0`, not a negative number.
      const negative =
        sign === "-" &&
        Arr.some(Str.split("")(digits), (digit) => digit !== "0");
      return {
        negative,
        cells,
        text: `${negative ? "-" : ""}${prefix}${integers}${fraction === undefined ? "" : `.${fraction}`}${suffix}`,
      };
    },
  });
};

/**
 * How far a column's plate is raised above the column's top to paint `digit`.
 *
 * A column's frame is exactly one line tall, so the plate sits a whole line
 * above the frame for each cell it has passed. A distance that cannot run reads
 * as no travel rather than reaching the runtime as `null`.
 */
export const columnTop = (digit: number, lineHeight: number): number => {
  if (!Number.isFinite(lineHeight)) return 0;
  const offset = -digit * lineHeight;
  return offset === 0 ? 0 : offset;
};
