/**
 * The `switch-lifecycle` probe: the shipped `Switch` in a real window.
 *
 * A switch's state is two paints and one **position** — the track's fill, the
 * knob's ink and the knob's inset. The package's suites read the resolved
 * `StyleDesc` and drive the motion clock through the render tree; a window is
 * the only place that says the fill reached the glass and the knob really
 * travelled. The knob is a part the component renders itself and carries no
 * `testId`, so the probe reads it out of a captured frame by its colour, inside
 * the box the switch's own address covers.
 *
 * Four measurements, each with its own state so none can borrow another's:
 *
 * 1. the accent-family switch — a press toggles it, and the knob moves from one
 *    authored inset to the same inset on the far side;
 * 2. Space — the control's own keyboard contract, which a window's key delivery
 *    is the only way to prove;
 * 3. a disabled twin — a press reports nothing;
 * 4. a platform style's own switch — its off and on fills and its knob, painted
 *    from the platform table rather than the accent recipe.
 *
 * The slide is read on the renderer's **motion clock**: freeze, press, advance
 * by an exact offset, capture. Half the `fast` level is half the travel, so the
 * thumb is measurably neither at the start nor at the end.
 */
import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { platformTheme, type Theme } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import {
  Switch,
  ThemeProvider as PrimitiveThemeProvider,
} from "@gpuixui/primitives";
import { palettes } from "../palettes.js";
import { Readout } from "../ui.js";
import { captureScale } from "./frame.js";
import { settleUntil } from "./settle.js";
import {
  SWITCH_HALF_MS,
  SWITCH_IDS,
  SWITCH_PAGE,
  SWITCH_REST_MS,
  isBetween,
  leadingGap,
  nearMiddle,
  paintInBand,
  sitsAtTheEnd,
  sitsAtTheStart,
  switchReadout,
  thumbMoved,
  trailingGap,
  type SwitchBox,
  type SwitchPaint,
} from "./switch.js";

/** A switch's own state is one re-render behind the press that changed it. */
const SETTLE = Duration.millis(120);

/** The captures a reader can look at. */
const REST = "switch-rest";
const ON = "switch-on";
const PLATFORM_OFF = "switch-platform-off";
const PLATFORM_ON = "switch-platform-on";
const FROZEN = "switch-frozen";
const PARTIAL = "switch-partial";
const SETTLED = "switch-settled";

/** The platform whose own toggle the probe paints. */
const PLATFORM = "darwin";

/** The shipped `Switch`, two states of it and the readouts they print. */
export const SwitchProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [checked, setChecked] = useState(false);
  const [changes, setChanges] = useState(0);
  const [platformChecked, setPlatformChecked] = useState(false);
  const [platformChanges, setPlatformChanges] = useState(0);
  const [refusals, setRefusals] = useState(0);
  const platform = platformTheme(palettes.dark, PLATFORM);

  return (
    <div
      testId={SWITCH_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: SWITCH_PAGE,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: theme.spacing.lg,
      }}
    >
      <Readout testId={SWITCH_IDS.readout}>
        {switchReadout(checked, changes)}
      </Readout>
      <PrimitiveThemeProvider theme={palettes.dark}>
        <Switch
          testId={SWITCH_IDS.field}
          label="Enable telemetry"
          checked={checked}
          onCheckedChange={(next) => {
            setChecked(next);
            setChanges((count) => count + 1);
          }}
        />
      </PrimitiveThemeProvider>
      <PrimitiveThemeProvider theme={palettes.dark}>
        <Switch
          testId={SWITCH_IDS.disabled}
          label="Policy controlled"
          disabled
          onCheckedChange={() => setRefusals((count) => count + 1)}
        />
      </PrimitiveThemeProvider>
      <Readout testId={SWITCH_IDS.disabledReadout}>
        {`refusals=${refusals}`}
      </Readout>
      <Readout testId={SWITCH_IDS.platformReadout}>
        {switchReadout(platformChecked, platformChanges)}
      </Readout>
      <PrimitiveThemeProvider theme={platform}>
        <Switch
          testId={SWITCH_IDS.platform}
          label="Desktop theme"
          checked={platformChecked}
          onCheckedChange={(next) => {
            setPlatformChecked(next);
            setPlatformChanges((count) => count + 1);
          }}
        />
      </PrimitiveThemeProvider>
    </div>
  );
};

