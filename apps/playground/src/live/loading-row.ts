import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Smoke } from "@gpuixui/testing";

export type PageDirection = "prepend" | "append";

export const ROW_HEIGHT = 40;

export const EDGE_HEIGHT = 80;

export const VIEWPORT_HEIGHT = 160;

export const PAGE_ROWS = 2;

export const MESSAGE_ROWS = 10;

export const OLDER_FIRST = 100;

export const NEWER_FIRST = 0;

export const MESSAGE_TOP = EDGE_HEIGHT;

export const VOID_TOP = VIEWPORT_HEIGHT - EDGE_HEIGHT;

export const READER_TOP = VOID_TOP - ROW_HEIGHT;

export const messageIds = (
  direction: PageDirection,
  page: number,
): ReadonlyArray<number> =>
  Match.value(direction).pipe(
    Match.when("prepend", () =>
      Arr.range(OLDER_FIRST - page * PAGE_ROWS, OLDER_FIRST + MESSAGE_ROWS - 1),
    ),
    Match.when("append", () =>
      Arr.range(NEWER_FIRST, NEWER_FIRST + MESSAGE_ROWS - 1 + page * PAGE_ROWS),
    ),
    Match.exhaustive,
  );

export const voidRow = (
  direction: PageDirection,
  messageRows: number,
): number =>
  Match.value(direction).pipe(
    Match.when("prepend", () => 0),
    Match.when("append", () => messageRows),
    Match.exhaustive,
  );

export const pageFirstId = (direction: PageDirection, page: number): number =>
  Match.value(direction).pipe(
    Match.when("prepend", () => OLDER_FIRST - page * PAGE_ROWS),
    Match.when(
      "append",
      () => NEWER_FIRST + MESSAGE_ROWS + (page - 1) * PAGE_ROWS,
    ),
    Match.exhaustive,
  );

export interface ScrollRequest {
  readonly index: number;
  readonly offsetInItem: number;
}

export interface PageArrival {
  readonly direction: PageDirection;

  readonly anchor: Smoke.ListAnchor;

  readonly voidRow: number;

  readonly pageRows: number;

  readonly edgeHeight: number;
}

export const loadingRowRestore = (
  arrival: PageArrival,
): Option.Option<ScrollRequest> =>
  Match.value(arrival.direction).pipe(
    Match.when("prepend", () =>
      arrival.anchor.itemIndex === arrival.voidRow
        ? Option.some({
            index: arrival.voidRow + 1 + arrival.pageRows,
            offsetInItem: arrival.anchor.offsetInItem - arrival.edgeHeight,
          })
        : Option.none<ScrollRequest>(),
    ),
    Match.when("append", () =>
      arrival.anchor.itemIndex >= arrival.voidRow
        ? Option.some({
            index: arrival.voidRow,
            offsetInItem:
              arrival.anchor.itemIndex > arrival.voidRow
                ? arrival.edgeHeight - arrival.anchor.viewportHeight
                : arrival.anchor.offsetInItem,
          })
        : Option.none<ScrollRequest>(),
    ),
    Match.exhaustive,
  );
