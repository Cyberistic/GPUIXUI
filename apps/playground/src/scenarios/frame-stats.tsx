/**
 * `frame-stats` — the renderer's paint counter, its bounded sample ring and the
 * debug overlay.
 *
 * `getDebugFrameOverlayStats()` is the only runtime-owned signal that a paint
 * happened, so it is the honest way for a test to prove a component repainted.
 * This probe pins the contract (plan `527`, measured on 0.10.0):
 *
 * - **a read is pure**: two consecutive reads are equal;
 * - `flush()` is **exactly one frame** (+1 frame, +1 sample);
 * - `resetDebugFrameOverlayStats()` clears only the sample ring — the lifetime
 *   `frames` count keeps growing, and the reset itself leaves one sample whose
 *   `p90`/`p99`/`max`/`current` all equal that paint;
 * - the ring is bounded at **1000 samples** while `frames` keeps counting;
 * - the overlay is a **paint-only** layer: it adds no retained host nodes,
 *   changes no painted text and never intercepts a click underneath it;
 * - the cycle order is hidden → minimal → full → hidden.
 *
 * The consumer rule: a scenario that must prove a repaint reads `frames`
 * around the action, and it must force the paint with `paint()` offscreen —
 * `advance(0)` is not a paint.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const ROWS = 40;
const ROW_HEIGHT = 20;
const SCROLLER_HEIGHT = 160;
/** The documented bound of the debug overlay's draw-sample ring. */
const SAMPLE_CAP = 1000;
/** Enough past the cap that the assertion proves the ring, not the loop. */
const FILL_PAINTS = SAMPLE_CAP + 5;

/** The scenario view, reused by the live twin. */
export const FrameStatsView = () => {
  const theme = useTheme();
  const [count, setCount] = useState(0);

  return (
    <div
      testId="fs-root"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 16,
        width: 640,
        height: 520,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="fs-counter"
        role="button"
        onClick={() => setCount((current) => current + 1)}
        style={{
          padding: 8,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.muted,
        }}
      >
        <text
          testId="fs-paints"
          style={{ color: theme.colors.foreground }}
        >{`paints ${count}`}</text>
      </div>
      <div
        testId="fs-scroller"
        style={{
          height: SCROLLER_HEIGHT,
          overflowY: "scroll",
          backgroundColor: theme.colors.card,
        }}
      >
        {Arr.map(Arr.range(0, ROWS - 1), (index) => (
          <div
            key={index}
            testId={`fs-row-${index}`}
            style={{ height: ROW_HEIGHT, flexShrink: 0 }}
          >
            <text
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.mutedForeground,
              }}
            >{`row ${index}`}</text>
          </div>
        ))}
      </div>
      <Readout testId="fs-readout">{`rows=${ROWS} paints=${count}`}</Readout>
    </div>
  );
};

type Context = Smoke.SmokeContext;

/** A readout's text, or a failure naming the missing id. */
const textOf = (ctx: Context, testId: string) =>
  ctx.expectSome(
    `${testId} is painted`,
    Option.fromNullishOr(ctx.host.text(testId)),
  );

/** Reads the four timings, failing on the one that is absent. */
const timingsOf = (ctx: Context, stats: Smoke.FrameStats) =>
  Effect.all(
    {
      current: ctx.expectSome(
        `the current draw time is reported (${stats.samples} samples)`,
        stats.currentMs,
      ),
      p90: ctx.expectSome("the p90 draw time is reported", stats.p90Ms),
      p99: ctx.expectSome("the p99 draw time is reported", stats.p99Ms),
      max: ctx.expectSome("the max draw time is reported", stats.maxMs),
    },
    { concurrency: 1 },
  );

/** Asserts one sample's ordering: `current ≤ p90 ≤ p99 ≤ max`. */
const expectOrdered = (ctx: Context, stats: Smoke.FrameStats) =>
  Effect.gen(function* () {
    const timings = yield* timingsOf(ctx, stats);
    yield* ctx.expectEqual(
      "the p90 never exceeds the p99",
      timings.p90 <= timings.p99,
      true,
    );
    yield* ctx.expectEqual(
      "the p99 never exceeds the maximum",
      timings.p99 <= timings.max,
      true,
    );
    yield* ctx.expectEqual(
      "the current draw is never the maximum outlier",
      timings.current <= timings.max,
      true,
    );
    return timings;
  });

