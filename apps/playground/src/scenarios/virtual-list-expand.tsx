/**
 * `virtual-list-expand` — a row that grows **while it is painted** re-measures.
 *
 * `virtual-list-rows` measured rows that differ from each other and a row that
 * grows while it is outside the window. The case an expandable row needs — Tier
 * 3's "expandable rows", and an expandable table row in a data grid — is the
 * third one: the reader presses a row that is on screen, it renders a detail
 * block, and the layout below has to follow without a scroll event to prompt a
 * re-measure.
 *
 * 200 rows of 32px; row 3 grows to 32 + 88px while its detail is open. Measured
 * on 0.11.0:
 *
 *   - an expansion that never scrolls re-measures the row immediately (the box
 *     paints 120px on the next frame);
 *   - the list paints only rows that fit the viewport whole, so the grown row
 *     leaves 24px below and the next row leaves the painted window until the
 *     reader scrolls — the layout below moved, it is just not painted yet;
 *   - after one wheel the rows return at their shifted positions
 *     (`row 4 = row 3 + 120`), and a press lands on the row that is painted
 *     there, so the shift is layout, not a stale hit-test;
 *   - collapsing returns the rows to one 32px pitch, and the detail unpaints;
 *   - the grown height joins the estimate: `scrollToItem(150)` still lands that
 *     row on the viewport's top edge, so a reveal is not 88px out;
 *   - the height survives the row leaving the window and painting again, so a
 *     row reopened by state keeps its measured box.
 */
import { useRef, useState } from "react";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useTheme } from "@gpuixui/tokens/react";
import { Pressable, Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";
import type { Smoke } from "@gpuixui/testing";
import {
  DETAIL,
  REVEAL,
  ROWS,
  ROW,
  TARGET,
  VIEWPORT,
  heightAt,
} from "./expand-fixture.js";

const ExpandableRowsProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const list = useRef<PublicInstance | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(-1);

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
      <div style={{ display: "flex", height: VIEWPORT }}>
        <virtual-list
          testId="xrows"
          ref={list}
          style={{ flexGrow: 1, minHeight: 0 }}
        >
          {Array.from({ length: ROWS }, (_, index) => (
            <div
              key={index}
              testId={`xrow-${index}`}
              onClick={() => setSelected(index)}
              style={{
                height: heightAt(index, open),
                display: "flex",
                flexDirection: "column",
                backgroundColor:
                  selected === index
                    ? theme.colors.accent
                    : theme.colors.background,
              }}
            >
              <text style={{ color: theme.colors.foreground }}>
                {`Row ${index}`}
              </text>
              {index === TARGET && open ? (
                <div
                  testId="xdetail"
                  style={{ height: DETAIL, paddingLeft: 12 }}
                >
                  <text style={{ color: theme.colors.mutedForeground }}>
                    Detail 3
                  </text>
                </div>
              ) : null}
            </div>
          ))}
        </virtual-list>
      </div>
      <Readout testId="x-readout">{`open=${open} selected=${selected}`}</Readout>
      <Pressable testId="x-toggle" onClick={() => setOpen((value) => !value)}>
        Toggle detail
      </Pressable>
      <Pressable testId="x-reveal" onClick={jump(REVEAL)}>
        {`Reveal ${REVEAL}`}
      </Pressable>
      <Pressable testId="x-top" onClick={jump(0)}>
        Back to top
      </Pressable>
    </div>
  );
};

