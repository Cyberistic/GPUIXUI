import * as Arr from "effect/Array";

export type PageItem =
  | { readonly kind: "page"; readonly page: number }
  | { readonly kind: "ellipsis"; readonly side: "start" | "end" };

export interface PageWindowInput {
  readonly page: number;

  readonly pageCount: number;

  readonly siblingCount?: number;

  readonly showEdges?: boolean;
}

const page = (value: number): PageItem => ({ kind: "page", page: value });

const ellipsis = (side: "start" | "end"): PageItem => ({
  kind: "ellipsis",
  side,
});

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

const countable = (value: number, fallback: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : fallback;

export const paginationRange = (
  page: number,
  pageCount: number,
): { readonly current: number; readonly pageCount: number } => {
  const count = countable(pageCount, 0);
  return {
    current:
      count === 0
        ? 1
        : clamp(Number.isFinite(page) ? Math.trunc(page) : 1, 1, count),
    pageCount: count,
  };
};

const pages = (from: number, to: number): ReadonlyArray<PageItem> =>
  Arr.map(Arr.range(from, Math.max(from, to)), page);

const between = (
  low: number,
  high: number,
  side: "start" | "end",
): ReadonlyArray<PageItem> => {
  const hidden = high - low - 1;
  if (hidden <= 0) return [];
  if (hidden === 1) return [page(low + 1)];
  return [ellipsis(side)];
};

export const pageWindow = ({
  page: rawPage,
  pageCount: rawPageCount,
  siblingCount: rawSiblingCount = 1,
  showEdges = true,
}: PageWindowInput): ReadonlyArray<PageItem> => {
  const { current, pageCount } = paginationRange(rawPage, rawPageCount);
  if (pageCount === 0) return [];

  const siblings = countable(rawSiblingCount, 1);
  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, pageCount);

  if (!showEdges) return pages(left, right);
  if (siblings + 5 >= pageCount) return pages(1, pageCount);

  const showStart = left > 2;
  const showEnd = right < pageCount - 2;

  if (showStart && showEnd) {
    return [
      page(1),
      ...between(1, left, "start"),
      ...pages(left, right),
      ...between(right, pageCount, "end"),
      page(pageCount),
    ];
  }
  if (showStart) {
    const from = Math.max(pageCount - (2 + 2 * siblings), 2);
    return [page(1), ...between(1, from, "start"), ...pages(from, pageCount)];
  }
  const to = Math.min(3 + 2 * siblings, pageCount - 2);
  return [...pages(1, to), ...between(to, pageCount, "end"), page(pageCount)];
};
