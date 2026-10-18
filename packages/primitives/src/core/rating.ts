/**
 * The rating contract: a whole number of stars, or none.
 *
 * A rating is a radio group shaped input, but its arrows clamp at the ends
 * instead of wrapping — moving right at five stars must not jump to one — and
 * an explicit clear key is what takes it back to zero. Keeping that here means
 * the component has no policy of its own.
 */

import * as Option from "effect/Option";

/** A usable star count: a whole number, at least one. */
const limitOf = (max: number): number =>
  Math.max(1, Math.trunc(Number.isFinite(max) ? max : 1));

/** Clamp a rating to `0..max`; a value that is not a number reads as unrated. */
export const clampRating = (value: number, max: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(limitOf(max), Math.max(0, Math.trunc(value)));
};

/**
 * The star count to paint.
 *
 * A pointer over an interactive rating previews the value a click would set, but
 * a preview is not a selection: the announcement keeps the committed value.
 * Clamping both inputs is what stops a shorter `max` from painting a star that
 * no longer exists while the pointer still rests on its old position.
 */
export const previewRating = (
  value: number,
  preview: Option.Option<number>,
  max: number,
): number =>
  clampRating(
    Option.getOrElse(preview, () => value),
    max,
  );

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
 * the arrows step and clamp rather than wrapping.
 */
export const decideRating = (
  value: number,
  max: number,
  key: string,
): Option.Option<number> => {
  const limit = limitOf(max);
  if (key === "home") return Option.some(1);
  if (key === "end") return Option.some(limit);
  if (key === "delete" || key === "backspace") return Option.some(0);
  const step = ARROW_STEPS[key];
  if (step === undefined) return Option.none();
  return Option.some(
    Math.min(limit, Math.max(0, clampRating(value, limit) + step)),
  );
};

/** The star that holds the group's single tab stop. */
export const ratingTabStop = (value: number, max: number): number =>
  clampRating(value, max) === 0 ? 1 : clampRating(value, max);
