/**
 * Type-ahead: the typed prefix and the item it selects.
 *
 * A long list is unusable with the arrows alone, and a desktop select answers a
 * typed prefix by choosing the next matching option. The rule has three parts —
 * which keys count, how long a prefix lives, and which item matches — and all
 * three are pure so they can be proven without a GPUix window.
 *
 * The window is a lazy comparison, not a timer: the buffer records the time of
 * its last keystroke and the next keystroke decides whether it has expired.
 * Nothing fires while the user is idle, so this module owns no fiber, no scope
 * and no `setTimeout`.
 *
 * `packages/components` keeps the same rule privately for menus and its
 * selectable `List`. This module is the shared home (the dependency arrow only
 * points this way); retiring that copy is recorded in `TODO.md`.
 */

import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Duration from "effect/Duration";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The typed prefix and when its last keystroke arrived (monotonic nanos). */
export interface TypeaheadBuffer {
  readonly text: string;
  readonly at: bigint;
}

/** Nothing typed. */
export const EMPTY_TYPEAHEAD: TypeaheadBuffer = { text: "", at: 0n };

/** How long a prefix stays alive after its last keystroke. */
export const TYPEAHEAD_WINDOW: Duration.Duration = Duration.millis(500);

const WINDOW_NANOS = BigInt(Duration.toMillis(TYPEAHEAD_WINDOW)) * 1_000_000n;

/**
 * The facts a key event must supply, structurally.
 *
 * Deliberately not the runtime's own type: this module stays free of
 * `@gpuix/react`, and the component passes its event straight through.
 */
export interface TypeaheadKey {
  /** The key name, e.g. `"e"`, `"enter"`, `"space"`. */
  readonly key?: string;
  /** The produced character, when the runtime reports one (e.g. `"ß"`). */
  readonly keyChar?: string;
  /** Modifier facts, when the runtime reports them. */
  readonly modifiers?: {
    readonly ctrl: boolean;
    readonly alt: boolean;
    readonly cmd: boolean;
  };
  /** A key-repeat event. */
  readonly isHeld?: boolean;
}

const alone = (value: string): boolean =>
  Str.length(value) === 1 && Str.isNonEmpty(Str.trim(value));

/**
 * The character a key event types, or `None` for a key that types nothing.
 *
 * The runtime's `keyChar` is the authority when present (it differs from `key`
 * under modifiers), with `key` as the fallback because 0.10.0's test renderer
 * reports `key: "e"` and no `keyChar` (measured). A character is accepted only
 * when it is exactly one non-blank character: `enter`, `space`, `up`, `f1` and
 * a literal space all type nothing. A held key repeats natively, so accepting it
 * would race the prefix; a chord belongs to the application, not the field.
 */
export const typeaheadChar = (press: TypeaheadKey): Option.Option<string> => {
  const modifiers = press.modifiers;
  if (
    press.isHeld === true ||
    (modifiers !== undefined &&
      (modifiers.ctrl || modifiers.alt || modifiers.cmd))
  ) {
    return Option.none();
  }
  return Option.filter(
    Option.orElse(
      Option.filter(Option.fromNullishOr(press.keyChar), alone),
      () => Option.fromNullishOr(press.key),
    ),
    alone,
  );
};

/**
 * Add one character to the buffer.
 *
 * A keystroke after the window starts a fresh prefix. Repeating the buffer's only
 * letter keeps it as it is, so the match can advance to the next item that
 * starts with that letter — the desktop convention. Otherwise the letter
 * appends. Matching is case-insensitive, so the buffer is stored lower-cased.
 */
export const pressTypeahead = (
  buffer: TypeaheadBuffer,
  char: string,
  now: bigint,
): TypeaheadBuffer => {
  const letter = Str.toLowerCase(char);
  if (Str.isEmpty(buffer.text) || now - buffer.at > WINDOW_NANOS) {
    return { text: letter, at: now };
  }
  const repeating = Arr.every(
    Str.split("")(buffer.text),
    (seen) => seen === letter,
  );
  return repeating
    ? { text: buffer.text, at: now }
    : { text: `${buffer.text}${letter}`, at: now };
};

/** Anything type-ahead can search: a resolved label and whether it accepts input. */
export interface TypeaheadItem {
  readonly label: string;
  readonly disabled: boolean;
}

/** The item a prefix selected, with its position so a caller can advance. */
export interface TypeaheadMatch<Item> {
  readonly item: Item;
  readonly index: number;
}

const normalise = (value: string): string => Str.toLowerCase(Str.trim(value));

/**
 * The item a typed prefix selects: the first **enabled** item after `from`
 * whose label starts with `prefix`, wrapping to the first match; `None` when
 * nothing matches or the prefix says nothing.
 *
 * "After the current item" is what makes a repeated letter advance instead of
 * staying on the first match. Blank labels are skipped so an unnamed row can
 * never be chosen by a prefix it does not show.
 */
export const matchTypeahead = <Item extends TypeaheadItem>(
  items: ReadonlyArray<Item>,
  from: Option.Option<number>,
  prefix: string,
): Option.Option<TypeaheadMatch<Item>> => {
  const needle = normalise(prefix);
  if (Str.isEmpty(needle)) return Option.none();

  const candidates = pipe(
    items,
    Arr.map((item, index) => ({
      item,
      index,
      label: normalise(item.label),
    })),
    Arr.filter(
      (candidate) =>
        !candidate.item.disabled &&
        Str.isNonEmpty(candidate.label) &&
        Str.startsWith(needle)(candidate.label),
    ),
  );

  const after = Option.getOrElse(from, () => -1);

  return pipe(
    Arr.findFirst(candidates, (candidate) => candidate.index > after),
    Option.orElse(() => Arr.head(candidates)),
    Option.map((candidate) => ({
      item: candidate.item,
      index: candidate.index,
    })),
  );
};
