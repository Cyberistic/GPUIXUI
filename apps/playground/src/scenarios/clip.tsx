/**
 * `scroll-clip` / `live-scroll-clip`: what `overflow` actually clips, measured
 * in the frame.
 *
 * Every scrollable surface rests on one rule — a viewport paints only inside
 * its box, and a press outside it never reaches the clipped child — and the
 * records only ever measured pieces of it: `scroll-affordance` (plan `801`)
 * proved `overflow: "auto"` does **not** clip, `border-pixels` (plan `745`)
 * sampled one corner under `hidden`, and plans `186`/`819` measured the refused
 * press. The grid-cell-editing limits name the gap outright: *"paint beyond the
 * list's own viewport clip was not measured"*.
 *
 * Six fixtures on one stage answer it: a vertical scroller whose paint must
 * follow the wheel at both edges, an x-only viewport (which the runtime forces
 * to a flex row), the x-only y-axis, a `hidden` box with a 2 px border and
 * 16 px padding (where the clip starts), the `auto` control, and an `<img>`
 * child that plan `385` claims escapes a parent's clip. Two decoded frames per
 * host; the axes rule is `clip-model.ts`.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState, type ReactNode } from "react";
import { Pixels, Smoke } from "@gpuixui/testing";
import { useTheme } from "@gpuixui/tokens/react";
import { palettes } from "../palettes.js";
import type { PlaygroundScenario } from "../types.js";
import { Readout } from "../ui.js";
import {
  captureHeadless,
  captureLive,
  expectColour,
  paintedBox,
  parseColour,
  pixelAtPoint,
  readAsync,
  readSync,
  type FrameReader,
} from "./frames.js";
import {
  clippedAxes,
  paintClip,
  stripIndexAt,
  type OverflowStyle,
} from "./clip-model.js";

const STAGE_WIDTH = 680;
const STAGE_HEIGHT = 420;
/** One strip of the vertical scroller's content. */
const STRIP = 60;
/** The wheel's travel: two strips, so both interior samples must change. */
const WHEEL = -120;
const STRIP_ROLES = ["card", "success", "primary"] as const;

const V = { left: 16, top: 20, width: 160, height: 120 } as const;
const H = { left: 200, top: 20, width: 160, height: 120 } as const;
const HY = { left: 400, top: 20, width: 160, height: 80 } as const;
const VX = { left: 400, top: 120, width: 160, height: 80 } as const;
const HIDDEN = { left: 16, top: 200, width: 180, height: 120 } as const;
const AUTO = { left: 220, top: 200, width: 160, height: 100 } as const;
const IMAGE = { left: 400, top: 200, width: 160, height: 120 } as const;
/** The image's offset inside its clipping box, and its size. */
const IMAGE_INSET = 40;
const IMAGE_SIDE = 200;
/** A point 10 px outside a box is stage, never a fill. */
const OUTSIDE = 10;

/**
 * Where the `hidden` box's clip starts, measured by this probe.
 *
 * `true` means a point inside the **padding** band still shows the child, so
 * the clip is the padding box (GPUI's own rule); `false` means the child stops
 * at the content box and the padding shows the element's background.
 */
const CLIP_IS_PADDING_BOX = true;

/**
 * Whether an `<img>` child escapes its parent's `overflow: "hidden"`.
 *
 * `true` records plan `385`'s claim that a bitmap is a separate paint
 * primitive; `false` means the clip covers it like any other child.
 */
const IMAGE_ESCAPES_CLIP = false;

/** A 1 × 1 red pixel with alpha 127 (the fixture plan `690` measured). */
const ONE_PIXEL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const boxStyle = (
  box: { readonly left: number; readonly top: number } & {
    readonly width: number;
    readonly height: number;
  },
  fill: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  position: "absolute",
  left: box.left,
  top: box.top,
  width: box.width,
  height: box.height,
  backgroundColor: fill,
  ...extra,
});

/** Red-dominant: the 1 × 1 fixture's alpha-blended paint, in any palette. */
const redDominant = (colour: Pixels.Rgba): boolean =>
  colour.r > colour.g + 20 && colour.r > colour.b + 20;

