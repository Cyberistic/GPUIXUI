/**
 * `search-highlights` — the find-bar contract search, logs and replace UIs sit
 * on: `HostProps.highlight`, `onHighlight`, `useTextSearch` and
 * `TestRenderer.getPaintedHighlights()`.
 *
 * Nothing in the repo had measured whether a wash reaches the paint, what the
 * `[start, end)` offsets index, how case / whole-word / active / explicit
 * ranges behave, whether a nested declaration replaces an ancestor's, or how a
 * virtualized list numbers matches. The probe drives the published React hook
 * (the same one a component would use) and asserts on the runtime's own report
 * of the washes, not on a readout alone.
 *
 * `getPaintedHighlights()` does not report the wash colour, so colour is not
 * asserted here — a screenshot is the only visual evidence and is never an
 * assertion (see `theme-color-roles` for the style-report route).
 *
 * Measured facts: plan `171` §8.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useTextSearch } from "@gpuix/react";
import type { EventPayload } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const FONT_SIZE = 14;
const LINE_HEIGHT = 20;
const LIST_ROWS = 120;
const LIST_TARGET = 90;
const ROW_HEIGHT = 24;

/** A row's run text, so a wash can be traced back to the row it painted in. */
const rowText = (row: number): string => `error at row ${row}`;

/** The matched substring, which is what the query actually found. */
const matchOf = (match: Smoke.HighlightMatch): string =>
  match.text.slice(match.start, match.end);

const lower = Str.toLowerCase;

/** Washes whose run is exactly `text`, in paint order. */
const washesIn = (
  washes: ReadonlyArray<Smoke.HighlightMatch>,
  text: string,
): ReadonlyArray<Smoke.HighlightMatch> =>
  Arr.filter(washes, (match) => match.text === text);

const SearchProbe = () => {
  const theme = useTheme();
  // The published adapter, not a hand-rolled controller: its `total`/`active`
  // come from the native `onHighlight` count, so the probe tests the contract a
  // component gets.
  const [query, setQuery] = useState("error");
  const search = useTextSearch({ query });
  const [countReadout, setCountReadout] = useState("matchCount=none");

  const lineStyle = {
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    color: theme.colors.foreground,
  };

  const counted = (event: EventPayload): void =>
    setCountReadout(`matchCount=${event.matchCount ?? -1}`);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 16,
        marginLeft: 40,
        marginTop: 30,
        alignItems: "flex-start",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          width: 420,
        }}
      >
        <div
          testId="search-doc"
          {...search.props}
          style={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <text testId="search-line-1" style={lineStyle}>
            The error handler logs an error.
          </text>
          <text testId="search-line-2" style={lineStyle}>
            An Error is not the same as errors.
          </text>
          <text testId="search-line-3" style={lineStyle}>
            No match here.
          </text>
          <div
            testId="search-nested"
            highlight={{ query: "nested" }}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <text testId="search-nested-line" style={lineStyle}>
              nested error
            </text>
          </div>
        </div>

        <div
          testId="search-counted"
          highlight={{ query: "error" }}
          onHighlight={counted}
          style={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <text testId="search-counted-1" style={lineStyle}>
            error one
          </text>
          <text testId="search-counted-2" style={lineStyle}>
            error two error
          </text>
        </div>

        <div
          testId="search-active"
          highlight={{ query: "error", activeIndex: 1 }}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <text testId="search-active-line" style={lineStyle}>
            alpha error beta error gamma
          </text>
        </div>

        <div
          testId="search-whole"
          highlight={{ query: "error", wholeWord: true }}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <text testId="search-whole-line" style={lineStyle}>
            errors error error.
          </text>
        </div>

        <div
          testId="search-case"
          highlight={{ query: "error", caseSensitive: true }}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <text testId="search-case-line" style={lineStyle}>
            Error error
          </text>
        </div>

        <div
          testId="search-ranges"
          highlight={{
            ranges: [
              [0, 5],
              [6, 10],
            ],
          }}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <text testId="search-ranges-line" style={lineStyle}>
            alpha beta gamma
          </text>
        </div>

        <div
          testId="search-surrogate"
          highlight={{ ranges: [[0, 1]] }}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <text testId="search-surrogate-line" style={lineStyle}>
            😀abc
          </text>
        </div>

        <div
          testId="search-surrogate-ok"
          highlight={{ ranges: [[2, 5]] }}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <text testId="search-surrogate-ok-line" style={lineStyle}>
            😀xyz
          </text>
        </div>

        <div
          testId="search-wrap"
          highlight={{ query: "alpha beta" }}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <text testId="search-wrap-line" style={{ ...lineStyle, width: 52 }}>
            alpha beta
          </text>
        </div>

        <code
          testId="search-code"
          code={"const error = 1;\nconsole.log(error);"}
          highlight={{ query: "error" }}
        />
        <code
          testId="search-code-ranges"
          code={"let error = 2;"}
          highlight={{ ranges: [[4, 9]] }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <Pressable testId="search-clear" onClick={() => setQuery("")}>
            Clear
          </Pressable>
          <Pressable testId="search-restore" onClick={() => setQuery("error")}>
            Restore
          </Pressable>
          <Pressable testId="search-next" onClick={search.next}>
            Next
          </Pressable>
          <Pressable testId="search-previous" onClick={search.previous}>
            Previous
          </Pressable>
        </div>

        <Readout testId="search-total">{`total=${search.total} active=${search.active}`}</Readout>
        <Readout testId="search-count-readout">{countReadout}</Readout>
      </div>

      <div style={{ display: "flex", flexDirection: "column", width: 260 }}>
        <div style={{ height: 264, display: "flex" }}>
          <virtual-list testId="search-list" style={{ flexGrow: 1 }}>
            {Arr.map(Arr.range(0, LIST_ROWS - 1), (row) => (
              <div
                key={row}
                testId={`search-row-${row}`}
                highlight={{
                  query: "error",
                  matchIndexOffset: row,
                  activeIndex: LIST_TARGET,
                }}
                style={{
                  height: ROW_HEIGHT,
                  flexShrink: 0,
                  paddingLeft: 4,
                  backgroundColor: theme.colors.background,
                }}
              >
                <text style={lineStyle}>{rowText(row)}</text>
              </div>
            ))}
          </virtual-list>
        </div>
      </div>
    </div>
  );
};

/** The four `search-doc` runs the outer query must wash, in paint order. */
const DOC_LINES = [
  "The error handler logs an error.",
  "An Error is not the same as errors.",
];

const docWashes = (
  washes: ReadonlyArray<Smoke.HighlightMatch>,
): ReadonlyArray<Smoke.HighlightMatch> =>
  Arr.filter(washes, (match) => Arr.contains(DOC_LINES, match.text));

/** Washes painted inside one `<code>` element, identified by line text. */
const codeWashes = (
  washes: ReadonlyArray<Smoke.HighlightMatch>,
): ReadonlyArray<Smoke.HighlightMatch> =>
  Arr.filter(
    washes,
    (match) =>
      Str.includes("const error")(match.text) ||
      Str.includes("console.log")(match.text),
  );

const readout = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "");

