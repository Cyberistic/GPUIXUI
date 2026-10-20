/**
 * `gradient-pixels` / `live-gradient`: does a declared linear gradient paint?
 *
 * `@gpuix/native@0.10.0` publishes a two-stop `background` gradient with an
 * angle and an interpolation space, and the library and both registries use it
 * **zero times**. Nothing said whether it paints, which way the angle runs, what
 * `colorSpace: "oklab"` does, or that an out-of-range stop is silently dropped.
 * The pinned parser returns `None` for an invalid stop, `backgroundColor` takes
 * precedence over `background`, and a gradient counts as a painted fill for
 * hit-testing — three traps a design system would walk into blind.
 *
 * The stage carries one fixture per property: sRGB, Oklab, orientation, stop
 * positions, precedence, radius, an invalid stop, an alpha fade, hover, and the
 * three hit cases. The expectations are pure (`gradient-model.ts`); capture,
 * scale mapping and comparison are the shared chain in `frames.ts`.
 *
 * Measured facts: plan `807`.
 */
import * as Option from "effect/Option";
import { Duration, Effect, Match } from "effect";
import { useState } from "react";
import type { ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { Pixels, Smoke } from "@gpuixui/testing";
import { useTheme } from "@gpuixui/tokens/react";
import { palettes } from "../palettes.js";
import type { PlaygroundScenario } from "../types.js";
import {
  channelDistance,
  oklabAt,
  pointAt,
  srgbAt,
  type Gradient,
  type GradientColourSpace,
} from "./gradient-model.js";
import {
  asHex,
  captureHeadless,
  captureLive,
  paintedBox,
  parseColour,
  pixelAtPoint,
  readAsync,
  readSync,
  type FrameReader,
} from "./frames.js";

/** The probe's own stop colours: they must not move with a palette change. */
const BLUE = "#0000FF";
const RED = "#FF0000";

/** The two-stop shape the runtime accepts, typed through the JSX style. */
const linear = (
  angle: number,
  from: string,
  to: string,
  colorSpace?: GradientColourSpace,
  positions: readonly [number, number] = [0, 1],
): StyleDesc["background"] => ({
  type: "linear-gradient",
  angle,
  stops: [
    { color: from, position: positions[0] },
    { color: to, position: positions[1] },
  ],
  ...(colorSpace === undefined ? {} : { colorSpace }),
});

/**
 * The probe declares both colour spaces; the model needs only the stops — the
 * caller picks the axis, so `angle` plays no part in the maths.
 */
const model = (
  from: Pixels.Rgba,
  to: Pixels.Rgba,
  colorSpace: GradientColourSpace,
  positions: readonly [number, number] = [0, 1],
): Gradient => ({
  angle: 90,
  colorSpace,
  stops: [
    { color: from, position: positions[0] },
    { color: to, position: positions[1] },
  ],
});

const GradientProbe = () => {
  const theme = useTheme();
  const [hits, setHits] = useState<HitCounts>({ valid: 0, clear: 0, none: 0 });
  const onHit = (testId: string): void =>
    setHits((counts) =>
      Match.value(testId).pipe(
        Match.when("grad-hit-valid", () => ({
          ...counts,
          valid: counts.valid + 1,
        })),
        Match.when("grad-hit-clear", () => ({
          ...counts,
          clear: counts.clear + 1,
        })),
        Match.when("grad-hit-none", () => ({
          ...counts,
          none: counts.none + 1,
        })),
        Match.orElse(() => counts),
      ),
    );
  const card = theme.colors.card;
  return (
    <div
      testId="gradient-stage"
      style={{
        position: "relative",
        width: 740,
        height: 440,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="grad-srgb"
        style={{
          position: "absolute",
          left: 20,
          top: 20,
          width: 160,
          height: 96,
          background: linear(90, BLUE, RED, "srgb"),
        }}
      />
      <div
        testId="grad-oklab"
        style={{
          position: "absolute",
          left: 200,
          top: 20,
          width: 160,
          height: 96,
          background: linear(90, BLUE, RED, "oklab"),
        }}
      />
      <div
        testId="grad-vertical"
        style={{
          position: "absolute",
          left: 380,
          top: 20,
          width: 160,
          height: 96,
          background: linear(0, BLUE, RED, "srgb"),
        }}
      />
      <div
        testId="grad-precedence"
        style={{
          position: "absolute",
          left: 560,
          top: 20,
          width: 160,
          height: 96,
          backgroundColor: card,
          background: linear(90, BLUE, RED, "srgb"),
        }}
      />
      <div
        testId="grad-stops"
        style={{
          position: "absolute",
          left: 20,
          top: 140,
          width: 160,
          height: 96,
          background: linear(90, BLUE, RED, "srgb", [0.25, 0.75]),
        }}
      />
      <div
        testId="grad-radius"
        style={{
          position: "absolute",
          left: 200,
          top: 140,
          width: 160,
          height: 96,
          borderRadius: theme.radius.xl,
          background: linear(90, BLUE, RED, "srgb"),
        }}
      />
      <div
        testId="grad-invalid"
        style={{
          position: "absolute",
          left: 380,
          top: 140,
          width: 160,
          height: 96,
          background: linear(90, BLUE, RED, "srgb", [0, 1.5]),
        }}
      />
      <div
        testId="grad-alpha"
        style={{
          position: "absolute",
          left: 560,
          top: 140,
          width: 160,
          height: 96,
          background: linear(90, "#FF0000FF", "#FF000000", "srgb"),
        }}
      />
      <div
        testId="grad-hover"
        style={{
          position: "absolute",
          left: 20,
          top: 260,
          width: 340,
          height: 72,
          backgroundColor: card,
          hover: {
            background: linear(
              90,
              theme.colors.success,
              theme.colors.destructive,
              "srgb",
            ),
          },
        }}
      />
      <HitProbe
        testId="grad-hit-valid"
        left={380}
        background={linear(90, BLUE, RED, "srgb")}
        onHit={onHit}
      />
      <HitProbe testId="grad-hit-clear" left={500} onHit={onHit} />
      <HitProbe
        testId="grad-hit-none"
        left={620}
        background={linear(90, BLUE, RED, "srgb")}
        passive
        onHit={onHit}
      />
      <div style={{ position: "absolute", left: 20, top: 356 }}>
        <HitReadout hits={hits} />
      </div>
    </div>
  );
};

/** A parent that counts presses; the child decides whether they reach it. */
const HitProbe = ({
  testId,
  left,
  background,
  passive,
  onHit,
}: {
  readonly testId: string;
  readonly left: number;
  readonly background?: StyleDesc["background"];
  readonly passive?: boolean;
  readonly onHit: (testId: string) => void;
}) => (
  <div
    testId={testId}
    onClick={() => onHit(testId)}
    style={{
      position: "absolute",
      left,
      top: 260,
      width: 100,
      height: 72,
      backgroundColor: palettes.dark.colors.card,
    }}
  >
    <div
      style={{
        width: "100%",
        height: "100%",
        ...(background === undefined ? {} : { background }),
        ...(passive === true ? { pointerEvents: "none" as const } : {}),
      }}
    />
  </div>
);

type HitCounts = {
  readonly valid: number;
  readonly clear: number;
  readonly none: number;
};

const HitReadout = ({ hits }: { readonly hits: HitCounts }) => {
  const theme = useTheme();
  return (
    <text
      testId="grad-hits"
      style={{
        color: theme.colors.mutedForeground,
        fontSize: 16,
      }}
    >{`valid=${hits.valid} clear=${hits.clear} none=${hits.none}`}</text>
  );
};

export const gradientView = (): ReactNode => <GradientProbe />;

/** The host verbs the shared checks need; the two hosts differ only in shape. */
interface GradientDriver<E> {
  readonly reader: FrameReader<E>;
  readonly capture: () => Effect.Effect<
    Pixels.Pixels,
    Smoke.SmokeAssertionError | E
  >;
  readonly hover: (testId: string) => Effect.Effect<void, E>;
  readonly clickAt: (point: {
    readonly x: number;
    readonly y: number;
  }) => Effect.Effect<void, E>;
  readonly readText: (
    testId: string,
  ) => Effect.Effect<string, Smoke.SmokeAssertionError | E>;
}

const TEXT_OPTIONS = {
  onNone: () => "none",
  onSome: (value: string) => value,
};

const gradientChecks = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  driver: GradientDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const boxes = {
      srgb: yield* paintedBox(ctx, driver.reader, "grad-srgb"),
      oklab: yield* paintedBox(ctx, driver.reader, "grad-oklab"),
      vertical: yield* paintedBox(ctx, driver.reader, "grad-vertical"),
      precedence: yield* paintedBox(ctx, driver.reader, "grad-precedence"),
      stops: yield* paintedBox(ctx, driver.reader, "grad-stops"),
      radius: yield* paintedBox(ctx, driver.reader, "grad-radius"),
      invalid: yield* paintedBox(ctx, driver.reader, "grad-invalid"),
      alpha: yield* paintedBox(ctx, driver.reader, "grad-alpha"),
      hover: yield* paintedBox(ctx, driver.reader, "grad-hover"),
      hitValid: yield* paintedBox(ctx, driver.reader, "grad-hit-valid"),
      hitClear: yield* paintedBox(ctx, driver.reader, "grad-hit-clear"),
      hitNone: yield* paintedBox(ctx, driver.reader, "grad-hit-none"),
    };
    const window = yield* driver.reader.windowSize();
    const frame = yield* driver.capture();

    yield* ctx.expectSome(
      "the frame's device scale is an integer",
      Pixels.frameScale(frame, window),
    );

    const background = yield* parseColour(
      "colors.background parses",
      palettes.dark.colors.background,
    );
    const card = yield* parseColour(
      "colors.card parses",
      palettes.dark.colors.card,
    );
    const blue = yield* parseColour("the blue stop parses", BLUE);
    const red = yield* parseColour("the red stop parses", RED);
    const success = yield* parseColour(
      "colors.success parses",
      palettes.dark.colors.success,
    );
    const destructive = yield* parseColour(
      "colors.destructive parses",
      palettes.dark.colors.destructive,
    );

    const srgb = model(blue, red, "srgb");
    const oklab = model(blue, red, "oklab");
    const stops = model(blue, red, "srgb", [0.25, 0.75]);
    const hovered = model(success, destructive, "srgb");

    /** One sample, compared against a model colour inside a stated band. */
    const at = (
      shot: Pixels.Pixels,
      box: Smoke.Bounds,
      t: number,
      axis: "x" | "y",
      expected: Pixels.Rgba,
      band: number,
      label: string,
    ) =>
      Effect.gen(function* () {
        const point = pointAt(box, t, axis);
        const actual = yield* pixelAtPoint(
          ctx,
          shot,
          window,
          point.x,
          point.y,
          label,
        );
        yield* ctx.check(
          label,
          channelDistance(actual, expected) <= band
            ? Effect.void
            : Effect.fail(
                new Smoke.SmokeAssertionError({
                  label,
                  expected: `${asHex(expected)} ±${band}`,
                  actual: asHex(actual),
                }),
              ),
        );
        return actual;
      });

    const sample = (
      box: Smoke.Bounds,
      t: number,
      axis: "x" | "y",
      label: string,
    ) =>
      Effect.gen(function* () {
        const point = pointAt(box, t, axis);
        return yield* pixelAtPoint(ctx, frame, window, point.x, point.y, label);
      });

    const paints = (
      box: Smoke.Bounds,
      t: number,
      expected: Pixels.Rgba,
      band: number,
      label: string,
      axis: "x" | "y" = "x",
    ) => Effect.asVoid(at(frame, box, t, axis, expected, band, label));

    // sRGB: the paint and the interpolation, with an orientation guard so a
    // symmetric expectation cannot pass backwards.
    yield* paints(
      boxes.srgb,
      0.05,
      srgbAt(srgb, 0.05),
      2,
      "the sRGB left end is its stop",
    );
    yield* paints(
      boxes.srgb,
      0.5,
      srgbAt(srgb, 0.5),
      2,
      "the sRGB midpoint mixes by channel",
    );
    yield* paints(
      boxes.srgb,
      0.95,
      srgbAt(srgb, 0.95),
      2,
      "the sRGB right end is its stop",
    );
    const left = yield* sample(boxes.srgb, 0.05, "x", "the sRGB left sample");
    const right = yield* sample(boxes.srgb, 0.95, "x", "the sRGB right sample");
    yield* ctx.expectEqual(
      "the angle runs from the first stop to the second",
      left.b > left.r && right.r > right.b,
      true,
    );

    // Oklab: close to the CSS model, and far from the sRGB answer.
    yield* paints(
      boxes.oklab,
      0.25,
      oklabAt(oklab, 0.25),
      12,
      "the Oklab quarter mixes in Oklab",
    );
    const oklabMid = yield* sample(boxes.oklab, 0.5, "x", "the Oklab midpoint");
    yield* paints(
      boxes.oklab,
      0.5,
      oklabAt(oklab, 0.5),
      12,
      "the Oklab midpoint matches the model",
    );
    yield* paints(
      boxes.oklab,
      0.75,
      oklabAt(oklab, 0.75),
      12,
      "the Oklab three-quarter mixes in Oklab",
    );
    yield* ctx.expectEqual(
      "the declared colour space is not ignored",
      channelDistance(oklabMid, srgbAt(srgb, 0.5)) >= 40,
      true,
    );

    // Orientation: angle 0 points up, so the mix runs bottom → top.
    yield* paints(
      boxes.vertical,
      0.05,
      srgbAt(srgb, 0.95),
      2,
      "a vertical gradient reaches its second stop at the top",
      "y",
    );
    yield* paints(
      boxes.vertical,
      0.95,
      srgbAt(srgb, 0.05),
      2,
      "a vertical gradient holds its first stop at the bottom",
      "y",
    );

    // Positions: flat before the first and after the second.
    yield* paints(
      boxes.stops,
      0.05,
      blue,
      2,
      "a gradient holds its first stop before its position",
    );
    yield* paints(
      boxes.stops,
      0.2,
      blue,
      2,
      "the first stop band ends at its position",
    );
    yield* paints(
      boxes.stops,
      0.5,
      srgbAt(stops, 0.5),
      2,
      "the positioned midpoint is still the mix",
    );
    yield* paints(
      boxes.stops,
      0.8,
      red,
      2,
      "the second stop band starts at its position",
    );
    yield* paints(
      boxes.stops,
      0.95,
      red,
      2,
      "a gradient holds its second stop after its position",
    );

    // Precedence: the solid colour wins, it is not a fallback.
    yield* paints(
      boxes.precedence,
      0.05,
      card,
      2,
      "backgroundColor wins over a gradient",
    );
    yield* paints(
      boxes.precedence,
      0.5,
      card,
      2,
      "the solid colour covers the gradient's middle",
    );
    yield* paints(
      boxes.precedence,
      0.95,
      card,
      2,
      "the solid colour covers the gradient's far end",
    );

    // The radius clips the gradient; the fill survives inside it.
    yield* ctx.check(
      "the rounded corner is cleared of the gradient",
      Effect.flatMap(
        pixelAtPoint(
          ctx,
          frame,
          window,
          boxes.radius.x + 2,
          boxes.radius.y + 2,
          "the gradient corner",
        ),
        (actual) =>
          channelDistance(actual, background) <= 2
            ? Effect.void
            : Effect.fail(
                new Smoke.SmokeAssertionError({
                  label: "the rounded corner is cleared of the gradient",
                  expected: asHex(background),
                  actual: asHex(actual),
                }),
              ),
      ),
    );
    yield* paints(
      boxes.radius,
      0.5,
      srgbAt(srgb, 0.5),
      2,
      "a radius clips the corners, not the fill",
    );

    // An out-of-range stop is dropped silently: the stage shows through.
    yield* paints(
      boxes.invalid,
      0.05,
      background,
      2,
      "an invalid stop drops the whole gradient",
    );
    yield* paints(
      boxes.invalid,
      0.5,
      background,
      2,
      "the dropped gradient paints nothing at its middle",
    );
    yield* paints(
      boxes.invalid,
      0.95,
      background,
      2,
      "the dropped gradient leaves the far end alone",
    );

    // An alpha stop composites over the stage: a fade without an image.
    const fade = yield* sample(
      boxes.alpha,
      0.05,
      "x",
      "the fade's painted end",
    );
    yield* ctx.expectEqual(
      "an alpha stop starts opaque",
      fade.r > fade.g && fade.r > fade.b,
      true,
    );
    yield* paints(
      boxes.alpha,
      0.5,
      Pixels.blendOver(red, 0.5, background),
      5,
      "the fade's midpoint is the half-alpha blend",
    );
    yield* paints(
      boxes.alpha,
      0.95,
      Pixels.blendOver(red, 0.05, background),
      4,
      "the fade keeps five percent of its stop at 95 percent",
    );
    yield* paints(
      boxes.alpha,
      0.99,
      Pixels.blendOver(red, 0.01, background),
      3,
      "the fade is the stage at its transparent end",
    );

    // Hover: the declared gradient paints, then reverts.
    yield* paints(
      boxes.hover,
      0.05,
      card,
      2,
      "the hover fixture rests on its solid fill",
    );
    yield* paints(
      boxes.hover,
      0.95,
      card,
      2,
      "the hover fixture's far end rests too",
    );
    yield* driver.hover("grad-hover");
    const hoverFrame = yield* driver.capture();
    yield* ctx.expectSome(
      "the hovered frame's device scale is an integer",
      Pixels.frameScale(hoverFrame, window),
    );
    yield* Effect.forEach(
      [
        [0.05, "the hover gradient paints its first stop"],
        [0.5, "the hover gradient mixes in the middle"],
        [0.95, "the hover gradient paints its second stop"],
      ] as const,
      ([t, label]) =>
        Effect.asVoid(
          at(hoverFrame, boxes.hover, t, "x", srgbAt(hovered, t), 2, label),
        ),
      { concurrency: 1 },
    );
    yield* driver.hover("gradient-stage");
    const restFrame = yield* driver.capture();
    yield* Effect.forEach(
      [
        [0.05, "leaving reverts the hover fixture's first end"],
        [0.95, "leaving reverts the hover fixture's far end"],
      ] as const,
      ([t, label]) =>
        Effect.asVoid(at(restFrame, boxes.hover, t, "x", card, 2, label)),
      { concurrency: 1 },
    );

    // Hit path: the gradient swallows, a clear child does not, and the
    // `pointerEvents: "none"` escape hands the press back to the parent.
    const press = (box: Smoke.Bounds) =>
      driver.clickAt({
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
      });
    yield* press(boxes.hitValid);
    yield* ctx.expectContains(
      "a gradient child swallows the press",
      yield* driver.readText("grad-hits"),
      "valid=0",
    );
    yield* press(boxes.hitClear);
    yield* ctx.expectContains(
      "a clear child lets the parent take the press",
      yield* driver.readText("grad-hits"),
      "clear=1",
    );
    yield* press(boxes.hitNone);
    yield* ctx.expectContains(
      "pointerEvents none hands the press back",
      yield* driver.readText("grad-hits"),
      "none=1",
    );
  });

/** The offscreen host: inspection verbs are values, so they lift with `sync`. */
const headlessDriver = (host: Smoke.SmokeHost): GradientDriver<never> => ({
  reader: readSync(host),
  capture: () => captureHeadless(host),
  hover: (testId) => Effect.sync(() => host.hover(testId)),
  clickAt: (point) => Effect.sync(() => host.clickWindow(point.x, point.y)),
  readText: (testId) =>
    Effect.sync(() =>
      Option.match(Option.fromNullishOr(host.text(testId)), TEXT_OPTIONS),
    ),
});

/** The 120 ms the live registry's steps settle for before a read. */
const SETTLE = Effect.sleep(Duration.millis(120));

/** The real window: a verb is an Effect, and the paint needs its commit. */
const liveDriver = (
  host: Smoke.AsyncSmokeHost,
): GradientDriver<Smoke.SmokeHostError> => {
  function settled<A>(effect: Effect.Effect<A, Smoke.SmokeHostError>) {
    return Effect.flatMap(effect, () => SETTLE);
  }
  return {
    reader: readAsync(host),
    capture: () =>
      Effect.flatMap(captureLive(host), (frame) =>
        Effect.map(SETTLE, () => frame),
      ),
    hover: (testId) => settled(host.hover(testId)),
    clickAt: (point) => settled(host.clickWindow(point.x, point.y)),
    readText: (testId) =>
      Effect.map(host.text(testId), (value) =>
        Option.match(Option.fromNullishOr(value), TEXT_OPTIONS),
      ),
  };
};

export const gradientScenario: PlaygroundScenario = {
  id: "gradient-pixels",
  title: "Gradient backgrounds: paint, colour space, precedence and hits",
  capability: "gradient",
  view: gradientView,
  steps: (ctx) => gradientChecks(ctx, headlessDriver(ctx.host)),
};

export const gradientLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-gradient",
  title: "Live gradient pixels: the paint route in a real window",
  capability: "gradient",
  steps: (ctx) => gradientChecks(ctx, liveDriver(ctx.host)),
};
