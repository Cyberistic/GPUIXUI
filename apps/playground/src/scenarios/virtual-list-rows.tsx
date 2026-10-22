/**
 * `virtual-list-rows` — a `<virtual-list>` measures each row, not a uniform one.
 *
 * Every other virtual-list probe declares fixed-height rows, so "rows do not
 * need equal heights" was the runtime's claim and nothing here had measured it.
 * A table with a wrapped description, a tree with a two-line label and an
 * expandable row (`motion` height) all depend on the measured path, and so does
 * the anchoring a growing row needs: a row above the reader that grows must not
 * move the rows the reader is looking at.
 *
 * The list declares 400 rows whose heights cycle 24 / 48 / 72px, so a uniform
 * row would be visible immediately in the painted boxes. Measured on 0.11.0:
 *
 *   - the painted rows carry those three heights and each row starts where the
 *     previous one ended, so the list stacks measured heights rather than
 *     assuming one;
 *   - `scrollToItem(150)` lands that row at the viewport's top edge even though
 *     most rows above it were only ever estimated;
 *   - growing row 0 by 40px while the reader sits at row 150 leaves the painted
 *     rows and the scroll offset untouched, because a row outside the window is
 *     not measured until it paints again — the reader cannot be jolted by a row
 *     they cannot see, and no compensation is owed;
 *   - the grown row reports its new height once it is painted again, and the row
 *     after it moves down by the growth.
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
import { Pressable } from "../ui.js";
import type { ScenarioBody } from "../types.js";
import type { Smoke } from "@gpuixui/testing";

/** Rows declared; far more than the viewport with mixed heights. */
const ROWS = 400;
/** The three heights a row cycles through, in pixels. */
const HEIGHTS = [24, 48, 72] as const;
/** The row the far reveal jumps to. */
const REVEAL = 150;
/** How much row 0 grows by, while the reader is at the tail. */
const GROWTH = 40;

const heightAt = (index: number): number =>
  index === 0
    ? HEIGHTS[0]
    : index % HEIGHTS.length === 1
      ? HEIGHTS[1]
      : HEIGHTS[2];

const VariableRowsProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const list = useRef<PublicInstance | null>(null);
  const [grown, setGrown] = useState(false);

  const rowHeight = (index: number): number =>
    grown && index === 0 ? HEIGHTS[0] + GROWTH : heightAt(index);

  const jump = (index: number) => (): void => {
    const elementId = list.current?.id;
    if (elementId != null) renderer?.scrollToItem?.(elementId, index);
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
      <div style={{ display: "flex", height: 240 }}>
        <virtual-list
          testId="vrows"
          ref={list}
          style={{ flexGrow: 1, minHeight: 0 }}
        >
          {Array.from({ length: ROWS }, (_, index) => (
            <div
              key={index}
              testId={`vrow-${index}`}
              style={{
                height: rowHeight(index),
                padding: 4,
                backgroundColor: theme.colors.background,
              }}
            >
              <text
                style={{ color: theme.colors.foreground }}
              >{`Row ${index}`}</text>
            </div>
          ))}
        </virtual-list>
      </div>
      <Pressable testId="vrows-reveal" onClick={jump(REVEAL)}>
        {`Reveal ${REVEAL}`}
      </Pressable>
      <Pressable testId="vrows-grow" onClick={() => setGrown(true)}>
        Grow row 0
      </Pressable>
      <Pressable testId="vrows-top" onClick={jump(0)}>
        Back to top
      </Pressable>
    </div>
  );
};

/** The rows the list currently paints, as the `Row N` labels become `N`s. */
const paintedRows = (lines: ReadonlyArray<string>): ReadonlyArray<number> =>
  Arr.filterMap(lines, (line) =>
    pipe(
      Str.match(/^Row (\d+)$/)(line),
      Option.flatMap((match) => Option.fromNullishOr(match[1])),
      Option.match({
        onNone: () => Result.failVoid,
        onSome: (value) => Result.succeed(Number.parseInt(value, 10)),
      }),
    ),
  );

