import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  EmptyState,
} from "@gpuixui/components";
import { Button } from "@gpuixui/primitives";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import {
  captureScale,
  colourAt,
  differs,
  framePoint,
  type Point,
} from "./frame.js";
import {
  actionPaint,
  afterAction,
  contentPaint,
  EMPTY_ERROR_COPY,
  EMPTY_ERROR_FRAMES,
  EMPTY_ERROR_IDS,
  EMPTY_ERROR_WIDTH,
  EMPTY_INSET,
  emptyErrorReadout,
  errorInkPaint,
  errorSurfacePaint,
  inside,
  PAINT_INSET,
  stagePaint,
  type EmptyErrorStage,
} from "./empty-error.js";

const SETTLE = Duration.millis(40);

export const EmptyErrorProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [stage, setStage] = useState<EmptyErrorStage>("error");

  const advance = (): void => setStage(afterAction);

  return (
    <div
      testId={EMPTY_ERROR_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        A list&apos;s two fallback panels: a failed load with a retry, an empty
        collection with a way to start one. Both actions are the shipped Button,
        and the empty panel paints no surface of its own.
      </text>
      <div
        testId={EMPTY_ERROR_IDS.stage}
        style={{
          width: EMPTY_ERROR_WIDTH,
          padding: theme.spacing.lg,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
          backgroundColor: stagePaint(theme),
          borderRadius: theme.radius.md,
        }}
      >
        {stage === "error" ? (
          <>
            <Alert testId={EMPTY_ERROR_IDS.alert} tone="danger">
              <AlertTitle>{EMPTY_ERROR_COPY.alertTitle}</AlertTitle>
              <AlertDescription>{EMPTY_ERROR_COPY.alertBody}</AlertDescription>
            </Alert>
            <div style={{ display: "flex", flexDirection: "row" }}>
              <Button
                testId={EMPTY_ERROR_IDS.retry}
                variant="primary"
                onClick={advance}
              >
                {EMPTY_ERROR_COPY.retry}
              </Button>
            </div>
          </>
        ) : null}
        {stage === "empty" ? (
          <EmptyState
            testId={EMPTY_ERROR_IDS.empty}
            title={EMPTY_ERROR_COPY.emptyTitle}
            description={EMPTY_ERROR_COPY.emptyBody}
            action={
              <Button
                testId={EMPTY_ERROR_IDS.newProject}
                variant="primary"
                onClick={advance}
              >
                {EMPTY_ERROR_COPY.newProject}
              </Button>
            }
          />
        ) : null}
        {stage === "ready" ? (
          <div
            testId={EMPTY_ERROR_IDS.content}
            style={{
              width: 200,
              height: 48,
              display: "flex",
              alignItems: "center",
              paddingLeft: theme.spacing.sm,
              backgroundColor: contentPaint(theme),
              borderRadius: theme.radius.sm,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "label"),
                color: theme.colors.successForeground,
              }}
            >
              {EMPTY_ERROR_COPY.content}
            </text>
          </div>
        ) : null}
      </div>
      <Readout testId={EMPTY_ERROR_IDS.readout}>
        {emptyErrorReadout(stage)}
      </Readout>
    </div>
  );
};

const sampleAt = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Pixels.Pixels,
  point: Point,
  scale: number,
  label: string,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  ctx.expectSome(label, colourAt(frame, point, scale));

const expectPaint = (
  ctx: Smoke.AsyncSmokeContext,
  label: string,
  sample: Pixels.Rgba,
  expected: Pixels.Rgba,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  ctx.expectEqual(label, differs(sample, expected), false);

const paintedBox = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<
  Smoke.Bounds,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    return yield* ctx.expectSome(
      `the runtime paints ${testId}`,
      Option.fromNullishOr(yield* ctx.host.bounds(testId)),
    );
  });

const unpainted = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.bounds(testId), (box) =>
    Option.isNone(Option.fromNullishOr(box)),
  );

