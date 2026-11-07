import { useRef, useState } from "react";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { Effect, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { useTheme } from "@gpuixui/tokens/react";
import { Readout } from "../ui.js";
import type { Smoke } from "@gpuixui/testing";
import type { ScenarioBody } from "../types.js";

const ROWS = 60;

const ROW_HEIGHT = 28;

const FROZEN_WIDTH = 120;
const BODY_WIDTH = 240;

const VIEWPORT = 240;

const MAX_OFFSET = ROWS * ROW_HEIGHT - VIEWPORT;

const FrozenColumnProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const frozen = useRef<PublicInstance | null>(null);
  const body = useRef<PublicInstance | null>(null);
  const syncing = useRef(false);
  const [selected, setSelected] = useState(-1);

  const mirror =
    (target: "frozen" | "body") =>
    (event: EventPayload): void => {
      const elementId = (target === "frozen" ? frozen : body).current?.id;
      const y = event.scrollY;

      if (elementId == null || y == null || syncing.current) return;
      syncing.current = true;
      renderer?.scrollTo?.(elementId, 0, y);
      syncing.current = false;
    };

  const rows = Array.from({ length: ROWS }, (_, index) => index);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: FROZEN_WIDTH + BODY_WIDTH,
        height: 340,
      }}
    >
      <div style={{ display: "flex", height: VIEWPORT }}>
        <div
          testId="frozen"
          ref={frozen}
          onScrollChange={mirror("body")}
          style={{
            width: FROZEN_WIDTH,
            height: VIEWPORT,
            overflowY: "scroll",
            backgroundColor: theme.colors.muted,
          }}
        >
          {rows.map((index) => (
            <div
              key={index}
              testId={`frozen-row-${index}`}
              onClick={() => setSelected(index)}
              style={{
                display: "flex",
                height: ROW_HEIGHT,
                alignItems: "center",
                backgroundColor:
                  selected === index ? theme.colors.accent : theme.colors.muted,
              }}
            >
              <text style={{ color: theme.colors.foreground }}>
                {`F${index}`}
              </text>
            </div>
          ))}
        </div>
        <div
          testId="grid-body"
          ref={body}
          onScrollChange={mirror("frozen")}
          style={{
            width: BODY_WIDTH,
            height: VIEWPORT,
            overflowY: "scroll",
            overflowX: "scroll",
          }}
        >
          {rows.map((index) => (
            <div
              key={index}
              testId={`body-row-${index}`}
              style={{
                display: "flex",
                width: 600,
                height: ROW_HEIGHT,
                alignItems: "center",
              }}
            >
              <div style={{ width: 200 }}>
                <text
                  style={{ color: theme.colors.foreground }}
                >{`B${index}`}</text>
              </div>
              <div style={{ width: 200 }}>
                <text style={{ color: theme.colors.mutedForeground }}>
                  {`C${index}`}
                </text>
              </div>
              <div style={{ width: 200 }}>
                <text style={{ color: theme.colors.mutedForeground }}>
                  {`D${index}`}
                </text>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Readout testId="frozen-selected">
        {selected < 0 ? "none" : `r${selected}`}
      </Readout>
    </div>
  );
};

const paintedRows = (lines: ReadonlyArray<string>): ReadonlyArray<number> =>
  Arr.filterMap(lines, (line) =>
    pipe(
      Str.match(/^B(\d+)$/)(line),
      Option.flatMap((match) => Option.fromNullishOr(match[1])),
      Option.match({
        onNone: () => Result.failVoid,
        onSome: (value) => Result.succeed(Number.parseInt(value, 10)),
      }),
    ),
  );

export const dataGridFrozenColumnScenario: ScenarioBody = {
  view: () => <FrozenColumnProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const boundsOf = (testId: string) =>
        Option.fromNullishOr(ctx.host.bounds(testId));
      const yOf = (testId: string): number =>
        Option.getOrElse(
          Option.map(boundsOf(testId), (bounds) => bounds.y),
          () => -1,
        );
      const xOf = (testId: string): number =>
        Option.getOrElse(
          Option.map(boundsOf(testId), (bounds) => bounds.x),
          () => -1,
        );
      const offsetOf = (
        testId: string,
      ): Effect.Effect<Smoke.Offset, Smoke.SmokeAssertionError> =>
        ctx.expectSome(
          `${testId} reports a scroll offset`,
          Option.fromNullishOr(ctx.host.scrollOffset(testId)),
        );

      const frozenStart = yield* offsetOf("frozen");
      const bodyStart = yield* offsetOf("grid-body");
      yield* ctx.expectEqual(
        "the frozen pane starts at the top",
        frozenStart.y,
        0,
      );
      yield* ctx.expectEqual("the grid starts at the top", bodyStart.y, 0);
      yield* ctx.expectNear(
        "the first row sits at the same y in both panes",
        yOf("frozen-row-0"),
        yOf("body-row-0"),
        1,
      );

      ctx.host.wheel("grid-body", 0, -300);
      ctx.host.advance(50);
      const frozenAfterGrid = yield* offsetOf("frozen");
      const bodyAfterGrid = yield* offsetOf("grid-body");
      yield* ctx.expectNear(
        "the grid follows the wheel",
        bodyAfterGrid.y,
        -300,
        2,
      );
      yield* ctx.expectNear(
        "the frozen column follows the grid",
        frozenAfterGrid.y,
        bodyAfterGrid.y,
        1,
      );

      ctx.host.wheel("frozen", 0, -300);
      ctx.host.advance(50);
      const frozenAfterBoth = yield* offsetOf("frozen");
      const bodyAfterBoth = yield* offsetOf("grid-body");
      yield* ctx.expectNear(
        "the frozen column's own wheel scrolls it",
        frozenAfterBoth.y,
        -600,
        2,
      );
      yield* ctx.expectNear(
        "the grid mirrors the frozen column",
        bodyAfterBoth.y,
        frozenAfterBoth.y,
        1,
      );

      const bodyRows = paintedRows(ctx.host.paintedText());
      yield* ctx.expectEqual(
        "the grid paints rows past the frozen column",
        Arr.some(bodyRows, (row) => row > 20),
        true,
      );
      const row = yield* ctx.expectSome(
        "a row inside the scrolled window exists",
        Arr.findFirst(bodyRows, (value) => value >= 22 && value <= 25),
      );
      yield* ctx.expectNear(
        `row ${row} lines up between the frozen column and the grid`,
        yOf(`frozen-row-${row}`),
        yOf(`body-row-${row}`),
        1,
      );

      const frozenX = xOf(`frozen-row-${row}`);
      const bodyX = xOf(`body-row-${row}`);
      ctx.host.wheel("grid-body", -200, 0);
      ctx.host.advance(50);
      const bodyPan = yield* offsetOf("grid-body");
      yield* ctx.expectNear(
        "a horizontal wheel pans the grid",
        bodyPan.x,
        -200,
        2,
      );
      yield* ctx.expectNear(
        "the grid's row moved left with the pan",
        xOf(`body-row-${row}`),
        bodyX - 200,
        2,
      );
      yield* ctx.expectNear(
        "the frozen column stayed where it was",
        xOf(`frozen-row-${row}`),
        frozenX,
        1,
      );

      ctx.host.click(`frozen-row-${row}`);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "a press on a frozen cell selects its row",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text("frozen-selected")),
          () => "",
        ),
        `r${row}`,
      );

      ctx.host.wheel("grid-body", 0, -10_000);
      ctx.host.advance(50);
      const frozenEnd = yield* offsetOf("frozen");
      const bodyEnd = yield* offsetOf("grid-body");
      yield* ctx.expectNear(
        "the grid clamps at the content's end",
        bodyEnd.y,
        -MAX_OFFSET,
        2,
      );
      yield* ctx.expectNear(
        "the frozen column clamps with it",
        frozenEnd.y,
        bodyEnd.y,
        1,
      );
    }),
};
