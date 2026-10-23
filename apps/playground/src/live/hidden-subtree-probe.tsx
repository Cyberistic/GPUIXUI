/**
 * The `hidden-subtree-lifecycle` probe: what the runtime's two hiding words do
 * to paint, layout and the Tab traversal.
 *
 * The pinned renderer's `apply_styles` only acts on `display` of `flex` or
 * `grid`, while `visibility: "hidden"` becomes GPUI's `invisible()`. Both are
 * in the style type, so a component can write either and the difference is
 * invisible to the type checker — which is why it is measured in a window.
 *
 * The shipped `Carousel` is the one component that leaned on the first word: it
 * used to keep every slide mounted so a form on slide two survived a visit to
 * slide three, and hid the spare ones with `display`. Because `display: none`
 * is ignored, every slide painted and the frame was as wide as all of them. It
 * now mounts only the slide on screen, so this window proves the fixed shape
 * beside the two words: one slide box, one frame wide, and a traversal that
 * never visits the spare slide's control.
 *
 * The invisible control counts the keys it hears, so a focus it takes from code
 * is proved live rather than assumed.
 *
 * The view and the steps live here rather than in `scenarios.tsx` so the
 * measurement is one module; the registry and `liveProbeBodies` name it.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { Carousel, CarouselSlide, CarouselTrack } from "@gpuixui/components";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import { palettes } from "../palettes.js";
import { captureScale, colourAt, differs, type Point } from "./frame.js";
import {
  HIDDEN_IDS,
  HIDDEN_KEY,
  HIDDEN_STOPS,
  HIDDEN_WALK,
  hiddenReadout,
} from "./hidden-subtree.js";

/** A key may arrive a frame after the press that focused the target. */
const SETTLE = Duration.millis(40);

/** A focusable control a probe can read back, hidden or not. */
const ProbeControl = ({
  testId,
  label,
  onKey,
}: {
  readonly testId: string;
  readonly label: string;
  readonly onKey?: () => void;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      onKeyDown={onKey}
      style={{
        width: 200,
        height: 32,
        padding: theme.spacing.sm,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.muted,
        display: "flex" as const,
        flexDirection: "row" as const,
        alignItems: "center" as const,
      }}
    >
      <text
        style={{ ...textStyle(theme, "label"), color: theme.colors.foreground }}
      >
        {label}
      </text>
    </div>
  );
};

/** The probe's window: the two hiding words around a shipped carousel. */
export const HiddenSubtreeProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [slide, setSlide] = useState(0);
  const [invisibleKeys, setInvisibleKeys] = useState(0);

  return (
    <div
      testId={HIDDEN_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex" as const,
        flexDirection: "column" as const,
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        Two ways to hide a subtree, and the carousel&apos;s spare slide: which
        ones paint, lay out and keep a tab stop?
      </text>
      <ProbeControl testId={HIDDEN_IDS.before} label="Before the hidden" />
      <div
        testId={HIDDEN_IDS.displayWrapper}
        style={{ display: "none" as const }}
      >
        <ProbeControl
          testId={HIDDEN_IDS.displayControl}
          label="Hidden by display"
        />
      </div>
      <div
        testId={HIDDEN_IDS.visibilityFrame}
        style={{ height: 32, display: "flex" as const }}
      >
        <div
          testId={HIDDEN_IDS.visibilityWrapper}
          style={{ visibility: "hidden" as const }}
        >
          <ProbeControl
            testId={HIDDEN_IDS.visibilityControl}
            label="Hidden by visibility"
            onKey={() => setInvisibleKeys((count) => count + 1)}
          />
        </div>
      </div>
      <Carousel
        label="Hidden slide probe"
        value={slide}
        onValueChange={setSlide}
        testId={HIDDEN_IDS.carousel}
      >
        <CarouselTrack>
          <CarouselSlide testId={HIDDEN_IDS.activeSlideFrame}>
            <ProbeControl
              testId={HIDDEN_IDS.activeSlide}
              label="Active slide's control"
            />
          </CarouselSlide>
          <CarouselSlide testId={HIDDEN_IDS.inactiveSlideFrame}>
            <ProbeControl
              testId={HIDDEN_IDS.inactiveSlide}
              label="Spare slide's control"
            />
          </CarouselSlide>
        </CarouselTrack>
      </Carousel>
      <ProbeControl testId={HIDDEN_IDS.after} label="After the carousel" />
      <text
        testId={HIDDEN_IDS.readout}
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {hiddenReadout({ slide, invisibleKeys })}
      </text>
    </div>
  );
};

