/**
 * `toast-lifecycle` — the runtime mechanisms a toast viewport is built on.
 *
 * `@gpuixui/components`' `ToastViewport` assumes five things 0.10.0 has never
 * been asked for in this repo:
 *
 * - `position: "absolute"` with **`right`/`bottom`** (every other probe uses
 *   `left`/`top`);
 * - `pointerEvents: "none"` on the viewport with `"auto"` on each card;
 * - paint order as the only stacking model (no `zIndex`), so the viewport must
 *   be the app root's last child;
 * - a per-toast JS timer plus an `AnimatePresence` exit that must not remove
 *   its siblings;
 * - `role="status"` + `aria-label` on the viewport, and a Tab-reachable dismiss
 *   control while the viewport ignores the pointer.
 *
 * The probe reproduces the mechanism with local data — the components package
 * is not on the integration branch, and this workstream does not import another
 * workstream's tree. Measured facts: plan `183` §7.
 */
import { useCallback, useEffect, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { AnimatePresence, motion, useWindowSize } from "@gpuix/react";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Body, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { nodeFor, treeOf } from "./probes.js";
import {
  clearToasts,
  dismissToast,
  emptyToasts,
  pushToast,
  type Toast,
  type ToastState,
} from "./toast-state.js";
import { awaitReadout } from "./await-readout.js";

export const CARD_WIDTH = 380;
export const CARD_HEIGHT = 56;
export const GAP = 8;
export const INSET = 24;
export const EXIT_MS = 120;
const SHORT_MS = 250;
/**
 * The long-lived probe cards must outlast a loaded full-suite run.
 *
 * The motion clock can be paused, but a toast's `setTimeout` is real JS time
 * (plan `337`), so a 5 s fixture expired before `live-toast`'s dismissal under
 * full-suite load and the check counted one card too few (plan `623` §9).
 */
const LONG_MS = 60_000;

/** A card. The motion wrapper is separate because `MotionDivProps` has no `testId`. */
const ToastCard = ({
  toast,
  onDismiss,
  onHover,
  onLeave,
}: {
  readonly toast: Toast;
  readonly onDismiss: (toast: Toast) => void;
  readonly onHover: (id: number) => void;
  readonly onLeave: () => void;
}) => {
  const theme = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast), toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <motion.div
      key={toast.id}
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: EXIT_MS / 1000, ease: "linear" }}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT, display: "flex" }}
    >
      <div
        testId={`toast-${toast.id}`}
        onMouseEnter={() => onHover(toast.id)}
        onMouseLeave={onLeave}
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.popover,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          pointerEvents: "auto",
        }}
      >
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.popoverForeground,
            flexGrow: 1,
          }}
        >
          {toast.title}
        </text>
        <div
          testId={`toast-dismiss-${toast.id}`}
          tabIndex={0}
          role="button"
          aria-label="Dismiss"
          onClick={() => onDismiss(toast)}
          style={{
            padding: 4,
            borderRadius: theme.radius.sm,
            cursor: "pointer",
            backgroundColor: theme.colors.muted,
            hover: { backgroundColor: theme.colors.border },
          }}
        >
          <text style={{ color: theme.colors.mutedForeground }}>✕</text>
        </div>
      </div>
    </motion.div>
  );
};

