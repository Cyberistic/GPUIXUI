/**
 * Avatar initials and presence state: the two letters an avatar shows when it
 * has no picture, and the dot's finite set of names.
 *
 * Pure and unicode-safe. Every rule here is asserted in `logic.test.ts`; the
 * bugs they guard are a code-unit split (which tears an emoji or a surrogate
 * pair in half), a dropped second initial in a hyphenated name, an empty
 * avatar instead of a visible placeholder, and a stored presence state the
 * union does not name reaching an exhaustive match.
 */

import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

/** The presence states an avatar announces. */
export const AVATAR_STATUSES = ["online", "away", "busy", "offline"] as const;

/** The presence states an avatar announces. */
export const AvatarStatus = Schema.Literals(AVATAR_STATUSES);
/** The presence states an avatar announces. */
export type AvatarStatus = typeof AvatarStatus.Type;

/**
 * Whether a stored value is a presence state this avatar paints.
 *
 * `status` can arrive from persisted UI state, so a name a later release
 * dropped must read as no dot rather than throwing out of the render.
 */
export const isAvatarStatus = Schema.is(AvatarStatus);

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
