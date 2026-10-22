/**
 * `search-virtual-document` — the offset a find bar must carry into a
 * virtualized document.
 *
 * `search-highlights` measured a `highlight` spec against three plain lines. A
 * find bar over a log, a code editor or a data grid searches a document the
 * runtime never holds: a `<virtual-list>` mounts a window of its rows, so native
 * can only number the matches inside that window, and `activeIndex` would mean
 * "the nth match on screen" instead of "the nth match in the document".
 * `matchIndexOffset` is the published answer — a **match** count per row, not a
 * row index, because rows hold different numbers of matches.
 *
 * 400 rows of 24px in a 200px viewport, each built with zero, one or two
 * occurrences of the query. Measured on 0.11.0:
 *
 *   - the app's count (`findRanges` over every row) is the document's, while
 *     `getPaintedHighlights()` reports only the mounted window's washes, so the
 *     two numbers differ and the runtime cannot number the rest;
 *   - a cursor in a row the reader has not reached paints no active wash without
 *     the offset, and the **row index** used as one (320 for a match at 541)
 *     leaves the cursor invisible too;
 *   - `row.offset` + the global `activeIndex` marks exactly the named match, and
 *     an off-by-one offset marks the match **before** it — the wash is a match
 *     count compared arithmetically, not a row looked up;
 *   - a negative or fractional offset drops the whole spec, so a bad offset
 *     removes the washes rather than mis-numbering them;
 *   - replace-all rewrites every occurrence (the count over the unmounted rows
 *     is the evidence), clears the washes, and the replacement can be searched
 *     as the matches were.
 */
import { useRef, useState } from "react";
import { findRanges, useGpuix } from "@gpuix/react";
import type { HighlightSpec, PublicInstance } from "@gpuix/react";
import { Effect, Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";
import {
  LATE_ROW,
  QUERY,
  REPLACEMENT,
  ROWS,
  ROW_HEIGHT,
  VIEWPORT,
  documentRows,
  lateMatchIndex,
  locateMatch,
  replaceMatches,
  rowText,
  totalMatches,
  type IndexedRow,
} from "./find-document.js";

/**
 * How each row numbers the matches it holds.
 *
 * `match` is the documented composition. The other three are the ways a find bar
 * gets it wrong, and the probe measures what each one paints: `row` is the
 * tempting "a row is a match" shortcut, `previous` is an off-by-one prefix sum,
 * and `invalid` is a value the runtime must refuse.
 */
type OffsetMode = "match" | "row" | "previous" | "invalid";

/** The offset a row hands the runtime in `mode`. */
const offsetOf = (row: IndexedRow, mode: OffsetMode): number =>
  Match.value(mode).pipe(
    Match.when("match", () => row.offset),
    Match.when("row", () => row.index),
    Match.when("previous", () => row.offset + 1),
    Match.when("invalid", () => -1),
    Match.exhaustive,
  );

/** The mode the offset button switches to. */
const nextMode = (mode: OffsetMode): OffsetMode =>
  Match.value(mode).pipe(
    Match.when("match", () => "row" as const),
    Match.when("row", () => "previous" as const),
    Match.when("previous", () => "invalid" as const),
    Match.when("invalid", () => "match" as const),
    Match.exhaustive,
  );

/** The spec a row declares, or `undefined` when the row holds no match. */
const highlightOf = (
  row: IndexedRow,
  query: string,
  active: number,
  mode: OffsetMode,
): HighlightSpec | undefined => {
  const ranges = findRanges({ text: row.text, query });
  if (query === "" || ranges.length === 0) return undefined;
  return {
    ranges,
    activeIndex: active < 0 ? undefined : active,
    matchIndexOffset: offsetOf(row, mode),
  };
};

const SearchVirtualProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const list = useRef<PublicInstance | null>(null);
  const [rows, setRows] = useState(documentRows);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [mode, setMode] = useState<OffsetMode>("match");

  // The find bar's count is the document's, not the mount window's: the runtime
  // only numbers what it paints, so the app counts with `findRanges`.
  const total =
    query === ""
      ? 0
      : Arr.reduce(
          rows,
          0,
          (sum, row) => sum + findRanges({ text: row.text, query }).length,
        );
  const located = locateMatch(rows, active);
  const activeOffset = Option.flatMap(located, (at) =>
    Option.map(Arr.get(rows, at.row), (row) => offsetOf(row, mode)),
  );

  const reveal = (index: number): void => {
    const id = list.current?.id;
    if (id != null) renderer?.scrollToItem?.(id, index);
  };

  const button = (testId: string, label: string, onClick: () => void) => (
    <Pressable testId={testId} onClick={onClick}>
      <text style={{ color: theme.colors.foreground }}>{label}</text>
    </Pressable>
  );

  const readout = Arr.join(
    [
      `query=${query}`,
      `total=${total}`,
      `active=${active}`,
      `row=${Option.match(located, { onNone: () => "none", onSome: (at) => `${at.row}` })}`,
      `local=${Option.match(located, { onNone: () => "none", onSome: (at) => `${at.local}` })}`,
      `offset=${Option.match(activeOffset, {
        onNone: () => "none",
        onSome: (value) => `${mode}:${value}`,
      })}`,
    ],
    " ",
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: 460,
        height: VIEWPORT + 96,
      }}
    >
      <div style={{ display: "flex", gap: 6 }}>
        {button("find-open", "find", () => {
          setQuery(QUERY);
          setActive(-1);
        })}
        {button("find-next", "next", () =>
          setActive((current) =>
            total === 0
              ? -1
              : current < 0 || current + 1 >= total
                ? 0
                : current + 1,
          ),
        )}
        {button("find-late", "far match", () => {
          setQuery(QUERY);
          setActive(lateMatchIndex(rows));
          reveal(LATE_ROW);
        })}
        {button("find-mode", "offset", () => setMode(nextMode))}
        {button("find-replace", "replace all", () => {
          setRows((current) => replaceMatches(current, query, REPLACEMENT));
          setActive(-1);
        })}
        {button("find-fixed", "find fixed", () => {
          setQuery(REPLACEMENT);
          setActive(-1);
        })}
      </div>
      <Readout testId="find-readout">{readout}</Readout>
      <div testId="find-frame" style={{ height: VIEWPORT, display: "flex" }}>
        <virtual-list
          testId="find-list"
          ref={list}
          style={{ flexGrow: 1, minHeight: 0 }}
        >
          {Arr.map(rows, (row) => (
            <div
              key={row.id}
              testId={row.id}
              highlight={highlightOf(row, query, active, mode)}
              style={{ height: ROW_HEIGHT, paddingLeft: 4 }}
            >
              <text style={{ color: theme.colors.foreground }}>{row.text}</text>
            </div>
          ))}
        </virtual-list>
      </div>
    </div>
  );
};

