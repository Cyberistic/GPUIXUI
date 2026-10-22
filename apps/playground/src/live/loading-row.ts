/**
 * The loading row a paginated history paints at each edge, and the restore it
 * owes when a page arrives while the reader is waiting in it.
 *
 * A `<virtual-list>` anchors on the row at the viewport top. While a page is in
 * flight the reader sits in a **loading void**: a normal row, `EDGE_HEIGHT`
 * tall, standing in for the page that is arriving. The void is therefore the
 * anchor, and the runtime holds it pixel-fixed — the splice puts the page in the
 * space the reader was reading, and the screen is replaced. Only the app knows
 * the void means "the page that just arrived", so it reads `getListScrollTop`
 * before the commit and re-anchors afterwards.
 *
 * The two edges need different arithmetic, measured on 0.11.0 by the
 * `loading-row-correction` live probe and held here so the numbers in that
 * probe are not hand-copied:
 *
 *   - **prepend** — the reader waits in the top void at offset 0. The message
 *     that was under it sat one void height below the viewport top, so it is
 *     anchored with a negative offset that resolves against the freshly
 *     measured rows above it.
 *   - **append** — a list resting at its end reports an `itemIndex` equal to its
 *     row count, gpui's at-end sentinel, because the viewport bottom sits on the
 *     trailing void's bottom. The new page takes the void's place, so the first
 *     new row is pinned where the void's **top edge** was.
 *
 * Native-free on purpose: the rule is testable on a host with no binding.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Smoke } from "@gpuixui/testing";

/** Where the arriving page joins the list. */
export type PageDirection = "prepend" | "append";

/** One message row's drawn height. */
export const ROW_HEIGHT = 40;
/** The loading void's drawn height. */
export const EDGE_HEIGHT = 80;
/** The list's viewport height: four whole rows. */
export const VIEWPORT_HEIGHT = 160;
/** Rows one arriving page adds. */
export const PAGE_ROWS = 2;
/** Message rows the fixture mounts before any page arrives. */
export const MESSAGE_ROWS = 10;
/** The older list's first message id; its pages walk downwards from here. */
export const OLDER_FIRST = 100;
/** The newer list's first message id; its pages append above it. */
export const NEWER_FIRST = 0;

/**
 * The viewport y the top void's first message sits at, `EDGE_HEIGHT` down.
 *
 * The probe's whole claim for a prepend is that this pixel does not move, so it
 * is a named number rather than a literal in the steps.
 */
export const MESSAGE_TOP = EDGE_HEIGHT;
/** The y the bottom void's top edge sits at, in a list resting at its end. */
export const VOID_TOP = VIEWPORT_HEIGHT - EDGE_HEIGHT;
/** The y the row above the bottom void sits at, in a list resting at its end. */
export const READER_TOP = VOID_TOP - ROW_HEIGHT;

/** The message ids a list holds once `page` pages have arrived. */
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

/** The loading void's row index in the list *before* a page arrives. */
export const voidRow = (
  direction: PageDirection,
  messageRows: number,
): number =>
  Match.value(direction).pipe(
    Match.when("prepend", () => 0),
    Match.when("append", () => messageRows),
    Match.exhaustive,
  );

/** The first message id a page adds, so a probe can name the row it pins. */
export const pageFirstId = (direction: PageDirection, page: number): number =>
  Match.value(direction).pipe(
    Match.when("prepend", () => OLDER_FIRST - page * PAGE_ROWS),
    Match.when(
      "append",
      () => NEWER_FIRST + MESSAGE_ROWS + (page - 1) * PAGE_ROWS,
    ),
    Match.exhaustive,
  );

/** A `<virtual-list>` scroll request: the row and the offset inside it. */
export interface ScrollRequest {
  readonly index: number;
  readonly offsetInItem: number;
}

/** What the app saw when the page arrived, plus the list's own geometry. */
export interface PageArrival {
  readonly direction: PageDirection;
  /** `getListScrollTop` read **before** the commit. */
  readonly anchor: Smoke.ListAnchor;
  /** The void's row index before the commit (see `voidRow`). */
  readonly voidRow: number;
  /** Rows the arriving page adds. */
  readonly pageRows: number;
  /** The void's drawn height. */
  readonly edgeHeight: number;
}

/**
 * The re-anchor a page arrival owes, or `None` when the splice already holds
 * the reader.
 *
 * `None` is the common case: once the reader has scrolled away from the void,
 * the anchor is a message row and gpui shifts its index by the inserted rows, so
 * the reader does not move a pixel and a correction would move them twice.
 */
export const loadingRowRestore = (
  arrival: PageArrival,
): Option.Option<ScrollRequest> =>
  Match.value(arrival.direction).pipe(
    Match.when("prepend", () =>
      arrival.anchor.itemIndex === arrival.voidRow
        ? Option.some({
            // The row under the void, after the page joined it.
            index: arrival.voidRow + 1 + arrival.pageRows,
            offsetInItem: arrival.anchor.offsetInItem - arrival.edgeHeight,
          })
        : Option.none<ScrollRequest>(),
    ),
    Match.when("append", () =>
      arrival.anchor.itemIndex >= arrival.voidRow
        ? Option.some({
            // The page's first row takes the void's place.
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
