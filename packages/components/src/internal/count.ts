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
