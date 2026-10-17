/**
 * `scroll-into-view` — making a keyboard-selected virtual row visible.
 *
 * `roving-focus` and `virtualized-tree` prove focus can leave the painted
 * window; a command palette, grid or file tree must then bring the row back into
 * view. 0.10.0 offers two routes — `renderer.scrollIntoView(elementId)` and
 * `renderer.scrollToItem(listId, index)` — and neither had been measured inside
 * `<virtual-list>`.
 *
 * The probe implements the keyboard contract itself: Home/End and arrows move
 * the active index, focus the row, then call `scrollIntoView`. A separate step
 * calls the list-level `scrollToItem` to compare the two routes.
 *
 * Measured facts: plan `166` §8.
 */
import { useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const ROWS = 200;
const ROW_HEIGHT = 32;

const clamp = (index: number, last: number): number =>
  Math.min(Math.max(index, 0), last);

const ScrollProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const ids = useRef<Array<Option.Option<number>>>([]);
  const [active, setActive] = useState(0);

  const focusRow = (index: number): void => {
    setActive(index);
    Option.match(Option.flatten(Option.fromNullishOr(ids.current[index])), {
      onNone: () => undefined,
      onSome: (id) => renderer?.focusElement?.(id),
    });
  };

  const onKeyDown = (event: EventPayload): void => {
    if (event.key === "down") return focusRow(clamp(active + 1, ROWS - 1));
    if (event.key === "up") return focusRow(clamp(active - 1, ROWS - 1));
    if (event.key === "end") return focusRow(ROWS - 1);
    if (event.key === "home") return focusRow(0);
  };

  const attach = (index: number) => (instance: PublicInstance | null) => {
    ids.current[index] = Option.map(
      Option.fromNullishOr(instance),
      (element) => element.id,
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 320,
        height: 340,
        padding: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <Readout testId="siv-readout">{`active=${active}`}</Readout>
      <div style={{ display: "flex", height: 280 }}>
        <virtual-list testId="siv-list" style={{ flexGrow: 1, minHeight: 0 }}>
          {Array.from({ length: ROWS }, (_, index) => (
            <div
              key={index}
              testId={`siv-row-${index}`}
              ref={attach(index)}
              tabIndex={active === index ? 0 : -1}
              role="option"
              aria-selected={active === index}
              onClick={() => setActive(index)}
              onKeyDown={onKeyDown}
              style={{
                height: ROW_HEIGHT,
                display: "flex",
                alignItems: "center",
                padding: 6,
                backgroundColor:
                  active === index
                    ? theme.colors.accent
                    : theme.colors.background,
                hover: { backgroundColor: theme.colors.muted },
              }}
            >
              <text style={{ color: theme.colors.foreground }}>
                {`row ${index}`}
              </text>
            </div>
          ))}
        </virtual-list>
      </div>
    </div>
  );
};

const readout = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(
    Option.fromNullishOr(ctx.host.text("siv-readout")),
    () => "",
  );

const focused = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.focused()), () => "none");

const painted = (ctx: Smoke.SmokeContext, row: number): boolean =>
  Arr.some(ctx.host.paintedText(), (line) => line === `row ${row}`);

const offsetOf = (ctx: Smoke.SmokeContext): Option.Option<Smoke.Offset> =>
  Option.fromNullishOr(ctx.host.scrollOffset("siv-list"));

const anchorOf = (
  ctx: Smoke.SmokeContext,
): Option.Option<readonly [number, number, number]> =>
  Option.fromNullishOr(ctx.host.listScrollTop("siv-list"));

