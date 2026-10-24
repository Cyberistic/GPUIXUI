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
 */

import * as Arr from "effect/Array";

/** The rows a saved surface carries: only a list is a list. */
export const listOf = <A>(
  value: ReadonlyArray<A> | undefined,
): ReadonlyArray<A> => (Arr.isArray(value) ? value : []);
