/**
 * `search-replace` — the replace half of the find contract: whether a match can
 * be washed inside an editable field, and what a document mutation does to the
 * washes, the match count and the find cursor.
 *
 * Plan `171` measured find over rendered text. The Tier 4 **Search and replace**
 * row is still unbuilt because the deciding question was never asked: the only
 * editor in 0.10.0 is `<input>` / `<textarea>`, whose text is not a retained
 * text run, while the highlight machinery attaches to runs built by the
 * retained renderer and to `<code>` / `<markdown>` / `<diff>`. If an editor's
 * text cannot be washed, a replace bar beside an editor must show a context
 * list instead of pretending it highlights the editable buffer.
 *
 * Measured facts: plan `334` §9.
 */
import { useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { findRanges, useTextSearch } from "@gpuix/react";
import type { EventPayload, StyleDesc } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import {
  matchText,
  nextCursor,
  replaceRange,
  replaceRanges,
} from "./replace-state.js";
import type { PlaygroundScenario } from "../types.js";

const QUERY = "error";
const REPLACEMENT = "fixed";
const INITIAL_LINES = [
  "error error here",
  "an error follows",
  "no match",
  "the last error",
  "another error closes",
] as const;
const INITIAL_CODE = "const error = 1;\nconsole.log(error);";
const REPLACED_CODE = "const value = 1;\nconsole.log(value);";
const EDITOR_TEXT = "error in the editor";
const INPUT_TEXT = "error in an input";

/** Washes whose every box sits inside `box`, with a pixel of tolerance. */
const inside = (
  box: Smoke.Bounds,
  washes: ReadonlyArray<Smoke.HighlightMatch>,
): ReadonlyArray<Smoke.HighlightMatch> =>
  Arr.filter(washes, (match) =>
    Arr.every(
      match.rects,
      (rect) =>
        rect.x >= box.x - 1 &&
        rect.x + rect.width <= box.x + box.width + 1 &&
        rect.y >= box.y - 1 &&
        rect.y + rect.height <= box.y + box.height + 1,
    ),
  );

/** The washes painted in one known line. */
const inLine = (
  washes: ReadonlyArray<Smoke.HighlightMatch>,
  line: string,
): ReadonlyArray<Smoke.HighlightMatch> =>
  Arr.filter(washes, (match) => match.text === line);

/** The matched substrings of `washes`, in paint order. */
const matched = (
  washes: ReadonlyArray<Smoke.HighlightMatch>,
): ReadonlyArray<string> =>
  Arr.map(washes, (match) => matchText(match.text, [match.start, match.end]));

/** The find cursor's matched substring, or `"none"`. */
const activeMatch = (washes: ReadonlyArray<Smoke.HighlightMatch>): string =>
  Option.getOrElse(
    Option.map(
      Arr.findFirst(washes, (match) => match.active),
      (match) => matchText(match.text, [match.start, match.end]),
    ),
    () => "none",
  );

const ReplaceSurface = ({ onReset }: { readonly onReset: () => void }) => {
  const theme = useTheme();
  const [query, setQuery] = useState(QUERY);
  const [replacement, setReplacement] = useState(REPLACEMENT);
  const [lines, setLines] = useState<ReadonlyArray<string>>(INITIAL_LINES);
  const [code, setCode] = useState(INITIAL_CODE);
  const [events, setEvents] = useState(0);
  const search = useTextSearch({ query });
  const goTo = useRef(search.goTo);
  goTo.current = search.goTo;

  const document = Arr.join(lines, "\n");
  const ranges = findRanges({ text: document, query });
  const total = Arr.length(ranges);

  const setDocument = (next: string): void => {
    setLines(Str.split(next, "\n"));
  };

  /** Replaces the match at the find cursor, then moves the cursor by the rule. */
  const replaceOne = (make: (current: string) => string): void => {
    const range = Option.fromNullishOr(ranges[search.active]);
    Option.match(range, {
      onNone: () => {},
      onSome: (hit) => {
        const next = replaceRange(
          document,
          hit,
          make(matchText(document, hit)),
        );
        const remaining = Arr.length(findRanges({ text: next, query }));
        Option.match(nextCursor(remaining, search.active), {
          onNone: () => {},
          onSome: (index) => goTo.current(index),
        });
        setDocument(next);
      },
    });
  };

  const replaceAll = (): void => {
    setDocument(replaceRanges(document, ranges, replacement));
  };

  /** Replace-all with a length-changing word, the fold-order proof. */
  const replaceAllShort = (): void => {
    setDocument(replaceRanges(document, ranges, "err"));
  };

  const counted = (event: EventPayload): void => {
    setEvents((count) => count + 1);
    search.props.onHighlight?.(event);
  };

  const surface: StyleDesc = {
    width: 240,
    padding: 6,
    color: theme.colors.inputForeground,
    backgroundColor: theme.colors.input,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
  };
  const lineStyle = {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.foreground,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        width: 940,
      }}
    >
      {/* The find/replace bar declares its own query, so a wash in here would
          mean the bar highlights itself — measured, not assumed. */}
      <div
        testId="sr-bar"
        highlight={{ query }}
        style={{
          display: "flex",
          gap: theme.spacing.sm,
          alignItems: "center",
        }}
      >
        <text style={lineStyle}>find and replace</text>
        <input
          testId="sr-query"
          value={query}
          onChange={(event) => setQuery(event.value ?? "")}
          style={surface}
        />
        <input
          testId="sr-replacement"
          value={replacement}
          onChange={(event) => setReplacement(event.value ?? "")}
          style={surface}
        />
        <Pressable testId="sr-previous" onClick={search.previous}>
          Previous
        </Pressable>
        <Pressable testId="sr-next" onClick={search.next}>
          Next
        </Pressable>
        <Pressable
          testId="sr-replace-one"
          onClick={() => replaceOne(() => replacement)}
        >
          Replace
        </Pressable>
        <Pressable testId="sr-replace-all" onClick={replaceAll}>
          Replace all
        </Pressable>
        <Pressable testId="sr-replace-all-short" onClick={replaceAllShort}>
          Replace all short
        </Pressable>
        <Pressable
          testId="sr-uppercase"
          onClick={() => replaceOne(Str.toUpperCase)}
        >
          Upper
        </Pressable>
        <Pressable
          testId="sr-longer"
          onClick={() => replaceOne(() => "errors")}
        >
          Longer
        </Pressable>
        <Pressable testId="sr-shorter" onClick={() => replaceOne(() => "err")}>
          Shorter
        </Pressable>
        <Pressable testId="sr-reset" onClick={onReset}>
          Reset
        </Pressable>
      </div>

      <div
        testId="sr-doc"
        {...search.props}
        onHighlight={counted}
        style={{ display: "flex", flexDirection: "column" }}
      >
        {Arr.map(lines, (line, index) => (
          <text key={index} testId={`sr-line-${index}`} style={lineStyle}>
            {line}
          </text>
        ))}
      </div>

      {/* An editor is not a text run. If a wash appears in here, the replace bar
          can live beside the buffer; if not, it needs a context list. */}
      <div
        testId="sr-editor-box"
        highlight={{ query }}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
        }}
      >
        <textarea
          testId="sr-editor"
          value={EDITOR_TEXT}
          readOnly
          style={surface}
        />
        <input
          testId="sr-editor-input"
          value={INPUT_TEXT}
          readOnly
          style={surface}
        />
        <text testId="sr-editor-control" style={lineStyle}>
          error in a text run
        </text>
      </div>

      <code testId="sr-code" code={code} highlight={{ query }} />
      <Pressable
        testId="sr-code-replace"
        onClick={() => setCode(REPLACED_CODE)}
        style={{ width: 160 }}
      >
        Replace in code
      </Pressable>

      <Readout testId="sr-total">{`total=${search.total} active=${search.active}`}</Readout>
      <Readout testId="sr-events">{`fired=${events} ranges=${total}`}</Readout>
      <Readout testId="sr-doc-text">{Arr.join(lines, "|")}</Readout>
      <Readout testId="sr-code-text">{Str.replaceAll("\n", "|")(code)}</Readout>
    </div>
  );
};

