/**
 * The `ripple-lifecycle` probe: what the shipped `RippleButton`'s disc really
 * paints.
 *
 * The catalogue's *Ripple button* row makes four claims about the glass: the
 * disc is the action's **own label ink at a faint share**, it is a **circle**,
 * it **grows from the press point** until it covers the control, and it is
 * **clipped by the control and takes no pointer input**. The component's
 * renderer suite reads the layer's reported box and its declarations, so a wash
 * painted in the action's fill, a square layer, a disc born at the window origin
 * or one that eats the next press would all pass there. This probe reads the
 * frame instead.
 *
 * The action carries **no visible label** on purpose: a text run inside the box
 * would be a second paint to tell from the wash. Its accessible name is the
 * `aria-label` it publishes, so the fixture is still a named action.
 *
 * Every measurement after the press is taken with the renderer's **motion clock
 * frozen**: the press starts the tween, the probe steps the clock until the
 * disc's reported box is the size it wants, and only then captures. A frame is
 * therefore a progress, not a race. The disc's removal is a real timer, so the
 * search is coarse and short — the whole tween is 500 ms of wall time.
 */
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useWindowSize } from "@gpuix/react";
import { RippleButton } from "@gpuixui/components";
import { actionOnColor } from "@gpuixui/primitives/button";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle, type Theme } from "@gpuixui/tokens";
import { useState, type ReactNode } from "react";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import { isColour } from "./box-paint.js";
import { captureScale, colourAt, differs } from "./frame.js";
import { settleUntil } from "./settle.js";
import {
  cornerPoints,
  discCentre,
  insideActionPoint,
  isFainter,
  isSmallFrame,
  isWash,
  outsideActionPoint,
  passesLeftEdge,
  pressOffset,
  pressPoint,
  RIPPLE_ACTION,
  RIPPLE_CLIP_GAP,
  RIPPLE_IDS,
  RIPPLE_PRESS,
  RIPPLE_SHARE_AGREEMENT,
  RIPPLE_STEPS,
  RIPPLE_STEP_MS,
  rippleReadout,
  washShare,
  type RippleBox,
} from "./ripple-button.js";

/** The palette the live runner provides every probe. */
const THEME: Theme = palettes.dark;

/** Where a reader looks: one capture per measured state. */
const REST = "ripple-rest";
const HOVER = "ripple-hover";
const SMALL = "ripple-small";
const CLIP = "ripple-clip";
const AFTER = "ripple-after";

/** The view: one named action with no visible label, and a press counter. */
export const RippleProbe = (): ReactNode => {
  const window = useWindowSize();
  const [presses, setPresses] = useState(0);
  return (
    <div
      testId={RIPPLE_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: THEME.spacing.xl,
        backgroundColor: THEME.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: THEME.spacing.lg,
      }}
    >
      <text
        style={{ ...textStyle(THEME, "body"), color: THEME.colors.foreground }}
      >
        A ripple is the action&apos;s own label ink laid at a faint share, grown
        from the press point until it covers the control. The action below
        paints no visible label, so the wash is the only paint inside its box.
      </text>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: THEME.spacing.xl,
          paddingRight: THEME.spacing.xl,
        }}
      >
        <RippleButton
          testId={RIPPLE_IDS.action}
          variant="primary"
          aria-label="Ship the release"
          onClick={() => setPresses((count) => count + 1)}
          style={{ width: RIPPLE_ACTION.width, height: RIPPLE_ACTION.height }}
        />
      </div>
      <Readout testId={RIPPLE_IDS.readout}>{rippleReadout(presses)}</Readout>
    </div>
  );
};

