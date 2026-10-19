/**
 * The page list a pagination control renders: which page numbers are shown and
 * where an ellipsis stands in for the ones that are not.
 *
 * The shape follows shadcn/ui: cropping keeps a stable width around the current
 * page rather than a window that grows at the edges, so the control does not
 * jump in size as the user pages through.
 */

import * as Arr from "effect/Array";
import * as Num from "effect/Number";
import { wholeCap } from "../internal/count.js";

/** A rendered entry in the page list. */
export type PageItem =
  | { readonly kind: "page"; readonly page: number }
  | { readonly kind: "ellipsis"; readonly side: "start" | "end" };

/** A whole page count: non-negative, and a non-finite input is zero. */
export const pageCountOf = (raw: number): number =>
  Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0;

/** The current page: whole, at least 1, at most the whole count. */
export const currentPageOf = (raw: number, pageCount: number): number =>
  Num.clamp({ minimum: 1, maximum: pageCount })(Math.trunc(raw));

/** Input to {@link pageWindow}. */
export interface PageWindowInput {
  /** The current page, 1-based. Truncated and clamped into range. */
  readonly page: number;
  /** How many pages exist, truncated. Zero, fewer or non-finite yields an empty list. */
  readonly pageCount: number;
  /** Pages shown either side of the current one. Default 1; a non-finite value means no crop. */
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

const pages = (from: number, to: number): ReadonlyArray<PageItem> =>
  Arr.map(Arr.range(from, Math.max(from, to)), page);

/**
 * The entries to render, ascending, with no repeated page and always including
 * the current page. A list that fits (`2 * siblingCount + 5` or fewer pages) is
 * rendered in full.
 */
export const pageWindow = ({
  page: rawPage,
  pageCount: rawPageCount,
  siblingCount = 1,
  showEdges = true,
}: PageWindowInput): ReadonlyArray<PageItem> => {
  const pageCount = pageCountOf(rawPageCount);
  if (pageCount === 0) return [];

  const current = currentPageOf(rawPage, pageCount);
  const siblings = wholeCap(siblingCount);
  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, pageCount);

  if (!showEdges) return pages(left, right);
  if (2 * siblings + 5 >= pageCount) return pages(1, pageCount);

  const showStart = left > 2;
  const showEnd = right < pageCount - 2;

  if (showStart && showEnd) {
    return [
      page(1),
      // A gap that stands for one page is not worth an ellipsis: render the
      // page so the user need not page through a marker to reach a neighbour.
      left === 3 ? page(2) : ellipsis("start"),
      ...pages(left, right),
      ellipsis("end"),
      page(pageCount),
    ];
  }
  if (showStart) {
    return [
      page(1),
      ellipsis("start"),
      ...pages(Math.max(pageCount - (2 + 2 * siblings), 2), pageCount),
    ];
  }
  return [
    ...pages(1, Math.min(3 + 2 * siblings, pageCount - 2)),
    ellipsis("end"),
    page(pageCount),
  ];
};