export const virtualListExpandScenario: ScenarioBody = {
  view: () => <ExpandableRowsProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const boundsOf = (testId: string): Option.Option<Smoke.Bounds> =>
        Option.fromNullishOr(ctx.host.bounds(testId));
      const heightOfRow = (index: number): number =>
        Option.getOrElse(
          Option.map(boundsOf(`xrow-${index}`), (bounds) => bounds.height),
          () => -1,
        );
      const yOf = (testId: string): number =>
        Option.getOrElse(
          Option.map(boundsOf(testId), (bounds) => bounds.y),
          () => -1,
        );
      const readout = (): string =>
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text("x-readout")),
          () => "",
        );

      // 1. Collapsed: the target row and the row below it share one pitch.
      yield* ctx.expectEqual(
        "the target row starts collapsed",
        heightOfRow(TARGET),
        ROW,
      );
      yield* ctx.expectNear(
        "the row below it starts one row lower",
        yOf(`xrow-${TARGET + 1}`),
        yOf(`xrow-${TARGET}`) + ROW,
        1,
      );

      // 2. Expanding a painted row grows its box on the next frame, with no
      //    scroll to prompt a re-measure.
      const topRow = yOf("xrow-0");
      const offsetBefore = yield* ctx.expectSome(
        "the list reports an offset before the expansion",
        Option.fromNullishOr(ctx.host.scrollOffset("xrows")),
      );
      ctx.host.click("x-toggle");
      ctx.host.advance(50);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the readout reports the row open",
        readout(),
        "open=true selected=-1",
      );
      yield* ctx.expectEqual(
        "the expanded row re-measures without a scroll",
        heightOfRow(TARGET),
        ROW + DETAIL,
      );
      yield* ctx.expectContains(
        "the detail block is painted",
        Arr.join(ctx.host.paintedText(), "\n"),
        "Detail 3",
      );
      yield* ctx.expectNear(
        "the rows above the growth did not move",
        yOf("xrow-0"),
        topRow,
        1,
      );
      yield* ctx.expectEqual(
        "the expansion moved no scroll offset",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.scrollOffset("xrows")),
          () => offsetBefore,
        ).y,
        offsetBefore.y,
      );

      // 3. The 88px growth leaves less than a row below it, and the list paints
      //    only whole rows, so the next row leaves the window until a scroll.
      yield* ctx.expectEqual(
        "the row below leaves the painted window until the reader scrolls",
        Option.isNone(boundsOf(`xrow-${TARGET + 1}`)),
        true,
      );

      // 4. One wheel repaints the rows at their shifted positions, and a press
      //    lands on the row painted there (layout, not a stale hit-test).
      ctx.host.wheel("xrows", 0, -80);
      ctx.host.advance(50);
      yield* ctx.expectNear(
        "the rows below sit one grown row down",
        yOf(`xrow-${TARGET + 1}`),
        yOf(`xrow-${TARGET}`) + ROW + DETAIL,
        1,
      );
      ctx.host.click(`xrow-${TARGET + 1}`);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "a press on the shifted row selects it",
        readout(),
        `open=true selected=${TARGET + 1}`,
      );

      // 5. Collapsing returns the rows to one pitch and unpaints the detail.
      ctx.host.click("x-top");
      ctx.host.advance(50);
      ctx.host.click("x-toggle");
      ctx.host.advance(50);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the collapsed row paints one row height again",
        heightOfRow(TARGET),
        ROW,
      );
      yield* ctx.expectEqual(
        "the detail block is gone",
        Str.includes("Detail 3")(Arr.join(ctx.host.paintedText(), "\n")),
        false,
      );
      yield* ctx.expectNear(
        "the rows below return with it",
        yOf(`xrow-${TARGET + 1}`),
        yOf(`xrow-${TARGET}`) + ROW,
        1,
      );

      // 6. The grown height joins the estimates: a far reveal is not 88px out.
      ctx.host.click("x-toggle");
      ctx.host.advance(50);
      ctx.host.click("x-reveal");
      ctx.host.advance(50);
      yield* ctx.expectContains(
        "the revealed row is painted",
        Arr.join(ctx.host.paintedText(), "\n"),
        `Row ${REVEAL}`,
      );
      yield* ctx.expectNear(
        "the reveal lands on the row's top edge with the grown row above it",
        yOf(`xrow-${REVEAL}`),
        yOf("xrows"),
        2,
      );

      // 7. The expanded height survives the row leaving the window and returning.
      ctx.host.click("x-top");
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the expanded row keeps its height after repainting",
        heightOfRow(TARGET),
        ROW + DETAIL,
      );
      yield* ctx.expectEqual(
        "the row below it is still pushed out by the kept height",
        Option.isNone(boundsOf(`xrow-${TARGET + 1}`)),
        true,
      );
    }),
};
