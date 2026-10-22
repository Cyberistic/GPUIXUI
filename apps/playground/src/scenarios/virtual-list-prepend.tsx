/**
 * `virtual-list-prepend` — a page prepended above the reader does not move them.
 *
 * A feed, a notification centre, a message scroller and a log viewer that loads
 * older pages all prepend rows the reader has already scrolled past. The
 * runtime types say nothing about where those rows land: a splice that keeps the
 * scroll offset still would shift the reader's content down by the page height,
 * and nothing in this repo measured which one happens.
 *
 * Two lists, both 20px rows in a 160px viewport:
 *
 *   - `Feed` starts with 12 rows (240px) so it **overflows at mount**, which is
 *     the only state that can show anchoring at all: while the content is
 *     shorter than the viewport the list re-anchors to the first row on every
 *     layout, so a broken prepend looks correct (see the `Short` list below);
 *   - `Short` starts with 2 rows (40px) and stays short after a prepend, so it
 *     is the control: it stays pinned to its first row whatever the splice does.
 *
 * Measured on 0.11.0:
 *
 *   - a prepend while scrolled keeps the painted rows `103..110` and their `y`
 *     exactly, and moves the offset by the inserted height (`-60` → `-140` for
 *     4 × 20px), so the anchor is logical and the new rows sit above the
 *     viewport;
 *   - a prepend at the **top** is the opposite case: the offset stays `0` and
 *     the new rows paint, so a page loaded above a reader at the top is shown
 *     rather than hidden — the browser behaviour a feed wants;
 *   - the prepended rows are in the retained tree even while unpainted, so
 *     "nothing moved" cannot be a splice that never happened.
 */
import { useState } from "react";
import { Effect, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { useTheme } from "@gpuixui/tokens/react";
import { Pressable, Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";
import type { Smoke } from "@gpuixui/testing";

/** The list viewport: 8 whole 20px rows, so every list here can overflow. */
const VIEWPORT = 160;
/** One row's drawn height, used as the page's arithmetic. */
const ROW = 20;
/** Rows the feed mounts with: 240px, already taller than the viewport. */
const INITIAL = 12;
/** Rows each press prepends. */
const PREPEND = 4;
/** Rows the control list mounts with: 40px, shorter than the viewport. */
const SHORT = 2;
/** The feed's first id; prepends walk downwards from it. */
const FEED_START = 100;
/** The feed's last id, which a prepend never changes. */
const FEED_END = FEED_START + INITIAL - 1;
/** The control list's first id. */
const SHORT_START = 200;
/** The control list's last id. */
const SHORT_END = SHORT_START + SHORT - 1;

const feedPattern = /^Feed (\d+)$/;
const shortPattern = /^Short (\d+)$/;

const FeedProbe = () => {
  const theme = useTheme();
  const [feedFirst, setFeedFirst] = useState(FEED_START);
  const [shortFirst, setShortFirst] = useState(SHORT_START);

  const row = (id: number, testId: string, label: string) => (
    <div key={id} testId={testId} style={{ height: ROW, padding: 2 }}>
      <text style={{ color: theme.colors.foreground }}>{label}</text>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: 320,
        height: 420,
      }}
    >
      <div style={{ display: "flex", height: VIEWPORT }}>
        <virtual-list testId="plist" style={{ flexGrow: 1, minHeight: 0 }}>
          {Arr.map(Arr.range(feedFirst, FEED_END), (id) =>
            row(id, `prow-${id}`, `Feed ${id}`),
          )}
        </virtual-list>
      </div>
      <Pressable
        testId="plist-prepend"
        onClick={() => setFeedFirst((first) => first - PREPEND)}
      >
        {`prepend ${PREPEND} above`}
      </Pressable>
      <Readout testId="plist-first">{`${feedFirst}`}</Readout>
      <div style={{ display: "flex", height: VIEWPORT }}>
        <virtual-list testId="slist" style={{ flexGrow: 1, minHeight: 0 }}>
          {Arr.map(Arr.range(shortFirst, SHORT_END), (id) =>
            row(id, `srow-${id}`, `Short ${id}`),
          )}
        </virtual-list>
      </div>
      <Pressable
        testId="slist-prepend"
        onClick={() => setShortFirst((first) => first - SHORT)}
      >
        {`prepend ${SHORT} above`}
      </Pressable>
    </div>
  );
};

/** The rows of one list the frame paints, in paint order. */
const paintedRows = (
  pattern: RegExp,
  lines: ReadonlyArray<string>,
): ReadonlyArray<number> =>
  Arr.filterMap(lines, (line) =>
    pipe(
      Str.match(pattern)(line),
      Option.flatMap((match) => Option.fromNullishOr(match[1])),
      Option.match({
        onNone: () => Result.failVoid,
        onSome: (value) => Result.succeed(Number.parseInt(value, 10)),
      }),
    ),
  );

