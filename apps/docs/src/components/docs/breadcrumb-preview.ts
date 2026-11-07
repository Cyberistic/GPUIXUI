export interface Crumb {
  readonly label: string;
  readonly current?: boolean;
}

export type CrumbEntry =
  | { readonly kind: "item"; readonly item: Crumb }
  | { readonly kind: "ellipsis" };

export const MIN_VISIBLE = 3;

const item = (entry: Crumb): CrumbEntry => ({ kind: "item", item: entry });

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

export const CRUMBS: ReadonlyArray<Crumb> = [
  { label: "Projects" },
  { label: "GPUIXUI" },
  { label: "packages" },
  { label: "components" },
  { label: "src" },
  { label: "breadcrumb.tsx", current: true },
];

export const BUDGETS = [MIN_VISIBLE, 4, 5] as const;

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

export const separatorCount = (entries: ReadonlyArray<CrumbEntry>): number =>
  Math.max(0, entries.length - 1);
