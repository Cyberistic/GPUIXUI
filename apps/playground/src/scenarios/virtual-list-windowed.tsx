/**
 * `virtual-list-windowed` — `<virtual-list>` in **itemCount** mode mounts only
 * the slice React renders.
 *
 * Every other probe uses the children form, where React and the Rust tree retain
 * all rows and GPUI skips only the build and paint. A data table with a hundred
 * thousand rows needs the other mode: `itemCount` + `estimatedItemHeight` +
 * `windowStart`, where the app renders `rows.slice(start, end)` and native
 * positions the mounted slice by index.
 *
 * Measured here, on GPUix 0.11.0, with 100 000 logical rows and a 60-row window:
 *
 *   - only the window is retained (`wrow-0` exists, `wrow-60` does not), so
 *     mount cost follows the window and not the data;
 *   - the painted window is a subset of it — the estimate positions rows that
 *     were never mounted;
 *   - `onVisibleRange` reports **absolute** indices, so the same numbers slice
 *     the data array rather than an offset into the mounted children; it also
 *     **lags the paint by one gesture** (the event still read `20..27` while the
 *     paint had reached `40..46`), so the window must exceed viewport + overdraw
 *     or the lag exposes native's empty estimate boxes;
 *   - a press on a painted row reports its absolute index;
 *   - `scrollToItem(90000)` on a window the app moved there paints `File 90000`,
 *     and the scroll offset is the estimate's arithmetic (`-90000 × 28`), which
 *     is what lets a table jump to a row it has never mounted.
 *
 * The wheel's `deltaY` is negative to scroll down (see `scroll.tsx`).
 */
import { useRef, useState } from "react";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { Effect, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { useTheme } from "@gpuixui/tokens/react";
import { Pressable, Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";

/** Logical rows: far more than a window or a paint can hold. */
const ROWS = 100_000;
/** One row's height, used both as the drawn height and as the estimate. */
const ROW_HEIGHT = 28;
/** How many rows React mounts around the viewport. */
const WINDOW = 60;
/** The row a far reveal jumps to — never mounted before the jump. */
const REVEAL = 90_000;
/** How far before the reported range the window starts, so a lag cannot blank it. */
const LEAD = 10;

const clampStart = (value: number): number =>
  Math.max(0, Math.min(ROWS - WINDOW, value));

const WindowedListProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const list = useRef<PublicInstance | null>(null);
  const [start, setStart] = useState(0);
  const [range, setRange] = useState({ start: -1, end: -1 });
  const [reports, setReports] = useState(0);
  const [selected, setSelected] = useState(-1);

  const end = Math.min(ROWS, start + WINDOW);

  const reveal = (): void => {
    // The window is app state, so a jump moves it first; the queued scroll is
    // applied after that commit's child splice.
    setStart(clampStart(REVEAL));
    const elementId = list.current?.id;
    if (elementId != null) renderer?.scrollToItem?.(elementId, REVEAL);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: 320,
        height: 360,
      }}
    >
      <div style={{ display: "flex", height: 280 }}>
        <virtual-list
          testId="wlist"
          ref={list}
          itemCount={ROWS}
          windowStart={start}
          estimatedItemHeight={ROW_HEIGHT}
          style={{ flexGrow: 1, minHeight: 0 }}
          onVisibleRange={(event) => {
            setReports((count) => count + 1);
            setRange({
              start: event.startIndex ?? -1,
              end: event.endIndex ?? -1,
            });
            setStart((current) =>
              Math.max(current, clampStart((event.startIndex ?? 0) - LEAD)),
            );
          }}
        >
          {Array.from({ length: end - start }, (_, offset) => {
            const index = start + offset;
            return (
              <div
                key={index}
                testId={`wrow-${index}`}
                onClick={() => setSelected(index)}
                style={{
                  display: "flex",
                  height: ROW_HEIGHT,
                  alignItems: "center",
                  backgroundColor:
                    selected === index
                      ? theme.colors.accent
                      : theme.colors.background,
                }}
              >
                <text style={{ color: theme.colors.foreground }}>
                  {`File ${index}`}
                </text>
              </div>
            );
          })}
        </virtual-list>
      </div>
      <Pressable testId="wlist-reveal" onClick={reveal}>
        Reveal 90000
      </Pressable>
      <Readout testId="wlist-start">{`${start}`}</Readout>
      <Readout testId="wlist-end">{`${end}`}</Readout>
      <Readout testId="wlist-range-start">{`${range.start}`}</Readout>
      <Readout testId="wlist-range-end">{`${range.end}`}</Readout>
      <Readout testId="wlist-reports">{`${reports}`}</Readout>
      <Readout testId="wlist-selected">
        {selected < 0 ? "none" : `r${selected}`}
      </Readout>
    </div>
  );
};

/** Parses a numeric readout; a missing or malformed one is `-1`. */
const readIndex = (text: Option.Option<string>): number =>
  pipe(
    text,
    Option.map((value) => Number.parseInt(value, 10)),
    Option.filter(Number.isInteger),
    Option.getOrElse(() => -1),
  );

/** The rows the list currently paints, as the `File N` labels become `N`s. */
const paintedRows = (lines: ReadonlyArray<string>): ReadonlyArray<number> =>
  Arr.filterMap(lines, (line) =>
    pipe(
      Str.match(/^File (\d+)$/)(line),
      Option.flatMap((match) => Option.fromNullishOr(match[1])),
      Option.match({
        onNone: () => Result.failVoid,
        onSome: (value) => Result.succeed(Number.parseInt(value, 10)),
      }),
    ),
  );

