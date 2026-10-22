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

/**
 * A curve applied at `progress`, falling back to the progress itself.
 *
 * A frame a curve cannot read is not a curve: an easing that answers `NaN` (or
 * an infinity) would put that value into the interpolated result, so the run
 * paints nothing for its whole journey. Degrading to the linear progress is the
 * same honest fallback `bezier` takes for controls it cannot use, and it keeps
 * the run's start, end and completion exact.
 */
export const eased = (
  curve: (progress: number) => number,
  progress: number,
): number => {
  const unit = clamp01(progress);
  const value = curve(unit);
  return Number.isFinite(value) ? value : unit;
};