/** The focused `testId`, with `"none"` for no focus so a failure reads clearly. */
const focusedId = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<string, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.focused(), (id) =>
    Option.getOrElse(Option.fromNullishOr(id), () => "none"),
  );

/** The focused `testId` once the frame settles after the input that moved it. */
const focusedAfterPaint = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<string, Smoke.SmokeHostError> =>
  Effect.flatMap(Effect.sleep(SETTLE), () => focusedId(ctx));

/** One Tab press, and the focus it left behind. */
const tab = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<string, Smoke.SmokeHostError> =>
  Effect.flatMap(ctx.host.key("tab"), () => focusedAfterPaint(ctx));

/** The walk up to its first repeat, which is one full traversal of the window. */
const cycleOf = (walked: ReadonlyArray<string>): ReadonlyArray<string> =>
  Option.match(
    Option.filter(
      Arr.findFirstIndex(walked, (id) => id === HIDDEN_IDS.before),
      (at) => at > 0,
    ),
    {
      onNone: () => walked,
      onSome: (at) => Arr.take(walked, at),
    },
  );

/** The colour at a logical point of a capture, failing by name if outside. */
const sampleAt = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Pixels.Pixels,
  point: Point,
  scale: number,
  label: string,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  ctx.expectSome(label, colourAt(frame, point, scale));

