/**
 * The page list a pagination control renders: which page numbers are shown and
 * where an ellipsis stands in for the ones that are not.
 *
 * The shape follows shadcn/ui: cropping keeps a stable width around the current
 * page rather than a window that grows at the edges, so the control does not
 * jump in size as the user pages through.
 *
 * An ellipsis is only worth its width when it stands for **two or more** pages:
 * one hidden page is rendered as itself, because the number and the ellipsis
 * occupy the same slot and the number is one press closer. That also means a
 * crop that would hide a single page collapses into the full trail.
 */

import * as Arr from "effect/Array";

/** A rendered entry in the page list. */
export type PageItem =
  | { readonly kind: "page"; readonly page: number }
  | { readonly kind: "ellipsis"; readonly side: "start" | "end" };

/** Input to {@link pageWindow}. */
export interface PageWindowInput {
  /** The current page, 1-based. Clamped into range. */
  readonly page: number;
  /** How many pages exist. Zero or fewer yields an empty list. */
  readonly pageCount: number;
  /** Pages shown either side of the current one. Default 1. */
  readonly siblingCount?: number;
  /** Always show the first and last page. Default true. */
  readonly showEdges?: boolean;
}

const page = (value: number): PageItem => ({ kind: "page", page: value });

/** `side` is where the ellipsis sits relative to the current page. */
const ellipsis = (side: "start" | "end"): PageItem => ({
  kind: "ellipsis",
  side,
});

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

/** A count as a whole number a list can render, or `fallback` when unreadable. */
const countable = (value: number, fallback: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : fallback;

/**
 * The page and count a control paints.
 *
 * A count is often arithmetic over a response (`Math.ceil(total / pageSize)`),
 * and a measurement that never arrived reaches a caller as `NaN`: a list built
 * from that count would paint the string `NaN` or an unbounded trail. A count
 * the component cannot read is no count at all, and a page it cannot read is
 * the first one.
 */
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

/**
 * What stands in for the pages strictly between `low` and `high` (both shown):
 * nothing when there are none, the page itself when there is one, an ellipsis
 * otherwise. Every branch of the window goes through here, so an ellipsis can
 * never be drawn over a gap that is empty or a single page wide.
 */
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

/**
 * The entries to render, ascending, with no repeated page and always including
 * the current page. A list that fits (`siblingCount + 5` or fewer pages) is
 * rendered in full.
 */
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
