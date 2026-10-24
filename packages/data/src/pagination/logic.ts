/**
 * The page a grid paints: a window of the filtered, sorted rows.
 *
 * Pagination is a **view**, like a filter and a sort. The query, the order and
 * the chosen ids are the core's state; a page names which slice of the kept set
 * paints. The arithmetic is here so a store-driven grid reads the same numbers
 * the controller writes, and so the edge cases are pure functions a test can
 * hold.
 *
 * Two of those edges are data rather than literals:
 *
 * - a **page size** is a stored preference as often as a literal, and JSON has
 *   no `Infinity`: a grid saved with every row on one page writes `null`, which
 *   reads back as every row. A size the grid cannot lay out — `NaN`, zero, a
 *   negative, text — is that same one page, because a grid that paints no row
 *   per page paints nothing at all.
 * - a **page index** outlives the set it was measured against: a saved
 *   workspace reopens with the page it was on, and a filter can leave ten rows
 *   where the reader was on page six. The index is clamped to the last page the
 *   set holds, so a narrowed grid paints its rows instead of a blank page past
 *   the end.
 */

import type { PaginationState } from "@tanstack/table-core";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";

/**
 * The page size that puts every row on one page.
 *
 * It is the shipped default: a grid that names no page size paints the whole
 * kept set, which is the table every earlier release shipped.
 */
export const ALL_ROWS = Number.POSITIVE_INFINITY;

/** The page a grid opens on, and the page an unreadable record means. */
export const DEFAULT_PAGINATION: PaginationState = {
  pageIndex: 0,
  pageSize: ALL_ROWS,
};

/** A record a store wrote, read as its keys and whatever they carry. */
const StoredPage = Schema.Record(Schema.String, Schema.Unknown);

const decodeStoredPage = Schema.decodeUnknownOption(StoredPage);

/** One field of a stored page, or absence when the store wrote no record. */
const storedField = (stored: unknown, key: string): unknown =>
  Option.match(decodeStoredPage(stored), {
    onNone: () => undefined,
    onSome: (record) => Option.getOrUndefined(R.get(record, key)),
  });

/**
 * A page index the grid can position: a whole, non-negative number.
 *
 * A stored `-1`, a fraction or text is the first page, because a page index is
 * a position in a list the grid paints from its start. `NaN` is not a page.
 */
export const pageIndexOf = (value: unknown): number =>
  P.isNumber(value) && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : DEFAULT_PAGINATION.pageIndex;

/**
 * A page size the grid can lay out: a whole number of rows, else every row.
 *
 * The `null` a JSON store keeps for `Infinity` reads as every row, the same
 * size it wrote; zero, a negative, a fraction below one and text are no page
 * size at all, so they take the default rather than dividing by nothing.
 */
export const pageSizeOf = (value: unknown): number =>
  P.isNumber(value) && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : ALL_ROWS;

/**
 * How many pages a set holds.
 *
 * The count is never zero: a set with no row still paints one page, which is
 * the page its empty state sits on. A size of every row is one page.
 */
export const pageCountOf = (rowCount: number, pageSize: number): number => {
  const rows =
    Number.isFinite(rowCount) && rowCount > 0 ? Math.floor(rowCount) : 0;
  const size = pageSizeOf(pageSize);
  return size === ALL_ROWS ? 1 : Math.max(1, Math.ceil(rows / size));
};

/**
 * The page a set can paint, from the page it was asked for.
 *
 * A saved index past the end of a narrowed set clamps to its last page — the
 * rule `clampScrollOffset` applies one model later, for the same reason: the
 * offset (or index) belongs to the set it was measured against.
 */
export const clampPageIndex = (
  pageIndex: number,
  rowCount: number,
  pageSize: number,
): number =>
  Math.min(pageIndexOf(pageIndex), pageCountOf(rowCount, pageSize) - 1);

/**
 * The page a new page size leaves the reader on.
 *
 * A size change keeps the reader's **top row** in view: the row at the top of
 * the current page is the one the new page index is measured from, so doubling
 * a page size shows the same records from the same first row instead of a
 * window somewhere else. Every row on one page has no top row to keep, so it
 * opens at the first page; a size that changes to every row does the same.
 */
export const withPageSize = (
  current: PaginationState,
  pageSize: unknown,
): PaginationState => {
  const size = pageSizeOf(pageSize);
  const top =
    pageSizeOf(current.pageSize) === ALL_ROWS
      ? 0
      : pageIndexOf(current.pageIndex) * pageSizeOf(current.pageSize);
  return {
    pageIndex: size === ALL_ROWS ? 0 : Math.floor(top / size),
    pageSize: size,
  };
};

/**
 * The page a store handed back, read as the shape the core takes.
 *
 * The record is written by {@link gridConfig} under the core's own names
 * (`pageIndex`, `pageSize`), so a saved workspace reopens on the page the
 * reader left. A record this release cannot read is the first page of every
 * row, never a page past the end.
 */
export const readPagination = (stored: unknown): PaginationState => ({
  pageIndex: pageIndexOf(storedField(stored, "pageIndex")),
  pageSize: pageSizeOf(storedField(stored, "pageSize")),
});
