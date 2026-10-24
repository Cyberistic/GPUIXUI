/**
 * The rows a data surface was handed, read as a list.
 *
 * A surface's rows are data as often as literals: a panel, toolbar, card or
 * builder restored from storage writes `null` where it carried nothing, and a
 * record from an older shape may carry another value there. `.map` over that
 * value threw out of the render and took the rest of the surface down — the
 * title, the toolbar's own controls, the card's reading — where the rule is
 * that a slot with no rows paints no rows.
 *
 * A caller that composes the list by hand still gets it unchanged; only a
 * value that is not a list reads as an empty one.
 *
 * A list is stored data **twice**: the slot can be absent, and an entry inside
 * it can be the hole a store wrote (`[null, { … }]` — a series a release
 * dropped, a record an older shape saved). A part that reads its entries as
 * objects dereferenced one of those and took the surface down with the slot
 * already guarded, so a list of keyed records reads through {@link recordsOf}.
 */

import * as Arr from "effect/Array";
import * as P from "effect/Predicate";

/** The rows a saved surface carries: only a list is a list. */
export const listOf = <A>(
  value: ReadonlyArray<A> | undefined,
): ReadonlyArray<A> => (Arr.isArray(value) ? value : []);

/**
 * The entries of a saved list that are records naming themselves.
 *
 * Every painted entry of a chart — a series, a ring datum, a legend row — is
 * addressed by its `key` and read field by field, so an entry that is not an
 * object carrying one is not an entry: it paints nothing rather than handing
 * the render `undefined` where a name belongs. A caller that composes the list
 * by hand is unaffected.
 */
export const recordsOf = <A extends { readonly key: string }>(
  value: ReadonlyArray<A> | undefined,
): ReadonlyArray<A> =>
  Arr.filter(
    listOf(value),
    (entry) => P.isObject(entry) && P.isString(entry.key),
  );

/**
 * The entries of a saved text list, at their own slots.
 *
 * A category list is stored data like any other: a store that wrote a hole (or
 * a number where a word belongs) still has a **slot** there, and a chart draws
 * a value in every slot its labels name. Filtering the entry away would shift
 * every later value under the wrong label, so an entry that is not text reads
 * as no words at its own slot — the geometry stays aligned and the paint says
 * nothing.
 */
export const textsOf = (
  value: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> =>
  Arr.map(listOf(value), (entry) => (P.isString(entry) ? entry : ""));