export const virtualListRowsScenario: ScenarioBody = {
  view: () => <VariableRowsProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const boundsOf = (testId: string): Option.Option<Smoke.Bounds> =>
        Option.fromNullishOr(ctx.host.bounds(testId));
      const heightOf = (testId: string): number =>
        Option.getOrElse(
          Option.map(boundsOf(testId), (bounds) => bounds.height),
          () => -1,
        );
      const yOf = (testId: string): number =>
        Option.getOrElse(
          Option.map(boundsOf(testId), (bounds) => bounds.y),
          () => -1,
        );

      // 1. Three different heights, stacked by their own measured sizes.
      yield* ctx.expectEqual(
        "the first row keeps its declared height",
        heightOf("vrow-0"),
        HEIGHTS[0],
      );
      yield* ctx.expectEqual(
        "the second row keeps its own, different height",
        heightOf("vrow-1"),
        HEIGHTS[1],
      );
      yield* ctx.expectEqual(
        "the third row keeps the third height",
        heightOf("vrow-2"),
        HEIGHTS[2],
      );
      yield* ctx.expectNear(
        "the second row starts where the first one ended",
        yOf("vrow-1"),
        yOf("vrow-0") + HEIGHTS[0],
        1,
      );
      yield* ctx.expectNear(
        "the third row starts where the second one ended",
        yOf("vrow-2"),
        yOf("vrow-1") + HEIGHTS[1],
        1,
      );

      // 2. A far reveal lands on a row it never measured, from estimates.
      ctx.host.click("vrows-reveal");
      ctx.host.advance(50);
      yield* ctx.expectContains(
        "the revealed row is painted",
        Arr.join(ctx.host.paintedText(), "\n"),
        `Row ${REVEAL}`,
      );
      yield* ctx.expectNear(
        "the revealed row lands at the viewport's top edge",
        yOf(`vrow-${REVEAL}`),
        yOf("vrows"),
        2,
      );
      yield* ctx.expectEqual(
        "the revealed row keeps its own cycle height",
        heightOf(`vrow-${REVEAL}`),
        heightAt(REVEAL),
      );

      // 3. A row above the reader grows: nothing moves, because it is unmeasured
      //    until it paints again (a row outside the window has no layout to
      //    change, so the reader cannot be jolted by it).
      const offsetBefore = yield* ctx.expectSome(
        "the list reports an offset before the grow",
        Option.fromNullishOr(ctx.host.scrollOffset("vrows")),
      );
      const before = paintedRows(ctx.host.paintedText());
      yield* ctx.expectEqual(
        "the grown row is outside the painted window",
        Arr.contains(before, 0),
        false,
      );
      ctx.host.click("vrows-grow");
      ctx.host.advance(50);
      ctx.host.advance(50);
      const after = paintedRows(ctx.host.paintedText());
      const offsetAfter = yield* ctx.expectSome(
        "the list reports an offset after the grow",
        Option.fromNullishOr(ctx.host.scrollOffset("vrows")),
      );
      yield* ctx.expectEqual(
        "the rows the reader is looking at stay where they were",
        Arr.join(Arr.map(after, String), ","),
        Arr.join(Arr.map(before, String), ","),
      );
      yield* ctx.expectNear(
        "an off-window row's new height moves no offset until it paints",
        offsetAfter.y,
        offsetBefore.y,
        1,
      );

      // 4. The grown row reports its new height when it paints again.
      ctx.host.click("vrows-top");
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the grown first row paints its new height",
        heightOf("vrow-0"),
        HEIGHTS[0] + GROWTH,
      );
      yield* ctx.expectNear(
        "the row after it moved down by the growth",
        yOf("vrow-1"),
        yOf("vrow-0") + HEIGHTS[0] + GROWTH,
        1,
      );
    }),
};