export const emptyErrorSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(EMPTY_ERROR_IDS.stage);
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text(EMPTY_ERROR_IDS.readout);
    const words = () => ctx.host.text(EMPTY_ERROR_IDS.stage);

    const capture = (name: string) =>
      Effect.gen(function* () {
        yield* ctx.host.capture(name);
        const pixels = yield* ctx.host.pixels(name);
        const size = yield* ctx.host.windowSize();
        const scale = yield* ctx.expectSome(
          `${name} is the window at a whole device scale`,
          captureScale(pixels, size),
        );
        return { pixels, scale } as const;
      });

    const dark = palettes.dark;
    const stageColour = yield* ctx.expectSome(
      "the panel's fill is a paintable colour",
      Option.fromNullishOr(Pixels.hexToRgba(stagePaint(dark))),
    );
    const surfaceColour = yield* ctx.expectSome(
      "the error's soft role is a paintable colour",
      Option.fromNullishOr(Pixels.hexToRgba(errorSurfacePaint(dark))),
    );
    const inkColour = yield* ctx.expectSome(
      "the error's readable role is a paintable colour",
      Option.fromNullishOr(Pixels.hexToRgba(errorInkPaint(dark))),
    );
    const actionColour = yield* ctx.expectSome(
      "the action's fill is a paintable colour",
      Option.fromNullishOr(Pixels.hexToRgba(actionPaint(dark))),
    );
    const contentColour = yield* ctx.expectSome(
      "the record's fill is a paintable colour",
      Option.fromNullishOr(Pixels.hexToRgba(contentPaint(dark))),
    );

    yield* ctx.expectEqual(
      "the panel opens on the failed load",
      yield* readout(),
      emptyErrorReadout("error"),
    );
    const alert = yield* paintedBox(ctx, EMPTY_ERROR_IDS.alert);
    const errorFrame = yield* capture(EMPTY_ERROR_FRAMES.error);
    yield* expectPaint(
      ctx,
      "the error paints the destructive soft role",
      yield* sampleAt(
        ctx,
        errorFrame.pixels,
        inside(alert, PAINT_INSET, PAINT_INSET),
        errorFrame.scale,
        "the error capture holds the alert's surface",
      ),
      surfaceColour,
    );

    const inkRegion = yield* ctx.expectSome(
      "the alert's box is inside the capture",
      Option.fromNullishOr(
        Pixels.crop(errorFrame.pixels, {
          ...framePoint(inside(alert, 0, 0), errorFrame.scale),
          width: Math.round(alert.width * errorFrame.scale),
          height: Math.round(alert.height * errorFrame.scale),
        }),
      ),
    );
    yield* ctx.expectEqual(
      "the error's readable role paints inside the alert",
      Pixels.countColour(inkRegion, inkColour) > 0,
      true,
    );

    const retry = yield* paintedBox(ctx, EMPTY_ERROR_IDS.retry);
    yield* expectPaint(
      ctx,
      "the retry action paints its filled role",
      yield* sampleAt(
        ctx,
        errorFrame.pixels,
        inside(retry, PAINT_INSET, retry.height / 2),
        errorFrame.scale,
        "the error capture holds the retry action",
      ),
      actionColour,
    );
    yield* Effect.flatMap(ctx.host.click(EMPTY_ERROR_IDS.retry), () =>
      Effect.sleep(SETTLE),
    );
    yield* ctx.expectEqual(
      "a press on retry recovers to the empty state",
      yield* readout(),
      emptyErrorReadout("empty"),
    );
    yield* ctx.expectEqual(
      "the error state unpaints when the empty state replaces it",
      yield* unpainted(ctx, EMPTY_ERROR_IDS.alert),
      true,
    );

    const emptyWords = yield* words();
    yield* ctx.expectContains(
      "the empty state paints its title",
      emptyWords,
      EMPTY_ERROR_COPY.emptyTitle,
    );
    yield* ctx.expectContains(
      "the empty state paints its explanation",
      emptyWords,
      EMPTY_ERROR_COPY.emptyBody,
    );
    const empty = yield* paintedBox(ctx, EMPTY_ERROR_IDS.empty);
    const emptyFrame = yield* capture(EMPTY_ERROR_FRAMES.empty);
    yield* expectPaint(
      ctx,
      "the empty state paints no surface of its own",
      yield* sampleAt(
        ctx,
        emptyFrame.pixels,
        inside(empty, EMPTY_INSET, EMPTY_INSET),
        emptyFrame.scale,
        "the empty capture holds the state's own padding",
      ),
      stageColour,
    );

    const newProject = yield* paintedBox(ctx, EMPTY_ERROR_IDS.newProject);
    yield* expectPaint(
      ctx,
      "the empty state's action paints its filled role",
      yield* sampleAt(
        ctx,
        emptyFrame.pixels,
        inside(newProject, PAINT_INSET, newProject.height / 2),
        emptyFrame.scale,
        "the empty capture holds the new-project action",
      ),
      actionColour,
    );
    yield* Effect.flatMap(ctx.host.click(EMPTY_ERROR_IDS.newProject), () =>
      Effect.sleep(SETTLE),
    );
    yield* ctx.expectEqual(
      "a press on the empty action paints the first record",
      yield* readout(),
      emptyErrorReadout("ready"),
    );
    yield* ctx.expectEqual(
      "the empty state unpaints when a record replaces it",
      yield* unpainted(ctx, EMPTY_ERROR_IDS.empty),
      true,
    );

    const content = yield* paintedBox(ctx, EMPTY_ERROR_IDS.content);
    const readyFrame = yield* capture(EMPTY_ERROR_FRAMES.ready);
    yield* expectPaint(
      ctx,
      "the recovered record paints its own fill",
      yield* sampleAt(
        ctx,
        readyFrame.pixels,
        inside(content, PAINT_INSET, PAINT_INSET),
        readyFrame.scale,
        "the ready capture holds the record",
      ),
      contentColour,
    );
    yield* ctx.expectContains(
      "the recovered panel paints the record's name",
      yield* words(),
      EMPTY_ERROR_COPY.content,
    );
  });
