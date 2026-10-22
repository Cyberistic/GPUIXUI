/**
 * The pure half of `SplitPane`: the resize arithmetic, with no React and no
 * GPUix. It is the only part of the divider that can be tested on a host with
 * no native binding, so it carries the clamping contract for both input paths.
 *
 * A divider is a control, not a decoration: a pointer can drag it and a
 * keyboard must be able to move it too (WCAG 2.1.1), so both gestures resolve
 * to one width through `nextSize`.
 */
import { Match } from "effect";
import * as Number from "effect/Number";
import * as Schema from "effect/Schema";

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

/**
 * The keys a focused divider answers, in the order a keyboard reader tries
 * them. They are the runtime's own key names (`host.d.ts`: "left", "right"),
 * not the DOM's `ArrowLeft`/`ArrowRight`.
 */
export const resizeKeys = ["left", "right", "home", "end"] as const;

/** One key a focused divider answers. */
export const ResizeKey = Schema.Literals(resizeKeys);
/** One key a focused divider answers. */
export type ResizeKey = typeof ResizeKey.Type;

/** Whether a key event belongs to the divider, so an unrelated key passes on. */
export const isResizeKey = Schema.is(ResizeKey);

/** One keyboard step: where the pane is, which key arrived, and the bounds. */
export interface KeyResizeInput {
  readonly size: number;
  readonly key: ResizeKey;
  /** Pixels one arrow press moves the divider. */
  readonly step: number;
  readonly min: number;
  readonly max: number;
}

/**
 * The pane width after a key.
 *
 * The arrows move by one `step` and clamp through `nextSize`, because a
 * keyboard reader can hold an arrow against a bound exactly as a pointer can
 * drag past it. Home/End name the bounds themselves, so they need no clamp.
 */
export const keySize = ({
  size,
  key,
  step,
  min,
  max,
}: KeyResizeInput): number =>
  Match.value(key).pipe(
    Match.when("left", () =>
      nextSize({ start: size, pointerDelta: -step, min, max }),
    ),
    Match.when("right", () =>
      nextSize({ start: size, pointerDelta: step, min, max }),
    ),
    Match.when("home", () => min),
    Match.when("end", () => max),
    Match.exhaustive,
  );
