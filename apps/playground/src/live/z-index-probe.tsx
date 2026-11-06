import { Duration, Effect } from "effect";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import { useGpuix, useWindowSize } from "@gpuix/react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { Pressable, Readout } from "../ui.js";
import { isColour } from "./box-paint.js";
import { captureScale, colourAt } from "./frame.js";
import {
  Z_INDEX_BOX,
  Z_INDEX_FILLS,
  Z_INDEX_FLOW,
  Z_INDEX_FLOW_LEVEL,
  Z_INDEX_IDS,
  Z_INDEX_LEVELS,
  Z_INDEX_STACK,
  namesIn,
  zIndexReadout,
  type IndexedHandle,
} from "./z-index.js";

const SETTLE = Duration.millis(40);

const CAPTURE = "z-index";

interface LayoutBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface LayoutPayload {
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
}

const boxOf = (payload: LayoutPayload): Option.Option<LayoutBox> =>
  Option.map(
    Option.all([
      Option.fromNullishOr(payload.x),
      Option.fromNullishOr(payload.y),
      Option.fromNullishOr(payload.width),
      Option.fromNullishOr(payload.height),
    ]),
    ([x, y, width, height]) => ({ x, y, width, height }),
  );

const positioned = (fill: string): StyleDesc => ({
  position: "absolute",
  top: Z_INDEX_BOX.top,
  left: Z_INDEX_BOX.left,
  width: Z_INDEX_BOX.width,
  height: Z_INDEX_BOX.height,
  backgroundColor: fill,
});

const layered = (fill: string, level: number): StyleDesc => ({
  ...positioned(fill),
  zIndex: level,
});

type Remember = (payload: LayoutPayload) => void;

const Layer = ({
  id,
  name,
  fill,
  level,
  register,
  press,
}: {
  readonly id: string;
  readonly name: string;
  readonly fill: string;
  readonly level?: number;
  readonly register: (name: string) => (element: PublicInstance | null) => void;
  readonly press: (name: string) => () => void;
}): ReactNode => (
  <div
    testId={id}
    ref={register(name)}
    onClick={press(name)}
    style={level === undefined ? positioned(fill) : layered(fill, level)}
  />
);

const centreOf = (
  box: LayoutBox,
): { readonly x: number; readonly y: number } => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

export const ZIndexProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const renderer = useGpuix().renderer;
  const handles = useRef<ReadonlyArray<IndexedHandle>>([]);
  const frames = useRef<HashMap.HashMap<string, LayoutBox>>(HashMap.empty());
  const [hits, setHits] = useState<{
    readonly stack: ReadonlyArray<string>;
    readonly plain: ReadonlyArray<string>;
    readonly flow: ReadonlyArray<string>;
  }>({ stack: [], plain: [], flow: [] });
  const [presses, setPresses] = useState<ReadonlyArray<string>>([]);

  const remember = useCallback(
    (name: string): Remember =>
      (payload) => {
        const box = boxOf(payload);
        if (Option.isSome(box)) {
          frames.current = HashMap.set(frames.current, name, box.value);
        }
      },
    [],
  );

  const register = useCallback(
    (name: string) =>
      (element: PublicInstance | null): void => {
        if (element === null) return;
        handles.current = [
          ...handles.current.filter((handle) => handle.name !== name),
          { id: element.id, name },
        ];
      },
    [],
  );

  const orderAt = useCallback(
    (name: string): ReadonlyArray<string> =>
      Option.match(HashMap.get(frames.current, name), {
        onNone: () => [],
        onSome: (box) => {
          const point = centreOf(box);
          return namesIn(
            renderer?.getElementsAt?.(point.x, point.y) ?? [],
            handles.current,
          );
        },
      }),
    [renderer],
  );

  const measure = useCallback(() => {
    setHits({
      stack: orderAt(Z_INDEX_IDS.stack),
      plain: orderAt(Z_INDEX_IDS.plain),
      flow: orderAt(Z_INDEX_IDS.flow),
    });
  }, [orderAt]);

  const press = useCallback(
    (name: string) => (): void => {
      setPresses((current) => [...current, name]);
    },
    [],
  );

  const stackStyle = {
    position: "relative" as const,
    width: Z_INDEX_STACK.width,
    height: Z_INDEX_STACK.height,
  };

  return (
    <div
      testId={Z_INDEX_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        Three absolute boxes mounted red, green, blue with levels 3, 1, 2: the
        level paints red on top, the same boxes with no level keep tree order,
        and a level on an in-flow child is ignored.
      </text>

      {}
      <div
        testId={Z_INDEX_IDS.stack}
        onLayout={remember(Z_INDEX_IDS.stack)}
        style={stackStyle}
      >
        <Layer
          id={Z_INDEX_IDS.high}
          name="high"
          fill={Z_INDEX_FILLS.high}
          level={Z_INDEX_LEVELS.high}
          register={register}
          press={press}
        />
        <Layer
          id={Z_INDEX_IDS.low}
          name="low"
          fill={Z_INDEX_FILLS.low}
          level={Z_INDEX_LEVELS.low}
          register={register}
          press={press}
        />
        <Layer
          id={Z_INDEX_IDS.mid}
          name="mid"
          fill={Z_INDEX_FILLS.mid}
          level={Z_INDEX_LEVELS.mid}
          register={register}
          press={press}
        />
      </div>

      {}
      <div
        testId={Z_INDEX_IDS.plain}
        onLayout={remember(Z_INDEX_IDS.plain)}
        style={stackStyle}
      >
        <Layer
          id={`${Z_INDEX_IDS.plain}-high`}
          name="plain-high"
          fill={Z_INDEX_FILLS.high}
          register={register}
          press={press}
        />
        <Layer
          id={`${Z_INDEX_IDS.plain}-low`}
          name="plain-low"
          fill={Z_INDEX_FILLS.low}
          register={register}
          press={press}
        />
        <Layer
          id={`${Z_INDEX_IDS.plain}-mid`}
          name="plain-mid"
          fill={Z_INDEX_FILLS.mid}
          register={register}
          press={press}
        />
      </div>

      {}
      <div
        testId={Z_INDEX_IDS.flow}
        onLayout={remember(Z_INDEX_IDS.flow)}
        style={{
          position: "relative",
          width: Z_INDEX_FLOW.width,
          height: Z_INDEX_FLOW.height,
        }}
      >
        <div
          testId={Z_INDEX_IDS.flowBase}
          ref={register("flow-base")}
          style={{
            width: Z_INDEX_FLOW.width,
            height: Z_INDEX_FLOW.height,
            backgroundColor: Z_INDEX_FILLS.flowBase,
            zIndex: Z_INDEX_FLOW_LEVEL,
          }}
        />
        <div
          testId={Z_INDEX_IDS.flowCover}
          ref={register("flow-cover")}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: Z_INDEX_FLOW.width,
            height: Z_INDEX_FLOW.height,
            backgroundColor: Z_INDEX_FILLS.flowCover,
            zIndex: 1,
          }}
        />
      </div>

      <Pressable testId={Z_INDEX_IDS.measure} onClick={measure}>
        measure the hit order
      </Pressable>

      <Readout testId={Z_INDEX_IDS.readout}>
        {zIndexReadout({ ...hits, presses })}
      </Readout>
    </div>
  );
};