/** The probe's steps: the fill, a frozen press, the growth, the clip, the end. */
export const rippleSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(RIPPLE_IDS.action);
    // A previous probe's screenshot stalls the animation clock, and its pointer
    // may still rest over this probe's action: park the pointer away first, so
    // the resting frame is a resting frame.
    yield* Effect.sleep(Duration.millis(600));
    yield* ctx.host.hoverAt(RIPPLE_IDS.probe, { x: 4, y: 4 });
    yield* Effect.sleep(Duration.millis(120));

    /** The box `testId` paints, failing by name when it paints nothing. */
    const box = (
      testId: string,
    ): Effect.Effect<
      RippleBox,
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          `the runtime paints ${testId}`,
          Option.fromNullishOr(yield* ctx.host.bounds(testId)),
        );
      });

    /** The box `testId` paints now, or `None` when it paints nothing. */
    const maybeBox = (
      testId: string,
    ): Effect.Effect<Option.Option<RippleBox>, Smoke.SmokeHostError> =>
      Effect.map(ctx.host.bounds(testId), Option.fromNullishOr);

    /** Captures `name` and hands back the frame with its device scale. */
    const captureFrame = (
      name: string,
    ): Effect.Effect<
      { readonly frame: Pixels.Pixels; readonly scale: number },
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      Effect.gen(function* () {
        yield* ctx.host.capture(name);
        const frame = yield* ctx.host.pixels(name);
        const size = yield* ctx.host.windowSize();
        const scale = yield* ctx.expectSome(
          `the ${name} capture is the window at a whole device scale`,
          captureScale(frame, size),
        );
        return { frame, scale };
      });

    /** A logical point's exact colour, failing by name when it lies outside. */
    const sample = (
      captured: { readonly frame: Pixels.Pixels; readonly scale: number },
      point: { readonly x: number; readonly y: number },
      label: string,
    ): Effect.Effect<
      Pixels.Rgba,
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > => ctx.expectSome(label, colourAt(captured.frame, point, captured.scale));

    /** How many of `points` paint something other than `reference`. */
    const paintedDifferently = (
      captured: { readonly frame: Pixels.Pixels; readonly scale: number },
      points: ReadonlyArray<{ readonly x: number; readonly y: number }>,
      reference: Pixels.Rgba,
      label: string,
    ): Effect.Effect<
      number,
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      Effect.gen(function* () {
        const samples = yield* Effect.forEach(
          points,
          (point) => sample(captured, point, label),
          { concurrency: 1 },
        );
        return Arr.length(
          Arr.filter(samples, (colour) => differs(colour, reference)),
        );
      });

    const action = yield* box(RIPPLE_IDS.action);
    const ink = yield* ctx.expectSome(
      "the primary action's label ink is a colour the theme ships",
      Option.fromNullishOr(Pixels.hexToRgba(actionOnColor(THEME, "primary"))),
    );
    const press = pressPoint(action, RIPPLE_PRESS.first);

    // ── Rest: the action's own fill, and no disc ─────────────────────────────
    const restFrame = yield* captureFrame(REST);
    const restFill = yield* sample(
      restFrame,
      press,
      "the action's fill lies inside the resting capture",
    );
    yield* ctx.expectEqual(
      "at rest the action paints the theme's primary role where the press will land",
      isColour(restFill, THEME.colors.primary),
      true,
    );
    yield* ctx.expectEqual(
      "at rest the whole action paints that one fill",
      isColour(
        yield* sample(
          restFrame,
          {
            x: action.x + action.width * 0.8,
            y: action.y + action.height * 0.25,
          },
          "a second resting point lies inside the action",
        ),
        THEME.colors.primary,
      ),
      true,
    );
    yield* ctx.expectEqual(
      "no disc is mounted before a press",
      Option.isNone(yield* maybeBox("ripple")),
      true,
    );

    // ── The pointer's fill: what the wash is laid over ───────────────────────
    yield* ctx.host.hoverAt(RIPPLE_IDS.action, pressOffset(RIPPLE_PRESS.first));
    yield* Effect.sleep(Duration.millis(120));
    const hoverFrame = yield* captureFrame(HOVER);
    const fill = yield* sample(
      hoverFrame,
      press,
      "the action's fill under the pointer lies inside the capture",
    );
    yield* ctx.expectEqual(
      "the action under the pointer paints a fill of its own",
      differs(fill, restFill),
      true,
    );

    // ── A frozen clock: a press mounts a disc the tween has not grown ────────
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

    /** Steps the frozen clock until a frame's disc is a size the wash is read in. */
    const findSmall = (
      left: number,
    ): Effect.Effect<Option.Option<RippleBox>, Smoke.SmokeHostError> =>
      Effect.gen(function* () {
        const disc = yield* maybeBox("ripple");
        if (Option.exists(disc, isSmallFrame) || left <= 0) return disc;
        yield* fastForward(RIPPLE_STEP_MS);
        return yield* findSmall(left - 1);
      });

    /** Steps the frozen clock until the disc's box reaches past the left edge. */
    const findClip = (
      left: number,
    ): Effect.Effect<Option.Option<RippleBox>, Smoke.SmokeHostError> =>
      Effect.gen(function* () {
        const disc = yield* maybeBox("ripple");
        if (Option.exists(disc, (found) => passesLeftEdge(action, found))) {
          return disc;
        }
        if (left <= 0) return Option.none();
        yield* fastForward(RIPPLE_STEP_MS);
        return yield* findClip(left - 1);
      });

    /** Presses at `fraction` and reads the counter the press reports. */
    const pressAt = (
      fraction: { readonly across: number; readonly down: number },
      presses: number,
      label: string,
    ): Effect.Effect<void, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
      Effect.gen(function* () {
        yield* ctx.host.clickAt(RIPPLE_IDS.action, pressOffset(fraction));
        const line = yield* settleUntil(
          ctx.host.text(RIPPLE_IDS.readout),
          (text) => text.includes(rippleReadout(presses)),
        );
        yield* ctx.expectContains(label, line, rippleReadout(presses));
      });

    yield* pauseClock();
    yield* pressAt(
      RIPPLE_PRESS.first,
      1,
      "the press reaches the action it lands on",
    );
    const unborn = yield* maybeBox("ripple");
    yield* ctx.expectEqual(
      "a frozen clock leaves the disc with no painted box",
      Option.match(unborn, {
        onNone: () => true,
        onSome: (disc) => disc.width < 1 && disc.height < 1,
      }),
      true,
    );

    const small = yield* ctx.expectSome(
      "a frozen clock paints a disc that grows as it is stepped",
      yield* findSmall(RIPPLE_STEPS),
    );
    yield* ctx.expectEqual(
      "the first disc is small enough to lie inside the action",
      isSmallFrame(small),
      true,
    );

    const centre = discCentre(small);
    yield* ctx.expectNear(
      "the disc is born on the press point, across the action",
      centre.x,
      press.x,
      2,
    );
    yield* ctx.expectNear(
      "the disc is born on the press point, down the action",
      centre.y,
      press.y,
      2,
    );
    yield* ctx.expectNear(
      "the disc's box is as wide as it is tall",
      small.width,
      small.height,
      2,
    );

    // One capture per disc: the layer's removal is a real timer, so the whole
    // measurement of one frame has to fit inside the 500 ms the tween runs for.
    const smallFrame = yield* captureFrame(SMALL);
    const wash = yield* sample(
      smallFrame,
      centre,
      "the disc's centre lies inside the capture",
    );
    yield* ctx.expectEqual(
      "the disc's paint differs from the fill it is laid over",
      differs(wash, fill),
      true,
    );
    const share = yield* ctx.expectSome(
      "the disc paints a wash of the action's own label ink",
      washShare(wash, fill, ink),
    );
    yield* ctx.expectEqual(
      "the wash is faint: the ink at a share, not the ink itself",
      isWash(share),
      true,
    );
    yield* ctx.expectEqual(
      "every corner of the disc's box paints the action's fill, so the layer is round",
      yield* paintedDifferently(
        smallFrame,
        cornerPoints(small),
        fill,
        "a corner of the disc's box lies inside the capture",
      ),
      0,
    );
    yield* ctx.expectEqual(
      "a point inside the action beside the disc still paints the fill",
      differs(
        yield* sample(
          smallFrame,
          insideActionPoint(action, press.y),
          "the point beside the disc lies inside the action",
        ),
        fill,
      ),
      false,
    );

    // ── The disc leaves when its tween ends ─────────────────────────────────
    yield* resumeClock();
    const left = yield* settleUntil(maybeBox("ripple"), Option.isNone);
    yield* ctx.expectEqual(
      "the disc unmounts when its tween is over",
      Option.isNone(left),
      true,
    );

    // ── A disc late in its journey: clipped by the control, and fainter ─────
    yield* pauseClock();
    yield* pressAt(
      RIPPLE_PRESS.first,
      2,
      "a second press starts a second disc",
    );
    const clipping = yield* ctx.expectSome(
      "the disc grows until its box passes the action's edge",
      yield* findClip(RIPPLE_STEPS),
    );
    yield* ctx.expectEqual(
      "the disc that passes the edge is larger than the sampled one",
      clipping.width >= small.width + RIPPLE_CLIP_GAP,
      true,
    );
    const clipFrame = yield* captureFrame(CLIP);
    const later = yield* ctx.expectSome(
      "the grown disc still paints a wash of the label's ink",
      washShare(
        yield* sample(
          clipFrame,
          discCentre(clipping),
          "the grown disc's centre lies inside the capture",
        ),
        fill,
        ink,
      ),
    );
    yield* ctx.expectEqual(
      "the wash fades as the disc arrives",
      isFainter(later, share),
      true,
    );
    yield* ctx.expectEqual(
      "the action clips the disc: the page paints outside its own box",
      isColour(
        yield* sample(
          clipFrame,
          outsideActionPoint(action, press.y),
          "the point outside the action lies inside the capture",
        ),
        THEME.colors.background,
      ),
      true,
    );
    const reached = yield* ctx.expectSome(
      "the part of the action the disc has reached paints its wash",
      washShare(
        yield* sample(
          clipFrame,
          insideActionPoint(action, press.y),
          "the point inside the action's edge lies inside the capture",
        ),
        fill,
        ink,
      ),
    );
    yield* ctx.expectEqual(
      "the wash inside the action matches the wash at the disc's centre",
      Math.abs(reached - later) <= RIPPLE_SHARE_AGREEMENT,
      true,
    );

    // ── The hit test: a disc never takes the press it marks ──────────────────
    yield* pressAt(
      RIPPLE_PRESS.second,
      3,
      "a press over a painted disc still reaches the action",
    );

    // ── The end: the layer leaves and the action keeps its fill ──────────────
    yield* resumeClock();
    const gone = yield* settleUntil(maybeBox("ripple"), Option.isNone);
    yield* ctx.expectEqual(
      "the second disc unmounts too",
      Option.isNone(gone),
      true,
    );
    const afterFrame = yield* captureFrame(AFTER);
    yield* ctx.expectEqual(
      "the action returns to the fill it held",
      differs(
        yield* sample(
          afterFrame,
          press,
          "the press point lies inside the final capture",
        ),
        fill,
      ),
      false,
    );
  });
