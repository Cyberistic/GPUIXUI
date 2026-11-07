import * as Option from "effect/Option";

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

export const tenth = (value: number): number => Math.round(value * 10) / 10;

export const paintable = (value: number): boolean =>
  Number.isFinite(value) && value > 0;

export const seedOf = (seed: Option.Option<number>): number =>
  Option.getOrElse(
    Option.filter(seed, (value) => Number.isFinite(value)),
    () => 1,
  );

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
