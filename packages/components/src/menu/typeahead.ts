/**
 * The type-ahead buffer: what the user has typed, and when.
 *
 * The window is a lazy comparison, not a timer: the buffer records the monotonic
 * time of its last keystroke and the next keystroke decides whether it has
 * expired. Nothing has to fire while the menu is idle, so this module owns no
 * fiber, no scope and no `setTimeout`.
 *
 * Pure: `press` takes `now`, so the suite is deterministic.
 */

import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Duration from "effect/Duration";
import * as Str from "effect/String";

/** The typed prefix and when its last keystroke arrived (monotonic nanos). */
export interface TypeaheadBuffer {
  readonly text: string;
  readonly at: bigint;
}

/** Nothing typed. */
export const idle: TypeaheadBuffer = { text: "", at: 0n };

/** How long a prefix stays alive. */
export const window: Duration.Duration = Duration.millis(500);

const WINDOW_NANOS = BigInt(Duration.toMillis(window)) * 1_000_000n;

/**
 * Add one character to the buffer.
 *
 * A keystroke after the window starts a fresh prefix. Repeating the buffer's only
 * letter keeps it as it is, so the match can advance to the next row that starts
 * with that letter — the desktop convention. Otherwise the letter appends.
 * Matching is case-insensitive, so the buffer is stored lower-cased.
 */
export const press = (
  buffer: TypeaheadBuffer,
  char: string,
  now: bigint,
): TypeaheadBuffer => {
  const letter = Str.toLowerCase(char);
  if (buffer.text === "" || now - buffer.at > WINDOW_NANOS) {
    return { text: letter, at: now };
  }
  const repeating = pipe(
    Str.split("")(buffer.text),
    Arr.every((seen) => seen === letter),
  );
  return repeating
    ? { text: buffer.text, at: now }
    : { text: `${buffer.text}${letter}`, at: now };
};
