import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import {
  Carousel,
  CarouselControl,
  CarouselIndicators,
  CarouselSlide,
  CarouselTrack,
} from "@gpuixui/components";
import { Button } from "@gpuixui/primitives";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import { captureScale } from "./frame.js";
import {
  CAROUSEL_DOT,
  CAROUSEL_IDS,
  CAROUSEL_LEVEL_MS,
  CAROUSEL_PARTIAL_MS,
  CAROUSEL_TRACK_WIDTH,
  CAROUSEL_SLIDES,
  carouselFrameHeight,
  carouselReadout,
  carouselSlides,
  dotId,
  dotWidth,
  rgbaOf,
  sameWidth,
  slideId,
  travelling,
} from "./carousel.js";

const SETTLE = Duration.millis(260);

const POLLS = 100;

const CAPTURE_ATTEMPTS = 12;

const FIRST = "carousel-first";
const SECOND = "carousel-second";
const DOTS = "carousel-dots";
const FROZEN = "carousel-motion-frozen";
const PARTIAL = "carousel-motion-partial";
const SETTLED = "carousel-motion-settled";

export const CarouselProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [active, setActive] = useState(0);
  const [reports, setReports] = useState(0);
  const [loop, setLoop] = useState(false);

  return (
    <div
      testId={CAROUSEL_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        The shipped carousel: only the slide on screen paints, the frame takes
        its height from that slide, and the indicator&apos;s inks change before
        its widths land.
      </text>
      <Readout testId={CAROUSEL_IDS.readout}>
        {carouselReadout({ active, reports, loop })}
      </Readout>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        <Button
          testId={CAROUSEL_IDS.loop}
          variant="secondary"
          size="sm"
          onClick={() => setLoop((previous) => !previous)}
        >
          {loop ? "Loop on" : "Loop off"}
        </Button>
        <Carousel
          testId={CAROUSEL_IDS.root}
          label="Workspace previews"
          value={active}
          loop={loop}
          onValueChange={(next) => {
            setActive(next);
            setReports((count) => count + 1);
          }}
          style={{ width: CAROUSEL_TRACK_WIDTH }}
        >
          <CarouselTrack testId={CAROUSEL_IDS.track}>
            {Arr.map(carouselSlides(), (slide) => (
              <CarouselSlide
                key={slide.name}
                testId={slideId(slide.name)}
                style={{
                  height: slide.height,
                  backgroundColor: slide.fill.hex,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <text
                  style={{
                    ...textStyle(theme, "h3"),
                    color: slide.ink.hex,
                  }}
                >
                  {slide.label}
                </text>
              </CarouselSlide>
            ))}
          </CarouselTrack>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: theme.spacing.sm,
            }}
          >
            <CarouselControl
              testId={CAROUSEL_IDS.previous}
              direction="previous"
            />
            <CarouselControl testId={CAROUSEL_IDS.next} direction="next" />
          </div>
          <CarouselIndicators testId={CAROUSEL_IDS.dots} />
        </Carousel>
      </div>
    </div>
  );
};

interface ProbeBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const paintedBox = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<ProbeBox, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    return yield* ctx.expectSome(
      `the runtime paints ${testId}`,
      Option.fromNullishOr(yield* ctx.host.bounds(testId)),
    );
  });

const capture = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
): Effect.Effect<
  { readonly pixels: Pixels.Pixels; readonly scale: number },
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
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

const cropTo = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Pixels.Pixels,
  scale: number,
  box: ProbeBox,
  label: string,
): Effect.Effect<Pixels.Pixels, Smoke.SmokeAssertionError> =>
  ctx.expectSome(
    `${label} holds the box it is read in`,
    Option.fromNullishOr(
      Pixels.crop(
        frame,
        new Pixels.PixelRegion({
          x: Math.round(box.x * scale),
          y: Math.round(box.y * scale),
          width: Math.round(box.width * scale),
          height: Math.round(box.height * scale),
        }),
      ),
    ),
  );

const countOf = (region: Pixels.Pixels, ink: Pixels.Rgba): number =>
  Pixels.countColour(region, ink);

