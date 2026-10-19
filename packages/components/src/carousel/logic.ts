/**
 * The active slide index, which every carousel part reads from the root.
 *
 * A slide index is whole. A caller that computes `1.5` (or `NaN`) names no
 * slide: `index === active` then fails for every slide, so the track paints
 * nothing and a step adds to a fraction that still matches no slide. Truncation
 * matches Pagination's page rule; a non-finite value starts at the first slide
 * because it cannot name a later one. An empty track reports `0` and nothing is
 * painted either way.
 */
export const slideIndex = (value: number, count: number): number => {
  if (count <= 0) return 0;
  const whole = Number.isFinite(value) ? Math.trunc(value) : 0;
  return Math.min(Math.max(whole, 0), count - 1);
};
