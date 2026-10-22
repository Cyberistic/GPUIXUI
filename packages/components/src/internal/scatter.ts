/**
 * The shared arithmetic of a scattered decorative field.
 *
 * A field of motes, a starfield and a burst all answer the same three questions
 * before they paint: where does one piece sit, how big is it, and how long does
 * its motion run? Each answer is a hash of the caller's seed and the slot being
 * drawn rather than a shared random sequence, so a field paints the same picture
 * on every mount — a decorative background that reshuffles between frames is a
 * bug a reader notices immediately — and two fields can borrow one seed without
 * borrowing each other's shapes.
 *
 * The hash is arithmetic on `Math.imul` (32-bit integer multiply), so it is
 * identical on every host the library runs on.
 */

import * as Option from "effect/Option";

/** A stable unit value in `[0, 1)` for one slot of one seeded field. */
export const seededUnit = (
  seed: number,
  index: number,
  slot: number,
): number => {
  let value =
    Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^
    Math.imul((index + 1) * 8 + slot, 0xc2b2ae35);
  value ^= value >>> 15;
  value = Math.imul(value, 0x2c1b3c6d);
  value ^= value >>> 13;
  return (value >>> 0) / 0x100000000;
};

/** A tenth of a pixel is the finest the runtime paints. */
export const tenth = (value: number): number => Math.round(value * 10) / 10;

/** A measurement the runtime can lay out. */
export const paintable = (value: number): boolean =>
  Number.isFinite(value) && value > 0;

/** The seed a field is drawn from. A non-finite seed is not a layout. */
export const seedOf = (seed: Option.Option<number>): number =>
  Option.getOrElse(
    Option.filter(seed, (value) => Number.isFinite(value)),
    () => 1,
  );

/** The pieces a field paints with, clamped to the cap, or the house number. */
export const countOf = (
  count: Option.Option<number>,
  fallback: number,
  cap: number,
): number =>
  Option.getOrElse(
    Option.map(
      Option.filter(count, (value) => Number.isFinite(value) && value >= 0),
      (value) => Math.min(Math.round(value), cap),
    ),
    () => fallback,
  );

/**
 * The ordered size range a caller can paint with.
 *
 * A step below a pixel cannot be seen, so it falls back; an inverted pair is
 * read low-to-high rather than painting a negative range.
 */
export const sizeRangeOf = (
  min: Option.Option<number>,
  max: Option.Option<number>,
  fallbackMin: number,
  fallbackMax: number,
): { readonly min: number; readonly max: number } => {
  const floor = sizeOf(min, fallbackMin);
  const ceiling = sizeOf(max, fallbackMax);
  return floor <= ceiling
    ? { min: floor, max: ceiling }
    : { min: ceiling, max: floor };
};

const sizeOf = (size: Option.Option<number>, fallback: number): number =>
  Option.getOrElse(
    Option.map(
      Option.filter(size, (value) => Number.isFinite(value) && value >= 1),
      Math.round,
    ),
    () => fallback,
  );

/**
 * The base time for one run of a field's motion.
 *
 * Below the floor the movement is a jitter rather than an animation; above the
 * cap the field looks frozen. Both extremes fall back or clamp instead of
 * reaching the runtime as a duration it would paint as nothing.
 */
export const durationOf = (
  duration: Option.Option<number>,
  fallback: number,
  floor: number,
  cap: number,
): number =>
  Option.getOrElse(
    Option.map(
      Option.filter(
        duration,
        (value) => Number.isFinite(value) && value >= floor,
      ),
      (value) => Math.min(Math.round(value), cap),
    ),
    () => fallback,
  );