/** The window the probe reports, read from its two readouts. */
const readWindow = (
  text: (testId: string) => Option.Option<string>,
): readonly [number, number] => [
  readIndex(text("wlist-start")),
  readIndex(text("wlist-end")),
];

export const virtualListWindowedScenario: ScenarioBody = {
  view: () => <WindowedListProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const text = (testId: string): Option.Option<string> =>
        Option.fromNullishOr(ctx.host.text(testId));
      const window = (): readonly [number, number] => readWindow(text);

      // 1. Mount cost follows the window, not the data.
      yield* ctx.expectContains(
        "the first row of the window is mounted",
        Option.getOrElse(text("wrow-0"), () => ""),
        "File 0",
      );
      yield* ctx.expectContains(
        "the last row of the window is mounted",
        Option.getOrElse(text(`wrow-${WINDOW - 1}`), () => ""),
        `File ${WINDOW - 1}`,
      );
      yield* ctx.expectEqual(
        "the row after the window is never mounted",
        Option.isNone(text(`wrow-${WINDOW}`)),
        true,
      );

      // 2. The painted window is a strict subset of the mounted one.
      const firstPaint = paintedRows(ctx.host.paintedText());
      yield* ctx.expectEqual(
        "the first row is painted",
        Arr.contains(firstPaint, 0),
        true,
      );
      yield* ctx.expectEqual(
        "the last mounted row is not painted, so the estimate places it",
        Arr.contains(firstPaint, WINDOW - 1),
        false,
      );

      // 3. The painted rows all belong to the window the app mounted.
      const [startAtRest, endAtRest] = window();
      yield* ctx.expectEqual(
        "the window starts at the first row",
        startAtRest,
        0,
      );
      yield* ctx.expectEqual(
        "every painted row is inside the mounted window",
        Arr.every(firstPaint, (row) => row >= startAtRest && row < endAtRest),
        true,
      );

      // 4. A wheel moves the list and reports absolute indices.
      ctx.host.wheel("wlist", 0, -560);
      ctx.host.advance(50);
      ctx.host.wheel("wlist", 0, -560);
      ctx.host.advance(50);

      yield* ctx.expectEqual(
        "onVisibleRange fired for the wheel",
        readIndex(text("wlist-reports")) >= 1,
        true,
      );
      const rangeStart = readIndex(text("wlist-range-start"));
      const rangeEnd = readIndex(text("wlist-range-end"));
      yield* ctx.expectEqual(
        "the range event reports absolute indices, not window offsets",
        rangeStart > 0 && rangeEnd > rangeStart,
        true,
      );

      yield* ctx.expectEqual(
        "the wheel moved the list's own offset",
        Option.match(Option.fromNullishOr(ctx.host.scrollOffset("wlist")), {
          onNone: () => false,
          onSome: (offset) => offset.y < 0,
        }),
        true,
      );

      const scrolled = paintedRows(ctx.host.paintedText());
      const [startAfter, endAfter] = window();
      yield* ctx.expectEqual(
        "the window followed the range event",
        startAfter > 0,
        true,
      );
      yield* ctx.expectEqual(
        "the range event is absolute and never runs ahead of the paint",
        rangeStart > 0 &&
          rangeStart <= Option.getOrElse(Arr.head(scrolled), () => -1),
        true,
      );
      yield* ctx.expectEqual(
        "the reported range is the viewport, not the mounted window",
        rangeEnd > rangeStart && rangeEnd - rangeStart <= WINDOW,
        true,
      );
      yield* ctx.expectEqual(
        "no painted row falls outside the window the app mounted",
        Arr.every(scrolled, (row) => row >= startAfter && row < endAfter),
        true,
      );
      yield* ctx.expectEqual(
        "the first row left the retained tree as the window moved",
        Option.isNone(text("wrow-0")),
        true,
      );

      // 5. A painted row is addressable by its absolute index.
      const target = yield* ctx.expectSome(
        "a painted row exists after the wheel",
        Arr.head(scrolled),
      );
      ctx.host.click(`wrow-${target}`);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "a press on a windowed row reports its absolute index",
        Option.getOrElse(text("wlist-selected"), () => ""),
        `r${target}`,
      );

      // 6. A far reveal lands on a row that was never mounted.
      ctx.host.click("wlist-reveal");
      ctx.host.advance(50);
      ctx.host.advance(50);

      const [startRevealed] = window();
      yield* ctx.expectEqual(
        "the app moved its window to the revealed row",
        startRevealed,
        REVEAL,
      );
      yield* ctx.expectContains(
        "the revealed row is painted",
        Arr.join(ctx.host.paintedText(), "\n"),
        `File ${REVEAL}`,
      );
      yield* ctx.expectEqual(
        "the row at the old window is no longer retained",
        Option.isNone(text(`wrow-${startAfter}`)),
        true,
      );
      const revealed = yield* ctx.expectSome(
        "the revealed list still reports a scroll offset",
        Option.fromNullishOr(ctx.host.scrollOffset("wlist")),
      );
      yield* ctx.expectNear(
        "the far jump lands on the estimate's arithmetic",
        revealed.y,
        -REVEAL * ROW_HEIGHT,
        ROW_HEIGHT,
      );
    }),
};