const SearchReplaceProbe = () => {
  const [generation, setGeneration] = useState(0);
  return (
    <ReplaceSurface
      key={generation}
      onReset={() => setGeneration((value) => value + 1)}
    />
  );
};

const readout = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "none");

/** The document's painted bounds, or a labelled failure. */
const docBox = (ctx: Smoke.SmokeContext) =>
  ctx.expectSome(
    "the document is painted",
    Option.fromNullishOr(ctx.host.bounds("sr-doc")),
  );

/** The washes inside the document, read after `advance` has settled the paint. */
const docWashes = (
  ctx: Smoke.SmokeContext,
): Effect.Effect<
  ReadonlyArray<Smoke.HighlightMatch>,
  Smoke.SmokeAssertionError
> => Effect.map(docBox(ctx), (box) => inside(box, ctx.host.highlights()));

/** Advances the dispatcher so a new `onHighlight` count reaches React. */
const settle = (ctx: Smoke.SmokeContext): void => ctx.host.advance(0);

export const searchReplaceScenario: PlaygroundScenario = {
  id: "search-replace",
  title: "Search and replace: editable text, document mutation and the cursor",
  capability: "search",
  view: () => <SearchReplaceProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      settle(ctx);

      // The five matches the document declares.
      yield* ctx.expectContains(
        "the find bar counts every document match",
        readout(ctx, "sr-total"),
        "total=5",
      );
      yield* ctx.expectContains(
        "the find cursor starts on the first match",
        readout(ctx, "sr-total"),
        "active=0",
      );
      const initial = yield* docWashes(ctx);
      yield* ctx.expectEqual(
        "the document paints one wash per match",
        Arr.length(initial),
        5,
      );
      yield* ctx.expectEqual(
        "every document wash is the queried word",
        Arr.every(
          initial,
          (match) =>
            Str.toLowerCase(matchText(match.text, [match.start, match.end])) ===
            QUERY,
        ),
        true,
      );

      // The deciding question: an editor's text is painted, but is it washed?
      yield* ctx.expectSome(
        "the textarea is painted",
        Option.fromNullishOr(ctx.host.bounds("sr-editor")),
      );
      yield* ctx.expectSome(
        "the input is painted",
        Option.fromNullishOr(ctx.host.bounds("sr-editor-input")),
      );
      const painted = Arr.join(ctx.host.paintedText(), "\n");
      yield* ctx.expectContains(
        "the textarea's value reaches the paint log",
        painted,
        EDITOR_TEXT,
      );
      yield* ctx.expectContains(
        "the input's value reaches the paint log",
        painted,
        INPUT_TEXT,
      );
      const washes = ctx.host.highlights();
      yield* ctx.expectEqual(
        "a match is not washed inside a textarea",
        Arr.length(
          Arr.filter(washes, (match) =>
            Str.includes("in the editor")(match.text),
          ),
        ),
        0,
      );
      yield* ctx.expectEqual(
        "a match is not washed inside an input",
        Arr.length(
          Arr.filter(washes, (match) =>
            Str.includes("in an input")(match.text),
          ),
        ),
        0,
      );
      // The contrast that makes the two negatives specific: the same declaration
      // does wash a `<text>` sibling, so the query is alive in that subtree.
      yield* ctx.expectEqual(
        "the same query washes a neighbouring text run",
        Arr.length(
          Arr.filter(washes, (match) => match.text === "error in a text run"),
        ),
        1,
      );
      const bar = yield* ctx.expectSome(
        "the find bar is painted",
        Option.fromNullishOr(ctx.host.bounds("sr-bar")),
      );
      yield* ctx.expectEqual(
        "the find bar does not wash its own query field",
        Arr.length(inside(bar, washes)),
        0,
      );

      // Move the cursor to the middle match, then replace it.
      ctx.host.click("sr-next");
      ctx.host.click("sr-next");
      settle(ctx);
      yield* ctx.expectContains(
        "the cursor reaches the third match",
        readout(ctx, "sr-total"),
        "active=2",
      );
      yield* ctx.expectEqual(
        "the active wash is the second line's match",
        activeMatch(yield* docWashes(ctx)),
        QUERY,
      );
      const beforeReplace = yield* docWashes(ctx);
      yield* ctx.expectEqual(
        "the third match is in the second line",
        Arr.length(inLine(beforeReplace, "an error follows")),
        1,
      );

      ctx.host.click("sr-replace-one");
      settle(ctx);
      yield* ctx.expectContains(
        "replacing one match decrements the count",
        readout(ctx, "sr-total"),
        "total=4",
      );
      yield* ctx.expectContains(
        "the cursor stays on the match that followed the replaced one",
        readout(ctx, "sr-total"),
        "active=2",
      );
      yield* ctx.expectContains(
        "the replaced line loses its match",
        readout(ctx, "sr-doc-text"),
        "an fixed follows",
      );
      const afterOne = yield* docWashes(ctx);
      yield* ctx.expectEqual(
        "the replaced line paints no wash",
        Arr.length(inLine(afterOne, "an fixed follows")),
        0,
      );
      yield* ctx.expectEqual(
        "the active wash is the next match",
        activeMatch(afterOne),
        QUERY,
      );
      yield* ctx.expectEqual(
        "the active wash is on the fourth line",
        Arr.length(inLine(afterOne, "the last error")),
        1,
      );

      // Replace all, then an exhausted cursor must stay harmless.
      ctx.host.click("sr-replace-all");
      settle(ctx);
      yield* ctx.expectContains(
        "replace-all empties the match count",
        readout(ctx, "sr-total"),
        "total=0",
      );
      yield* ctx.expectContains(
        "the cursor is zero when nothing matches",
        readout(ctx, "sr-total"),
        "active=0",
      );
      yield* ctx.expectEqual(
        "replace-all clears every document wash",
        Arr.length(yield* docWashes(ctx)),
        0,
      );
      yield* ctx.expectEqual(
        "replace-all rewrites every matching line",
        Str.includes(QUERY)(readout(ctx, "sr-doc-text")),
        false,
      );
      ctx.host.click("sr-next");
      ctx.host.click("sr-previous");
      settle(ctx);
      yield* ctx.expectContains(
        "stepping an empty result set keeps the cursor at zero",
        readout(ctx, "sr-total"),
        "total=0 active=0",
      );

      // A count-preserving replacement: the washes move, the count event must not.
      ctx.host.click("sr-reset");
      settle(ctx);
      yield* ctx.expectContains(
        "reset restores every match",
        readout(ctx, "sr-total"),
        "total=5",
      );
      yield* ctx.expectContains(
        "one count event paints the restored document",
        readout(ctx, "sr-events"),
        "fired=1",
      );
      const eventsBefore = readout(ctx, "sr-events");
      ctx.host.click("sr-uppercase");
      settle(ctx);
      yield* ctx.expectContains(
        "a case change keeps the count",
        readout(ctx, "sr-total"),
        "total=5",
      );
      yield* ctx.expectEqual(
        "a count-preserving replace fires no new count event",
        readout(ctx, "sr-events"),
        eventsBefore,
      );
      const uppercased = yield* docWashes(ctx);
      yield* ctx.expectEqual(
        "the count-preserving wash follows the rewritten run",
        Arr.join(matched(inLine(uppercased, "ERROR error here")), ","),
        "ERROR,error",
      );

      // A longer replacement shifts every later match on the line.
      ctx.host.click("sr-reset");
      settle(ctx);
      ctx.host.click("sr-longer");
      settle(ctx);
      const longer = yield* docWashes(ctx);
      yield* ctx.expectContains(
        "a longer replacement keeps the count when it still contains the query",
        readout(ctx, "sr-total"),
        "total=5",
      );
      const longerLine = inLine(longer, "errors error here");
      yield* ctx.expectEqual(
        "the longer replacement paints both matches",
        Arr.length(longerLine),
        2,
      );
      yield* ctx.expectEqual(
        "a longer replacement shifts the next match by its delta",
        Option.getOrElse(
          Option.map(Arr.get(longerLine, 1), (match) => match.start),
          () => -1,
        ),
        7,
      );

      // A shorter replacement shrinks the count and shifts the survivors back.
      ctx.host.click("sr-reset");
      settle(ctx);
      ctx.host.click("sr-shorter");
      settle(ctx);
      yield* ctx.expectContains(
        "a shorter replacement drops the match it removed",
        readout(ctx, "sr-total"),
        "total=4",
      );
      const shorterLine = inLine(yield* docWashes(ctx), "err error here");
      yield* ctx.expectEqual(
        "the survivor keeps the correct offset after the shrink",
        Option.getOrElse(
          Option.map(Arr.head(shorterLine), (match) => match.start),
          () => -1,
        ),
        4,
      );

      // Replace-all with a shorter word: the fold order is load-bearing, and
      // only a length-changing replacement exposes it.
      ctx.host.click("sr-reset");
      settle(ctx);
      ctx.host.click("sr-replace-all-short");
      settle(ctx);
      yield* ctx.expectEqual(
        "a length-changing replace-all rewrites every match exactly once",
        readout(ctx, "sr-doc-text"),
        "err err here|an err follows|no match|the last err|another err closes",
      );
      yield* ctx.expectContains(
        "the shorter replace-all leaves nothing matching",
        readout(ctx, "sr-total"),
        "total=0",
      );

      // A rendered code block replaces by prop, and its washes follow.
      ctx.host.click("sr-reset");
      settle(ctx);
      const codeBefore = Arr.filter(
        ctx.host.highlights(),
        (match) =>
          Str.startsWith("const error")(match.text) ||
          Str.startsWith("console.log")(match.text),
      );
      yield* ctx.expectEqual(
        "the code block paints its two matches",
        Arr.length(codeBefore),
        2,
      );
      ctx.host.click("sr-code-replace");
      settle(ctx);
      yield* ctx.expectContains(
        "the code block's source is replaced",
        readout(ctx, "sr-code-text"),
        "const value = 1;|console.log(value);",
      );
      yield* ctx.expectEqual(
        "replacing the source removes its washes",
        Arr.length(
          Arr.filter(
            ctx.host.highlights(),
            (match) =>
              Str.includes("const error")(match.text) ||
              Str.includes("console.log(error)")(match.text),
          ),
        ),
        0,
      );

      // Back to the baseline for the screenshot.
      ctx.host.click("sr-reset");
      settle(ctx);
      ctx.host.screenshot(
        "apps/playground/.artifacts/screenshots/search-replace.png",
      );
    }),
};
