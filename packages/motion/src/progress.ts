/**
 * The progress a curve is handed, and the progress it answers.
 *
 * Private to the package: an `Easing` is a caller's function, so the samplers
 * that apply one share this rule rather than repeating it. The module is not
 * re-exported from `index.ts`, so it adds no surface a consumer has to learn.
 */

/**
 * A progress clamped into `[0, 1]`, with an unreadable one read as the start.
 *
 * `NaN` cannot be clamped — both comparisons are false — so it used to reach
 * every curve and come back as `NaN`, which the runtime paints as nothing. The
 * house rule is that a number a formula cannot read is replaced before it
 * arrives, and for progress that replacement is `0`: the first frame of a run.
 * An infinity still clamps to the end it names.
 */
export const clamp01 = (value: number): number =>
  Number.isNaN(value) ? 0 : value < 0 ? 0 : value > 1 ? 1 : value;

/** A value the samplers can call as a curve. */
const isCurve = (value: unknown): value is (progress: number) => number =>
  typeof value === "function";

/**
 * A curve applied at `progress`, falling back to the progress itself.
 *
 * A frame a curve cannot read is not a curve: an easing that answers `NaN` (or
 * an infinity) would put that value into the interpolated result, so the run
 * paints nothing for its whole journey. Degrading to the linear progress is the
 * same honest fallback `bezier` takes for controls it cannot use, and it keeps
 * the run's start, end and completion exact.
 *
 * A value that is not a function at all is no curve either. `Transition` and
 * `Keyframe` are exported and structural, so a hand-built one can carry the
 * easing a config never decoded; calling it threw `TypeError: curve is not a
 * function` out of a frame loop instead of painting the run.
 */
export const eased = (curve: unknown, progress: number): number => {
  const unit = clamp01(progress);
  if (!isCurve(curve)) return unit;
  const value = curve(unit);
  return Number.isFinite(value) ? value : unit;
};

/**
 * The frame between two readable values at `progress`.
 *
 * The interpolation is a convex combination rather than
 * `from + (to - from) * progress`: the **difference** of two finite endpoints
 * can overflow even though each endpoint is a number the runtime can paint, so
 * a tween from `-1e308` to `1e308` used to answer `NaN` at its first frame and
 * `Infinity` for the rest of the journey — a surface that paints nothing until
 * it snaps to its target. The weighted sum stays inside the endpoints' own range
 * for every progress in `[0, 1]`.
 *
 * A curve may overshoot that range (`backOut`, `anticipate`), and an overshoot
 * the arithmetic cannot represent falls back to the endpoint the progress is
 * heading for, so the frame is always a number.
 */
export const mix = (from: number, to: number, progress: number): number => {
  const value = from * (1 - progress) + to * progress;
  if (Number.isFinite(value)) return value;
  return progress < 0.5 ? from : to;
};
