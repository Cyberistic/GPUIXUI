/**
 * The live probes: one real-window view and one `steps` effect each.
 *
 * A probe is deliberately **not** a headless scenario: a window's automation
 * API is asynchronous and its renderer reports no style, so a probe asserts
 * focus and captures paint states as screenshots. The checks are still the
 * shared `Smoke` ones, so both suites emit one report shape.
 */
import type { ReactNode } from "react";
import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import type { StyleDesc } from "@gpuix/react";
import { textStyle, type Theme } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { Pixels, type Smoke } from "@gpuixui/testing";
import { palettes } from "../palettes.js";
import type { LiveProbeId } from "./registry.js";

/** Long enough for one paint after an input reaches the window. */
const SETTLE = Duration.millis(40);

/** The focus ring plan `053` proposes: an outline the runtime paints itself. */
const focusVisibleRing = (theme: Theme): StyleDesc => ({
  focusVisible: {
    outlineWidth: theme.borderWidth.strong,
    outlineColor: theme.colors.ring,
    outlineOffset: 0,
  },
});

/** One focusable sample; every sample carries the same proposed ring. */
const Sample = ({
  testId,
  label,
}: {
  readonly testId: string;
  readonly label: string;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      style={{
        width: 240,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.muted,
        ...focusVisibleRing(theme),
      }}
    >
      <text
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {label}
      </text>
    </div>
  );
};

const FocusVisibleProbe = (): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId="focus-visible-probe"
      style={{
        width: 720,
        height: 360,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The ring is focusVisible: it should appear only after keyboard input.
      </text>
      <Sample testId="press-ring" label="press target" />
      <Sample testId="tab-ring" label="tab target" />
      <Sample testId="programmatic-ring" label="programmatic target" />
    </div>
  );
};

/** One sample with the runtime's default focus dimming, or opted out. */
const DimSample = ({
  testId,
  label,
  keyboardFocusDim,
}: {
  readonly testId: string;
  readonly label: string;
  readonly keyboardFocusDim?: boolean;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      style={{
        width: 240,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.muted,
        keyboardFocusDim,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {label}
      </text>
    </div>
  );
};

/**
 * Three identical samples, one opted out of the runtime's focus dimming.
 *
 * The outside pair models "the rest of the window" while the keyboard focus is
 * elsewhere; the third shows the per-element opt-out the runtime documents.
 */
const FocusDimProbe = (): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId="focus-dim-probe"
      style={{
        width: 720,
        height: 360,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        keyboardFocusDim: the first sample dims, the third opts out.
      </text>
      <DimSample testId="dim-first" label="dims on Tab" />
      <DimSample testId="dim-second" label="takes focus on Tab" />
      <DimSample
        testId="dim-opt-out"
        label="opts out of dimming"
        keyboardFocusDim={false}
      />
    </div>
  );
};

/** What a probe module supplies; the registry supplies the metadata. */
export interface LiveProbeBody {
  readonly id: LiveProbeId;
  readonly view: () => ReactNode;
  readonly steps: Smoke.AsyncSmokeScenario["steps"];
}

/** The focused `testId`, with `"none"` for no focus so a failure reads clearly. */
const focusedId = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<string, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.focused(), (id) =>
    Option.getOrElse(Option.fromNullishOr(id), () => "none"),
  );

/** How many pixels of the capture under `name` paint exactly `colour`. */
const paintedPixels = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
  colour: Pixels.Rgba,
): Effect.Effect<number, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.pixels(name), (frame) => Pixels.countColour(frame, colour));

const focusedAfterPaint = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<string, Smoke.SmokeHostError> =>
  Effect.flatMap(Effect.sleep(SETTLE), () => focusedId(ctx));

const focusVisibleSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("focus-visible-probe");
    const ring = yield* ctx.expectSome(
      "the theme names a ring colour",
      Option.fromNullishOr(Pixels.hexToRgba(palettes.dark.colors.ring)),
    );

    // 1. A mouse press focuses the element; `focusVisible` must not paint.
    yield* ctx.host.click("press-ring");
    yield* ctx.expectEqual(
      "a press focuses the element",
      yield* focusedAfterPaint(ctx),
      "press-ring",
    );
    yield* ctx.host.capture("press");
    yield* ctx.expectEqual(
      "a press paints no focus ring",
      yield* paintedPixels(ctx, "press", ring),
      0,
    );

    // 2. Native traversal (`window.focus_next`) before any key is delivered:
    //    a traversal is not keyboard input, so the ring must stay off.
    yield* ctx.host.focusNext();
    yield* ctx.expectEqual(
      "native traversal moves focus",
      yield* focusedAfterPaint(ctx),
      "tab-ring",
    );
    yield* ctx.host.capture("traversal-before-keyboard");
    yield* ctx.expectEqual(
      "traversal before a key paints no focus ring",
      yield* paintedPixels(ctx, "traversal-before-keyboard", ring),
      0,
    );

    // 3. Programmatic focus, still before any key: same expected null ring.
    yield* ctx.host.focusElement("programmatic-ring");
    yield* ctx.expectEqual(
      "programmatic focus moves native focus",
      yield* focusedAfterPaint(ctx),
      "programmatic-ring",
    );
    yield* ctx.host.capture("programmatic-before-keyboard");
    yield* ctx.expectEqual(
      "programmatic focus before a key paints no focus ring",
      yield* paintedPixels(ctx, "programmatic-before-keyboard", ring),
      0,
    );

    // 4. Tab traverses natively and is the keyboard-input case the ring is
    //    meant for. Focus wraps from the last sample to the first.
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "Tab traverses natively and wraps",
      yield* focusedAfterPaint(ctx),
      "press-ring",
    );
    yield* ctx.host.capture("tab");
    yield* ctx.expectEqual(
      "Tab paints the focus ring",
      (yield* paintedPixels(ctx, "tab", ring)) > 0,
      true,
    );

    // 5. Programmatic focus after keyboard input has happened: does the ring
    //    persist, or is it tied to the input that caused the focus?
    yield* ctx.host.focusElement("programmatic-ring");
    yield* ctx.expectEqual(
      "programmatic focus moves native focus after Tab",
      yield* focusedAfterPaint(ctx),
      "programmatic-ring",
    );
    yield* ctx.host.capture("programmatic-after-keyboard");
    yield* ctx.expectEqual(
      "programmatic focus after a key paints the focus ring",
      (yield* paintedPixels(ctx, "programmatic-after-keyboard", ring)) > 0,
      true,
    );
  });

/** How many pixels paint the theme's `muted` fill in the capture under `name`. */
const mutedPixels = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
): Effect.Effect<number, Smoke.SmokeHostError | Smoke.SmokeAssertionError> =>
  Effect.gen(function* () {
    const muted = yield* ctx.expectSome(
      "the theme names a muted colour",
      Option.fromNullishOr(Pixels.hexToRgba(palettes.dark.colors.muted)),
    );
    return yield* paintedPixels(ctx, name, muted);
  });

const focusDimSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("focus-dim-probe");

    // A pointer press focuses a sample without entering keyboard mode, so every
    // fill is at full strength: this is the baseline the dimming is measured
    // against.
    yield* ctx.host.click("dim-first");
    yield* ctx.expectEqual(
      "a press focuses the first sample",
      yield* focusedAfterPaint(ctx),
      "dim-first",
    );
    yield* ctx.host.capture("pointer");
    const plain = yield* mutedPixels(ctx, "pointer");

    // The same three fills after Tab: the focused sample keeps its fill, the
    // dimmed one loses it, and the opted-out one must keep its own.
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "Tab focuses the second sample",
      yield* focusedAfterPaint(ctx),
      "dim-second",
    );
    yield* ctx.host.capture("keyboard");
    const dimmed = yield* mutedPixels(ctx, "keyboard");

    yield* ctx.expectEqual(
      "some fills are painted at rest",
      plain > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the runtime dims another focusable while one has keyboard focus",
      dimmed < plain,
      true,
    );
    // One sample dims (the first) and one opts out (the third), so the drop is
    // about a third. A whole-window dim would take far more than half.
    yield* ctx.expectEqual(
      "only the default sample dims, not the opted-out one",
      dimmed > plain / 2,
      true,
    );
  });

/** The bodies, one per registry id; `Record` makes a missing body a compile error. */
export const liveProbeBodies: Record<LiveProbeId, LiveProbeBody> = {
  "focus-visible": {
    id: "focus-visible",
    view: () => <FocusVisibleProbe />,
    steps: focusVisibleSteps,
  },
  "keyboard-focus-dim": {
    id: "keyboard-focus-dim",
    view: () => <FocusDimProbe />,
    steps: focusDimSteps,
  },
};