/** The painted box of `testId`, failing by name when the runtime omitted it. */
const paintedBox = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<SwitchBox, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    return yield* ctx.expectSome(
      `the runtime paints ${testId}`,
      Option.fromNullishOr(yield* ctx.host.bounds(testId)),
    );
  });

/**
 * The device scale the window paints at, read once.
 *
 * A capture arrives device-scaled, so every logical box is converted by this
 * one number. It is asserted once and not per capture: the polls below capture
 * as often as their paint needs, and a printed check count that moved with the
 * machine's load would not be reproducible.
 */
const captureScaleOf = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
): Effect.Effect<number, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    yield* ctx.host.capture(name);
    const pixels = yield* ctx.host.pixels(name);
    const size = yield* ctx.host.windowSize();
    return yield* ctx.expectSome(
      `${name} is the window at a whole device scale`,
      captureScale(pixels, size),
    );
  });

/** One capture's frame, decoded through the window's own pixel reader. */
const frameOf = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
): Effect.Effect<Pixels.Pixels, Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    yield* ctx.host.capture(name);
    return yield* ctx.host.pixels(name);
  });

/** Both paints of one state, read out of a single capture. */
const paintsOf = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
  band: SwitchBox,
  scale: number,
  track: Pixels.Rgba,
  thumb: Pixels.Rgba,
): Effect.Effect<
  {
    readonly track: Option.Option<SwitchPaint>;
    readonly thumb: Option.Option<SwitchPaint>;
  },
  Smoke.SmokeHostError
> =>
  Effect.map(frameOf(ctx, name), (frame) => ({
    track: paintInBand(frame, band, track, scale),
    thumb: paintInBand(frame, band, thumb, scale),
  }));

/**
 * The thumb at rest, polled until the slide has finished.
 *
 * A press on a switch leaves the pointer on it, so the track paints its
 * `hover` fill rather than the role it rests on; parking the pointer away is
 * what captures the resting frame. The poll is for the 160ms slide behind the
 * two paints — the readout lands a frame before the knob does. The settled
 * frame is returned too, so the track beside the knob is read from that same
 * frame rather than a second capture.
 */
const restedThumb = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
  band: SwitchBox,
  track: Pixels.Rgba,
  thumbInk: Pixels.Rgba,
  scale: number,
  start: SwitchBox,
  label: string,
): Effect.Effect<
  {
    readonly thumb: SwitchPaint;
    readonly track: Option.Option<SwitchPaint>;
    readonly frame: Pixels.Pixels;
  },
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    yield* ctx.host.hover(SWITCH_IDS.readout);
    const grounded = yield* settleUntil(
      Effect.map(frameOf(ctx, name), (frame) => ({
        frame,
        track: paintInBand(frame, band, track, scale),
        thumb: paintInBand(frame, band, thumbInk, scale),
      })),
      // Both resting paints at once: the knob at the far inset, and the track
      // on its resting role rather than the fill the pointer left behind.
      (read) =>
        Option.isSome(read.track) &&
        Option.exists(read.thumb, (found) => sitsAtTheEnd(band, start, found)),
      25,
    );
    return {
      frame: grounded.frame,
      track: grounded.track,
      thumb: yield* ctx.expectSome(label, grounded.thumb),
    } as const;
  });

/**
 * The canonical colours the probe counts.
 *
 * A frame is read for exact bytes, so each ink is resolved from the same theme
 * the switch paints from — the two cannot drift.
 */
const inksOf = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
  hex: string,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  ctx.expectSome(
    `the theme names a paintable ${name}`,
    Option.fromNullishOr(Pixels.hexToRgba(hex)),
  );