export const scrollIntoViewScenario: PlaygroundScenario = {
  id: "scroll-into-view",
  title: "Virtual list: scrollIntoView and scrollToItem",
  capability: "scroll",
  view: () => <ScrollProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const atRest = yield* ctx.expectSome(
        "the list reports a scroll offset",
        offsetOf(ctx),
      );
      yield* ctx.expectNear("the list starts at the top", atRest.y, 0, 1);
      yield* ctx.expectEqual("the first row is painted", painted(ctx, 0), true);
      yield* ctx.expectEqual(
        "the last row is not painted",
        painted(ctx, ROWS - 1),
        false,
      );

      // The generic route: focus the last row, then scroll its element into view.
      ctx.host.click("siv-row-0");
      ctx.host.key("end");
      yield* ctx.expectContains(
        "End selects the last row",
        readout(ctx),
        "active=199",
      );
      yield* ctx.expectEqual(
        "End focuses the last row",
        focused(ctx),
        "siv-row-199",
      );
      const atEnd = yield* ctx.expectSome(
        "the list reports an offset after End",
        offsetOf(ctx),
      );
      yield* ctx.expectEqual("End scrolled the list", atEnd.y < -500, true);
      const endAnchor = yield* ctx.expectSome(
        "the list reports a logical anchor after End",
        anchorOf(ctx),
      );
      yield* ctx.expectEqual(
        "the logical anchor is near the last row",
        endAnchor[0] + Math.floor(endAnchor[2] / ROW_HEIGHT) >= ROWS - 1,
        true,
      );
      yield* ctx.expectEqual(
        "the raw scroll offset saturates before the last row",
        atEnd.y > -2000,
        true,
      );
      yield* ctx.expectEqual(
        "scrollIntoView painted the last row",
        painted(ctx, ROWS - 1),
        true,
      );

      ctx.host.key("home");
      const atHome = yield* ctx.expectSome(
        "the list reports an offset after Home",
        offsetOf(ctx),
      );
      yield* ctx.expectNear("Home returned to the top", atHome.y, 0, 1);
      yield* ctx.expectEqual(
        "Home focuses the first row",
        focused(ctx),
        "siv-row-0",
      );
      yield* ctx.expectEqual(
        "Home painted the first row",
        painted(ctx, 0),
        true,
      );
      const homeAnchor = yield* ctx.expectSome(
        "the list reports a logical anchor after Home",
        anchorOf(ctx),
      );
      yield* ctx.expectEqual(
        "Home returns the anchor to the first row",
        homeAnchor[0],
        0,
      );

      // The list route: an index jump, independent of the row element.
      ctx.host.scrollToItem("siv-list", 120);
      const atItem = yield* ctx.expectSome(
        "the list reports an offset after scrollToItem",
        offsetOf(ctx),
      );
      yield* ctx.expectEqual(
        "scrollToItem scrolled the list",
        atItem.y < 0,
        true,
      );
      yield* ctx.expectEqual(
        "scrollToItem painted the indexed row",
        painted(ctx, 120),
        true,
      );
      const itemAnchor = yield* ctx.expectSome(
        "the list reports a logical anchor after scrollToItem",
        anchorOf(ctx),
      );
      yield* ctx.expectEqual(
        "the logical anchor is at the indexed row",
        Math.abs(itemAnchor[0] - 120) <= 5,
        true,
      );
      yield* ctx.expectContains(
        "scrollToItem does not change the selection",
        readout(ctx),
        "active=0",
      );

      // The element route from a distant window.
      ctx.host.scrollIntoView("siv-row-10");
      const atRow = yield* ctx.expectSome(
        "the list reports an offset after scrollIntoView",
        offsetOf(ctx),
      );
      yield* ctx.expectEqual(
        "scrollIntoView painted the target row",
        painted(ctx, 10),
        true,
      );
      yield* ctx.expectEqual(
        "scrollIntoView scrolled back toward the target",
        atRow.y > atItem.y,
        true,
      );
      const rowAnchor = yield* ctx.expectSome(
        "the list reports a logical anchor after scrollIntoView",
        anchorOf(ctx),
      );
      yield* ctx.expectEqual(
        "the logical anchor is at the target row",
        rowAnchor[0] <= 12,
        true,
      );

      // Keyboard follow: the next moves stay visible.
      ctx.host.click("siv-row-10");
      ctx.host.key("down");
      ctx.host.key("down");
      ctx.host.key("down");
      yield* ctx.expectContains(
        "three downs move the active row",
        readout(ctx),
        "active=13",
      );
      yield* ctx.expectEqual(
        "the keyboard move focuses the new row",
        focused(ctx),
        "siv-row-13",
      );
      yield* ctx.expectEqual(
        "the keyboard move keeps the row painted",
        painted(ctx, 13),
        true,
      );

      // A scroll is not a focus change.
      ctx.host.scrollIntoView("siv-row-199");
      yield* ctx.expectEqual(
        "scrollIntoView paints the far row",
        painted(ctx, ROWS - 1),
        true,
      );
      yield* ctx.expectEqual(
        "scrolling does not move focus",
        focused(ctx),
        "siv-row-13",
      );
    }),
};
