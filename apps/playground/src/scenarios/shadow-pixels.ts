/**
 * Where the shadow probe samples, and what "darker" means there.
 *
 * The bug being guarded: `focusRing` and `elevationShadow` produce a
 * `boxShadow`, and the suite only ever read that value back from the runtime's
 * **style report**. A runtime that accepts a shadow but paints nothing would
 * pass every existing check while every focus ring stayed invisible. These
 * rules keep the frame samples outside the box (where the ring and the drop
 * shadow live), inside it (where they must not paint), and make the elevation
 * check directional — a bright shadow must fail, not merely "differ".
 */
import { Match } from "effect";
import type { Pixels } from "@gpuixui/testing";

/** A box as the runtime reports it, in logical window coordinates. */
export interface ProbeBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A logical window point. */
export interface ProbePoint {
  readonly x: number;
  readonly y: number;
}

/** The minimum per-channel darkening the elevation sample must show. */
export const SHADOW_DELTA = 4;

/** How far below the box the elevation sample sits, in logical px. */
export const SHADOW_DROP = 4;

/**
 * The middle of a ring band on one edge.
 *
 * A ring is a zero-blur, zero-offset shadow spread by `spread`, painted
 * outside the border box, so its band spans `1…spread` logical px outside the
 * edge. `floor(spread / 2)` (at least 1) lands in the middle: 1 px for the
 * token's spread of 2, which at a device scale of 2 is the middle of four
 * device pixels.
 */
export const ringBand = (
  bounds: ProbeBox,
  spread: number,
  edge: "left" | "right" | "top",
): ProbePoint => {
  const distance = Math.max(1, Math.floor(spread / 2));
  const middleY = bounds.y + bounds.height / 2;
  const middleX = bounds.x + bounds.width / 2;
  return Match.value(edge).pipe(
    Match.when("left", () => ({ x: bounds.x - distance, y: middleY })),
    Match.when("right", () => ({
      x: bounds.x + bounds.width + distance,
      y: middleY,
    })),
    Match.when("top", () => ({ x: middleX, y: bounds.y - distance })),
    Match.exhaustive,
  );
};

/** A point `inset` px inside the box's left edge, at its vertical middle. */
export const interior = (bounds: ProbeBox, inset: number): ProbePoint => ({
  x: bounds.x + inset,
  y: bounds.y + bounds.height / 2,
});

/** The elevation sample: horizontally centred, `SHADOW_DROP` below the box. */
export const shadowSample = (bounds: ProbeBox): ProbePoint => ({
  x: bounds.x + bounds.width / 2,
  y: bounds.y + bounds.height + SHADOW_DROP,
});

/**
 * True when every colour channel of `actual` is at least `delta` below
 * `control`.
 *
 * A drop shadow's alpha at a given point is a blur implementation detail, so
 * the probe asserts direction and magnitude against a matched unshadowed box
 * instead of inventing a composite. Alpha is ignored: both samples are over an
 * opaque stage.
 */
export const darkerThan = (
  actual: Pixels.Rgba,
  control: Pixels.Rgba,
  delta: number,
): boolean =>
  control.r - actual.r >= delta &&
  control.g - actual.g >= delta &&
  control.b - actual.b >= delta;
