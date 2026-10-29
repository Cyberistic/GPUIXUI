/**
 * The shimmer's arithmetic, without a renderer.
 *
 * The runtime paints a two-stop gradient, cannot animate its stops, and takes
 * pixel geometry rather than a percentage `left`. So the travelling highlight is
 * **a row of thin strips**: every frame samples one triangular brightness
 * profile, and each strip is a two-stop ramp between two neighbouring samples.
 * Moving the profile is what moves the highlight; nothing measures the surface
 * and nothing interpolates a gradient.
 */

/** How many strips one sweep is drawn from, and therefore its frames. */
export const SHIMMER_STEPS = 16;

/** How many strips either side of the peak are lit. */
export const SHIMMER_SPREAD = 3;

/** One frame of the sweep: the alpha at each strip edge. */
export interface ShimmerFrame {
  /** `SHIMMER_STEPS + 1` samples, left edge first; each is 0…1. */
  readonly alphas: ReadonlyArray<number>;
  /** The brightest sample this frame. */
  readonly peak: number;
}

const positive = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

/**
 * The frame at a step.
 *
 * The profile's peak enters from outside the left edge, crosses the surface and
 * leaves past the right edge, so no step paints a hard band against the border.
 * `step` wraps, so the caller's counter can grow without a reset.
 */
export const shimmerFrame = (
  step: number,
  steps = SHIMMER_STEPS,
  spread = SHIMMER_SPREAD,
): ShimmerFrame => {
  const frames = Math.max(2, Math.trunc(positive(steps, SHIMMER_STEPS)));
  const reach = Math.max(1, positive(spread, SHIMMER_SPREAD));
  const phase = ((Math.trunc(step) % frames) + frames) % frames;
  const progress = phase / (frames - 1);
  const centre = -reach + progress * (frames + reach * 2);
  const alphas = Array.from({ length: frames + 1 }, (_, index) =>
    Math.max(0, Math.min(1, 1 - Math.abs(index - centre) / reach)),
  );
  return { alphas, peak: Math.max(...alphas) };
};

/**
 * The interval between frames.
 *
 * A sweep is stated as a duration; the component ticks at the frame that keeps
 * the sweep on time. An unusable duration falls back to two seconds, so a
 * stored `0` does not freeze the surface.
 */
export const shimmerInterval = (
  durationMs: number,
  steps = SHIMMER_STEPS,
): number =>
  Math.max(
    1,
    Math.round(positive(durationMs, 2_000) / positive(steps, SHIMMER_STEPS)),
  );