const ClipProbe = () => {
  const theme = useTheme();
  const [hits, setHits] = useState(0);
  const strip = (index: number) => {
    const role = STRIP_ROLES[index % STRIP_ROLES.length] ?? "card";
    return (
      <div
        key={index}
        testId={`clip-v-strip-${index}`}
        onClick={() => setHits((previous) => previous + 1)}
        style={{ height: STRIP, backgroundColor: theme.colors[role] }}
      />
    );
  };
  const block = (testId: string, fill: string) => (
    <div
      testId={testId}
      style={{ width: H.width, height: H.height, backgroundColor: fill }}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        testId="clip-stage"
        style={{
          position: "relative",
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          backgroundColor: theme.colors.background,
        }}
      >
        <div
          testId="clip-v"
          style={boxStyle(V, theme.colors.muted, { overflowY: "scroll" })}
        >
          <div testId="clip-v-child">
            {Arr.makeBy(6, (index) => strip(index))}
          </div>
        </div>

        <div
          testId="clip-h"
          style={boxStyle(H, theme.colors.muted, { overflowX: "scroll" })}
        >
          {block("clip-h-a", theme.colors.card)}
          {block("clip-h-b", theme.colors.success)}
          {block("clip-h-c", theme.colors.primary)}
        </div>

        <div
          testId="clip-hy"
          style={boxStyle(HY, theme.colors.muted, { overflowX: "scroll" })}
        >
          <div
            testId="clip-hy-child"
            style={{
              width: 480,
              height: 240,
              backgroundColor: theme.colors.card,
            }}
          />
        </div>

        <div
          testId="clip-vx"
          style={boxStyle(VX, theme.colors.muted, { overflowY: "scroll" })}
        >
          <div
            testId="clip-vx-child"
            style={{
              width: 300,
              height: 240,
              backgroundColor: theme.colors.card,
            }}
          />
        </div>

        <div
          testId="clip-hidden"
          style={boxStyle(HIDDEN, theme.colors.muted, {
            overflow: "hidden",
            padding: theme.spacing.xl,
            borderWidth: theme.borderWidth.strong,
            borderColor: theme.colors.primary,
          })}
        >
          <div
            testId="clip-hidden-child"
            style={{
              width: 300,
              height: 260,
              backgroundColor: theme.colors.card,
            }}
          />
        </div>

        <div
          testId="clip-auto"
          style={boxStyle(AUTO, theme.colors.muted, { overflow: "auto" })}
        >
          <div
            testId="clip-auto-child"
            style={{
              width: AUTO.width,
              height: 260,
              backgroundColor: theme.colors.success,
            }}
          />
        </div>

        <div
          testId="clip-img"
          style={boxStyle(IMAGE, theme.colors.muted, { overflow: "hidden" })}
        >
          <div
            style={{
              paddingLeft: IMAGE_INSET,
              paddingTop: IMAGE_INSET,
            }}
          >
            <img
              testId="clip-img-child"
              src={ONE_PIXEL_PNG}
              style={{ width: IMAGE_SIDE, height: IMAGE_SIDE }}
            />
          </div>
        </div>
      </div>
      <Readout testId="clip-hit">{`hits=${hits}`}</Readout>
    </div>
  );
};

export const clipView = (): ReactNode => <ClipProbe />;

/** The one difference between the hosts: plain values or Effects, and a settle. */
interface ClipDriver<E> {
  readonly reader: FrameReader<E>;
  readonly capture: () => Effect.Effect<
    Pixels.Pixels,
    Smoke.SmokeAssertionError | E
  >;
  readonly wheel: (testId: string, deltaY: number) => Effect.Effect<void, E>;
  readonly scrollOffset: (
    testId: string,
  ) => Effect.Effect<Smoke.Offset | null, E>;
  readonly clickPoint: (x: number, y: number) => Effect.Effect<void, E>;
  readonly read: (testId: string) => Effect.Effect<string | null, E>;
}

const headlessAct = (
  host: Smoke.SmokeHost,
  act: () => void,
): Effect.Effect<void> =>
  Effect.sync(() => {
    act();
    host.paint();
  });

const headlessDriver = (host: Smoke.SmokeHost): ClipDriver<never> => ({
  reader: readSync(host),
  capture: () => captureHeadless(host),
  wheel: (testId, deltaY) =>
    headlessAct(host, () => host.wheel(testId, 0, deltaY)),
  scrollOffset: (testId) => Effect.sync(() => host.scrollOffset(testId)),
  clickPoint: (x, y) => headlessAct(host, () => host.clickWindow(x, y)),
  read: (testId) => Effect.sync(() => host.text(testId)),
});

