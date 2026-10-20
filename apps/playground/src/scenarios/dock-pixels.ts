/**
 * The docking drop indicator in the frame (plan `715`).
 *
 * `docking-layout` proves the indicator's **box** and its **authored** style, so
 * a bar painted underneath the pane's tab strip or body passes every existing
 * check. This module turns the paint order into pixels: the bar's own centre,
 * the strip's row over it, and the body and strip 10 px inside it. The first
 * pair proves the bar paints; the second proves what is underneath the same
 * rows, which is what makes an "under the strip" regression fail by name.
 *
 * The points come from the runtime's reported bounds, never from the dock
 * model: the model's rectangle and the reported content box differ by the 1 px
 * border (plan `529` §6.3), and the bar straddles that edge.
 */
import { Effect } from "effect";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import type { FrameReader } from "./frames.js";
import { asHex, frameSampler, parseColour, TOLERANCE } from "./frames.js";

/** The centre zone's overlay opacity; `docking.tsx` imports this. */
export const CENTRE_OPACITY = 0.18;

/** How far inside the pane the two "beside the bar" samples sit. */
export const BESIDE_GAP = 10;

/** How far inside the bar's left edge the two on-bar samples sit. */
export const INSET = 1;

/** The three tokens a drop indicator paints with or over. */
export interface DockPalette {
  readonly primary: string;
  readonly card: string;
  readonly muted: string;
}

/** A logical window point. */
export interface DockPoint {
  readonly x: number;
  readonly y: number;
}

/** One point and the fact it proves. */
export interface DockSample {
  readonly label: string;
  readonly point: DockPoint;
}

/** A right-edge bar's four samples: two on the bar, two on what it covers. */
export interface DockBarSamples {
  readonly barBody: DockSample;
  readonly barStrip: DockSample;
  readonly bodyBeside: DockSample;
  readonly stripBeside: DockSample;
}

/**
 * The four points a right-edge bar paints differently.
 *
 * `bar` is the indicator's reported box and `tab` any tab in the same group, so
 * the strip's row follows the runtime's own type metrics. `bodyBeside` and
 * `stripBeside` sit `BESIDE_GAP` px to the bar's left — inside the pane, on the
 * rows the two bar samples read.
 */
export const dockBarSamples = (
  bar: Smoke.Bounds,
  tab: Smoke.Bounds,
): DockBarSamples => {
  // The bar's reported box straddles the pane's right border and the group's
  // `overflow: hidden` edge; the border paints over the bar's last pixel
  // (measured in plan 715), so the samples sit 1 px inside the bar's left edge.
  const barX = bar.x + INSET;
  const barMid = bar.y + bar.height / 2;
  const stripY = tab.y + tab.height / 2;
  const inside = bar.x - BESIDE_GAP;
  return {
    barBody: {
      label: "the drop bar paints the primary colour",
      point: { x: barX, y: barMid },
    },
    barStrip: {
      label: "the drop bar paints over the tab strip",
      point: { x: barX, y: stripY },
    },
    bodyBeside: {
      label: "the pane body paints beside the drop bar",
      point: { x: inside, y: barMid },
    },
    stripBeside: {
      label: "the tab strip paints beside the drop bar",
      point: { x: inside, y: stripY },
    },
  };
};

/**
 * The centre zone's sample: the pane's body, 40 px above its bottom edge.
 *
 * Clear of the body's top-left label and of the 1 px border, and inside every
 * pane the probe can hold a centre drag over.
 */
export const dockCentrePoint = (group: Smoke.Bounds): DockPoint => ({
  x: group.x + group.width / 2,
  y: group.y + group.height - 40,
});

const failure = (
  label: string,
  expected: string,
  actual: string,
): Smoke.SmokeAssertionError =>
  new Smoke.SmokeAssertionError({ label, expected, actual });

const sampleCheck = <E>(
  ctx: Pick<Smoke.SmokeContext, "check">,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  sample: DockSample,
  expected: Pixels.Rgba,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const window = yield* reader.windowSize();
    yield* ctx.check(
      sample.label,
      Option.match(
        frameSampler(frame, window)(sample.point.x, sample.point.y),
        {
          onNone: () =>
            Effect.fail(
              failure(sample.label, asHex(expected), "outside the frame"),
            ),
          onSome: (actual) =>
            Pixels.rgbaNear(actual, expected, TOLERANCE)
              ? Effect.void
              : Effect.fail(
                  failure(sample.label, asHex(expected), asHex(actual)),
                ),
        },
      ),
    );
  });

/** Parse a palette token, failing by name when a token is unparseable. */
const token = (
  palette: DockPalette,
  key: keyof DockPalette,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  parseColour(`the palette's ${key} token parses`, palette[key]);

/**
 * Sample a right-edge bar and what it covers: four checks.
 *
 * A bar painted under the tab strip fails only `barStrip`, which names the
 * regression instead of leaving "the indicator is not visible" to a screenshot.
 */
export const dockBarChecks = <E>(
  ctx: Pick<Smoke.SmokeContext, "check">,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  bar: Smoke.Bounds,
  tab: Smoke.Bounds,
  palette: DockPalette,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const primary = yield* token(palette, "primary");
    const card = yield* token(palette, "card");
    const muted = yield* token(palette, "muted");
    const samples = dockBarSamples(bar, tab);
    yield* sampleCheck(ctx, reader, frame, samples.barBody, primary);
    yield* sampleCheck(ctx, reader, frame, samples.barStrip, primary);
    yield* sampleCheck(ctx, reader, frame, samples.bodyBeside, card);
    yield* sampleCheck(ctx, reader, frame, samples.stripBeside, muted);
  });

/**
 * Sample the centre zone: one check that the pane is washed at 18 %.
 *
 * The expected colour is the composite the runtime performs, derived from the
 * palette — never a hardcoded hex.
 */
export const dockCentreChecks = <E>(
  ctx: Pick<Smoke.SmokeContext, "check">,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  group: Smoke.Bounds,
  palette: DockPalette,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const primary = yield* token(palette, "primary");
    const card = yield* token(palette, "card");
    yield* sampleCheck(
      ctx,
      reader,
      frame,
      {
        label: "the centre drop zone washes the pane at 18 %",
        point: dockCentrePoint(group),
      },
      Pixels.blendOver(primary, CENTRE_OPACITY, card),
    );
  });

/** One check that `point` paints the pane body again (the overlay is gone). */
export const dockRestoredCheck = <E>(
  ctx: Pick<Smoke.SmokeContext, "check">,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  point: DockPoint,
  palette: DockPalette,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const card = yield* token(palette, "card");
    yield* sampleCheck(
      ctx,
      reader,
      frame,
      {
        label: "the pane returns to its body colour when the pointer leaves",
        point,
      },
      card,
    );
  });