export const zIndexSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(Z_INDEX_IDS.probe);
    yield* Effect.sleep(SETTLE);

    yield* ctx.host.click(Z_INDEX_IDS.measure);
    yield* Effect.sleep(SETTLE);
    const order = yield* ctx.host.text(Z_INDEX_IDS.readout);
    yield* ctx.expectContains(
      "the levelled stack hit-tests highest first",
      order,
      "stack=high,mid,low",
    );
    yield* ctx.expectContains(
      "the stack with no level keeps the tree order",
      order,
      "plain=plain-mid,plain-low,plain-high",
    );
    yield* ctx.expectContains(
      "a positioned cover paints and hit-tests above the in-flow child it covers",
      order,
      "flow=flow-cover,flow-base",
    );
    yield* ctx.expectContains("no press has run yet", order, "presses=none");

    yield* ctx.host.capture(CAPTURE);
    const frame = yield* ctx.host.pixels(CAPTURE);
    const window = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, window),
    );
    const stack = yield* ctx.expectSome(
      "the levelled stack reports its painted box",
      Option.fromNullishOr(yield* ctx.host.bounds(Z_INDEX_IDS.stack)),
    );
    const plain = yield* ctx.expectSome(
      "the unlevelled stack reports its painted box",
      Option.fromNullishOr(yield* ctx.host.bounds(Z_INDEX_IDS.plain)),
    );
    const flow = yield* ctx.expectSome(
      "the flow pair reports its painted box",
      Option.fromNullishOr(yield* ctx.host.bounds(Z_INDEX_IDS.flow)),
    );
    const stackTop = yield* ctx.expectSome(
      "the levelled stack paints a colour at its centre",
      colourAt(frame, centreOf(stack), scale),
    );
    const plainTop = yield* ctx.expectSome(
      "the unlevelled stack paints a colour at its centre",
      colourAt(frame, centreOf(plain), scale),
    );
    const flowTop = yield* ctx.expectSome(
      "the flow pair paints a colour at its centre",
      colourAt(frame, centreOf(flow), scale),
    );
    yield* ctx.expectEqual(
      "the highest level paints the top of the stack",
      isColour(stackTop, Z_INDEX_FILLS.high),
      true,
    );
    yield* ctx.expectEqual(
      "the gate's stack keeps its tree-order top",
      isColour(plainTop, Z_INDEX_FILLS.mid),
      true,
    );
    yield* ctx.expectEqual(
      "the positioned cover paints over the in-flow child",
      isColour(flowTop, Z_INDEX_FILLS.flowCover),
      true,
    );

    yield* ctx.host.click(Z_INDEX_IDS.stack);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press at the stack's centre reaches the highest level",
      yield* ctx.host.text(Z_INDEX_IDS.readout),
      "presses=high",
    );
    yield* ctx.host.click(Z_INDEX_IDS.plain);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the same press on the unlevelled stack reaches its tree-order top",
      yield* ctx.host.text(Z_INDEX_IDS.readout),
      "presses=high,plain-mid",
    );
  });