const inkBoxIn = (
  region: Pixels.Pixels,
  ink: Pixels.Rgba,
  scale: number,
): Option.Option<{ readonly width: number; readonly height: number }> =>
  Option.map(
    Option.fromNullishOr(Pixels.boundsOfColour(region, ink)),
    (bounds) => ({
      width: bounds.width / scale,
      height: bounds.height / scale,
    }),
  );

interface DotPaint {
  readonly primary: number;
  readonly rest: number;
  readonly ink: Option.Option<{
    readonly width: number;
    readonly height: number;
  }>;
}

interface DotInks {
  readonly primary: Pixels.Rgba;
  readonly rest: Pixels.Rgba;
}

const dotPaint = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Pixels.Pixels,
  scale: number,
  index: number,
  inks: DotInks,
): Effect.Effect<DotPaint, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    const box = yield* paintedBox(ctx, dotId(index));
    const region = yield* cropTo(ctx, frame, scale, box, dotId(index));
    const primary = countOf(region, inks.primary);
    const rest = countOf(region, inks.rest);
    return {
      primary,
      rest,
      ink: inkBoxIn(region, primary >= rest ? inks.primary : inks.rest, scale),
    } as const;
  });

const inkWidth = (paint: DotPaint): number =>
  Option.getOrElse(
    Option.map(paint.ink, (box) => box.width),
    () => 0,
  );

const settleFocused = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> => {
  const attempt = (
    remaining: number,
  ): Effect.Effect<boolean, Smoke.SmokeHostError> =>
    Effect.gen(function* () {
      if ((yield* ctx.host.focused()) === testId) return true;
      if (remaining <= 0) return false;
      yield* Effect.sleep(Duration.millis(20));
      return yield* attempt(remaining - 1);
    });
  return attempt(POLLS);
};

const settleReadout = (
  ctx: Smoke.AsyncSmokeContext,
  expected: string,
): Effect.Effect<string, Smoke.SmokeHostError> => {
  const attempt = (
    remaining: number,
  ): Effect.Effect<string, Smoke.SmokeHostError> =>
    Effect.gen(function* () {
      const value = yield* ctx.host.text(CAROUSEL_IDS.readout);
      if (value.includes(expected)) return value;
      if (remaining <= 0) return value;
      yield* Effect.sleep(Duration.millis(20));
      return yield* attempt(remaining - 1);
    });
  return attempt(POLLS);
};

function settlePaint<A>(
  read: (
    name: string,
  ) => Effect.Effect<A, Smoke.SmokeAssertionError | Smoke.SmokeHostError>,
  accept: (value: A) => boolean,
  name: string,
): Effect.Effect<A, Smoke.SmokeAssertionError | Smoke.SmokeHostError> {
  const attempt = (
    remaining: number,
  ): Effect.Effect<A, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
    Effect.gen(function* () {
      const value = yield* read(name);
      if (accept(value) || remaining <= 0) return value;
      return yield* attempt(remaining - 1);
    });
  return attempt(CAPTURE_ATTEMPTS);
}

