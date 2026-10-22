/**
 * The reveal a typing effect runs on: how long it waits, how fast it types and
 * what is visible at a given count.
 *
 * These are the rules a caller can get wrong by passing a number — a negative
 * speed, a fractional delay, a `NaN` from a calculation — and the rules a
 * renderer cannot be trusted to keep: a *character* is a code point, so a
 * string with an emoji must not split one in half halfway through its reveal.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** The speed and delay a typing effect uses when the caller names neither. */
export const typingDefaults = {
  /** One character every 45 ms: fast enough to read, slow enough to watch. */
  speedMs: 45,
  /** The first character arrives with the first frame. */
  delayMs: 0,
} as const;

/** A sanitised reveal schedule, in milliseconds. */
export interface TypingTiming {
  /** The wait before the first character. */
  readonly delayMs: number;
  /** The wait between two characters. */
  readonly speedMs: number;
}

const milliseconds = (value: Option.Option<number>, fallback: number): number =>
  Option.match(
    Option.filter(value, (ms) => Number.isFinite(ms) && ms >= 0),
    {
      onNone: () => fallback,
      onSome: (ms) => Math.round(ms),
    },
  );

/**
 * The schedule for the speed and delay a caller passed.
 *
 * A missing, non-finite or negative value falls back to {@link typingDefaults}:
 * a `NaN` speed would otherwise schedule one timer per frame forever, and a
 * negative delay is a wait that never ends. A speed of `0` is kept — it means
 * "paint the whole string at once" — and is the one value the component reads
 * as an instant reveal.
 */
export const typingTiming = (
  options: {
    readonly speedMs?: number;
    readonly delayMs?: number;
  } = {},
): TypingTiming => ({
  delayMs: milliseconds(
    Option.fromNullishOr(options.delayMs),
    typingDefaults.delayMs,
  ),
  speedMs: milliseconds(
    Option.fromNullishOr(options.speedMs),
    typingDefaults.speedMs,
  ),
});

/**
 * A string as the characters a reader sees.
 *
 * `String.prototype.length` counts UTF-16 code units, so slicing by it reveals
 * half of an emoji or a combining pair. The reveal counts code points, which is
 * the smallest unit the renderer can paint without breaking a glyph.
 */
export const characters = (text: string): ReadonlyArray<string> =>
  Arr.fromIterable(text);

/** The text visible once `revealed` characters of `text` have arrived. */
export const visibleText = (text: string, revealed: number): string =>
  Arr.join(
    Arr.take(
      characters(text),
      Number.isFinite(revealed) ? Math.max(0, Math.trunc(revealed)) : 0,
    ),
    "",
  );
