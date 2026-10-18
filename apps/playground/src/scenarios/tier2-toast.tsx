/**
 * `tier2-toast` — the shipped `ToastProvider` / `ToastViewport` from
 * `@gpuixui/components`, mounted by a consumer and driven natively.
 *
 * `toast-lifecycle` (plan `183`) measured the mechanism with a local
 * implementation because the package was not on the integration branch. This
 * scenario asserts the shipped store, viewport and card reproduce it: a push
 * paints a card, the tone glyph and title are addressable, the stack is inset
 * bottom-right and grows upward, the action runs once and dismisses its card,
 * the dismiss control removes only its card, Escape is not a shortcut, and a
 * short duration dismisses in bounded real time.
 *
 * Measured facts: plan `330` §5.5.
 */
import { useState } from "react";
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useWindowSize } from "@gpuix/react";
// Compiled by `tsconfig.vendor.json`; see the note in `tier2-dialog.tsx`.
import {
  ToastProvider,
  ToastViewport,
  useToast,
} from "../../vendor/packages/components/src/index.js";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Body, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { read } from "./probes.js";
import { awaitReadout } from "./await-readout.js";

const CARD_WIDTH = 380;
/** The shipped viewport insets by `theme.spacing.xl`, which tokens define as 16. */
const INSET = 16;
/**
 * Long enough that the pre-timer reads are safe on a loaded host, short enough
 * that the bounded wait still observes a real timer.
 */
const SHORT_MS = 600;

const painted = (ctx: Smoke.SmokeContext, testId: string) =>
  Option.fromNullishOr(ctx.host.bounds(testId));

const Action = ({
  testId,
  label,
  onClick,
}: {
  readonly testId: string;
  readonly label: string;
  readonly onClick: () => void;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        padding: 6,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.muted,
        cursor: "pointer",
      }}
    >
      <text style={{ color: theme.colors.foreground }}>{label}</text>
    </div>
  );
};

/**
 * The consumer half: it reads the queue through the public hook, so the readout
 * is the same state the viewport paints rather than a copy the probe keeps.
 */
const ToastProbeBody = () => {
  const toasts = useToast();
  const [actions, setActions] = useState(0);
  const last = Option.getOrElse(
    Option.map(Arr.last(toasts.toasts), (toast) => toast.title),
    () => "none",
  );

  return (
    <>
      <Body>shipped Tier 2 toasts</Body>
      <Action
        testId="toast-push"
        label="Push toast"
        onClick={() => toasts.push({ title: "Saved", tone: "success" })}
      />
      <Action
        testId="toast-push-action"
        label="Push with action"
        onClick={() =>
          toasts.push(
            { title: "Deleted", action: { label: "Undo" } },
            { onAction: () => setActions((count) => count + 1) },
          )
        }
      />
      <Action
        testId="toast-push-short"
        label="Push short"
        onClick={() =>
          toasts.push({ title: "Short", duration: Duration.millis(SHORT_MS) })
        }
      />
      <Action
        testId="toast-clear"
        label="Clear"
        onClick={() => toasts.dismissAll()}
      />
      <Readout testId="tier2-toast-readout">
        {`count=${Arr.length(toasts.toasts)} actions=${actions} last=${last}`}
      </Readout>
    </>
  );
};

/**
 * One root host element: the native renderer reports a single tree root, and a
 * provider's children are siblings of each other (the components package's own
 * toast harness records the same rule). The frame is also the mount parent the
 * viewport's `position: "absolute"` resolves against.
 */
