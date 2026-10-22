/**
 * What a counting number prints, and how long it may take to get there.
 *
 * The numbers are the caller's; these are the two rules a caller should not
 * have to repeat: a value the renderer cannot paint (`NaN`, `Infinity`) prints
 * as `0` rather than `NaN`, a decimal count is clamped to what `toFixed` accepts,
 * and a duration that is missing, negative or not finite falls back to the
 * house level instead of stalling the tween.
 */

import * as Option from "effect/Option";

/** The text a counting number prints at one sampled value. */
export interface CountOptions {
  /** Digits after the point. Default `0`. */
  readonly decimals?: number;
  /** A full replacement for the default number text, e.g. a currency. */
  readonly format?: (value: number) => string;
}

/** `toFixed` accepts 0–20 fraction digits; anything else is a `RangeError`. */
const MAX_DECIMALS = 20;

const finite = (value: number): number => (Number.isFinite(value) ? value : 0);

const decimals = (value: Option.Option<number>): number =>
  Option.match(
    Option.filter(value, (digits) => Number.isFinite(digits) && digits >= 0),
    {
      onNone: () => 0,
      onSome: (digits) => Math.min(MAX_DECIMALS, Math.round(digits)),
    },
  );

/**
 * The string to paint at `value`.
 *
 * A `format` owns the text whole — a caller printing `$1,284` needs its own
 * grouping and symbol — so `decimals` applies only to the default text.
 */
export const countedText = (
  value: number,
  options: CountOptions = {},
): string =>
  Option.match(Option.fromNullishOr(options.format), {
    onNone: () =>
      finite(value).toFixed(decimals(Option.fromNullishOr(options.decimals))),
    onSome: (format) => format(finite(value)),
  });

/**
 * The tween duration, in milliseconds.
 *
 * `0` is kept: it is the honest "no journey" a caller can choose without a
 * provider. A negative or non-finite span would leave the physics sampling a
 * completed run forever, so it takes the fallback.
 */
export const countDuration = (
  value: Option.Option<number>,
  fallback: number,
): number =>
  Option.match(
    Option.filter(value, (ms) => Number.isFinite(ms) && ms >= 0),
    {
      onNone: () => fallback,
      onSome: (ms) => Math.round(ms),
    },
  );
