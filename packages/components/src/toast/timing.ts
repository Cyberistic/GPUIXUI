/**
 * The live timing of one auto-dismissing toast.
 *
 * The store publishes these values; the card ticks its copy locally between
 * store updates. `totalMs` is what the card started with, `remainingMs` is
 * clamped to `[0, totalMs]`, and `paused` means a hover or focus hold owns the
 * clock. Keeping the arithmetic here makes a zero total and a paused bar
 * table-testable without a renderer.
 */

/** How long the card waits between visual ticks. */
export const PROGRESS_TICK_MS = 100;

/** The live timing of one auto-dismissing toast. */
export interface ToastTiming {
  readonly id: string;
  /** The duration the card started with, in milliseconds. */
  readonly totalMs: number;
  /** Milliseconds left, clamped to `[0, totalMs]`. */
  readonly remainingMs: number;
  /** True while a hover/focus hold has stopped the clock. */
  readonly paused: boolean;
}

/** Clamp a remaining value into the timing's own range. */
export const clampRemaining = (totalMs: number, remainingMs: number): number =>
  Math.min(Math.max(0, remainingMs), Math.max(0, totalMs));

/** The bar's width as a whole percentage, 0–100. */
export const progressPercent = (timing: ToastTiming): number =>
  timing.totalMs <= 0
    ? 0
    : Math.round(
        (clampRemaining(timing.totalMs, timing.remainingMs) / timing.totalMs) *
          100,
      );

/** One visual tick: a paused timing never moves. */
export const tickTiming = (timing: ToastTiming): ToastTiming =>
  timing.paused
    ? timing
    : {
        ...timing,
        remainingMs: clampRemaining(
          timing.totalMs,
          timing.remainingMs - PROGRESS_TICK_MS,
        ),
      };