/** The overlay mode the runtime reports, or a failure naming the absence. */
const modeOf = (ctx: Context, label: string, mode: Option.Option<string>) =>
  ctx.expectSome(label, mode);

const paintedTextOf = (ctx: Context): string =>
  Arr.join(ctx.host.paintedText(), "|");

const retainedOf = (
  ctx: Context,
  label = "the host reports its retained tree",
) => ctx.expectSome(label, Option.fromNullishOr(ctx.host.retainedElements()));

export const frameStatsScenario: PlaygroundScenario = {
  id: "frame-stats",
  title: "Paint counter: frames, the sample ring and the debug overlay",
  capability: "frames",
  view: () => <FrameStatsView />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // 1. The counter exists and is readable without painting.
      const baseline = ctx.host.frameStats();
      yield* ctx.expectEqual(
        "the renderer reports painted frames",
        baseline.frames > 0,
        true,
      );
      yield* ctx.expectEqual(
        "the renderer reports draw samples",
        baseline.samples > 0,
        true,
      );
      yield* ctx.expectEqual(
        "the sample ring cannot exceed the paint count",
        baseline.samples <= baseline.frames,
        true,
      );

      const reread = ctx.host.frameStats();
      yield* ctx.expectEqual(
        "a read does not paint (frames)",
        reread.frames,
        baseline.frames,
      );
      yield* ctx.expectEqual(
        "a read does not paint (samples)",
        reread.samples,
        baseline.samples,
      );
      yield* expectOrdered(ctx, baseline);

      // 2. One forced paint is exactly one frame.
      const beforePaint = ctx.host.frameStats();
      ctx.host.paint();
      const afterPaint = ctx.host.frameStats();
      yield* ctx.expectEqual(
        "one forced paint costs exactly one frame",
        afterPaint.frames,
        beforePaint.frames + 1,
      );
      yield* ctx.expectEqual(
        "one forced paint records exactly one sample",
        afterPaint.samples,
        beforePaint.samples + 1,
      );

      // 3. A state change paints; the counter follows the real repaint.
      const beforeClick = ctx.host.frameStats();
      ctx.host.click("fs-counter");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the click repaints its counter",
        yield* textOf(ctx, "fs-paints"),
        "paints 1",
      );
      yield* ctx.expectEqual(
        "a click that changes the tree paints",
        ctx.host.frameStats().frames > beforeClick.frames,
        true,
      );

      // 4. A wheel is a real gesture and costs at least one paint.
      const beforeWheel = ctx.host.frameStats();
      ctx.host.wheel("fs-scroller", 0, -60);
      ctx.host.advance(0);
      const offset = yield* ctx.expectSome(
        "the scroller reports its offset",
        Option.fromNullishOr(ctx.host.scrollOffset("fs-scroller")),
      );
      yield* ctx.expectNear("the wheel moved the scroller", offset.y, -60, 1);
      yield* ctx.expectEqual(
        "a wheel that scrolls paints",
        ctx.host.frameStats().frames > beforeWheel.frames,
        true,
      );

      // 5. Reset clears the ring, never the lifetime count.
      const beforeReset = ctx.host.frameStats();
      ctx.host.resetFrameStats();
      const reset = ctx.host.frameStats();
      yield* ctx.expectEqual(
        "reset keeps the lifetime frame count",
        reset.frames >= beforeReset.frames,
        true,
      );
      yield* ctx.expectEqual(
        "reset clears the ring to its own paint",
        reset.samples,
        1,
      );
      const resetTimings = yield* expectOrdered(ctx, reset);
      yield* ctx.expectEqual(
        "reset collapses p90 onto that sample",
        resetTimings.p90,
        resetTimings.current,
      );
      yield* ctx.expectEqual(
        "reset collapses p99 onto that sample",
        resetTimings.p99,
        resetTimings.current,
      );
      yield* ctx.expectEqual(
        "reset collapses max onto that sample",
        resetTimings.max,
        resetTimings.current,
      );

      // 6. A read after a reset is still pure.
      const resetReread = ctx.host.frameStats();
      yield* ctx.expectEqual(
        "a read after reset does not paint (frames)",
        resetReread.frames,
        reset.frames,
      );
      yield* ctx.expectEqual(
        "a read after reset does not paint (samples)",
        resetReread.samples,
        reset.samples,
      );

      // 7. The overlay is a paint-only layer.
      const hidden = yield* modeOf(
        ctx,
        "the overlay starts hidden",
        ctx.host.overlayMode(),
      );
      yield* ctx.expectEqual("the overlay's mode is hidden", hidden, "hidden");

      const retainedBefore = yield* retainedOf(ctx);
      const paintedBefore = paintedTextOf(ctx);
      const minimal = yield* modeOf(
        ctx,
        "set reports the mode the runtime holds",
        ctx.host.setOverlayMode("minimal"),
      );
      yield* ctx.expectEqual(
        "set returns the mode the runtime reports",
        minimal,
        "minimal",
      );
      const current = yield* modeOf(
        ctx,
        "get agrees with the mode just set",
        ctx.host.overlayMode(),
      );
      yield* ctx.expectEqual(
        "the overlay's mode is minimal",
        current,
        "minimal",
      );
      yield* ctx.expectEqual(
        "the overlay adds no host nodes",
        yield* retainedOf(ctx, "the host still reports its retained tree"),
        retainedBefore,
      );
      yield* ctx.expectEqual(
        "the overlay changes no painted text",
        paintedTextOf(ctx),
        paintedBefore,
      );

      // 8. The overlay never intercepts a click underneath it.
      yield* modeOf(
        ctx,
        "the full overlay is applied",
        ctx.host.setOverlayMode("full"),
      );
      ctx.host.click("fs-counter");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "a click under the overlay still activates",
        yield* textOf(ctx, "fs-paints"),
        "paints 2",
      );

      // 9. The cycle order is hidden → minimal → full → hidden.
      const cycled = [
        yield* modeOf(
          ctx,
          "cycle leaves full for hidden",
          ctx.host.cycleOverlayMode(),
        ),
        yield* modeOf(
          ctx,
          "cycle leaves hidden for minimal",
          ctx.host.cycleOverlayMode(),
        ),
        yield* modeOf(
          ctx,
          "cycle leaves minimal for full",
          ctx.host.cycleOverlayMode(),
        ),
        yield* modeOf(
          ctx,
          "cycle wraps back to hidden",
          ctx.host.cycleOverlayMode(),
        ),
      ];
      yield* ctx.expectEqual(
        "the cycle order is hidden → minimal → full → hidden",
        Arr.join(cycled, ","),
        "hidden,minimal,full,hidden",
      );

      // 10. Setting the same mode twice is idempotent.
      yield* modeOf(
        ctx,
        "the overlay is minimal again",
        ctx.host.setOverlayMode("minimal"),
      );
      const twice = yield* modeOf(
        ctx,
        "setting the same mode is idempotent",
        ctx.host.setOverlayMode("minimal"),
      );
      yield* ctx.expectEqual(
        "setting the same mode is idempotent",
        twice,
        "minimal",
      );

      // 11. The sample ring is bounded while the frame count keeps counting.
      ctx.host.resetFrameStats();
      const beforeFill = ctx.host.frameStats();
      Arr.forEach(Arr.range(0, FILL_PAINTS - 1), () => ctx.host.paint());
      const capped = ctx.host.frameStats();
      yield* ctx.expectEqual(
        "the sample ring is bounded at 1000 samples",
        capped.samples,
        SAMPLE_CAP,
      );
      yield* ctx.expectEqual(
        "the lifetime count keeps growing past the ring",
        capped.frames > capped.samples,
        true,
      );
      yield* ctx.expectEqual(
        "every forced paint still counted",
        capped.frames - beforeFill.frames,
        FILL_PAINTS,
      );
      yield* expectOrdered(ctx, capped);

      // 12. Leave the overlay hidden for the next scenario.
      const final = yield* modeOf(
        ctx,
        "the overlay hides again",
        ctx.host.setOverlayMode("hidden"),
      );
      yield* ctx.expectEqual("the overlay ends hidden", final, "hidden");

      ctx.host.screenshot(
        "apps/playground/.artifacts/screenshots/frame-stats.png",
      );
    }),
};
