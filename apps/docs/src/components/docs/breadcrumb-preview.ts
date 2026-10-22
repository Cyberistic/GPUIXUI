/**
 * The breadcrumb preview's collapse rule and the trail it collapses.
 *
 * `maxItems` keeps the first entry, an ellipsis and the last `maxItems - 2`
 * entries, so the current page is always visible and a budget below 3 is
 * clamped. The rule is the component's (`packages/components/src/breadcrumb/logic.ts`);
 * a drawing cannot show whether a hidden entry took its separator with it, so
 * `breadcrumb-preview.test.ts` holds this copy to the component's own function.
 */

/** One entry a trail shows: a link, or the current page. */
export interface Crumb {
  readonly label: string;
  readonly current?: boolean;
}

/** A rendered entry: an item, or the ellipsis standing in for the hidden middle. */
export type CrumbEntry =
  | { readonly kind: "item"; readonly item: Crumb }
  | { readonly kind: "ellipsis" };

/** Fewer than this cannot show the trail's start, a gap and its end. */
export const MIN_VISIBLE = 3;

const item = (entry: Crumb): CrumbEntry => ({ kind: "item", item: entry });

/**
 * The entries to render at a budget.
 *
 * A trail that fits is returned unchanged; a longer one keeps its first entry,
 * an ellipsis, and the tail — so the current page never collapses away.
 */
export const collapseCrumbs = (
  items: ReadonlyArray<Crumb>,
  maxItems: number,
): ReadonlyArray<CrumbEntry> => {
  const budget = Math.max(MIN_VISIBLE, Math.trunc(maxItems));
  if (items.length <= budget) return items.map(item);
  const head = items.slice(0, 1).map(item);
  const tail = items.slice(items.length - (budget - 2)).map(item);
  return [...head, { kind: "ellipsis" }, ...tail];
};

/** The file the workflow preview is looking at: six entries deep. */
export const CRUMBS: ReadonlyArray<Crumb> = [
  { label: "Projects" },
  { label: "GPUIXUI" },
  { label: "packages" },
  { label: "components" },
  { label: "src" },
  { label: "breadcrumb.tsx", current: true },
];

/** The collapse budgets the workflow control offers, plus "all". */
export const BUDGETS = [MIN_VISIBLE, 4, 5] as const;

/** What a click on a crumb reports: the trail above it, joined by `/`. */
export const openLabel = (
  items: ReadonlyArray<Crumb>,
  index: number,
): string => {
  const target = items[index];
  if (target === undefined) return "Nothing to open";
  const path = items
    .slice(0, index + 1)
    .map((entry) => entry.label)
    .join(" / ");
  return `Open ${path}`;
};

/** How many separators a rendered trail draws: one before every entry but the first. */
export const separatorCount = (entries: ReadonlyArray<CrumbEntry>): number =>
  Math.max(0, entries.length - 1);
