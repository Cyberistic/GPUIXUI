/**
 * The shimmer's arithmetic, without a renderer.
 *
 * The runtime paints a two-stop gradient, cannot animate its stops, and takes
 * pixel geometry rather than a percentage `left`. So the travelling highlight is
 * **one triangular brightness profile**: every frame samples it at the strips a
 * surface band is drawn from, and at the glyphs a text run is painted from.
 * Moving the profile is what moves the highlight; nothing measures the surface
 * and nothing interpolates a gradient.
 */

import {
  glyphLines,
  gradientColor,
  type GradientLine,
} from "../gradient-text/logic.js";

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

/** The share of the accent the brightest glyph takes: the profile's full peak. */
export const SHIMMER_INK = 1;

/** The triangular profile at `position`, `0` left edge to `1` right edge. */
const profileAt = (frame: ShimmerFrame, position: number): number => {
  const last = frame.alphas.length - 1;
  if (last <= 0) return 0;
  const at = Math.min(1, Math.max(0, position)) * last;
  const lower = Math.floor(at);
  const from = frame.alphas[lower] ?? 0;
  const to = frame.alphas[lower + 1] ?? from;
  return from + (to - from) * (at - lower);
};

/**
 * The ink one glyph takes this frame.
 *
 * The profile samples the same triangular curve the band paints, so a text run
 * and a surface band in the same frame agree about where the highlight is. The
 * blend is `from` at rest and {@link SHIMMER_INK} of the way to `to` at the
 * peak; both ends must be hex colours, which the theme's roles are.
 */
export const shimmerInk = (
  frame: ShimmerFrame,
  position: number,
  from: string,
  to: string,
): string => gradientColor(from, to, profileAt(frame, position) * SHIMMER_INK);

/**
 * A text run, one glyph per code point, inked from the frame's profile.
 *
 * This is the native substitute for a `background-clip: text` gradient: the
 * runtime paints one `color` per text host, so the smallest honest step is a
 * colour per code point. Words keep their wrapping; a line's profile restarts
 * at each explicit newline just as the browser gradient restarts at each line.
 */
export const shimmerLines = (
  text: string,
  from: string,
  to: string,
  frame: ShimmerFrame,
): ReadonlyArray<GradientLine> =>
  glyphLines(text, (position) => shimmerInk(frame, position, from, to));

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
