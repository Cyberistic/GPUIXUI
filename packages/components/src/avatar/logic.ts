/**
 * Avatar initials: the two letters an avatar shows when it has no picture.
 *
 * Pure and unicode-safe. Every rule here is asserted in `logic.test.ts`; the
 * bugs they guard are a code-unit split (which tears an emoji or a surrogate
 * pair in half), a dropped second initial in a hyphenated name, and an empty
 * avatar instead of a visible placeholder.
 */

import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** Whitespace or a hyphen separates the parts of a name. */
const SEPARATORS = /[\s-]+/;

/** The non-empty parts of `name`. */
const parts = (name: string): ReadonlyArray<string> =>
  pipe(Str.trim(name), Str.split(SEPARATORS), Arr.filter(Str.isNonEmpty));

/**
 * The first code point of every part, uppercased. `Arr.fromIterable` walks code
 * points, so an astral character stays whole.
 */
const leadingLetters = (name: string): ReadonlyArray<string> =>
  Arr.getSomes(
    Arr.map(parts(name), (part) =>
      Option.map(Arr.head(Arr.fromIterable(part)), Str.toUpperCase),
    ),
  );

/**
 * Up to two uppercase initials: the first part's letter and the last part's.
 * A single-part name gives one letter, and a name with no letter at all gives
 * `"?"` so an avatar is never blank.
 *
 * @example
 * ```ts
 * initials("Ada Lovelace");   // "AL"
 * initials("Jean-Luc Picard"); // "JP"
 * initials("李 小龙");          // "李小"
 * initials("🎨 Artist");        // "🎨A"
 * initials("  ");              // "?"
 * ```
 */
export const initials = (name: string): string => {
  const letters = leadingLetters(name);
  // `Some` whenever `letters` is non-empty; the `""` fallback keeps the
  // function total without an unreachable branch.
  const last = Option.getOrElse(Arr.last(letters), () => "");

  return Option.match(Arr.head(letters), {
    onNone: () => "?",
    onSome: (first) => (first === last ? first : `${first}${last}`),
  });
};
