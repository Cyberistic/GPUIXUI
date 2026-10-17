/**
 * Collapsing a breadcrumb trail to a maximum number of rendered entries.
 */

import * as Arr from "effect/Array";

/** A rendered breadcrumb entry: an item, or the ellipsis standing in for the rest. */
export type Crumb<A> =
  | { readonly kind: "item"; readonly item: A }
  | { readonly kind: "ellipsis" };

/** Wrap an item as a crumb. */
export const crumb = <A>(item: A): Crumb<A> => ({ kind: "item", item });

const ELLIPSIS: Crumb<never> = { kind: "ellipsis" };

/** Fewer than this cannot show the trail's start, a gap and its end. */
const minimum = 3;

/**
 * The crumbs to render. A trail that fits is returned unchanged; a longer one
 * keeps the first entry, an ellipsis, and the last `maxItems - 2` entries, so
 * the current page is always visible.
 */
export const collapse = <A>(
  items: ReadonlyArray<A>,
  maxItems: number,
): ReadonlyArray<Crumb<A>> => {
  const budget = Math.max(minimum, Math.trunc(maxItems));
  if (Arr.length(items) <= budget) return Arr.map(items, crumb);
  return [
    ...Arr.map(Arr.take(items, 1), crumb),
    ELLIPSIS,
    ...Arr.map(Arr.takeRight(items, budget - 2), crumb),
  ];
};
