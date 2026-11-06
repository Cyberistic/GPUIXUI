import type { PaginationState } from "@tanstack/table-core";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";

export const ALL_ROWS = Number.POSITIVE_INFINITY;

export const DEFAULT_PAGINATION: PaginationState = {
  pageIndex: 0,
  pageSize: ALL_ROWS,
};

const StoredPage = Schema.Record(Schema.String, Schema.Unknown);

const decodeStoredPage = Schema.decodeUnknownOption(StoredPage);

const storedField = (stored: unknown, key: string): unknown =>
  Option.match(decodeStoredPage(stored), {
    onNone: () => undefined,
    onSome: (record) => Option.getOrUndefined(R.get(record, key)),
  });

export const pageIndexOf = (value: unknown): number =>
  P.isNumber(value) && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : DEFAULT_PAGINATION.pageIndex;

export const pageSizeOf = (value: unknown): number =>
  P.isNumber(value) && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : ALL_ROWS;

export const pageCountOf = (rowCount: number, pageSize: number): number => {
  const rows =
    Number.isFinite(rowCount) && rowCount > 0 ? Math.floor(rowCount) : 0;
  const size = pageSizeOf(pageSize);
  return size === ALL_ROWS ? 1 : Math.max(1, Math.ceil(rows / size));
};

export const clampPageIndex = (
  pageIndex: number,
  rowCount: number,
  pageSize: number,
): number =>
  Math.min(pageIndexOf(pageIndex), pageCountOf(rowCount, pageSize) - 1);

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

export const readPagination = (stored: unknown): PaginationState => ({
  pageIndex: pageIndexOf(storedField(stored, "pageIndex")),
  pageSize: pageSizeOf(storedField(stored, "pageSize")),
});
