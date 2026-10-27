/**
 * The browser glue between a press on a star and the rating's own arithmetic.
 *
 * The left half of a star is the half below it and the right half the star
 * itself, so a press can say `3.5` without a second control — that rule is
 * `pointerRating`'s in the primitive. What the browser adds is a pointer
 * position and a measured box, and both can be absent; the primitive takes them
 * as `Option`, and this module hands them over without inventing a zero.
 */

import * as Option from "effect/Option";
import { pointerRating } from "@gpuixui/primitives/core";

/** A measured star, in the page coordinates the pointer is reported in. */
export interface StarBox {
  readonly x: number;
  readonly width: number;
}

/** The score a press at `x` on `star` aims at. */
export const rateAt = (
  star: number,
  x: number | null | undefined,
  box: StarBox | null | undefined,
  half = false,
): number =>
  pointerRating(
    star,
    Option.fromNullishOr(x),
    Option.fromNullishOr(box),
    half,
  );
