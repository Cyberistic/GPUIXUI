/**
 * The pure half of `SplitPane`: the resize arithmetic, with no React and no
 * GPUix. It is the only part of the divider that can be tested on a host with
 * no native binding, so it carries the clamping contract.
 */
import * as Number from "effect/Number";

/** One drag: where the pane started and how far the pointer has travelled. */
export interface ResizeInput {
  readonly start: number;
  readonly pointerDelta: number;
  readonly min: number;
  readonly max: number;
}

/**
 * The pane width after a drag.
 *
 * Clamped to `[min, max]` **inclusively**: `min` is the narrowest legal pane,
 * and a drag past it must never invert the pane or produce a negative width.
 */
export const nextSize = ({
  start,
  pointerDelta,
  min,
  max,
}: ResizeInput): number =>
  Number.clamp({ minimum: min, maximum: max })(start + pointerDelta);
