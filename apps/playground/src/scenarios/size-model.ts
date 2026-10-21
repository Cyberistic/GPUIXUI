/**
 * Size constraints: how a declared size, a minimum, a maximum and a percentage
 * resolve (plan `825`).
 *
 * The bug being guarded: the shipped components rely on `minWidth`, `maxWidth`,
 * `minHeight`, `maxHeight` and `"100%"` in more than twenty call sites
 * (`preview-card` 240–360, `toast` max 380 with `minWidth: 0`, `combobox` max
 * height 280, `menu/sub` 320 + scroll), and **no scenario reads any of them**.
 * A runtime that dropped the four constraints would pass every check while a
 * popover collapsed, a hover card overgrew, a menu did not scroll and a toast
 * pushed its viewport off-screen.
 *
 * These are the two rules the checks compare against, kept here so the fixture
 * and the expectation cannot drift: CSS precedence (the minimum wins when both
 * constraints apply) and the percentage resolution.
 */

/** No upper bound: the value a fixture passes when it declares no maximum. */
export const UNBOUNDED = Number.POSITIVE_INFINITY;

/**
 * The constrained extent of a declared size.
 *
 * CSS resolves `min` **after** `max`, so `min = 300, max = 260` yields `300` —
 * a runtime that clamped by max last yields `260`.
 */
export const constrained = (
  declared: number,
  min: number,
  max: number,
): number => Math.max(min, Math.min(declared, max));

/** A percentage dimension resolved against the parent's extent. */
export const percentOf = (parent: number, percent: number): number =>
  parent * percent;

/** The style string a percentage fixture declares, from one fraction. */
export const percentStyle = (percent: number): string => `${percent * 100}%`;