/** Whether `sample` is the paint `expected` within the frame's tolerance. */
const expectPaint = (
  ctx: Smoke.AsyncSmokeContext,
  label: string,
  sample: Pixels.Rgba,
  expected: Pixels.Rgba,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  ctx.expectEqual(label, differs(sample, expected), false);

/** A box's centre, which is inside the control and clear of its label. */
const centreOf = (box: Smoke.Bounds): Point => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

export const hiddenSubtreeSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(HIDDEN_IDS.probe);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("hidden-subtree");

    const page = yield* ctx.expectSome(
      "the theme names the page fill",
      Option.fromNullishOr(Pixels.hexToRgba(palettes.dark.colors.background)),
    );
    const fill = yield* ctx.expectSome(
      "the theme names the control's own fill",
      Option.fromNullishOr(Pixels.hexToRgba(palettes.dark.colors.muted)),
    );
    const frame = yield* ctx.host.pixels("hidden-subtree");
    const window = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, window),
    );

    // 1. The two words, read on the same frame. A `display: none` control is
    //    still laid out and painted; an invisible one is not.
    const displayed = yield* ctx.expectSome(
      "the display:none control still reports a laid-out box",
      Option.fromNullishOr(yield* ctx.host.bounds(HIDDEN_IDS.displayControl)),
    );
    yield* ctx.expectNear(
      "the display:none control keeps the 32-point box it was built at",
      displayed.height,
      32,
      1,
    );
    yield* expectPaint(
      ctx,
      "the display:none control paints its own fill",
      yield* sampleAt(
        ctx,
        frame,
        centreOf(displayed),
        scale,
        "the frame holds the display:none control's box",
      ),
      fill,
    );

    yield* ctx.expectEqual(
      "the visibility:hidden control reports no box",
      Option.isNone(
        Option.fromNullishOr(
          yield* ctx.host.bounds(HIDDEN_IDS.visibilityControl),
        ),
      ),
      true,
    );
    const wrapper = yield* ctx.expectSome(
      "the visibility:hidden frame keeps the row its invisible control holds",
      Option.fromNullishOr(yield* ctx.host.bounds(HIDDEN_IDS.visibilityFrame)),
    );
    yield* ctx.expectNear(
      "the invisible control still takes its 32-point row",
      wrapper.height,
      32,
      1,
    );
    yield* expectPaint(
      ctx,
      "the visibility:hidden row paints the page where its control would be",
      yield* sampleAt(
        ctx,
        frame,
        centreOf(wrapper),
        scale,
        "the frame holds the visibility row's box",
      ),
      page,
    );

    // 2. The traversal. A `display: none` control keeps its stop; an invisible
    //    one is measured, not assumed.
    yield* ctx.host.focusElement(HIDDEN_IDS.before);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the walk starts on the control the probe focused",
      yield* focusedId(ctx),
      HIDDEN_IDS.before,
    );
    const walked = yield* Effect.forEach(
      Arr.range(1, HIDDEN_WALK),
      () => tab(ctx),
      { concurrency: 1 },
    );
    const cycle = cycleOf(walked);
    yield* ctx.expectEqual(
      "the walk repeats the stops the window actually visits",
      Arr.join(cycle, " > "),
      Arr.join(Arr.drop(HIDDEN_STOPS, 1), " > "),
    );

    // 3. The mount window: the slide on screen is the only one in the tree, and
    //    it is the frame's whole width. A spare slide kept mounted would paint
    //    beside it and keep its control as a tab stop, because `display: none`
    //    is not a hiding word here.
    const carousel = yield* ctx.expectSome(
      "the carousel lays out",
      Option.fromNullishOr(yield* ctx.host.bounds(HIDDEN_IDS.carousel)),
    );
    const active = yield* ctx.expectSome(
      "the active slide paints",
      Option.fromNullishOr(yield* ctx.host.bounds(HIDDEN_IDS.activeSlideFrame)),
    );
    yield* ctx.expectEqual(
      "the spare slide is not in the tree: one slide box, not two",
      Option.isNone(
        Option.fromNullishOr(
          yield* ctx.host.bounds(HIDDEN_IDS.inactiveSlideFrame),
        ),
      ),
      true,
    );
    // The track draws one 1-point edge each side, and the slide is its content
    // box, so the frame's width less the slide's is the track's edge.
    const trackEdge = 2 * palettes.dark.borderWidth.thin;
    yield* ctx.expectNear(
      "the one mounted slide fills the frame the carousel lays out",
      carousel.width - active.width,
      trackEdge,
      1,
    );

    // 4. A step moves the mount window with it: the slide the reader left is
    //    gone from the tree and the one now on screen is the only box painted.
    yield* ctx.host.focusElement(HIDDEN_IDS.carousel);
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the carousel steps to its second slide",
      yield* ctx.host.text(HIDDEN_IDS.readout),
      "slide=1",
    );
    yield* ctx.expectEqual(
      "the slide that left the screen unmounts",
      Option.isNone(
        Option.fromNullishOr(
          yield* ctx.host.bounds(HIDDEN_IDS.activeSlideFrame),
        ),
      ),
      true,
    );
    const stepped = yield* ctx.expectSome(
      "the slide now on screen is the only one painted",
      Option.fromNullishOr(
        yield* ctx.host.bounds(HIDDEN_IDS.inactiveSlideFrame),
      ),
    );
    yield* ctx.expectNear(
      "the stepped slide fills the same frame",
      carousel.width - stepped.width,
      trackEdge,
      1,
    );

    // 5. The invisible control from code: the traversal's answer is not the
    //    window's last word about focus.
    yield* ctx.host.focusElement(HIDDEN_IDS.visibilityControl);
    yield* ctx.expectEqual(
      "focusing the visibility:hidden control reports what the window did",
      yield* focusedAfterPaint(ctx),
      HIDDEN_IDS.visibilityControl,
    );
    yield* ctx.host.key(HIDDEN_KEY);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a key typed at the invisible control is not delivered to it",
      yield* ctx.host.text(HIDDEN_IDS.readout),
      "invisibleKeys=0",
    );
    yield* ctx.host.capture("hidden-subtree-stepped");
  });
