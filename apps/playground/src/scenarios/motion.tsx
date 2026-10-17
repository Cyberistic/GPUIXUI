/**
 * `motion-collapse` — native dimension motion and the exit tween.
 *
 * Two component patterns depend on facts nobody has measured in this repo:
 * the collapsible sidebar (an outer clipping container whose width animates
 * while the inner pane keeps its width) and the toast (a leaving child that
 * `AnimatePresence` must keep mounted until the native exit finishes).
 *
 * The probe freezes GPUix's motion clock (`TestRenderer.clockPause`) before it
 * animates, so 80 ms into a 200 ms linear tween is exactly 40% of the distance.
 * That is what makes the mid-tween width an assertion instead of a race: a
 * runtime that jumps to the target lands on 0 or 240 and fails.
 *
 * Measured facts: plan `157` §8.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { AnimatePresence, motion } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Body, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const SIDEBAR = 240;
const DURATION_MS = 200;
const MID_MS = 80;

/** The painted width of `testId`, or a labelled failure when it is not painted. */
const width = (ctx: Smoke.SmokeContext, testId: string) =>
  Effect.gen(function* () {
    const bounds = yield* ctx.expectSome(
      `${testId} is painted`,
      Option.fromNullishOr(ctx.host.bounds(testId)),
    );
    return bounds.width;
  });

/** The painted left edge of `testId`, or a labelled failure when it is not painted. */
const left = (ctx: Smoke.SmokeContext, testId: string) =>
  Effect.gen(function* () {
    const bounds = yield* ctx.expectSome(
      `${testId} is painted`,
      Option.fromNullishOr(ctx.host.bounds(testId)),
    );
    return bounds.x;
  });

/** Asserts `testId`'s text contains `needle`. */
const contains = (ctx: Smoke.SmokeContext, testId: string, needle: string) =>
  Effect.gen(function* () {
    const text = yield* ctx.expectSome(
      `${testId} is painted`,
      Option.fromNullishOr(ctx.host.text(testId)),
    );
    yield* ctx.expectContains(`${testId} contains "${needle}"`, text, needle);
  });

const present = (ctx: Smoke.SmokeContext, testId: string): boolean =>
  Option.isSome(Option.fromNullishOr(ctx.host.text(testId)));

/** A compact pressable for the probe, kept local so the scenario reads as one view. */
const ProbeButton = ({
  testId,
  onClick,
  children,
}: {
  readonly testId: string;
  readonly onClick: () => void;
  readonly children: string;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      onClick={onClick}
      style={{
        padding: 6,
        borderRadius: 4,
        cursor: "pointer",
        backgroundColor: theme.colors.muted,
        hover: { backgroundColor: theme.colors.border },
      }}
    >
      <text style={{ color: theme.colors.foreground }}>{children}</text>
    </div>
  );
};

const MotionProbe = () => {
  const theme = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState(false);
  const [complete, setComplete] = useState(0);
  const [exited, setExited] = useState(0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 420,
        padding: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <div style={{ display: "flex", flexDirection: "row", height: 120 }}>
        <motion.div
          initial={false}
          animate={{ width: collapsed ? 0 : SIDEBAR }}
          transition={{ duration: DURATION_MS / 1000, ease: "linear" }}
          onMotionComplete={() => setComplete((count) => count + 1)}
          style={{
            display: "flex",
            flexDirection: "row",
            flexShrink: 0,
            overflow: "hidden",
            backgroundColor: theme.colors.muted,
          }}
        >
          <div
            testId="motion-inner"
            style={{ width: SIDEBAR, flexShrink: 0, padding: 8 }}
          >
            <Body>sidebar</Body>
          </div>
        </motion.div>
        <div testId="motion-content" style={{ flexGrow: 1, padding: 8 }}>
          <Body>content</Body>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <ProbeButton
          testId="motion-toggle"
          onClick={() => setCollapsed((current) => !current)}
        >
          toggle sidebar
        </ProbeButton>
        <ProbeButton testId="motion-show-toast" onClick={() => setToast(true)}>
          show toast
        </ProbeButton>
        <ProbeButton testId="motion-hide-toast" onClick={() => setToast(false)}>
          hide toast
        </ProbeButton>
      </div>
      <Readout testId="motion-readout">
        {`collapsed=${collapsed} complete=${complete} exited=${exited}`}
      </Readout>
      <AnimatePresence
        initial={false}
        onExitComplete={() => setExited((count) => count + 1)}
      >
        {toast ? (
          <motion.div
            key="toast"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION_MS / 1000, ease: "linear" }}
            style={{
              padding: 8,
              backgroundColor: theme.colors.card,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 6,
            }}
          >
            <text
              testId="motion-toast-label"
              style={{ color: theme.colors.foreground }}
            >
              saved
            </text>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export const motionScenario: PlaygroundScenario = {
  id: "motion-collapse",
  title: "Motion: animated sidebar width, fixed inner pane, exit tween",
  capability: "motion",
  view: () => <MotionProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.pauseMotion();

      const expandedX = yield* left(ctx, "motion-content");
      yield* ctx.expectNear(
        "expanded inner width",
        yield* width(ctx, "motion-inner"),
        SIDEBAR,
        1,
      );

      ctx.host.click("motion-toggle");
      ctx.host.fastForwardMotion(MID_MS);
      yield* ctx.expectNear(
        "content moved mid-collapse",
        expandedX - (yield* left(ctx, "motion-content")),
        SIDEBAR * (MID_MS / DURATION_MS),
        4,
      );
      yield* ctx.expectNear(
        "inner width mid-collapse",
        yield* width(ctx, "motion-inner"),
        SIDEBAR,
        1,
      );
      yield* contains(ctx, "motion-readout", "complete=0");

      ctx.host.fastForwardMotion(DURATION_MS);
      yield* ctx.expectNear(
        "content reached the collapsed edge",
        expandedX - (yield* left(ctx, "motion-content")),
        SIDEBAR,
        1,
      );
      yield* contains(ctx, "motion-readout", "complete=1");

      ctx.host.click("motion-toggle");
      ctx.host.fastForwardMotion(MID_MS);
      yield* ctx.expectNear(
        "content moved mid-expand",
        expandedX - (yield* left(ctx, "motion-content")),
        SIDEBAR - SIDEBAR * (MID_MS / DURATION_MS),
        4,
      );
      ctx.host.fastForwardMotion(DURATION_MS);
      yield* ctx.expectNear(
        "content returned to the expanded edge",
        yield* left(ctx, "motion-content"),
        expandedX,
        1,
      );
      yield* contains(ctx, "motion-readout", "complete=2");

      ctx.host.click("motion-show-toast");
      yield* ctx.expectEqual(
        "toast mounted",
        present(ctx, "motion-toast-label"),
        true,
      );

      ctx.host.click("motion-hide-toast");
      yield* ctx.expectEqual(
        "toast retained while exiting",
        present(ctx, "motion-toast-label"),
        true,
      );
      ctx.host.fastForwardMotion(DURATION_MS);
      yield* ctx.expectEqual(
        "toast removed after the exit tween",
        present(ctx, "motion-toast-label"),
        false,
      );
      yield* contains(ctx, "motion-readout", "exited=1");
    }),
};