/** A window needs its mount and each input committed before it is read. */
const liveDriver = (
  host: Smoke.AsyncSmokeHost,
): ClipDriver<Smoke.SmokeHostError> => {
  const settle = Effect.sleep(Duration.millis(120));
  return {
    reader: readAsync(host),
    capture: () => Effect.andThen(settle, captureLive(host)),
    wheel: (testId, deltaY) =>
      Effect.gen(function* () {
        // A live wheel reaches the box under the pointer, so hover it first
        // (plan `606`'s measured rule), then let the hover commit.
        yield* host.hover(testId);
        yield* settle;
        yield* host.wheel(testId, 0, deltaY);
        yield* settle;
      }),
    scrollOffset: host.scrollOffset,
    clickPoint: (x, y) => Effect.andThen(host.clickWindow(x, y), settle),
    read: host.text,
  };
};

/** The colour of the strip the offset selects, from the palette roles. */
const stripColour = (index: number): string => {
  const role = STRIP_ROLES[index % STRIP_ROLES.length] ?? "card";
  return palettes.dark.colors[role];
};

const clipChecks = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  driver: ClipDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const colors = palettes.dark.colors;
    const background = yield* parseColour(
      "the stage role parses",
      colors.background,
    );
    const card = yield* parseColour("the card role parses", colors.card);
    const muted = yield* parseColour("the muted role parses", colors.muted);
    const success = yield* parseColour(
      "the success role parses",
      colors.success,
    );
    const primary = yield* parseColour(
      "the primary role parses",
      colors.primary,
    );

    const window = yield* driver.reader.windowSize();
    const atRest = yield* driver.capture();
    yield* ctx.expectSome(
      "the frame's device scale is an integer",
      Pixels.frameScale(atRest, window),
    );
    const sample = (
      frame: Pixels.Pixels,
      x: number,
      y: number,
      label: string,
    ) => pixelAtPoint(ctx, frame, window, x, y, label);
    const fill = (
      index: number,
    ): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
      parseColour(`strip ${index} parses`, stripColour(index));

    // Guards: a check cannot pass because two roles coincide or because the
    // stage sample is inside a fixture.
    yield* ctx.expectEqual(
      "the card and background roles are distinguishable",
      Pixels.rgbaNear(card, background, 2),
      false,
    );
    yield* ctx.expectEqual(
      "the muted and card roles are distinguishable",
      Pixels.rgbaNear(muted, card, 2),
      false,
    );
    yield* ctx.expectEqual(
      "the success and primary roles are distinguishable",
      Pixels.rgbaNear(success, primary, 2),
      false,
    );
    const stage = yield* paintedBox(ctx, driver.reader, "clip-stage");
    yield* expectColour(
      ctx,
      "the stage paints the background role",
      yield* sample(
        atRest,
        stage.x + 8,
        stage.y + STAGE_HEIGHT - 8,
        "the stage",
      ),
      background,
    );

    // ── clip-v: the vertical viewport ────────────────────────────────
    const v = yield* paintedBox(ctx, driver.reader, "clip-v");
    const vMiddle = v.x + v.width / 2;
    const restTop = yield* sample(
      atRest,
      vMiddle,
      v.y + 10,
      "the vertical viewport's top",
    );
    yield* expectColour(
      ctx,
      "the vertical viewport paints its first strip",
      restTop,
      yield* fill(0),
    );
    yield* expectColour(
      ctx,
      "the vertical viewport does not paint below its box",
      yield* sample(
        atRest,
        vMiddle,
        v.y + v.height + OUTSIDE,
        "below the viewport",
      ),
      background,
    );
    const child = yield* paintedBox(ctx, driver.reader, "clip-v-child");
    yield* ctx.expectNear(
      "the clipped child keeps its layout height",
      child.height,
      STRIP * 6,
      4,
    );
    const restLower = yield* sample(
      atRest,
      vMiddle,
      v.y + 70,
      "the vertical viewport's lower half",
    );
    yield* expectColour(
      ctx,
      "the vertical viewport paints its second strip",
      restLower,
      yield* fill(1),
    );

    // The hit path: a press inside runs the strip's own handler; a press just
    // outside the box (over the child's unclipped area) must not.
    yield* driver.clickPoint(vMiddle, v.y + 30);
    const afterInside = yield* ctx.expectSome(
      "the hit readout is painted after the inside press",
      Option.fromNullishOr(yield* driver.read("clip-hit")),
    );
    yield* ctx.expectEqual(
      "a press inside the viewport reaches the child",
      afterInside,
      "hits=1",
    );
    yield* driver.clickPoint(vMiddle, v.y + v.height + OUTSIDE);
    const afterOutside = yield* ctx.expectSome(
      "the hit readout is painted after the outside press",
      Option.fromNullishOr(yield* driver.read("clip-hit")),
    );
    yield* ctx.expectEqual(
      "a press outside the viewport does not reach the clipped child",
      afterOutside,
      "hits=1",
    );

    yield* driver.wheel("clip-v", WHEEL);
    const offset = yield* ctx.expectSome(
      "the wheel reports an offset",
      Option.fromNullishOr(yield* driver.scrollOffset("clip-v")),
    );
    yield* ctx.expectNear(
      "the wheel moved the viewport by its delta",
      offset.y,
      WHEEL,
      4,
    );

    const scrolled = yield* driver.capture();
    yield* expectColour(
      ctx,
      "the vertical viewport does not paint above its box after a scroll",
      yield* sample(
        scrolled,
        vMiddle,
        v.y - OUTSIDE,
        "above the scrolled viewport",
      ),
      background,
    );
    const scrolledTop = yield* sample(
      scrolled,
      vMiddle,
      v.y + 10,
      "the scrolled viewport's top",
    );
    const scrolledLower = yield* sample(
      scrolled,
      vMiddle,
      v.y + 70,
      "the scrolled viewport's lower half",
    );
    yield* expectColour(
      ctx,
      "the scrolled viewport paints the strip the offset selects",
      scrolledTop,
      yield* fill(stripIndexAt(STRIP, offset.y, 10)),
    );
    yield* expectColour(
      ctx,
      "the scrolled viewport's lower half follows the offset",
      scrolledLower,
      yield* fill(stripIndexAt(STRIP, offset.y, 70)),
    );
    yield* ctx.expectEqual(
      "both interior strips changed with the offset",
      Pixels.rgbaNear(restTop, scrolledTop, 2) ||
        Pixels.rgbaNear(restLower, scrolledLower, 2),
      false,
    );
    yield* expectColour(
      ctx,
      "the scrolled viewport still does not paint below its box",
      yield* sample(
        scrolled,
        vMiddle,
        v.y + v.height + OUTSIDE,
        "below the scrolled viewport",
      ),
      background,
    );

    // ── clip-h: an x-only viewport is a flex row ────────────────────
    const h = yield* paintedBox(ctx, driver.reader, "clip-h");
    const a = yield* paintedBox(ctx, driver.reader, "clip-h-a");
    const b = yield* paintedBox(ctx, driver.reader, "clip-h-b");
    const c = yield* paintedBox(ctx, driver.reader, "clip-h-c");
    yield* ctx.expectNear("the x-only row shares its y", b.y, a.y, 1);
    yield* ctx.expectNear("the x-only row shares its y twice", c.y, a.y, 1);
    yield* ctx.expectNear(
      "the x-only viewport lays its children out in a row",
      b.x - a.x,
      H.width,
      1,
    );
    yield* ctx.expectNear(
      "the x-only row keeps every child's width",
      c.x - b.x,
      H.width,
      1,
    );
    yield* expectColour(
      ctx,
      "the x-only viewport paints its first block",
      yield* sample(atRest, a.x + a.width / 2, a.y + a.height / 2, "block a"),
      card,
    );
    yield* expectColour(
      ctx,
      "the x-only viewport clips to its right edge",
      yield* sample(
        atRest,
        h.x + h.width + OUTSIDE,
        h.y + h.height / 2,
        "right of the x-only viewport",
      ),
      background,
    );

    // ── clip-hy: an x-only viewport clips x only ────────────────────
    const hy = yield* paintedBox(ctx, driver.reader, "clip-hy");
    yield* expectColour(
      ctx,
      "the x-only viewport clips its right edge",
      yield* sample(
        atRest,
        hy.x + hy.width + OUTSIDE,
        hy.y + hy.height / 2,
        "right of the x-only viewport",
      ),
      background,
    );
    yield* expectColour(
      ctx,
      "an x-only viewport does not leak its y axis",
      yield* sample(
        atRest,
        hy.x + hy.width / 2,
        hy.y + hy.height + OUTSIDE,
        "below the x-only viewport",
      ),
      background,
    );

    // ── clip-vx: a y-only viewport clips x too ─────────────────────
    const vx = yield* paintedBox(ctx, driver.reader, "clip-vx");
    yield* expectColour(
      ctx,
      "a y-only viewport clips its x axis",
      yield* sample(
        atRest,
        vx.x + vx.width + OUTSIDE,
        vx.y + vx.height / 2,
        "right of the y-only viewport",
      ),
      background,
    );
    yield* ctx.expectEqual(
      "any scroll container clips both axes",
      paintClip({ overflowX: "scroll" }),
      paintClip({ overflowY: "scroll" }),
    );

    // ── clip-hidden: where the clip starts ─────────────────────────
    const padding = palettes.dark.spacing.xl;
    const border = palettes.dark.borderWidth.strong;
    const hidden = yield* paintedBox(ctx, driver.reader, "clip-hidden");
    const outerX = hidden.x - padding - border;
    const outerY = hidden.y - padding - border;
    yield* expectColour(
      ctx,
      "the hidden box paints its child in the content area",
      yield* sample(atRest, hidden.x + 40, hidden.y + 40, "the hidden content"),
      card,
    );
    yield* expectColour(
      ctx,
      CLIP_IS_PADDING_BOX
        ? "the clip includes the padding band"
        : "the clip stops at the content box",
      yield* sample(
        atRest,
        outerX + HIDDEN.width - border - 6,
        outerY + HIDDEN.height / 2,
        "the hidden box's padding band",
      ),
      CLIP_IS_PADDING_BOX ? card : muted,
    );
    yield* expectColour(
      ctx,
      "the hidden box does not paint outside its border",
      yield* sample(
        atRest,
        outerX + HIDDEN.width + OUTSIDE,
        outerY + HIDDEN.height / 2,
        "right of the hidden box",
      ),
      background,
    );
    yield* expectColour(
      ctx,
      "the hidden box paints its border",
      yield* sample(
        atRest,
        outerX + HIDDEN.width - 1,
        outerY + HIDDEN.height / 2,
        "the hidden box's border",
      ),
      primary,
    );
    const hiddenChild = yield* paintedBox(
      ctx,
      driver.reader,
      "clip-hidden-child",
    );
    yield* ctx.expectNear(
      "the hidden box's child keeps its layout width",
      hiddenChild.width,
      300,
      4,
    );

    // ── clip-auto: the controlled non-clip ─────────────────────────
    const auto = yield* paintedBox(ctx, driver.reader, "clip-auto");
    yield* expectColour(
      ctx,
      "an auto box paints its child below its own box",
      yield* sample(
        atRest,
        auto.x + auto.width / 2,
        auto.y + auto.height + OUTSIDE,
        "below the auto box",
      ),
      success,
    );
    yield* ctx.expectEqual(
      "an auto box reports no scroll offset",
      Option.isNone(
        Option.fromNullishOr(yield* driver.scrollOffset("clip-auto")),
      ),
      true,
    );
    yield* expectColour(
      ctx,
      "the auto child does not paint beside its box",
      yield* sample(
        atRest,
        auto.x + auto.width + OUTSIDE,
        auto.y + auto.height / 2,
        "right of the auto box",
      ),
      background,
    );

    // ── clip-img: does the bitmap escape the clip? ─────────────────
    const image = yield* paintedBox(ctx, driver.reader, "clip-img");
    const insideImage = yield* sample(
      atRest,
      image.x + IMAGE_INSET + 40,
      image.y + IMAGE_INSET + 40,
      "inside the clipped image",
    );
    yield* ctx.expectEqual(
      "the clipped image paints inside its box",
      redDominant(insideImage),
      true,
    );
    const outsideImage = yield* sample(
      atRest,
      image.x + image.width + 30,
      image.y + IMAGE_INSET + 40,
      "outside the clipped image",
    );
    yield* ctx.expectEqual(
      IMAGE_ESCAPES_CLIP
        ? "an image child escapes the parent's clip"
        : "the clip covers an image child",
      IMAGE_ESCAPES_CLIP
        ? redDominant(outsideImage)
        : Pixels.rgbaNear(outsideImage, background, 2),
      true,
    );

    // ── the axes rule (pure, once per host) ────────────────────────
    yield* ctx.expectEqual(
      "an x-only style clips x only",
      clippedAxes({ overflowX: "scroll" } satisfies OverflowStyle),
      "x",
    );
    yield* ctx.expectEqual(
      "an axis-specific style overrides the shorthand",
      clippedAxes({ overflow: "hidden", overflowX: "scroll" }),
      "both",
    );
    yield* ctx.expectEqual(
      "hidden keeps its declared axes",
      paintClip({ overflowX: "hidden" }),
      "x",
    );
  });

export const clipScenario: PlaygroundScenario = {
  id: "scroll-clip",
  title: "The clip contract: what overflow clips, and where",
  capability: "clip",
  view: clipView,
  steps: (ctx) => clipChecks(ctx, headlessDriver(ctx.host)),
};

export const clipLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-scroll-clip",
  title:
    "Live clip contract: a scrolling viewport, the axes and the clip origin",
  capability: "clip",
  steps: (ctx) => clipChecks(ctx, liveDriver(ctx.host)),
};
