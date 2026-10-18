/**
 * Keep a highlighted row inside a scroll viewport.
 *
 * `renderer.scrollIntoView` scrolls to the nearest scroll parent's direct child,
 * which is a listbox/group wrapper for a combobox option, so it under-scrolls.
 * These helpers take the row's and the viewport's painted bounds and the offset
 * the viewport is at, and return the offset that brings the row inside — a
 * measured `scrollTo` (plan 535).
 *
 * GPUix reports a scroll container's own painted box **already translated by its
 * offset**, so the row's position in the list's content is `row.y - viewport.y`
 * (invariant under scrolling). Window coordinates would leave the check true
 * after every scroll and each arrow press would scroll again.
 */

import { pipe } from "effect";
import * as Option from "effect/Option";

/** The slice of a painted box a reveal needs. */
export interface RevealBounds {
  readonly y: number;
  readonly height: number;
}

/**
 * The scroll offset that brings `row` inside `viewport`, or `None` when it is
 * already visible. Offsets are zero at the top and negative downwards.
 */
export const revealOffset: (
  row: Option.Option<RevealBounds>,
  viewport: Option.Option<RevealBounds>,
  offsetY: Option.Option<number>,
) => Option.Option<number> = (row, viewport, offsetY) =>
  pipe(
    Option.all({ row, viewport, offsetY }),
    Option.flatMap((measured) => {
      const contentTop = measured.row.y - measured.viewport.y;
      const visibleTop = -measured.offsetY;
      const target =
        contentTop < visibleTop
          ? -contentTop
          : contentTop + measured.row.height >
              visibleTop + measured.viewport.height
            ? measured.viewport.height - measured.row.height - contentTop
            : undefined;
      if (target === undefined) return Option.none();
      const next = Math.min(0, target);
      return Math.abs(next - measured.offsetY) <= 0.5
        ? Option.none()
        : Option.some(next);
    }),
  );

/** What the renderer measured for one reveal; any gap means "do nothing". */
export interface RevealMeasure {
  readonly row: RevealBounds | null | undefined;
  readonly viewport: RevealBounds | null | undefined;
  readonly offsetY: number | null | undefined;
}

/** Scroll the row into the viewport through `scroll`, when it is outside. */
export const scrollRowIntoView = (
  measure: RevealMeasure,
  scroll: (offsetY: number) => void,
): void => {
  Option.match(
    revealOffset(
      Option.fromNullishOr(measure.row),
      Option.fromNullishOr(measure.viewport),
      Option.fromNullishOr(measure.offsetY),
    ),
    { onNone: () => undefined, onSome: scroll },
  );
};