/** The washes the renderer reports, in paint order. */
const washes = (ctx: Smoke.SmokeContext) => ctx.host.highlights();

/** The washes a row's own text carries. */
const washesFor = (ctx: Smoke.SmokeContext, text: string) =>
  Arr.filter(washes(ctx), (wash) => wash.text === text);

/** The washes the find bar's cursor marked. */
const activeWashes = (ctx: Smoke.SmokeContext) =>
  Arr.filter(washes(ctx), (wash) => wash.active);

/** A host read, flattened for an assertion. */
const textOf = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "");

/** A painted box's `y`, or `NaN` so an unpainted element fails a `near` check. */
const yOf = (ctx: Smoke.SmokeContext, testId: string): number =>
  Option.getOrElse(
    Option.map(Option.fromNullishOr(ctx.host.bounds(testId)), (box) => box.y),
    () => Number.NaN,
  );

/** Where the `local`th occurrence of the query starts in `text`, or `-1`. */
const startOf = (text: string, local: number): number =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(findRanges({ text, query: QUERY })[local]),
      (range) => range[0],
    ),
    () => -1,
  );

/** Where the single active wash starts, or `-1` when none is active. */
const activeStart = (ctx: Smoke.SmokeContext): number =>
  Option.getOrElse(
    Option.map(Arr.head(activeWashes(ctx)), (wash) => wash.start),
    () => -1,
  );

const TOTAL = totalMatches(documentRows);
const LATE = lateMatchIndex(documentRows);
const LATE_TEXT = rowText(LATE_ROW);

