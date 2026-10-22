/**
 * Type-ahead: the typed prefix, the row it selects, and the character a
 * keystroke types.
 *
 * The window is a lazy comparison, not a timer: the buffer records the
 * millisecond of its last keystroke and the next keystroke decides whether it
 * has expired. Nothing fires while the user is idle, so this module owns no
 * fiber, no scope and no `setTimeout`.
 *
 * The rule is **published** at `@gpuixui/components/typeahead`, because a
 * selectable list, a menu and a tree must not disagree about what a typed
 * prefix means. A surface that owns its own rows maps them onto
 * {@link TypeaheadItem}, asks {@link typeaheadMatchIndex} for a position and
 * keeps its own row type — no second copy of the window, the repeat rule or the
 * character rule.
 */

import type { EventPayload } from "@gpuix/react";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Duration from "effect/Duration";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useCallback, useRef } from "react";
import { monotonicNanos } from "./internal/clock.js";

/** The typed prefix and when its last keystroke arrived (milliseconds). */
export interface TypeaheadBuffer {
  readonly text: string;
  readonly at: number;
}

/** Nothing typed. */
export const idleTypeahead: TypeaheadBuffer = { text: "", at: 0 };

/** How long a prefix stays alive. */
export const typeaheadWindow: Duration.Duration = Duration.millis(500);

/** {@link typeaheadWindow} as the milliseconds {@link typeaheadPress} reads. */
export const typeaheadWindowMs: number = Duration.toMillis(typeaheadWindow);

/** The clock a keystroke records, in whole milliseconds. */
export const typeaheadNowMs = (): number =>
  Number(monotonicNanos() / 1_000_000n);

/**
 * Add one character to the buffer.
 *
 * A keystroke after the window starts a fresh prefix. Repeating the buffer's
 * only letter keeps it as it is, so the match can advance to the next row that
 * starts with that letter — the desktop convention. Otherwise the letter
 * appends. Matching is case-insensitive, so the buffer is stored lower-cased.
 *
 * An unreadable clock cannot answer "has the window passed", so it starts a
 * fresh prefix rather than letting a stale one grow forever.
 */
export const typeaheadPress = (
  buffer: TypeaheadBuffer,
  char: string,
  now: number,
): TypeaheadBuffer => {
  const letter = Str.toLowerCase(char);
  if (
    buffer.text === "" ||
    !Number.isFinite(now) ||
    now - buffer.at > typeaheadWindowMs
  ) {
    return { text: letter, at: Number.isFinite(now) ? now : 0 };
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
 * The position a typed prefix selects: the first **enabled** item after `from`
 * whose label starts with `prefix`, wrapping to the first match; `None` when
 * nothing matches or the prefix is empty.
 *
 * "After the current item" is what makes a repeated letter advance instead of
 * staying on the first match. A position rather than an item is what lets a
 * surface with its own row type (a tree keyed by string, a table keyed by
 * column) use the same rule.
 */
export const typeaheadMatchIndex = <Item extends TypeaheadItem>(
  items: ReadonlyArray<Item>,
  from: Option.Option<number>,
  prefix: string,
): Option.Option<number> => {
  const needle = normalise(prefix);
  if (Str.isEmpty(needle)) return Option.none();

  const fromIndex = Option.getOrElse(from, () => -1);

  return pipe(
    items,
    Arr.map((item, index) => ({ index, item, label: normalise(item.label) })),
    Arr.filter(
      (candidate) =>
        !candidate.item.disabled &&
        Str.isNonEmpty(candidate.label) &&
        Str.startsWith(needle)(candidate.label),
    ),
    (candidates) =>
      pipe(
        Arr.findFirst(candidates, (candidate) => candidate.index > fromIndex),
        Option.orElse(() => Arr.head(candidates)),
        Option.map((candidate) => candidate.index),
      ),
  );
};

/** The item {@link typeaheadMatchIndex} selects. */
export const typeaheadMatch = <Item extends TypeaheadItem>(
  items: ReadonlyArray<Item>,
  from: Option.Option<number>,
  prefix: string,
): Option.Option<Item> =>
  Option.flatMap(typeaheadMatchIndex(items, from, prefix), (index) =>
    Arr.get(items, index),
  );

/**
 * The character a keystroke types, or `None` for a shortcut, a named key or Space.
 *
 * `key` decides whether this is text: one character for letters, digits and
 * punctuation, a word (`"enter"`, `"space"`, `"down"`) otherwise. `keyChar`
 * supplies the shifted form. Measured in the real renderer: `Enter` carries
 * `keyChar: "\n"`, so testing `keyChar` alone would type a newline instead of
 * activating the row.
 */
export const typedChar = (event: EventPayload): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(event.keyChar),
    Option.filter(
      (char) =>
        char.length === 1 &&
        char !== " " &&
        Option.exists(
          Option.fromNullishOr(event.key),
          (key) =>
            key.length === 1 &&
            event.modifiers?.cmd !== true &&
            event.modifiers?.ctrl !== true &&
            event.modifiers?.alt !== true,
        ),
    ),
  );

/**
 * Type-ahead for a list-like collection. The returned handler takes the
 * character from {@link typedChar}; a miss clears the buffer so the next letter
 * starts a new search.
 */
export const useTypeahead = <Item extends TypeaheadItem>(
  items: ReadonlyArray<Item>,
  from: Option.Option<number>,
  onMatch: (item: Item) => void,
): ((char: string) => void) => {
  // A ref, not state: nothing renders the buffer, and re-rendering on every
  // keystroke would be wasted work.
  const buffer = useRef<TypeaheadBuffer>(idleTypeahead);
  return useCallback(
    (char: string) => {
      const next = typeaheadPress(buffer.current, char, typeaheadNowMs());
      Option.match(typeaheadMatch(items, from, next.text), {
        onNone: () => {
          // The latest letter matched nothing: start a new search rather than
          // poisoning every later keystroke with an unmatched prefix.
          buffer.current = idleTypeahead;
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