const ToastProbe = () => {
  const theme = useTheme();
  const window = useWindowSize();
  return (
    <div
      testId="tier2-toast-frame"
      style={{
        width: window.width,
        height: window.height,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <ToastProvider defaultDuration={Duration.minutes(5)}>
        <ToastProbeBody />
        <ToastViewport />
      </ToastProvider>
    </div>
  );
};

export const tier2ToastScenario: PlaygroundScenario = {
  id: "tier2-toast",
  title: "Tier 2 Toast: push, stack, action, dismiss and a real timer",
  capability: "tier2",
  view: () => <ToastProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectContains(
        "the probe body rendered",
        ctx.host.paintedText().join("\n"),
        "shipped Tier 2 toasts",
      );
      const frame = yield* ctx.expectSome(
        "the probe frame is painted",
        painted(ctx, "tier2-toast-frame"),
      );
      yield* ctx.expectContains(
        "the queue starts empty",
        read(ctx, "tier2-toast-readout"),
        "count=0",
      );

      ctx.host.click("toast-push");
      const first = yield* ctx.expectSome(
        "a pushed toast paints a card",
        painted(ctx, "toast-1"),
      );
      yield* ctx.expectContains(
        "the card carries its title",
        read(ctx, "tier2-toast-readout"),
        "last=Saved",
      );
      yield* ctx.expectNear(
        "the card is inset from the right",
        frame.x + frame.width - (first.x + first.width),
        INSET,
        1,
      );
      yield* ctx.expectNear(
        "the card is inset from the bottom",
        frame.y + frame.height - (first.y + first.height),
        INSET,
        1,
      );
      yield* ctx.expectNear(
        "the card keeps its fixed width",
        first.width,
        CARD_WIDTH,
        1,
      );

      ctx.host.click("toast-dismiss");
      yield* ctx.expectContains(
        "the dismiss control removed its card",
        read(ctx, "tier2-toast-readout"),
        "count=0",
      );
      yield* ctx.expectEqual(
        "the card left the tree",
        Option.isNone(painted(ctx, "toast-1")),
        true,
      );

      // The action control runs the caller's handler and dismisses its card.
      ctx.host.click("toast-push-action");
      yield* ctx.expectSome(
        "the action toast is painted",
        painted(ctx, "toast-2"),
      );
      ctx.host.click("toast-action");
      yield* ctx.expectContains(
        "the action ran exactly once",
        read(ctx, "tier2-toast-readout"),
        "actions=1",
      );
      yield* ctx.expectContains(
        "the action dismissed its card",
        read(ctx, "tier2-toast-readout"),
        "count=0",
      );

      // Two cards stack upward; the newest owns the bottom inset.
      ctx.host.click("toast-push");
      ctx.host.click("toast-push");
      const older = yield* ctx.expectSome(
        "the older card is painted",
        painted(ctx, "toast-3"),
      );
      const newest = yield* ctx.expectSome(
        "the newest card is painted",
        painted(ctx, "toast-4"),
      );
      yield* ctx.expectEqual(
        "the older card sits above the newest",
        older.y + older.height <= newest.y,
        true,
      );
      yield* ctx.expectNear(
        "the newest card owns the bottom inset",
        frame.y + frame.height - (newest.y + newest.height),
        INSET,
        1,
      );

      ctx.host.key("escape");
      yield* ctx.expectContains(
        "Escape is not a toast shortcut",
        read(ctx, "tier2-toast-readout"),
        "count=2",
      );

      // The shipped viewport maps the queue straight to cards: no motion
      // wrapper, no exit tween. Freeze the clock anyway, so the timer is proven
      // to be real JS time and the removal to need no motion frame.
      const frozenAt = ctx.host.pauseMotion();
      ctx.host.click("toast-push-short");
      yield* ctx.expectContains(
        "the short toast joined the stack before its timer",
        read(ctx, "tier2-toast-readout"),
        "count=3",
      );
      yield* ctx.expectSome(
        "the short card is painted before its timer",
        painted(ctx, "toast-5"),
      );

      // No fastForwardMotion: the wait itself proves the timer is real time.
      yield* awaitReadout(ctx, "tier2-toast-readout", "count=2");
      yield* ctx.expectContains(
        "the timer removed exactly one card",
        read(ctx, "tier2-toast-readout"),
        "count=2",
      );
      yield* ctx.expectEqual(
        "the shipped viewport keeps no leaving card at the frozen clock",
        Option.isNone(painted(ctx, "toast-5")),
        true,
      );
      const survivor = yield* ctx.expectSome(
        "the long toast survived its sibling's timer",
        painted(ctx, "toast-4"),
      );
      yield* ctx.expectNear(
        "the survivor reflows to the bottom inset without motion time",
        frame.y + frame.height - (survivor.y + survivor.height),
        INSET,
        1,
      );
      yield* ctx.expectEqual(
        "the timer path never advanced the motion clock",
        ctx.host.fastForwardMotion(0),
        frozenAt,
      );
    }),
};
