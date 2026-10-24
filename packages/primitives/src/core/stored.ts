/**
 * Reading the shapes a store hands back.
 *
 * A list or a string reaches a component from storage as often as from a
 * literal, and JSON keeps a field a record never set as `null` — not
 * `undefined`. A prop's type describes the working shape, while the value at
 * the boundary is whatever the decoder produced, so the reads every component
 * shares live here.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";

/** A stored string, or absence for a value that is not text. */
export const storedText = (value: unknown): string | undefined =>
  P.isString(value) ? value : undefined;

/**
 * A stored list, read structurally.
 *
 * Only a real array is a list: a field a store wrote as absent (`null`, or an
 * object from an older shape) carries no entries, and `Arr.map`/`Arr.reduce`
 * over it threw `Cannot read properties of null (reading 'length')` out of the
 * render. An entry the reader cannot use is dropped rather than hiding the
 * rest, so one deleted record does not empty a saved picker.
 */
export const storedList = <A>(
  value: unknown,
  read: (entry: unknown) => Option.Option<A>,
): ReadonlyArray<A> =>
  Arr.isArray(value) ? Arr.getSomes(Arr.map(value, read)) : [];

/**
 * A stored list of strings, or absence when the value is not a list.
 *
 * A selection is saved with the control that made it, and a record written by
 * another release can hold a map (`{ email: true }`) where this one writes a
 * list. A list keeps only its text entries; anything else is **absence**, so a
 * controlled control stays uncontrolled rather than being pinned to an empty
 * choice nobody made.
 */
export const storedTextList = (
  value: unknown,
): Option.Option<ReadonlyArray<string>> =>
  Arr.isArray(value)
    ? Option.some(Arr.filter(value, P.isString))
    : Option.none();

/**
 * A stored number, or absence for a value that is not one.
 *
 * A measurement a store keeps — a bar's share, a count, a pixel size — comes back
 * as whatever the record carried. Text is not a number this library coerces
 * (`parseNumberText` is the one seam that reads text as a number, and it is
 * explicit about it), so `"42"` is absence and only a real number is a
 * measurement. What a *number* then means — `NaN`'s share, `Infinity`'s
 * position — is the arithmetic's decision, made once by the seam that paints it.
 */
export const storedNumber = (value: unknown): Option.Option<number> =>
  typeof value === "number" ? Option.some(value) : Option.none();
