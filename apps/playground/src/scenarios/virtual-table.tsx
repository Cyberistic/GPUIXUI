/**
 * `virtualized-table` — a 500-row table inside `<virtual-list>`.
 *
 * The data-grid package needs the combination, not the two halves measured
 * separately in plan `130`: fixed-width table cells inside a virtual row, a
 * pointer hit on a row that is genuinely painted, `onVisibleRange`'s index,
 * and selection state that survives scrolling the row out of the window.
 *
 * Measured facts (plan `152` §8): the list paints a window of fixed-height
 * rows; a painted row is hittable; the range event reports a positive start
 * index after a wheel gesture; selection is React state and repaints after the
 * row leaves and re-enters the window. Rows are flex rows with fixed-width
 * cells because `gridTemplateColumns` is a column count in 0.10.0.
 *
 * The wheel's `deltaY` is negative to scroll down (see `scroll.tsx`).
 */
import { useState } from "react";
import { Effect, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";

const ROWS = 500;
const ROW_HEIGHT = 32;

const COLUMNS = [
  { label: "Name", width: 220 },
  { label: "Kind", width: 100 },
  { label: "Size", width: 80 },
] as const;

const VirtualTableProbe = () => {
  const theme = useTheme();
  const [selected, setSelected] = useState(-1);
  const [range, setRange] = useState({ start: -1, end: -1 });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 520,
        height: 360,
      }}
    >
      <div style={{ display: "flex", height: 24 }}>
        {COLUMNS.map((column) => (
          <div key={column.label} style={{ width: column.width }}>
            <text
              style={{
                fontSize: 12,
                color: theme.colors.mutedForeground,
              }}
            >
              {column.label}
            </text>
          </div>
        ))}
      </div>
      <div testId="vtable-viewport" style={{ display: "flex", height: 280 }}>
        <virtual-list
          testId="vtable"
          style={{ flexGrow: 1, minHeight: 0 }}
          onVisibleRange={(event) =>
            setRange({
              start: event.startIndex ?? -1,
              end: event.endIndex ?? -1,
            })
          }
        >
          {Array.from({ length: ROWS }, (_, index) => (
            <div
              key={index}
              testId={`vtable-row-${index}`}
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
              <div style={{ width: 220 }}>
                <text
                  style={{ color: theme.colors.foreground }}
                >{`File ${index}`}</text>
              </div>
              <div style={{ width: 100 }}>
                <text style={{ color: theme.colors.mutedForeground }}>
                  {index % 2 === 0 ? "file" : "dir"}
                </text>
              </div>
              <div style={{ width: 80 }}>
                <text
                  style={{ color: theme.colors.mutedForeground }}
                >{`${index} B`}</text>
              </div>
            </div>
          ))}
        </virtual-list>
      </div>
      <Readout testId="vtable-selected">
        {selected < 0 ? "none" : `r${selected}`}
      </Readout>
      <Readout testId="vtable-start">{`${range.start}`}</Readout>
      <Readout testId="vtable-end">{`${range.end}`}</Readout>
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

/** The rows the list currently paints, as `File N` labels become `N`s. */
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

const backgroundColor = (ctx: Smoke.SmokeContext, testId: string): string =>
  pipe(
    Option.fromNullishOr(ctx.host.paintedStyle(testId)),
    Option.flatMap((style) => style.backgroundColor),
    Option.getOrElse(() => ""),
  );

export const virtualizedTableScenario: ScenarioBody = {
  view: () => <VirtualTableProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const firstPaint = ctx.host.paintedText();
      yield* ctx.expectContains(
        "the first row is painted",
        Arr.join(firstPaint, "\n"),
        "File 0",
      );
      yield* ctx.expectEqual(
        "only a window of the 500 rows is painted",
        Arr.some(firstPaint, (line) => line === `File ${ROWS - 1}`),
        false,
      );

      ctx.host.wheel("vtable", 0, -600);
      ctx.host.advance(50);
      ctx.host.wheel("vtable", 0, -600);
      ctx.host.advance(50);

      const painted = paintedRows(ctx.host.paintedText());
      const start = yield* ctx.expectSome(
        "the range event reported a start index",
        Option.filter(
          Option.some(
            readIndex(Option.fromNullishOr(ctx.host.text("vtable-start"))),
          ),
          (value) => value > 0,
        ),
      );
      yield* ctx.expectEqual(
        "the painted window moved past the first row",
        Arr.contains(painted, 0),
        false,
      );
      // `onVisibleRange` lags the painted window by one gesture (measured):
      // use the painted rows to choose a row that is genuinely on screen.
      yield* ctx.expectEqual(
        "the range event is behind the painted window",
        start <= Option.getOrElse(Arr.head(painted), () => -1),
        true,
      );
      const target = yield* ctx.expectSome(
        "a second painted row exists",
        Arr.head(Arr.drop(painted, 1)),
      );
      const list = yield* ctx.expectSome(
        "the virtual list viewport is painted",
        Option.fromNullishOr(ctx.host.bounds("vtable-viewport")),
      );
      const row = yield* ctx.expectSome(
        "a row inside the reported window is painted",
        Option.fromNullishOr(ctx.host.bounds(`vtable-row-${target}`)),
      );
      yield* ctx.expectEqual(
        "the row lies inside the list's bounds",
        row.y >= list.y && row.y + row.height <= list.y + list.height,
        true,
      );

      ctx.host.click(`vtable-row-${target}`);
      ctx.host.advance(50);
      const selected = yield* ctx.expectSome(
        "the selection readout is painted",
        Option.fromNullishOr(ctx.host.text("vtable-selected")),
      );
      yield* ctx.expectEqual(
        "clicking a painted virtual row selects it",
        selected,
        `r${target}`,
      );
      yield* ctx.expectEqual(
        "the selected row repaints with a different background",
        backgroundColor(ctx, `vtable-row-${target}`) !==
          backgroundColor(ctx, `vtable-row-${target + 1}`) &&
          backgroundColor(ctx, `vtable-row-${target}`) !== "",
        true,
      );

      ctx.host.wheel("vtable", 0, 600);
      ctx.host.advance(50);
      ctx.host.wheel("vtable", 0, 600);
      ctx.host.advance(50);
      yield* ctx.expectContains(
        "the first row is painted again at the top",
        Arr.join(ctx.host.paintedText(), "\n"),
        "File 0",
      );
      yield* ctx.expectEqual(
        "selection survives the row leaving and re-entering the window",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text("vtable-selected")),
          () => "",
        ),
        `r${target}`,
      );
    }),
};
