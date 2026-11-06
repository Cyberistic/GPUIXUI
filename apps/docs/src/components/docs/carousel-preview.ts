import { targetSize } from "@gpuixui/tokens";

export const dotHeight = 6;

export const dotRestWidth = 6;

export const dotActiveWidth = 18;

export const dotTarget = targetSize.minimum;

export type SlideStep = 1 | -1;

export interface StepInput {
  readonly active: number;
  readonly count: number;
  readonly delta: SlideStep;
  readonly loop: boolean;
}

export const resolveActive = (active: number, count: number): number =>
  count === 0 ? 0 : Math.min(Math.max(active, 0), count - 1);

export const stepIndex = ({
  active,
  count,
  delta,
  loop,
}: StepInput): number => {
  if (count === 0) return 0;
  const current = resolveActive(active, count);
  const next = current + delta;
  if (next >= 0 && next < count) return next;
  return loop ? (next + count) % count : Math.min(Math.max(next, 0), count - 1);
};

export const goToIndex = (index: number, count: number): number =>
  resolveActive(index, count);

export const firstIndex = (): number => 0;
export const lastIndex = (count: number): number =>
  resolveActive(count - 1, count);

export const atEdge = (
  active: number,
  count: number,
  direction: SlideStep,
): boolean => {
  const current = resolveActive(active, count);
  return direction === 1 ? current >= count - 1 : current <= 0;
};

export const controlDisabled = ({
  active,
  count,
  delta,
  loop,
}: StepInput): boolean =>
  count === 0 || (!loop && atEdge(active, count, delta));

export const rovingStop = (active: number): number => active;

export const dotWidth = (selected: boolean): number =>
  selected ? dotActiveWidth : dotRestWidth;

export const dotLabel = (index: number): string => `Go to slide ${index + 1}`;

export const describeSlide = (
  active: number,
  count: number,
  loop: boolean,
): string =>
  count === 0
    ? "No slides"
    : `Slide ${resolveActive(active, count) + 1} of ${count} · ${
        loop ? "wraps at both ends" : "stops at the ends"
      }`;
