/**
 * `variable-rows` — a virtual list with **real** row heights, and an
 * expandable row.
 *
 * Every other virtual-list probe uses fixed heights. The published
 * `<virtual-list>` documents itself as a variable-height list and takes
 * `estimatedItemHeight`; nothing measured whether declared heights stack, what
 * an expansion does to the rows below, or whether a jump is still exact.
 *
 * Measured facts: plan `198` §7. The recipe for Expandable rows / a message
 * thread: declare each row's height, keep `estimatedItemHeight` a rough
 * average, and let the list do the arithmetic.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const ROWS = 60;
/** The height a row of each parity declares, in px. */
const baseHeight = (index: number): number => 20 + (index % 3) * 20;
/** How much taller the expandable row becomes. */
const EXPAND_BY = 60;
/** The row that expands. */
const EXPANDABLE = 2;
/** The list viewport: exactly six base rows of rows 0–5 (20+40+60+20+40+60). */
const VIEWPORT = 300;
const WIDTH = 320;

const heightOf = (index: number, expanded: number | null): number =>
  index === expanded ? baseHeight(index) + EXPAND_BY : baseHeight(index);

/** The `y` a row starts at when no row is expanded. */
const baseY = (index: number): number =>
  Arr.reduce(Arr.range(0, index), 0, (sum, row) => sum + baseHeight(row)) -
  baseHeight(index);

/** The expected row indices, so a step never hand-writes six numbers. */
const ROWS_0_TO_5 = Arr.range(0, 5);

const VariableRowsProbe = () => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div
      testId="variable-rows-view"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 820,
        height: 400,
        padding: 16,
        backgroundColor: theme.colors.background,
      }}
    >
      <Readout testId="vr-state">
        {`expanded=${Option.getOrElse(Option.fromNullishOr(expanded), () => "none")}`}
      </Readout>
      <div
        testId="vr-viewport"
        style={{ display: "flex", width: WIDTH, height: VIEWPORT }}
      >
        <virtual-list
          testId="vr-list"
          estimatedItemHeight={20}
          style={{ width: WIDTH, height: VIEWPORT }}
        >
          {Arr.map(Arr.range(0, ROWS - 1), (index) => (
            <div
              key={index}
              testId={`vr-row-${index}`}
              onClick={
                index === EXPANDABLE
                  ? () =>
                      setExpanded((current) =>
                        current === EXPANDABLE ? null : EXPANDABLE,
                      )
                  : undefined
              }
              style={{
                height: heightOf(index, expanded),
                flexShrink: 0,
                backgroundColor:
                  index % 2 === 0
                    ? theme.colors.muted
                    : theme.colors.background,
              }}
            >
              <text style={{ fontSize: 12, color: theme.colors.foreground }}>
                {`row ${index}`}
              </text>
            </div>
          ))}
        </virtual-list>
      </div>
    </div>
  );
};

/** The painted box of a row, or a failure naming the missing id. */
const rowBox = (ctx: Smoke.SmokeContext, index: number) =>
  ctx.expectSome(
    `row ${index} is painted`,
    Option.fromNullishOr(ctx.host.bounds(`vr-row-${index}`)),
  );

