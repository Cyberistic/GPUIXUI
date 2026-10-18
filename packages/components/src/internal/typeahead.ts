/**
 * Type-ahead: the typed prefix, the row it selects, and the hook that wires
 * them to a key handler.
 *
 * The window is a lazy comparison, not a timer: the buffer records the monotonic
 * time of its last keystroke and the next keystroke decides whether it has
 * expired. Nothing fires while the user is idle, so this module owns no fiber,
 * no scope and no `setTimeout`.
 *
 * `press` and `matchPrefix` are pure, so the suite is deterministic. Menus and
 * the selectable `List` share them, which is why a menu and a list cannot
 * disagree about what "the row matching a typed prefix" means.
 */

import { useCallback, useRef } from "react";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Duration from "effect/Duration";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { monotonicNanos } from "./clock.js";

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

/** Anything type-ahead can search: a label and whether it accepts input. */
export interface TypeaheadItem {
  readonly label: string;
  readonly disabled: boolean;
}

const normalise = (value: string): string => Str.toLowerCase(Str.trim(value));

/**
 * The item a typed prefix selects: the first **enabled** item after `from`
 * whose label starts with `prefix`, wrapping to the first match; `None` when
 * nothing matches or the prefix is empty.
 *
 * "After the current item" is what makes a repeated letter advance instead of
 * staying on the first match.
 */
export const matchPrefix = <Item extends TypeaheadItem>(
  items: ReadonlyArray<Item>,
  from: Option.Option<number>,
  prefix: string,
): Option.Option<Item> => {
  const needle = normalise(prefix);
  if (Str.isEmpty(needle)) return Option.none();

  const candidates = pipe(
    items,
    Arr.map((item, index) => ({
      index,
      item,
      label: normalise(item.label),
    })),
    Arr.filter(
      (candidate) =>
        !candidate.item.disabled &&
        Str.isNonEmpty(candidate.label) &&
        Str.startsWith(needle)(candidate.label),
    ),
  );

  const fromIndex = Option.getOrElse(from, () => -1);

  return pipe(
    Arr.findFirst(candidates, (candidate) => candidate.index > fromIndex),
    Option.orElse(() => Arr.head(candidates)),
    Option.map((candidate) => candidate.item),
  );
};

/**
 * Type-ahead for a list-like collection. The returned handler takes the
 * character from `typedChar`; a miss clears the buffer so the next letter starts
 * a new search.
 */
export const useTypeahead = <Item extends TypeaheadItem>(
  items: ReadonlyArray<Item>,
  from: Option.Option<number>,
  onMatch: (item: Item) => void,
): ((char: string) => void) => {
  // A ref, not state: nothing renders the buffer, and re-rendering on every
  // keystroke would be wasted work.
  const buffer = useRef<TypeaheadBuffer>(idle);
  return useCallback(
    (char: string) => {
      const next = press(buffer.current, char, monotonicNanos());
      Option.match(matchPrefix(items, from, next.text), {
        onNone: () => {
          // The latest letter matched nothing: start a new search rather than
          // poisoning every later keystroke with an unmatched prefix.
          buffer.current = idle;
        },
        onSome: (item) => {
          buffer.current = next;
          onMatch(item);
        },
      });
    },
    [from, items, onMatch],
  );
};