export const virtualListPrependScenario: ScenarioBody = {
  view: () => <FeedProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const text = (testId: string): Option.Option<string> =>
        Option.fromNullishOr(ctx.host.text(testId));
      const painted = (pattern: RegExp): ReadonlyArray<number> =>
        paintedRows(pattern, ctx.host.paintedText());
      const boundsOf = (testId: string): Option.Option<Smoke.Bounds> =>
        Option.fromNullishOr(ctx.host.bounds(testId));
      const yOf = (testId: string): number =>
        Option.getOrElse(
          Option.map(boundsOf(testId), (bounds) => bounds.y),
          () => -1,
        );
      const offsetOf = (testId: string): Option.Option<number> =>
        Option.map(
          Option.fromNullishOr(ctx.host.scrollOffset(testId)),
          (offset) => offset.y,
        );

      // 1. The feed overflows at mount: the only state that can show anchoring.
      const atRest = painted(feedPattern);
      yield* ctx.expectEqual(
        "the feed starts at its first row",
        Option.getOrElse(Arr.head(atRest), () => -1),
        FEED_START,
      );
      yield* ctx.expectEqual(
        "the feed reports a scroll offset at rest",
        Option.getOrElse(offsetOf("plist"), () => -1),
        0,
      );
      yield* ctx.expectEqual(
        "the feed's declared rows overflow the viewport",
        Arr.contains(atRest, FEED_END),
        false,
      );
      yield* ctx.expectEqual(
        "the control list is shorter than its viewport",
        Arr.join(Arr.map(painted(shortPattern), String), ","),
        Arr.join(Arr.map(Arr.range(SHORT_START, SHORT_END), String), ","),
      );

      // 2. Scroll the feed away from the top.
      ctx.host.wheel("plist", 0, -60);
      ctx.host.advance(50);
      const offsetBefore = yield* ctx.expectSome(
        "the feed reports an offset after the wheel",
        offsetOf("plist"),
      );
      yield* ctx.expectEqual(
        "the wheel moved the feed off the top",
        offsetBefore < 0,
        true,
      );
      yield* ctx.expectEqual(
        "the first row scrolled out of the viewport",
        Arr.contains(painted(feedPattern), FEED_START),
        false,
      );

      // 3. A prepend holds the anchor: the rows, and their place on screen.
      const before = painted(feedPattern);
      const topBefore = yield* ctx.expectSome(
        "a painted row exists before the prepend",
        Arr.head(before),
      );
      const topBeforeY = yOf(`prow-${topBefore}`);
      ctx.host.click("plist-prepend");
      ctx.host.advance(50);
      ctx.host.advance(50);

      yield* ctx.expectEqual(
        "the prepend reached React",
        Option.getOrElse(text("plist-first"), () => ""),
        `${FEED_START - PREPEND}`,
      );
      yield* ctx.expectEqual(
        "the prepended rows are retained even while unpainted",
        Option.getOrElse(text(`prow-${FEED_START - 1}`), () => ""),
        `Feed ${FEED_START - 1}`,
      );
      yield* ctx.expectEqual(
        "the new rows stay above the viewport",
        Arr.some(
          painted(feedPattern),
          (id) => id >= FEED_START - PREPEND && id < FEED_START,
        ),
        false,
      );
      yield* ctx.expectEqual(
        "the rows the reader was looking at stay painted",
        Arr.join(Arr.map(painted(feedPattern), String), ","),
        Arr.join(Arr.map(before, String), ","),
      );
      yield* ctx.expectNear(
        "the top painted row did not move on screen",
        yOf(`prow-${topBefore}`),
        topBeforeY,
        1,
      );
      yield* ctx.expectNear(
        "the offset grew by exactly the height inserted above",
        Option.getOrElse(offsetOf("plist"), () => 0),
        offsetBefore - PREPEND * ROW,
        2,
      );

      // 4. At the top the opposite must happen: a page above is shown.
      ctx.host.wheel("plist", 0, 1000);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the wheel returned the feed to the top",
        Option.getOrElse(offsetOf("plist"), () => -1),
        0,
      );
      ctx.host.click("plist-prepend");
      ctx.host.advance(50);
      ctx.host.advance(50);

      const atTop = painted(feedPattern);
      yield* ctx.expectEqual(
        "a prepend at the top keeps the offset at zero",
        Option.getOrElse(offsetOf("plist"), () => -1),
        0,
      );
      yield* ctx.expectEqual(
        "a prepend at the top paints the newest row",
        Option.getOrElse(Arr.head(atTop), () => -1),
        FEED_START - 2 * PREPEND,
      );
      yield* ctx.expectNear(
        "the row that held the top moved down by the page",
        yOf(`prow-${FEED_START - PREPEND}`),
        yOf(`prow-${FEED_START - 2 * PREPEND}`) + PREPEND * ROW,
        1,
      );

      // 5. The short control cannot show the difference: it is pinned anyway.
      ctx.host.click("slist-prepend");
      ctx.host.advance(50);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "a short list stays at offset zero",
        Option.getOrElse(offsetOf("slist"), () => -1),
        0,
      );
      yield* ctx.expectEqual(
        "a short list shows its newest row at the top",
        Option.getOrElse(Arr.head(painted(shortPattern)), () => -1),
        SHORT_START - SHORT,
      );
      yield* ctx.expectEqual(
        "the short list still fits, so it never had to anchor",
        Option.getOrElse(
          Option.map(boundsOf(`srow-${SHORT_END}`), (bounds) => bounds.y),
          () => -1,
        ) > 0,
        true,
      );
    }),
};
