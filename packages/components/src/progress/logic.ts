/**
 * The share a bar paints, read from the caller's value and maximum.
 *
 * A progress bar's `value` is a measurement a record carries: JSON keeps a field
 * that was never written as `null`, a restored widget can hand back text from a
 * hand-edited export, and a decoder can answer `NaN`. Each of those is
 * **absence** — the bar paints its indeterminate segment — rather than a bar
 * pinned at an empty 0% that still claims a value. `0` is the empty share it
 * names.
 *
 * The maximum is the scale the caller's value is stated in, not a share: a
 * `max` that is not a positive number cannot divide one, so it reads as the
 * documented `100` and the value keeps the meaning it had.
 */

/** A measurement a store could have written, or absence. */
const measurement = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/** The documented scale when the caller states none the bar can divide by. */
const DEFAULT_MAX = 100;

/**
 * The percentage of `max` a `value` stands for, or `undefined` for a bar with
 * no measurement.
 */
export const progressShare = (
  value: unknown,
  max: unknown,
): number | undefined => {
  const share = measurement(value);
  if (share === undefined) return undefined;
  const stated = measurement(max);
  const top = stated !== undefined && stated > 0 ? stated : DEFAULT_MAX;
  return Math.min(100, Math.max(0, (share / top) * 100));
};
