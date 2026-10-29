/**
 * The browser glue between a range drag and the slider's own arithmetic.
 *
 * A press on two coincident thumbs cannot say which end it grabbed — every
 * direction is a tie — so the pair opens around the press instead of dragging a
 * thumb that has nowhere to go. Once the ends differ, the grab is ordinary: the
 * end the reader pressed follows the pointer and the other stays pinned. That
 * rule is `spanFrom`'s in the primitive; this module only
 * decides which one the gesture is.
 */

import {
  clampValue,
  spanFrom,
  stepValue,
  valueFraction,
  type ValueRange,
  type ValueSpan,
  normalizeSpan,
} from "@gpuixui/primitives/core";

/**
 * The end a press pinned: the one the pointer is **not** moving.
 *
 * A drag that remembered the grabbed end clamped it onto its pair, because
 * `moveSpanEnd` refuses to cross — the pair collapsed and the next move read the
 * stale press point and jumped back. Holding the *other* end and drawing the span
 * around it lets the dragged end pass, and the thumb under the pointer is simply
 * the one that moved.
 */
export interface SpanDrag {
  readonly anchor: number;
}

/**
 * A DOM key as the primitive names it.
 *
 * The runtime reports `right`; the browser reports `ArrowRight`, and
 * `decideValueKey` reads the runtime's name — so a drawing that passed the DOM
 * key through stepped on `Home`/`End` and sat still on every arrow.
 */
export const valueKey = (key: string): string =>
  key.toLowerCase().replace(/^arrow/, "");

/** The filled span, as fractions of the track: where it starts and how wide. */
export interface TrackPaint {
  readonly left: number;
  readonly width: number;
}

/**
 * The fill a value or a pair paints.
 *
 * One value fills from the start of the track to the thumb; two values fill
 * between them. Reading the fill as `last - first` drew an **empty** track
 * under a single thumb — the page printed `Quality · 62` over a strip that
 * reported `width: 0%` — so a single value's fill starts at the floor.
 */
export const trackPaint = (
  values: ReadonlyArray<number>,
  range: ValueRange,
): TrackPaint => {
  const clean = (fraction: number): number =>
    Number.parseFloat(fraction.toPrecision(12));
  const first = valueFraction(values[0] ?? range.min, range);
  const last = valueFraction(values.at(-1) ?? range.min, range);
  const single = values.length < 2;
  return {
    left: single ? 0 : clean(first),
    width: clean(last - (single ? 0 : first)),
  };
};

/** The thumb fractions a value list paints, in the order the values arrive. */
export const thumbFractions = (
  values: ReadonlyArray<number>,
  range: ValueRange,
): ReadonlyArray<number> => values.map((value) => valueFraction(value, range));

/**
 * The window a stepper's `−`/`+` moves: both ends by `steps`, keeping the
 * span's width until a bound stops it.
 *
 * The component publishes no stepper, so this is the page's own affordance —
 * built on the same `stepValue` an arrow key uses, so a press and a key move by
 * the same amount.
 */
export const shiftSpan = (
  span: ValueSpan,
  steps: number,
  range: ValueRange,
): ValueSpan => {
  const current = normalizeSpan(span, range);
  const offset = stepValue(current.start, range, steps) - current.start;
  if (offset === 0) return current;
  const width = current.end - current.start;
  const start = Math.min(
    clampValue(current.start + offset, range),
    range.max - width,
  );
  return { start, end: clampValue(start + width, range) };
};

/** The span a pointer at `value` draws from a pinned end. */
export const dragSpan = (
  drag: SpanDrag,
  value: number,
  range: ValueRange,
): ValueSpan => spanFrom(drag.anchor, value, range);
