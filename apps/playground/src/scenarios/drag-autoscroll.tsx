/**
 * `drag-autoscroll` — scrolling a rail while a drag rests at its edge.
 *
 * Dragging a file or a row to the bottom of a workspace pane is how a tree
 * grows, and no scenario measured what the runtime does when the pointer sits
 * inside the edge band. Two identical 320×200 rails hold 24 rows of 40px:
 *
 * - the **plain** rail only records the drag, and its offset stays `0` — the
 *   runtime does not auto-scroll a scroller because a pointer rests near its
 *   edge (nor does it need to: the wheel, the scrollbar and `scrollTo` are the
 *   three ways an offset moves);
 * - the **driven** rail runs the alternative a component must implement: each
 *   `onMouseMove` whose window `y` is inside the rail's bottom band calls the
 *   renderer's `scrollTo` for one step, so the same eight-move drag scrolls it.
 *
 * The probe measures the app-driven path end to end (the rail's own painted
 * bounds, the renderer call and the offset it produces), so a docking or
 * file-tree component reads "auto-scroll is caller-driven" as a measurement
 * rather than as prose.
 */
import { useRef, useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import { Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";

const ROWS = 24;
const ROW_HEIGHT = 40;
const RAIL_HEIGHT = 200;
/** How close to the bottom edge a pointer must be to start scrolling. */
const EDGE = 24;
/** The distance one move scrolls the rail. */
const STEP = 16;

const Rail = ({
  id,
  driven,
}: {
  readonly id: string;
  readonly driven: boolean;
}) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const rail = useRef<PublicInstance | null>(null);
  const pressed = useRef(false);
  const offset = useRef(0);
  const [moves, setMoves] = useState(0);

  const move = (event: EventPayload) => {
    if (!driven || !pressed.current) return;
    const elementId = rail.current?.id;
    const y = event.y;
    if (elementId == null || y == null) return;
    const bounds = renderer?.getElementBounds?.(elementId);
    if (bounds == null) return;
    if (y < bounds.y + bounds.height - EDGE) return;
    offset.current -= STEP;
    setMoves((current) => current + 1);
    renderer?.scrollTo?.(elementId, 0, offset.current);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        testId={`${id}-rail`}
        ref={rail}
        style={{ width: 320, height: RAIL_HEIGHT, overflowY: "scroll" }}
        onScrollChange={(event) => {
          offset.current = event.scrollY ?? offset.current;
        }}
      >
        {Array.from({ length: ROWS }, (_, index) => (
          <div
            key={index}
            testId={`${id}-row-${index}`}
            onMouseDown={() => {
              pressed.current = true;
            }}
            onMouseMove={move}
            onMouseUp={() => {
              pressed.current = false;
            }}
            style={{
              height: ROW_HEIGHT,
              backgroundColor:
                index % 2 === 0 ? theme.colors.card : theme.colors.background,
            }}
          >
            <text style={{ color: theme.colors.foreground }}>{`row ${index}`}</text>
          </div>
        ))}
      </div>
      <Readout testId={`${id}-readout`}>{`moves=${moves}`}</Readout>
    </div>
  );
};

const DragAutoscrollProbe = () => (
  <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
    <Rail id="plain" driven={false} />
    <Rail id="driven" driven />
  </div>
);

const readout = (text: string | null): string =>
  Option.getOrElse(Option.fromNullishOr(text), () => "");

export const dragAutoscrollScenario: ScenarioBody = {
  view: () => <DragAutoscrollProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const offset = (id: string) =>
        Option.fromNullishOr(ctx.host.scrollOffset(`${id}-rail`));

      const plainStart = yield* ctx.expectSome(
        "the plain rail reports an offset",
        offset("plain"),
      );
      yield* ctx.expectEqual("the plain rail starts at the top", plainStart.y, 0);

      // Row 4's centre is y = 180, inside the 24px bottom band of the 200px
      // rail, so every synthesized move lands in it.
      ctx.host.drag("plain-row-4", 0, 10, 8);
      ctx.host.advance(50);
      const plainAfter = yield* ctx.expectSome(
        "the plain rail reports an offset after the drag",
        offset("plain"),
      );
      yield* ctx.expectEqual(
        "a drag at the edge does not scroll by itself",
        plainAfter.y,
        0,
      );
      yield* ctx.expectEqual(
        "the plain rail has no move handler",
        readout(ctx.host.text("plain-readout")),
        "moves=0",
      );

      const drivenStart = yield* ctx.expectSome(
        "the driven rail reports an offset",
        offset("driven"),
      );
      yield* ctx.expectEqual(
        "the driven rail starts at the top",
        drivenStart.y,
        0,
      );

      ctx.host.drag("driven-row-4", 0, 10, 8);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "every edge move runs the scroll step",
        readout(ctx.host.text("driven-readout")),
        "moves=8",
      );
      const drivenAfter = yield* ctx.expectSome(
        "the driven rail reports an offset after the drag",
        offset("driven"),
      );
      yield* ctx.expectEqual(
        "the caller-driven scroll moved the rail by one step per move",
        drivenAfter.y,
        -STEP * 8,
      );
    }),
};