export const variableRowsScenario: PlaygroundScenario = {
  id: "variable-rows",
  title: "Variable rows: real heights, expansion and an exact jump",
  capability: "virtual-list",
  view: () => <VariableRowsProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const list = yield* ctx.expectSome(
        "the list viewport is painted",
        Option.fromNullishOr(ctx.host.bounds("vr-viewport")),
      );

      // 1. Declared heights stack; the window is built, not the whole list.
      const start = yield* ctx.expectSome(
        "the list reports an anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("vr-list")),
      );
      yield* ctx.expectEqual("the list starts on row 0", start[0], 0);
      yield* ctx.expectEqual("the list starts at offset 0", start[1], 0);
      yield* ctx.expectEqual("the viewport height", start[2], VIEWPORT);

      yield* Effect.forEach(
        ROWS_0_TO_5,
        (index) =>
          Effect.gen(function* () {
            const box = yield* rowBox(ctx, index);
            yield* ctx.expectNear(
              `row ${index} stacks at its declared height`,
              box.y - list.y,
              baseY(index),
              1,
            );
            yield* ctx.expectNear(
              `row ${index} declares its own height`,
              box.height,
              baseHeight(index),
              1,
            );
          }),
        { concurrency: 1, discard: true },
      );

      const painted = ctx.host.paintedText();
      yield* ctx.expectEqual(
        "the window starts at row 0",
        Arr.contains(painted, "row 0"),
        true,
      );
      yield* ctx.expectEqual(
        "the window is the visible rows only",
        Arr.contains(painted, "row 40"),
        false,
      );

      // 2. Expanding reflows the rows below by exactly the delta.
      ctx.host.click("vr-row-2");
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "the readout records the expansion",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text("vr-state")),
          () => "",
        ),
        "expanded=2",
      );
      const grown = yield* rowBox(ctx, 2);
      yield* ctx.expectNear(
        "the expanded row grows by exactly 60",
        grown.height,
        baseHeight(EXPANDABLE) + EXPAND_BY,
        1,
      );
      yield* Effect.forEach(
        Arr.range(3, 5),
        (index) =>
          Effect.gen(function* () {
            const box = yield* rowBox(ctx, index);
            yield* ctx.expectNear(
              `row ${index} moves down by the expansion`,
              box.y - list.y,
              baseY(index) + EXPAND_BY,
              1,
            );
          }),
        { concurrency: 1, discard: true },
      );

      const expandedAnchor = yield* ctx.expectSome(
        "the expanded list still reports an anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("vr-list")),
      );
      yield* ctx.expectEqual(
        "the expansion does not move the anchor",
        `[${Arr.join(Arr.map(expandedAnchor, String), ",")}]`,
        `[0,0,${VIEWPORT}]`,
      );
      yield* ctx.expectEqual(
        "the taller rows shrink the painted window",
        Arr.contains(ctx.host.paintedText(), "row 6"),
        false,
      );

      // 3. Collapsing restores the arithmetic.
      ctx.host.click("vr-row-2");
      ctx.host.advance(0);
      const shrunk = yield* rowBox(ctx, 3);
      yield* ctx.expectNear(
        "collapsing moves the rows back",
        shrunk.y - list.y,
        baseY(3),
        1,
      );
      yield* ctx.expectEqual(
        "the shorter window paints row 7 again",
        Arr.contains(ctx.host.paintedText(), "row 7"),
        true,
      );

      // 4. A jump is exact with mixed heights.
      ctx.host.scrollToItem("vr-list", 30);
      ctx.host.advance(0);
      const jumped = yield* ctx.expectSome(
        "the jumped list reports an anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("vr-list")),
      );
      yield* ctx.expectEqual("the jump anchors the row", jumped[0], 30);
      yield* ctx.expectEqual("the jump lands at offset 0", jumped[1], 0);
      yield* ctx.expectEqual(
        "the jump keeps the viewport",
        jumped[2],
        VIEWPORT,
      );
      const jumpedRow = yield* rowBox(ctx, 30);
      yield* ctx.expectNear(
        "the jumped row sits at the viewport top",
        jumpedRow.y,
        list.y,
        1,
      );
      yield* ctx.expectEqual(
        "the jump unmounts the rows above it",
        Arr.contains(ctx.host.paintedText(), "row 29"),
        false,
      );

      // 5. `scrollIntoView` reveals a variable-height row from a jump far away.
      ctx.host.scrollToItem("vr-list", 0);
      ctx.host.advance(0);
      ctx.host.scrollIntoView("vr-row-45");
      ctx.host.advance(0);
      const revealed = yield* ctx.expectSome(
        "row 45 is retained for a reveal",
        Option.fromNullishOr(ctx.host.bounds("vr-row-45")),
      );
      yield* ctx.expectEqual(
        "scrollIntoView reveals a variable-height row",
        revealed.y >= list.y - 1 &&
          revealed.y + revealed.height <= list.y + list.height + 1,
        true,
      );
      yield* ctx.expectEqual(
        "the revealed row is painted",
        Arr.contains(ctx.host.paintedText(), "row 45"),
        true,
      );

      // 6. A wheel's anchor stays inside the row it names.
      ctx.host.scrollToItem("vr-list", 0);
      ctx.host.advance(0);
      ctx.host.wheel("vr-list", 0, -120);
      ctx.host.advance(0);
      const wheeled = yield* ctx.expectSome(
        "the wheeled list reports an anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("vr-list")),
      );
      yield* ctx.expectEqual(
        "the wheel moves past row 0",
        wheeled[0] > 0,
        true,
      );
      yield* ctx.expectEqual(
        "the in-row offset is inside that row",
        wheeled[1] >= 0 && wheeled[1] < baseHeight(wheeled[0]),
        true,
      );

      ctx.host.screenshot(
        "apps/playground/.artifacts/screenshots/variable-rows.png",
      );
    }),
};