export const carouselSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(CAROUSEL_IDS.root);
    yield* Effect.sleep(SETTLE);
    const readout = () => ctx.host.text(CAROUSEL_IDS.readout);
    const inks: DotInks = {
      primary: yield* ctx.expectSome(
        "the palette's primary role is paintable",
        Option.fromNullishOr(Pixels.hexToRgba(palettes.dark.colors.primary)),
      ),
      rest: yield* ctx.expectSome(
        "the palette's muted ink is paintable",
        Option.fromNullishOr(
          Pixels.hexToRgba(palettes.dark.colors.mutedForeground),
        ),
      ),
    };

    const frameRegion = (frame: Pixels.Pixels, scale: number, box: ProbeBox) =>
      Effect.gen(function* () {
        return yield* cropTo(ctx, frame, scale, box, "the carousel's frame");
      });

    const slidePaints = (frame: Pixels.Pixels, scale: number, box: ProbeBox) =>
      Effect.gen(function* () {
        const region = yield* frameRegion(frame, scale, box);
        return Arr.map(carouselSlides(), (slide) => ({
          name: slide.name,
          fill: countOf(region, rgbaOf(slide.fill)),
          ink: countOf(region, rgbaOf(slide.ink)),
        }));
      });

    const expectOnlySlide = (
      frame: Pixels.Pixels,
      scale: number,
      box: ProbeBox,
      active: number,
    ) =>
      Effect.gen(function* () {
        const paints = yield* slidePaints(frame, scale, box);
        yield* Effect.forEach(
          paints,
          (paint, index) =>
            Effect.gen(function* () {
              const slide = Option.getOrElse(
                Option.fromNullishOr(carouselSlides()[index]),
                () => CAROUSEL_SLIDES[0],
              );
              if (index === active) {
                yield* ctx.expectEqual(
                  `the ${slide.name} slide paints its own fill`,
                  paint.fill > Math.round(box.width * box.height * 0.4),
                  true,
                );
                yield* ctx.expectEqual(
                  `the ${slide.name} slide's label paints its own ink`,
                  paint.ink > 20,
                  true,
                );
              } else {
                yield* ctx.expectEqual(
                  `the ${slide.name} slide paints no fill while ${String(active)} is on screen`,
                  paint.fill,
                  0,
                );
                yield* ctx.expectEqual(
                  `the ${slide.name} slide's label paints no ink while ${String(active)} is on screen`,
                  paint.ink,
                  0,
                );
              }
            }),
          { concurrency: 1, discard: true },
        );
      });

    const expectSlidePaint = (
      frame: Pixels.Pixels,
      scale: number,
      box: ProbeBox,
      active: number,
      gone: number,
    ) =>
      Effect.gen(function* () {
        const paints = yield* slidePaints(frame, scale, box);
        const shown = paints[active];
        const hidden = paints[gone];
        yield* ctx.expectEqual(
          "the chosen slide's fill paints",
          Option.getOrElse(
            Option.map(Option.fromNullishOr(shown), (paint) => paint.fill > 0),
            () => false,
          ),
          true,
        );
        yield* ctx.expectEqual(
          "the slide it left paints nothing",
          Option.getOrElse(
            Option.map(Option.fromNullishOr(hidden), (paint) => paint.fill),
            () => -1,
          ),
          0,
        );
      });

    const frameBox = () => paintedBox(ctx, CAROUSEL_IDS.track);

    yield* ctx.expectEqual(
      "the carousel starts on its first slide",
      yield* readout(),
      carouselReadout({ active: 0, reports: 0, loop: false }),
    );
    const firstBox = yield* frameBox();
    yield* ctx.expectNear(
      "the frame paints the track's own width",
      firstBox.width,
      CAROUSEL_TRACK_WIDTH,
      2,
    );
    yield* ctx.expectNear(
      "the frame takes its height from the first slide on screen",
      firstBox.height,
      carouselFrameHeight(0),
      3,
    );
    const first = yield* capture(ctx, FIRST);
    yield* expectOnlySlide(first.pixels, first.scale, firstBox, 0);

    yield* ctx.host.click(CAROUSEL_IDS.next);
    yield* ctx.expectContains(
      "a press on the next control steps to the second slide",
      yield* settleReadout(ctx, "active=1"),
      "active=1",
    );
    yield* Effect.sleep(SETTLE);
    const secondBox = yield* frameBox();
    yield* ctx.expectNear(
      "the frame's width does not move with the slide",
      secondBox.width,
      firstBox.width,
      1,
    );
    yield* ctx.expectNear(
      "the frame takes its height from the second slide on screen",
      secondBox.height,
      carouselFrameHeight(1),
      3,
    );
    yield* ctx.expectNear(
      "the frame keeps its origin while it resizes",
      secondBox.x,
      firstBox.x,
      1,
    );
    yield* ctx.expectNear(
      "the frame keeps its top edge while it resizes",
      secondBox.y,
      firstBox.y,
      1,
    );
    const second = yield* capture(ctx, SECOND);
    yield* expectOnlySlide(second.pixels, second.scale, secondBox, 1);

    yield* ctx.host.focusElement(CAROUSEL_IDS.root);
    yield* ctx.expectEqual(
      "the carousel's root takes the native focus",
      yield* settleFocused(ctx, CAROUSEL_IDS.root),
      true,
    );
    yield* ctx.host.key("right");
    yield* ctx.expectContains(
      "the right arrow steps to the next slide",
      yield* settleReadout(ctx, "active=2 reports=2"),
      "active=2 reports=2",
    );
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the right arrow at the last slide stays there without loop",
      yield* readout(),
      carouselReadout({ active: 2, reports: 2, loop: false }),
    );
    yield* ctx.host.key("home");
    yield* ctx.expectContains(
      "Home reaches the first slide",
      yield* settleReadout(ctx, "active=0 reports=3"),
      "active=0 reports=3",
    );
    yield* ctx.host.key("end");
    yield* ctx.expectContains(
      "End reaches the last slide",
      yield* settleReadout(ctx, "active=2 reports=4"),
      "active=2 reports=4",
    );

    yield* ctx.host.focusElement(CAROUSEL_IDS.root);
    yield* ctx.host.key("home");
    yield* settleReadout(ctx, "active=0 reports=5");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click(CAROUSEL_IDS.previous);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the previous control is disabled on the first slide",
      yield* readout(),
      carouselReadout({ active: 0, reports: 5, loop: false }),
    );
    yield* ctx.host.focusElement(CAROUSEL_IDS.root);
    yield* ctx.host.key("end");
    yield* settleReadout(ctx, "active=2 reports=6");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click(CAROUSEL_IDS.next);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the next control is disabled on the last slide",
      yield* readout(),
      carouselReadout({ active: 2, reports: 6, loop: false }),
    );
    yield* ctx.host.click(CAROUSEL_IDS.loop);
    yield* ctx.expectContains(
      "the caller's control takes the loop preference",
      yield* settleReadout(ctx, "loop=on"),
      "loop=on",
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click(CAROUSEL_IDS.next);
    yield* ctx.expectContains(
      "with loop on, the next control wraps to the first slide",
      yield* settleReadout(ctx, "active=0 reports=7"),
      "active=0 reports=7",
    );
    yield* ctx.host.click(CAROUSEL_IDS.previous);
    yield* ctx.expectContains(
      "with loop on, the previous control wraps to the last slide",
      yield* settleReadout(ctx, "active=2 reports=8"),
      "active=2 reports=8",
    );

    yield* ctx.host.click(dotId(1));
    yield* ctx.expectContains(
      "a press on a dot chooses its slide",
      yield* settleReadout(ctx, "active=1 reports=9"),
      "active=1 reports=9",
    );
    yield* ctx.host.click(dotId(1));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "pressing the chosen dot reports nothing",
      yield* readout(),
      carouselReadout({ active: 1, reports: 9, loop: true }),
    );

    yield* Effect.sleep(SETTLE);
    const dots = yield* capture(ctx, DOTS);
    const paints = yield* Effect.forEach(
      [0, 1, 2],
      (index) => dotPaint(ctx, dots.pixels, dots.scale, index, inks),
      { concurrency: 1 },
    );
    yield* Effect.forEach(
      paints,
      (paint, index) =>
        Effect.gen(function* () {
          const selected = index === 1;
          if (selected) {
            yield* ctx.expectEqual(
              "the chosen slide's dot paints the theme's primary ink",
              paint.primary > 0,
              true,
            );
            yield* ctx.expectEqual(
              "the chosen slide's dot paints none of the resting ink",
              paint.rest,
              0,
            );
          } else {
            yield* ctx.expectEqual(
              `dot ${String(index)} paints the resting ink`,
              paint.rest > 0,
              true,
            );
            yield* ctx.expectEqual(
              `dot ${String(index)} paints none of the primary ink`,
              paint.primary,
              0,
            );
          }
          const box = yield* ctx.expectSome(
            `dot ${String(index)} paints a drawing to measure`,
            paint.ink,
          );
          yield* ctx.expectEqual(
            `dot ${String(index)} paints the width of ${selected ? "the pill" : "a dot"}`,
            sameWidth(box.width, dotWidth(index, 1)),
            true,
          );
          yield* ctx.expectEqual(
            `dot ${String(index)} paints the dot height`,
            sameWidth(box.height, CAROUSEL_DOT.height),
            true,
          );
        }),
      { concurrency: 1, discard: true },
    );

    const travellingDots = (frame: {
      readonly pixels: Pixels.Pixels;
      readonly scale: number;
    }): Effect.Effect<
      readonly [DotPaint, DotPaint],
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      Effect.gen(function* () {
        const paints = yield* Effect.forEach(
          [1, 2],
          (index) => dotPaint(ctx, frame.pixels, frame.scale, index, inks),
          { concurrency: 1 },
        );
        const left = yield* ctx.expectSome(
          "the dot the selection leaves paints a drawing",
          Arr.get(paints, 0),
        );
        const reached = yield* ctx.expectSome(
          "the dot the selection reaches paints a drawing",
          Arr.get(paints, 1),
        );
        return [left, reached] as const;
      });

    const pauseClock = yield* ctx.expectSome(
      "the window exposes a motion clock",
      Option.fromNullishOr(ctx.host.clockPause),
    );
    const fastForward = yield* ctx.expectSome(
      "the clock can be advanced",
      Option.fromNullishOr(ctx.host.clockFastForward),
    );
    const resumeClock = yield* ctx.expectSome(
      "the clock can be resumed",
      Option.fromNullishOr(ctx.host.clockResume),
    );
    yield* pauseClock();
    yield* ctx.host.click(dotId(2));
    yield* ctx.expectContains(
      "the third dot chooses the last slide with the clock frozen",
      yield* settleReadout(ctx, "active=2 reports=10"),
      "active=2 reports=10",
    );
    const frozenBox = yield* frameBox();
    const frozen = yield* capture(ctx, FROZEN);
    yield* expectSlidePaint(frozen.pixels, frozen.scale, frozenBox, 2, 1);
    const [left, reached] = yield* travellingDots(frozen);
    yield* ctx.expectEqual(
      "the dot the selection left paints the resting ink in the press's frame",
      left.rest > 0 && left.primary === 0,
      true,
    );
    yield* ctx.expectEqual(
      "the dot the selection reached paints the primary ink in the press's frame",
      reached.primary > 0 && reached.rest === 0,
      true,
    );
    yield* ctx.expectEqual(
      "the ink changes before the width: the reached dot is still a dot",
      sameWidth(inkWidth(reached), CAROUSEL_DOT.rest),
      true,
    );
    yield* ctx.expectEqual(
      "the dot the selection left is still the pill",
      sameWidth(inkWidth(left), CAROUSEL_DOT.active),
      true,
    );

    yield* fastForward(CAROUSEL_PARTIAL_MS);
    const partial = yield* settlePaint(
      (name) =>
        Effect.gen(function* () {
          const frame = yield* capture(ctx, name);
          const paints = yield* travellingDots(frame);
          return Arr.every(
            Arr.map(paints, (paint) => travelling(inkWidth(paint))),
            (value) => value,
          );
        }),
      (all) => all,
      PARTIAL,
    );
    yield* ctx.expectEqual(
      "partway through the level both dots paint a width between a dot and the pill",
      partial,
      true,
    );

    yield* fastForward(CAROUSEL_LEVEL_MS - CAROUSEL_PARTIAL_MS);
    const settled = yield* settlePaint(
      (name) =>
        Effect.gen(function* () {
          const frame = yield* capture(ctx, name);
          const paints = yield* travellingDots(frame);
          return Arr.every(
            [
              sameWidth(inkWidth(paints[0]), dotWidth(1, 2)),
              sameWidth(inkWidth(paints[1]), dotWidth(2, 2)),
            ],
            (value) => value,
          );
        }),
      (all) => all,
      SETTLED,
    );
    yield* ctx.expectEqual(
      "past the level the chosen dot is the pill and the one it left is a dot",
      settled,
      true,
    );
    yield* resumeClock();
  });
