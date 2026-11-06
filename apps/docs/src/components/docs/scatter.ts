export interface ScatterPoint {
  readonly x: number;

  readonly y: number;

  readonly size: number;

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
