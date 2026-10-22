/**
 * The rating contract: a score in stars, or none.
 *
 * A rating is a radio group shaped input, but its arrows clamp at the ends
 * instead of wrapping — moving right at five stars must not jump to one — and
 * an explicit clear key is what takes it back to zero. Keeping that here means
 * the component has no policy of its own.
 *
 * A score is whole stars, or **halves** when the caller asks for them. One
 * module owns both precisions: what a value snaps to, how much of a star is
 * painted, what an arrow steps by, and which star holds the tab stop.
 */

import * as Option from "effect/Option";

/** A star's score state, the vocabulary `aria-valuetext` announces. */
export type StarState = "checked" | "half" | "unchecked";

/** A star's painted box, as the renderer reports it. */
export interface StarBox {
  readonly x: number;
  readonly width: number;
}

/**
 * A usable star count: a whole number, at least one.
 *
 * `max` is caller arithmetic — a measured total, a stored preference — so it
 * arrives as one number and has to become an array length. A count that cannot
 * be laid out reads as one star, the same answer the value clamp, the key
 * contract and the tab stop already give it; an infinite count would otherwise
 * reach `new Array(Infinity)` and throw `RangeError: Invalid array length`.
 */
export const starCount = (max: number): number =>
  Math.max(1, Math.trunc(Number.isFinite(max) ? max : 1));

/**
 * Where a score lands: on a whole star, or on a half when halves are allowed.
 *
 * A value between two places belongs to the nearer one, so a stored `4.4` reads
 * as `4` while `4.4` with halves reads as `4.5` — the score a reader wrote is
 * the score the stars paint.
 */
const snapRating = (value: number, half: boolean): number =>
  half ? Math.round(value * 2) / 2 : Math.trunc(value);

/** Clamp a rating to `0..max`; a value that is not a number reads as unrated. */
export const clampRating = (
  value: number,
  max: number,
  half = false,
): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(starCount(max), Math.max(0, snapRating(value, half)));
};

/** How much of one star is filled: `0`, `1`, or the half between them. */
export const starFill = (index: number, value: number): number =>
  Math.min(1, Math.max(0, value - (index - 1)));

/** What one star reports: filled, half filled, or empty. */
export const starState = (index: number, value: number): StarState => {
  const fill = starFill(index, value);
  return fill >= 1 ? "checked" : fill > 0 ? "half" : "unchecked";
};

const ARROW_STEPS: Readonly<Record<string, number>> = {
  right: 1,
  up: 1,
  left: -1,
  down: -1,
};

/**
 * The keyboard contract.
 *
 * `None` means the key is not one of ours. Delete and Backspace clear the
 * rating (the only way to return to zero), Home and End jump to the ends, and
 * the arrows step and clamp rather than wrapping. **A rated value's lower end is
 * one place** — a whole star, or a half when halves are allowed — so an arrow
 * never clears a rating the reader only nudged: zero is explicit (a clear key,
 * or the app calling `onValueChange(0)`), because losing a rating to a stray
 * ArrowLeft is data loss, not a step.
 */
export const decideRating = (
  value: number,
  max: number,
  key: string,
  half = false,
): Option.Option<number> => {
  const limit = starCount(max);
  const place = half ? 0.5 : 1;
  if (key === "home") return Option.some(place);
  if (key === "end") return Option.some(limit);
  if (key === "delete" || key === "backspace") return Option.some(0);
  const step = ARROW_STEPS[key];
  if (step === undefined) return Option.none();
  const current = clampRating(value, limit, half);
  const lower = current === 0 ? 0 : place;
  return Option.some(
    Math.min(
      limit,
      Math.max(lower, clampRating(current + step * place, limit, half)),
    ),
  );
};

/**
 * The star that holds the group's single tab stop.
 *
 * A half score is held by the star it is part of: `3.5` lands on the fourth
 * star, because that is the star a press would complete.
 */
export const ratingTabStop = (
  value: number,
  max: number,
  half = false,
): number => {
  const current = clampRating(value, max, half);
  return current === 0 ? 1 : Math.min(starCount(max), Math.ceil(current));
};

/**
 * The score a pointer at `x` on one star aims at.
 *
 * The left half of a star is the half below it, the right half the star itself,
 * so a press can say `3.5` without a second control. Without halves, or without
 * a press position and a measured box, the star's whole score stands. Both
 * inputs arrive as `Option`: an event with no `x` and an element the renderer
 * cannot measure are absences, not zeros.
 */
export const pointerRating = (
  star: number,
  x: Option.Option<number>,
  box: Option.Option<StarBox>,
  half = false,
): number => {
  if (!half) return star;
  return Option.match(x, {
    onNone: () => star,
    onSome: (pointer) =>
      Option.match(box, {
        onNone: () => star,
        onSome: (target) =>
          target.width > 0 && (pointer - target.x) / target.width < 0.5
            ? Math.max(0.5, star - 0.5)
            : star,
      }),
  });
};