/** The switch's own ink: the accent family's two track fills and two knobs. */
const darkInks = (ctx: Smoke.AsyncSmokeContext, theme: Theme) =>
  Effect.gen(function* () {
    return {
      trackOff: yield* inksOf(ctx, "muted", theme.colors.muted),
      trackOn: yield* inksOf(ctx, "primary", theme.colors.primary),
      thumbOff: yield* inksOf(ctx, "foreground", theme.colors.foreground),
      thumbOn: yield* inksOf(
        ctx,
        "primaryForeground",
        theme.colors.primaryForeground,
      ),
    } as const;
  });

export const switchSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(SWITCH_IDS.probe);
    yield* Effect.sleep(SETTLE);
    const dark = palettes.dark;
    const inks = yield* darkInks(ctx, dark);
    const platform = platformTheme(dark, PLATFORM);
    const declared = yield* ctx.expectSome(
      "the platform style declares its own switch",
      Option.fromNullishOr(platform.switch),
    );
    const platformOffInk = yield* inksOf(ctx, "platform off", declared.off);
    const platformOnInk = yield* inksOf(ctx, "platform on", declared.on);
    const platformKnobInk = yield* inksOf(ctx, "platform knob", declared.knob);
    const band = yield* paintedBox(ctx, SWITCH_IDS.field);
    const platformBand = yield* paintedBox(ctx, SWITCH_IDS.platform);
    const scale = yield* captureScaleOf(ctx, REST);

    // ── At rest: the accent family's own two paints ─────────────────────────
    yield* ctx.expectEqual(
      "the shipped Switch starts unchecked",
      yield* ctx.host.text(SWITCH_IDS.readout),
      switchReadout(false, 0),
    );
    const rest = yield* paintsOf(
      ctx,
      REST,
      band,
      scale,
      inks.trackOff,
      inks.thumbOff,
    );
    const restTrack = yield* ctx.expectSome(
      "the resting track paints the muted role",
      rest.track,
    );
    const restThumb = yield* ctx.expectSome(
      "the resting thumb paints the foreground role",
      rest.thumb,
    );
    yield* ctx.expectEqual(
      "the resting thumb sits at the track's leading edge",
      sitsAtTheStart(band, restThumb),
      true,
    );
    yield* ctx.expectEqual(
      "the muted fill covers the track's resting width",
      restTrack.count > 0,
      true,
    );

    // ── A press: the state, the paint, and the knob's own travel ─────────────
    yield* ctx.host.click(SWITCH_IDS.field);
    yield* ctx.expectEqual(
      "a press toggles the switch and reports it once",
      yield* settleUntil(
        ctx.host.text(SWITCH_IDS.readout),
        (value) => value === switchReadout(true, 1),
      ),
      switchReadout(true, 1),
    );
    const on = yield* restedThumb(
      ctx,
      ON,
      band,
      inks.trackOn,
      inks.thumbOn,
      scale,
      restThumb,
      "the checked thumb rests at the track's trailing edge",
    );
    const onTrack = yield* ctx.expectSome(
      "the checked track paints the primary role",
      on.track,
    );
    yield* ctx.expectEqual(
      "the primary fill covers the checked track",
      onTrack.count > 0,
      true,
    );
    yield* ctx.expectNear(
      "the checked thumb's far inset is the inset it started with",
      trailingGap(band, on.thumb),
      leadingGap(band, restThumb),
      1,
    );
    yield* ctx.expectEqual(
      "the thumb crosses more than a third of its track",
      thumbMoved(restThumb, on.thumb) > band.width / 3,
      true,
    );
    yield* ctx.expectEqual(
      "the checked thumb rests at the track's trailing edge",
      sitsAtTheEnd(band, restThumb, on.thumb),
      true,
    );

    // ── Space: the control's own keyboard contract ──────────────────────────
    yield* ctx.host.key("space");
    yield* ctx.host.keyUp("space");
    yield* ctx.expectEqual(
      "Space toggles the focused switch",
      yield* settleUntil(
        ctx.host.text(SWITCH_IDS.readout),
        (value) => value === switchReadout(false, 2),
      ),
      switchReadout(false, 2),
    );

    // ── A disabled twin refuses the press ───────────────────────────────────
    yield* ctx.host.click(SWITCH_IDS.disabled);
    yield* ctx.expectEqual(
      "a disabled switch reports nothing",
      yield* ctx.host.text(SWITCH_IDS.disabledReadout),
      "refusals=0",
    );
    yield* ctx.expectEqual(
      "the press on the disabled twin leaves the open switch alone",
      yield* ctx.host.text(SWITCH_IDS.readout),
      switchReadout(false, 2),
    );

    // ── A platform style paints its own toggle, not the accent recipe ───────
    const platformRest = yield* paintsOf(
      ctx,
      PLATFORM_OFF,
      platformBand,
      scale,
      platformOffInk,
      platformKnobInk,
    );
    const platformRestTrack = yield* ctx.expectSome(
      "the platform's resting track paints its own off fill",
      platformRest.track,
    );
    const platformRestThumb = yield* ctx.expectSome(
      "the platform's resting knob paints its own ink",
      platformRest.thumb,
    );
    yield* ctx.expectEqual(
      "the off fill covers the platform's track",
      platformRestTrack.count > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the platform knob starts at its own box's inset",
      sitsAtTheStart(platformBand, platformRestThumb),
      true,
    );
    yield* ctx.host.click(SWITCH_IDS.platform);
    yield* ctx.expectEqual(
      "a press toggles the platform switch",
      yield* settleUntil(
        ctx.host.text(SWITCH_IDS.platformReadout),
        (value) => value === switchReadout(true, 1),
      ),
      switchReadout(true, 1),
    );
    const platformOn = yield* restedThumb(
      ctx,
      PLATFORM_ON,
      platformBand,
      platformOnInk,
      platformKnobInk,
      scale,
      platformRestThumb,
      "the platform's checked knob rests at the far inset",
    );
    const platformOnTrack = yield* ctx.expectSome(
      "the platform's checked track paints its own on fill",
      platformOn.track,
    );
    yield* ctx.expectEqual(
      "the on fill covers the platform's track, not the palette's primary",
      platformOnTrack.count > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the platform knob crosses more than a third of its own track",
      thumbMoved(platformRestThumb, platformOn.thumb) > platformBand.width / 3,
      true,
    );
    yield* ctx.expectNear(
      "the platform knob's far inset is the inset it started with",
      trailingGap(platformBand, platformOn.thumb),
      leadingGap(platformBand, platformRestThumb),
      1,
    );

    // ── The slide, on the renderer's own motion clock ───────────────────────
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
    yield* ctx.host.click(SWITCH_IDS.field);
    yield* ctx.expectEqual(
      "the frozen press toggles the switch",
      yield* settleUntil(
        ctx.host.text(SWITCH_IDS.readout),
        (value) => value === switchReadout(true, 3),
      ),
      switchReadout(true, 3),
    );
    const frozen = yield* ctx.expectSome(
      "the frozen frame paints the thumb where the run starts",
      paintInBand(yield* frameOf(ctx, FROZEN), band, inks.thumbOn, scale),
    );
    yield* ctx.expectEqual(
      "the frozen frame leaves the thumb at its start",
      sitsAtTheStart(band, frozen),
      true,
    );
    yield* fastForward(SWITCH_HALF_MS);
    const partial = yield* ctx.expectSome(
      "the halfway frame paints the thumb",
      paintInBand(yield* frameOf(ctx, PARTIAL), band, inks.thumbOn, scale),
    );
    yield* ctx.expectEqual(
      "halfway through the level the thumb is between its two places",
      isBetween(partial.x, frozen.x, on.thumb.x),
      true,
    );
    yield* ctx.expectEqual(
      "halfway through an in-out slide the thumb is at its middle",
      nearMiddle(partial.x, frozen.x, on.thumb.x),
      true,
    );
    yield* fastForward(SWITCH_REST_MS - SWITCH_HALF_MS);
    const settled = yield* ctx.expectSome(
      "the settled frame paints the thumb",
      paintInBand(yield* frameOf(ctx, SETTLED), band, inks.thumbOn, scale),
    );
    yield* ctx.expectEqual(
      "past the level the thumb rests at the far end",
      sitsAtTheEnd(band, frozen, settled),
      true,
    );
    yield* resumeClock();
  });