export const searchScenario: PlaygroundScenario = {
  id: "search-highlights",
  title: "Search: painted highlights, match numbering and find controls",
  capability: "search",
  view: () => <SearchProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // `mount` renders and flushes but does not drain native events, and
      // `onHighlight` is one: this is the same requirement `motion-collapse`
      // measured for `onMotionComplete`.
      ctx.host.advance(0);

      const total = readout(ctx, "search-total");
      yield* ctx.expectContains(
        "the text-search hook counts the document's matches",
        total,
        "total=4",
      );
      yield* ctx.expectContains(
        "the find cursor starts on the first match",
        total,
        "active=0",
      );

      const washes = ctx.host.highlights();
      const doc = docWashes(washes);
      yield* ctx.expectEqual(
        "the document paints one wash per match",
        Arr.length(doc),
        4,
      );
      yield* ctx.expectEqual(
        "every document wash is the queried word",
        Arr.every(doc, (match) => lower(matchOf(match)) === "error"),
        true,
      );

      // Geometry: a wash is a box behind the text, so its rect must be inside
      // the line's own bounds.
      const line1Bounds = yield* ctx.expectSome(
        "the first line has bounds",
        Option.fromNullishOr(ctx.host.bounds("search-line-1")),
      );
      const line1 = washesIn(washes, "The error handler logs an error.");
      yield* ctx.expectEqual("line one has two washes", Arr.length(line1), 2);
      yield* Effect.forEach(
        line1,
        (match, index) =>
          Effect.forEach(
            match.rects,
            (rect) =>
              ctx.check(
                `line one wash ${index} sits inside the line's box`,
                Effect.gen(function* () {
                  yield* ctx.expectEqual(
                    `line one wash ${index} is above zero height`,
                    rect.height > 0,
                    true,
                  );
                  yield* ctx.expectEqual(
                    `line one wash ${index} starts inside the line`,
                    rect.x >= line1Bounds.x - 1 && rect.y >= line1Bounds.y - 1,
                    true,
                  );
                  yield* ctx.expectEqual(
                    `line one wash ${index} stays within the line`,
                    rect.x + rect.width <=
                      line1Bounds.x + line1Bounds.width + 1 &&
                      rect.y + rect.height <=
                        line1Bounds.y + line1Bounds.height + 1,
                    true,
                  );
                }),
              ),
            { concurrency: 1, discard: true },
          ),
        { concurrency: 1, discard: true },
      );

      // A soft-wrapped match must paint one box per visual row.
      const wrapped = washesIn(washes, "alpha beta");
      const wrappedMatch = yield* ctx.expectSome(
        "the wrapped match paints",
        Arr.head(wrapped),
      );
      yield* ctx.expectEqual(
        "a soft-wrapped match paints one box per row",
        wrappedMatch.rects.length > 1,
        true,
      );

      // Case sensitivity: the default query matched `Error`, the explicit one
      // did not.
      yield* ctx.expectEqual(
        "the default query is case-insensitive",
        Arr.length(washesIn(washes, "An Error is not the same as errors.")),
        2,
      );
      const caseWashes = washesIn(washes, "Error error");
      yield* ctx.expectEqual(
        "a case-sensitive query skips the capitalised match",
        Arr.length(caseWashes),
        1,
      );
      yield* ctx.expectEqual(
        "the case-sensitive match is the lower-case word",
        Option.getOrElse(
          Option.map(Arr.head(caseWashes), matchOf),
          () => "none",
        ),
        "error",
      );

      // Whole word: `errors` contains `error` but is not one.
      const whole = washesIn(washes, "errors error error.");
      yield* ctx.expectEqual(
        "a whole-word query skips the suffixed word",
        Arr.length(whole),
        2,
      );

      // Active index: exactly one of the three washes is the find cursor, and
      // it is the second one.
      const activeRuns = washesIn(washes, "alpha error beta error gamma");
      yield* ctx.expectEqual(
        "the active container paints both matches",
        Arr.length(activeRuns),
        2,
      );
      const activeIndex = yield* ctx.expectSome(
        "one active wash is reported",
        Arr.findFirst(activeRuns, (match) => match.active),
      );
      yield* ctx.expectEqual(
        "the active wash is the second match",
        activeIndex.start,
        (yield* ctx.expectSome(
          "the second match exists",
          Arr.get(activeRuns, 1),
        )).start,
      );

      // Explicit ranges index the same UTF-16 text the query does.
      const ranged = washesIn(washes, "alpha beta gamma");
      yield* ctx.expectEqual(
        "explicit ranges paint exactly the declared runs",
        Arr.join(Arr.map(ranged, matchOf), ","),
        "alpha,beta",
      );
      yield* ctx.expectEqual(
        "a surrogate-splitting range is refused",
        Arr.length(washesIn(washes, "😀abc")),
        0,
      );
      yield* ctx.expectEqual(
        "a range after the surrogate still paints",
        Option.getOrElse(
          Option.map(
            Arr.findFirst(
              washes,
              (match) => match.text === "😀xyz" && matchOf(match) === "xyz",
            ),
            matchOf,
          ),
          () => "none",
        ),
        "xyz",
      );

      // Native `<code>` text is searched by query; ranges do not index it.
      const code = codeWashes(washes);
      yield* ctx.expectEqual(
        "a query paints inside a code block",
        Arr.length(code),
        2,
      );
      yield* ctx.expectEqual(
        "a range spec does not index native code text",
        Arr.length(washesIn(washes, "let error = 2;")),
        0,
      );

      // `onHighlight` is the count route the hook relies on.
      yield* ctx.expectContains(
        "onHighlight reports the match count",
        readout(ctx, "search-count-readout"),
        "matchCount=3",
      );

      // A nested declaration replaces the ancestor's for its subtree.
      const nested = washesIn(washes, "nested error");
      yield* ctx.expectEqual(
        "the nested declaration is the only wash in its subtree",
        Arr.length(nested),
        1,
      );
      yield* ctx.expectEqual(
        "the ancestor query does not wash the nested subtree",
        Option.getOrElse(Option.map(Arr.head(nested), matchOf), () => "none"),
        "nested",
      );

      // Clearing and restoring re-paints; the hook's next moves the cursor.
      ctx.host.click("search-clear");
      yield* ctx.expectEqual(
        "clearing the query removes every wash",
        Arr.length(docWashes(ctx.host.highlights())),
        0,
      );
      yield* ctx.expectContains(
        "clearing the query resets the count",
        readout(ctx, "search-total"),
        "total=0",
      );

      ctx.host.click("search-restore");
      yield* ctx.expectEqual(
        "restoring the query repaints the document",
        Arr.length(docWashes(ctx.host.highlights())),
        4,
      );
      ctx.host.click("search-next");
      const stepped = docWashes(ctx.host.highlights());
      const steppedActive = yield* ctx.expectSome(
        "next moves the find cursor",
        Arr.findFirst(stepped, (match) => match.active),
      );
      yield* ctx.expectEqual(
        "next selects the second document match",
        Option.getOrElse(
          Arr.findFirstIndex(stepped, (match) => match.active),
          () => -1,
        ),
        1,
      );
      yield* ctx.expectEqual(
        "the find cursor is in the first line",
        Str.includes("handler")(steppedActive.text),
        true,
      );

      // The virtual list numbers matches from the document, not the window.
      ctx.host.scrollToItem("search-list", LIST_TARGET);
      ctx.host.advance(0);
      const rows = Arr.filter(ctx.host.highlights(), (match) =>
        Str.startsWith("error at row")(match.text),
      );
      yield* ctx.expectEqual(
        "the window paints one wash per visible row",
        Arr.length(rows) > 0,
        true,
      );
      const rowActive = Arr.filter(rows, (match) => match.active);
      yield* ctx.expectEqual(
        "exactly one virtual row is the active match",
        Arr.length(rowActive),
        1,
      );
      yield* ctx.expectEqual(
        "the active row is the one matchIndexOffset names",
        Option.getOrElse(
          Option.map(Arr.head(rowActive), (match) =>
            Str.includes(`row ${LIST_TARGET}`)(match.text),
          ),
          () => false,
        ),
        true,
      );
    }),
};