const ToastProbe = () => {
  const theme = useTheme();
  const window = useWindowSize();
  const [queue, setQueue] = useState<ToastState>(emptyToasts);
  const [hover, setHover] = useState("none");
  const [dismissed, setDismissed] = useState("none");
  const [action, setAction] = useState(0);
  const [behind, setBehind] = useState(0);
  const [under, setUnder] = useState(0);
  const [text, setText] = useState("");

  const show = useCallback(
    () =>
      setQueue((current) =>
        pushToast(current, {
          title: `Toast ${current.seq + 1}`,
          durationMs: LONG_MS,
        }),
      ),
    [],
  );
  const showShort = useCallback(
    () =>
      setQueue((current) =>
        pushToast(current, { title: "Short", durationMs: SHORT_MS }),
      ),
    [],
  );
  const clear = useCallback(() => setQueue(clearToasts), []);
  const remove = useCallback((toast: Toast) => {
    setQueue((current) => dismissToast(current, toast.id));
    setDismissed(toast.title);
  }, []);
  const onHover = useCallback((id: number) => setHover(`${id}`), []);
  const onLeave = useCallback(() => setHover("none"), []);

  return (
    <div
      testId="toast-root"
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
      <Body>toast viewport</Body>
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <div
          testId="toast-show"
          tabIndex={-1}
          role="button"
          onClick={show}
          style={{
            padding: 6,
            borderRadius: 4,
            cursor: "pointer",
            backgroundColor: theme.colors.muted,
          }}
        >
          <text style={{ color: theme.colors.foreground }}>show</text>
        </div>
        <div
          testId="toast-show-short"
          tabIndex={-1}
          role="button"
          onClick={showShort}
          style={{
            padding: 6,
            borderRadius: 4,
            cursor: "pointer",
            backgroundColor: theme.colors.muted,
          }}
        >
          <text style={{ color: theme.colors.foreground }}>short</text>
        </div>
        <div
          testId="toast-clear"
          tabIndex={-1}
          role="button"
          onClick={clear}
          style={{
            padding: 6,
            borderRadius: 4,
            cursor: "pointer",
            backgroundColor: theme.colors.muted,
          }}
        >
          <text style={{ color: theme.colors.foreground }}>clear</text>
        </div>
      </div>
      <div
        testId="toast-action"
        tabIndex={-1}
        role="button"
        onClick={() => setAction((count) => count + 1)}
        style={{
          width: 160,
          padding: 6,
          borderRadius: 4,
          cursor: "pointer",
          backgroundColor: theme.colors.primary,
        }}
      >
        <text style={{ color: theme.colors.primaryForeground }}>
          page action
        </text>
      </div>
      <input
        testId="toast-field"
        value={text}
        placeholder="focus sentinel"
        onChange={(event) => setText(event.value ?? "")}
        onSubmit={show}
        style={{
          width: 240,
          padding: 6,
          color: theme.colors.inputForeground,
          backgroundColor: theme.colors.input,
        }}
      />
      <Readout testId="toast-readout">
        {`count=${Arr.length(queue.toasts)} action=${action} behind=${behind} under=${under} dismissed=${dismissed} hover=${hover}`}
      </Readout>
      {/* Under the bottom card: a click must reach the card, not this surface. */}
      <div
        testId="toast-behind"
        tabIndex={-1}
        role="button"
        onClick={() => setBehind((count) => count + 1)}
        style={{
          position: "absolute",
          right: INSET,
          bottom: INSET,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          backgroundColor: theme.colors.destructive,
        }}
      />
      {/* Inside the viewport's transparent strip: `pointerEvents: none` must let
          this control take the click while the viewport is painted over it. */}
      <div
        testId="toast-under"
        tabIndex={-1}
        role="button"
        onClick={() => setUnder((count) => count + 1)}
        style={{
          position: "absolute",
          right: INSET + CARD_WIDTH + 10,
          bottom: INSET,
          width: 80,
          height: CARD_HEIGHT,
          backgroundColor: theme.colors.warning,
        }}
      />
      {/* Paint order is the stack: the viewport must be the last child. */}
      <div
        testId="toast-viewport"
        role="status"
        aria-label="Notifications"
        style={{
          position: "absolute",
          right: INSET,
          bottom: INSET,
          width: CARD_WIDTH + 120,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: GAP,
          pointerEvents: "none",
        }}
      >
        <AnimatePresence initial={false}>
          {Arr.map(queue.toasts, (toast) => (
            <ToastCard
              key={toast.id}
              toast={toast}
              onDismiss={remove}
              onHover={onHover}
              onLeave={onLeave}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

/** A painted element's bounds, or a labelled failure naming the missing id. */
const bounds = (ctx: Smoke.SmokeContext, testId: string) =>
  ctx.expectSome(
    `${testId} is painted`,
    Option.fromNullishOr(ctx.host.bounds(testId)),
  );

/** The probe's readout, or `"none"` so a failure names the absence. */
const readout = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(
    Option.fromNullishOr(ctx.host.text("toast-readout")),
    () => "none",
  );

/** Everything painted this frame, joined for substring checks. */
const painted = (ctx: Smoke.SmokeContext): string =>
  Arr.join(ctx.host.paintedText(), "\n");

/** The gap between the frame's bottom-right corner and the card's. */
const insets = (
  frame: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  card: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
) => ({
  right: frame.x + frame.width - (card.x + card.width),
  bottom: frame.y + frame.height - (card.y + card.height),
});

export const toastScenario: PlaygroundScenario = {
  id: "toast-lifecycle",
  title: "Toast viewport: placement, stacking, timers, focus and a11y",
  capability: "toast",
  view: () => <ToastProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.pauseMotion();

      const frame = yield* bounds(ctx, "toast-root");
      yield* ctx.expectEqual(
        "the frame is wide enough for a card",
        frame.width >= CARD_WIDTH + INSET * 2,
        true,
      );
      yield* ctx.expectEqual(
        "the frame is tall enough for a stack",
        frame.height >= CARD_HEIGHT * 3 + GAP * 2 + INSET * 2,
        true,
      );

      // One card: right/bottom placement.
      ctx.host.click("toast-show");
      const first = yield* bounds(ctx, "toast-1");
      const firstInsets = insets(frame, first);
      // The card's reported box is its content box: 1 px border + 8 px padding
      // from each edge, and 2 px narrower (plan 529 §6.3).
      yield* ctx.expectNear(
        "the card's content is inset from the right",
        firstInsets.right,
        INSET + 9,
        1,
      );
      yield* ctx.expectNear(
        "the card's content is inset from the bottom",
        firstInsets.bottom,
        INSET + 17,
        1,
      );
      yield* ctx.expectNear(
        "the card's content keeps its fixed width",
        first.width,
        CARD_WIDTH - 2,
        1,
      );
      yield* ctx.expectContains(
        "the first card paints its title",
        yield* ctx.expectSome(
          "the first card's text is addressable",
          Option.fromNullishOr(ctx.host.text("toast-1")),
        ),
        "Toast 1",
      );

      // Two cards: column order and gap. Both bounds are re-read because the
      // bottom-anchored viewport moves the first card up when the second mounts.
      ctx.host.click("toast-show");
      const firstLifted = yield* bounds(ctx, "toast-1");
      const second = yield* bounds(ctx, "toast-2");
      yield* ctx.expectNear(
        "the second card sits one gap above the first",
        second.y - (firstLifted.y + CARD_HEIGHT),
        GAP,
        1,
      );
      yield* ctx.expectNear(
        // The card's content box is 17 px inside the stack's bottom edge
        // (plan 529 §6.3).
        "the newest card owns the bottom inset",
        insets(frame, second).bottom,
        INSET + 17,
        1,
      );
      yield* ctx.expectContains(
        "the second card paints its title",
        yield* ctx.expectSome(
          "the second card's text is addressable",
          Option.fromNullishOr(ctx.host.text("toast-2")),
        ),
        "Toast 2",
      );

      // Three cards fit, and the page under the stack is still usable.
      ctx.host.click("toast-show");
      yield* ctx.expectNear(
        "the third card owns the bottom inset",
        insets(frame, yield* bounds(ctx, "toast-3")).bottom,
        INSET + 17,
        1,
      );
      yield* ctx.expectContains(
        "three toasts are queued",
        readout(ctx),
        "count=3",
      );

      ctx.host.click("toast-action");
      yield* ctx.expectContains(
        "a click outside the stack reaches the page",
        readout(ctx),
        "action=1",
      );
      ctx.host.click("toast-under");
      yield* ctx.expectContains(
        "the viewport's empty strip does not block the page",
        readout(ctx),
        "under=1",
      );

      // A fourth push drops the oldest, and the exit is frozen until forwarded.
      ctx.host.click("toast-show");
      ctx.host.fastForwardMotion(EXIT_MS);
      yield* ctx.expectContains(
        "the stack is bounded at three",
        readout(ctx),
        "count=3",
      );
      yield* ctx.expectEqual(
        "the oldest card was dropped",
        Str.includes("Toast 1")(painted(ctx)),
        false,
      );
      yield* ctx.expectEqual(
        "the fourth card is painted",
        Str.includes("Toast 4")(painted(ctx)),
        true,
      );
      const secondKept = yield* bounds(ctx, "toast-2");
      const thirdKept = yield* bounds(ctx, "toast-3");
      const fourth = yield* bounds(ctx, "toast-4");
      yield* ctx.expectNear(
        "the kept cards reflow with the same gap",
        thirdKept.y - (secondKept.y + CARD_HEIGHT),
        GAP,
        1,
      );
      yield* ctx.expectNear(
        "the fourth card owns the bottom inset",
        insets(frame, fourth).bottom,
        INSET + 17,
        1,
      );

      // The bottom card dismisses itself; the page under it never sees the click.
      ctx.host.click("toast-dismiss-4");
      yield* ctx.expectContains(
        "dismissing removes exactly the clicked card",
        readout(ctx),
        "count=2",
      );
      yield* ctx.expectContains(
        "the click did not reach the page under the card",
        readout(ctx),
        "behind=0",
      );
      // A click dismissal is synchronous, so the frozen exit is asserted here:
      // the card is still laid out at elapsed 0 and leaves only when the clock
      // moves. A timer-driven exit is not a reliable place for this check — the
      // timer, the clock and AnimatePresence's own re-render can interleave.
      yield* ctx.expectEqual(
        "the dismissed card is still laid out while its exit is frozen",
        Option.isSome(Option.fromNullishOr(ctx.host.bounds("toast-4"))),
        true,
      );
      ctx.host.fastForwardMotion(EXIT_MS);
      yield* ctx.expectEqual(
        "the dismissed card left the tree after its exit",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("toast-4"))),
        true,
      );
      const thirdAfter = yield* bounds(ctx, "toast-3");
      const secondAfter = yield* bounds(ctx, "toast-2");
      yield* ctx.expectNear(
        "the survivors reflow down",
        thirdAfter.y - (secondAfter.y + CARD_HEIGHT),
        GAP,
        1,
      );
      yield* ctx.expectNear(
        "the last survivor still owns the bottom inset",
        insets(frame, thirdAfter).bottom,
        INSET + 17,
        1,
      );

      // Focus: a toast never steals it, and its dismiss control is a tab stop.
      // The toast is pushed by the focused field's own submit, because a click
      // on the show button would focus the button and hide the fact under test.
      ctx.host.click("toast-field");
      yield* ctx.expectContains(
        "the field holds focus",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.focused()),
          () => "none",
        ),
        "toast-field",
      );
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "showing a toast does not steal focus",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.focused()),
          () => "none",
        ),
        "toast-field",
      );
      yield* ctx.expectContains(
        "the submitted form pushed a toast",
        readout(ctx),
        "count=3",
      );
      ctx.host.focusNext();
      yield* ctx.expectContains(
        "Tab reaches a toast dismiss control",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.focused()),
          () => "none",
        ),
        "toast-dismiss-",
      );

      // Escape is not a toast shortcut, and hover crosses the pointerEvents chain.
      ctx.host.key("escape");
      yield* ctx.expectContains(
        "Escape leaves the stack alone",
        readout(ctx),
        "count=3",
      );
      ctx.host.hover("toast-5");
      yield* ctx.expectContains(
        "hover reaches the card",
        readout(ctx),
        "hover=5",
      );
      ctx.host.hover("toast-field");
      yield* ctx.expectContains(
        "leaving the card clears hover",
        readout(ctx),
        "hover=none",
      );

      // Auto-dismiss: a real JS timer, a frozen exit, and a sibling that must stay.
      ctx.host.click("toast-clear");
      ctx.host.fastForwardMotion(EXIT_MS);
      yield* ctx.expectContains(
        "clearing empties the stack",
        readout(ctx),
        "count=0",
      );

      ctx.host.click("toast-show");
      // Name both cards before the timer starts. The frozen-exit assertion is
      // about id 7, so a push that did not land (or an id that shifted) must
      // fail here, not at an assertion about a card that never existed.
      yield* ctx.expectContains(
        "the long toast is queued before the short one",
        readout(ctx),
        "count=1",
      );
      yield* bounds(ctx, "toast-6");
      // Freeze the motion clock before the short timer starts, then paint the
      // short card: a motion element's first painted frame is the from-style its
      // exit animates out of, so the paint must happen before the 250 ms timer
      // can remove the card.
      ctx.host.pauseMotion();
      ctx.host.click("toast-show-short");
      const shortCard = yield* bounds(ctx, "toast-7");
      yield* ctx.expectNear(
        "the short card owns the bottom inset before its timer runs",
        insets(frame, shortCard).bottom,
        INSET + 17,
        1,
      );
      yield* awaitReadout(ctx, "toast-readout", "dismissed=Short");
      yield* ctx.expectContains(
        "the short toast's timer fired",
        readout(ctx),
        "dismissed=Short",
      );
      yield* ctx.expectContains(
        "only the long toast remains queued",
        readout(ctx),
        "count=1",
      );
      yield* ctx.expectSome(
        "the long toast survived its sibling's timer",
        Option.fromNullishOr(ctx.host.bounds("toast-6")),
      );
      // Move the frozen clock past the exit in two steps: the zero dispatch
      // settles any frame the timer queued, then the jump finishes the tween.
      ctx.host.fastForwardMotion(0);
      ctx.host.fastForwardMotion(EXIT_MS + 1);
      yield* ctx.expectEqual(
        "the short toast leaves the layout after its exit",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("toast-7"))),
        true,
      );
      const survivor = yield* bounds(ctx, "toast-6");
      yield* ctx.expectNear(
        "the survivor reflows to the bottom inset",
        insets(frame, survivor).bottom,
        INSET + 17,
        1,
      );

      // Accessibility: the status region and the dismiss control are exposed.
      const tree = yield* treeOf(ctx);
      yield* ctx.expectSome(
        "the viewport is an accessible Status region",
        nodeFor(tree, "Status", "Notifications"),
      );
      yield* ctx.expectSome(
        "the dismiss control is an accessible Button",
        nodeFor(tree, "Button", "Dismiss"),
      );

      // Clear the last card: the state and the paint agree.
      ctx.host.click("toast-clear");
      ctx.host.fastForwardMotion(EXIT_MS);
      yield* ctx.expectContains(
        "the stack is empty again",
        readout(ctx),
        "count=0",
      );
      yield* ctx.expectEqual(
        "no card remains painted",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("toast-6"))),
        true,
      );
    }),
};