export const searchVirtualDocumentScenario: ScenarioBody = {
  view: () => <SearchVirtualProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // 1. Only a window of the document is mounted, so native sees a window's
      //    matches and nothing else.
      yield* ctx.expectEqual(
        "the first row is painted",
        Option.isSome(Option.fromNullishOr(ctx.host.bounds("find-row-0"))),
        true,
      );
      yield* ctx.expectEqual(
        "the last row is outside the mount window",
        Option.isNone(
          Option.fromNullishOr(ctx.host.bounds(`find-row-${ROWS - 1}`)),
        ),
        true,
      );
      yield* ctx.expectEqual(
        "an empty query washes nothing",
        washes(ctx).length,
        0,
      );

      // 2. The app's count is the document's; the paint is the window's.
      ctx.host.click("find-open");
      ctx.host.advance(50);
      yield* ctx.expectContains(
        "the find bar counts every match in the document",
        textOf(ctx, "find-readout"),
        `total=${TOTAL}`,
      );
      yield* ctx.expectEqual(
        "the washes are only the mounted rows' matches",
        washes(ctx).length < TOTAL,
        true,
      );
      yield* ctx.expectEqual(
        "row 0 washes its two matches",
        washesFor(ctx, rowText(0)).length,
        2,
      );
      yield* ctx.expectEqual(
        "row 3 washes its one match",
        washesFor(ctx, rowText(3)).length,
        1,
      );
      yield* ctx.expectEqual(
        "row 5 holds no match",
        washesFor(ctx, rowText(5)).length,
        0,
      );
      yield* ctx.expectEqual(
        "every wash is a painted box",
        Arr.every(
          washes(ctx),
          (wash) =>
            wash.rects.length > 0 &&
            Arr.every(wash.rects, (rect) => rect.width > 0 && rect.height > 0),
        ),
        true,
      );
      yield* ctx.expectEqual(
        "no match is active until the find bar asks",
        activeWashes(ctx).length,
        0,
      );

      // 3. A cursor in the mount window needs no offset.
      ctx.host.click("find-next");
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the cursor marks exactly one match",
        activeWashes(ctx).length,
        1,
      );
      yield* ctx.expectEqual(
        "the active wash is row 0's first match",
        activeStart(ctx),
        startOf(rowText(0), 0),
      );
      yield* ctx.expectContains(
        "the readout names the first match",
        textOf(ctx, "find-readout"),
        "active=0 row=0 local=0",
      );

      // 4. A cursor in a row the reader has not reached is only numbered
      //    correctly with the document-wide offset.
      ctx.host.click("find-late");
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the reveal paints the row the cursor lives in",
        Option.isSome(
          Option.fromNullishOr(ctx.host.bounds(`find-row-${LATE_ROW}`)),
        ),
        true,
      );
      yield* ctx.expectEqual(
        "the late row washes its two matches",
        washesFor(ctx, LATE_TEXT).length,
        2,
      );
      yield* ctx.expectEqual(
        "the active wash is the second match of the row",
        activeStart(ctx),
        startOf(LATE_TEXT, 1),
      );
      yield* ctx.expectContains(
        "the readout names the match the offset made",
        textOf(ctx, "find-readout"),
        `offset=match:${Option.getOrElse(
          Option.map(Arr.get(documentRows, LATE_ROW), (row) => row.offset),
          () => -1,
        )}`,
      );
      yield* ctx.expectContains(
        "the readout names the late match",
        textOf(ctx, "find-readout"),
        `active=${LATE} row=${LATE_ROW} local=1`,
      );
      yield* ctx.expectNear(
        "the revealed row sits on the viewport's top edge",
        yOf(ctx, `find-row-${LATE_ROW}`),
        yOf(ctx, "find-frame"),
        1,
      );

      // 5. The row-index shortcut: 320 compared against a match numbered 541.
      ctx.host.click("find-mode");
      ctx.host.advance(50);
      yield* ctx.expectContains(
        "the readout names the shortcut it tried",
        textOf(ctx, "find-readout"),
        `offset=row:${LATE_ROW}`,
      );
      yield* ctx.expectEqual(
        "a row index is not a match count",
        activeWashes(ctx).length,
        0,
      );
      yield* ctx.expectEqual(
        "the row is still washed, only its cursor is gone",
        washesFor(ctx, LATE_TEXT).length,
        2,
      );

      // 6. An off-by-one prefix sum marks the match before the one named.
      ctx.host.click("find-mode");
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the off-by-one offset marks the row's first match",
        activeStart(ctx),
        startOf(LATE_TEXT, 0),
      );
      yield* ctx.expectEqual(
        "the first match is not the one the find bar named",
        activeStart(ctx) === startOf(LATE_TEXT, 1),
        false,
      );

      // 7. An offset the runtime refuses drops the whole spec.
      ctx.host.click("find-mode");
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "a refused offset drops every wash",
        washes(ctx).length,
        0,
      );
      yield* ctx.expectContains(
        "the query is still set while nothing paints",
        textOf(ctx, "find-readout"),
        "query=error",
      );
      ctx.host.click("find-mode");
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the next mode paints the washed row again",
        washesFor(ctx, LATE_TEXT).length,
        2,
      );
      yield* ctx.expectEqual(
        "and the cursor returns with it",
        activeWashes(ctx).length,
        1,
      );

      // 8. Replace-all rewrites every occurrence, mounted or not.
      ctx.host.click("find-replace");
      ctx.host.advance(50);
      yield* ctx.expectContains(
        "replace-all leaves no match in the document",
        textOf(ctx, "find-readout"),
        "total=0",
      );
      yield* ctx.expectEqual(
        "the washes leave with the matches",
        washes(ctx).length,
        0,
      );
      yield* ctx.expectContains(
        "the mounted row paints the replacement",
        textOf(ctx, `find-row-${LATE_ROW}`),
        REPLACEMENT,
      );
      yield* ctx.expectEqual(
        "no occurrence of the query survives in the mounted row",
        Str.includes(QUERY)(textOf(ctx, `find-row-${LATE_ROW}`)),
        false,
      );
      yield* ctx.expectNear(
        "the replace leaves the reader's row where it was",
        yOf(ctx, `find-row-${LATE_ROW}`),
        yOf(ctx, "find-frame"),
        1,
      );
      ctx.host.click("find-fixed");
      ctx.host.advance(50);
      yield* ctx.expectContains(
        "the replacement counts as the matches did",
        textOf(ctx, "find-readout"),
        `total=${TOTAL}`,
      );
      yield* ctx.expectEqual(
        "each replaced occurrence washes on its own",
        washesFor(ctx, Str.replaceAll(QUERY, REPLACEMENT)(LATE_TEXT)).length,
        2,
      );
      yield* ctx.expectEqual(
        "a new query starts with no cursor",
        activeWashes(ctx).length,
        0,
      );
    }),
};
