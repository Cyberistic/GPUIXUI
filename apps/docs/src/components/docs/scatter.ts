/**
 * A deterministic scatter for the decorative-field previews (Bubbles, Stars,
 * Particles, Fireworks, Gravity stars). Each native field derives its points
 * from a seed; these previews reproduce a stable scatter with a small LCG so a
 * drawing does not reshuffle every render.
 */

export interface ScatterPoint {
  /** Horizontal position, 0..1 of the field's width. */
  readonly x: number;
  /** Vertical position, 0..1 of the field's height. */
  readonly y: number;
  /** Diameter in pixels. */
  readonly size: number;
  /** A per-point phase in 0..1, for staggering the animation. */
  readonly phase: number;
}

export const scatter = (
  count: number,
  seed: number,
  minSize: number,
  maxSize: number,
): ReadonlyArray<ScatterPoint> => {
  let state = (seed * 2654435761) >>> 0;
  const next = (): number => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };

  return Array.from({ length: count }, () => ({
    x: next(),
    y: next(),
    size: minSize + next() * (maxSize - minSize),
    phase: next(),
  }));
};
