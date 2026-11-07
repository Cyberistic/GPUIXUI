import {
  glyphLines,
  gradientColor,
  type GradientLine,
} from "../gradient-text/logic.js";

export const SHIMMER_STEPS = 16;

export const SHIMMER_SPREAD = 3;

export interface ShimmerFrame {
  readonly alphas: ReadonlyArray<number>;

  readonly peak: number;
}

const positive = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

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

export const SHIMMER_INK = 1;

const profileAt = (frame: ShimmerFrame, position: number): number => {
  const last = frame.alphas.length - 1;
  if (last <= 0) return 0;
  const at = Math.min(1, Math.max(0, position)) * last;
  const lower = Math.floor(at);
  const from = frame.alphas[lower] ?? 0;
  const to = frame.alphas[lower + 1] ?? from;
  return from + (to - from) * (at - lower);
};

export const shimmerInk = (
  frame: ShimmerFrame,
  position: number,
  from: string,
  to: string,
): string => gradientColor(from, to, profileAt(frame, position) * SHIMMER_INK);

export const shimmerLines = (
  text: string,
  from: string,
  to: string,
  frame: ShimmerFrame,
): ReadonlyArray<GradientLine> =>
  glyphLines(text, (position) => shimmerInk(frame, position, from, to));

export const shimmerInterval = (
  durationMs: number,
  steps = SHIMMER_STEPS,
): number =>
  Math.max(
    1,
    Math.round(positive(durationMs, 2_000) / positive(steps, SHIMMER_STEPS)),
  );
