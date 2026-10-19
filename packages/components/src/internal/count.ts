/**
 * A caller's cap on how many entries a list shows: a whole count at least
 * `minimum`, or no cap when the value is not finite.
 *
 * A malformed bound hides nothing. `Math.max` propagates `NaN`, and
 * `Arr.take(list, NaN)` is empty, so normalising with arithmetic alone turns a
 * bad count into an apparently empty control. `Infinity` already means "no cap"
 * here, and a finite value keeps the component's documented floor.
 */
export const wholeCap = (value: number, minimum = 0): number =>
  Number.isFinite(value)
    ? Math.max(minimum, Math.trunc(value))
    : Number.POSITIVE_INFINITY;

/**
 * A caller's 0-based position in a list of `count` entries: a whole, in-range
 * index. A fractional value names no entry, and a non-finite one cannot name a
 * later entry, so both start at `0`; a finite value is truncated then clamped.
 * An empty list reports `0`.
 */
export const wholeIndex = (value: number, count: number): number => {
  if (count <= 0) return 0;
  const whole = Number.isFinite(value) ? Math.trunc(value) : 0;
  return Math.min(Math.max(whole, 0), count - 1);
};
