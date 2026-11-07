import * as Arr from "effect/Array";

export type Crumb<A> =
  | { readonly kind: "item"; readonly item: A }
  | { readonly kind: "ellipsis" };

export const crumb = <A>(item: A): Crumb<A> => ({ kind: "item", item });

const ELLIPSIS: Crumb<never> = { kind: "ellipsis" };

const minimum = 3;

export const collapse = <A>(
  items: ReadonlyArray<A>,
  requested: number,
): ReadonlyArray<Crumb<A>> => {
  const maxItems = Number.isNaN(requested) ? minimum : requested;
  const budget = Math.max(minimum, Math.trunc(maxItems));
  if (Arr.length(items) <= budget) return Arr.map(items, crumb);
  return [
    ...Arr.map(Arr.take(items, 1), crumb),
    ELLIPSIS,
    ...Arr.map(Arr.takeRight(items, budget - 2), crumb),
  ];
};
