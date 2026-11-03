/**
 * The monitor's pure part: the ring's two segments, the sample window, and the
 * next range a press selects.
 */
import * as Arr from "effect/Array";
import type { Range } from "./data.js";

const noise = (seed: number, index: number): number => {
  const x = Math.sin(seed * 12.9898 + index * 4.1414) * 43758.5453;
  return x - Math.floor(x);
};

/** `count` samples around `base`, seeded so a window is stable on every render. */
export const samples = (
  seed: number,
  base: number,
  count: number,
): ReadonlyArray<number> =>
  Arr.map(Arr.range(0, count - 1), (i) =>
    Math.round(base + (noise(seed, i) - 0.5) * 9 + Math.sin(i / 3) * 2),
  );

export interface RingSegment {
  readonly key: string;
  readonly label: string;
  readonly value: number;
}

/** A ring's two segments: the load, then the rest of the circle. */
export const ring = (load: number): ReadonlyArray<RingSegment> => [
  { key: "load", label: "Load", value: load },
  { key: "rest", label: "Rest", value: Math.max(0, 100 - load) },
];

/** The window's caption. */
export const rangeLabel = (range: Range): string => `last ${range} min`;

/** The window a press selects; a press on the open one keeps it open. */
export const nextRange = (current: Range, next: Range): Range =>
  current === next ? current : next;
