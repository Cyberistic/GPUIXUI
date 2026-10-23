/**
 * The toast viewport: a paint-order stack in the bottom-right corner.
 *
 * GPUix has no `zIndex`; stacking is paint order, so the viewport must be the
 * **last child of the app root**. The container is `pointerEvents: "none"` so the
 * page underneath stays usable; each card turns pointer events back on.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import { motionTimingOf } from "@gpuixui/motion/timing";
import {
  cn,
  TOAST_CARD,
  TOAST_DESCRIPTION,
  TOAST_GLYPH,
  TOAST_TITLE,
  TOAST_VIEWPORT,
} from "@gpuixui/tw";
import { HashMap, Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button, IconButton } from "../internal/button.js";
import { overlaySurfaceStyle } from "../internal/overlay.js";
import {
  exitWindowMs,
  PresenceShield,
  presenceMotion,
  presenceStyle,
  useMotionPreference,
  type SurfaceFrames,
  type SurfaceTiming,
} from "../internal/presence.js";
import { recipeStyle } from "../internal/recipe.js";
import { tone, useTheme, type Tone } from "../internal/theme.js";
import type { Toast, ToastTone } from "./model.js";
import { useToast } from "./provider.js";

/** The status tone behind a toast's bar and icon. */
const asTone = (value: ToastTone): Tone =>
  Match.value(value).pipe(
    Match.when("info", () => "info" as const),
    Match.when("success", () => "success" as const),
    Match.when("warning", () => "warning" as const),
    Match.when("danger", () => "danger" as const),
    Match.exhaustive,
  );

/** The icon each tone shows beside its title. */
const glyph = (value: ToastTone): "info" | "success" | "warning" | "error" =>
  Match.value(value).pipe(
    Match.when("info", () => "info" as const),
    Match.when("success", () => "success" as const),
    Match.when("warning", () => "warning" as const),
    Match.when("danger", () => "error" as const),
    Match.exhaustive,
  );

/** The toast's own timing: it arrives a touch slower than a menu and leaves
 *  faster than it entered, so the stack reads as arriving gently and leaving
 *  promptly. The durations are sonner's, not a shared level's, so the toast's
 *  feel never drags another surface along (or the reverse). */
const useToastTiming = (): SurfaceTiming => {
  const preference = useMotionPreference();
  return {
    enter: motionTimingOf(220, { phase: "enter", preference }),
    exit: motionTimingOf(180, { phase: "exit", preference }),
  };
};

/**
 * The toast's enter and exit frames: it rises `16px` into place (a `top` travel,
 * the runtime's slide-up) and leaves by fading while it slides `16px` to the
 * right (a `left` travel). `fanLift` is the hover fan's resting offset: while
 * the stack is hovered the older cards rest that far above their slot, so the
 * runtime tweens `top` between the fanned and unfanned frames.
 */
const toastFrames = (fanLift: number): SurfaceFrames => ({
  initial: { opacity: 0, top: 16 },
  animate: { opacity: 1, top: -fanLift },
  exit: { opacity: 0, top: -fanLift, left: 16 },
});

/** The vertical lift, in pixels, one hovered stack fans each older card by. */
const FAN_STEP = 8;

/** One painted card: a live toast, or one playing out its exit. */
interface StackEntry {
  readonly toast: Toast;
  readonly present: boolean;
}

/** A scheduled removal of a leaving card, and the window it was scheduled for. */
interface ExitTimer {
  readonly handle: ReturnType<typeof setTimeout>;
  readonly ms: number;
}

/**
 * The stack with the cards that have just left it, kept for their exit tween.
 *
 * The store removes a dismissed toast immediately — its timers are Effect
 * `Clock` time, not animation frames — so the viewport is what remembers the
 * card long enough to run its exit. The entry list keeps its order: a card
 * leaving does not reorder the stack under the reader. A leave is timed by the
 * seam's exit window, not by the runtime's clock, so a frozen motion clock
 * cannot strand a card on screen; a preference change rescales a leave already
 * in progress, so turning reduced motion on removes the card at once.
 */
const useToastStack = (
  toasts: ReadonlyArray<Toast>,
  timing: SurfaceTiming,
): ReadonlyArray<StackEntry> => {
  const [entries, setEntries] = useState<ReadonlyArray<StackEntry>>(() =>
    Arr.map(toasts, (toast) => ({ toast, present: true })),
  );
  const painted = useRef(entries);
  const timers = useRef(new Map<string, ExitTimer>());
  // The window a leave occupies: the tween plus the wait it sits out first. The
  // timers are keyed by this value, so a preference change (or a timing that
  // gains a wait) rescales a leave already in flight.
  const windowMs = exitWindowMs(timing);

  useLayoutEffect(() => {
    painted.current = entries;
  }, [entries]);

  useLayoutEffect(() => {
    const live = HashMap.fromIterable(
      Arr.map(toasts, (toast) => [toast.id, toast] as const),
    );
    const current = painted.current;
    const kept = Arr.map(current, (entry): StackEntry => {
      const next = HashMap.get(live, entry.toast.id);
      return Option.isSome(next)
        ? { toast: next.value, present: true }
        : { toast: entry.toast, present: false };
    });
    const appended = Arr.map(
      Arr.filter(
        toasts,
        (toast) => !Arr.some(current, (entry) => entry.toast.id === toast.id),
      ),
      (toast): StackEntry => ({ toast, present: true }),
    );
    const merged = [...kept, ...appended];
    setEntries(merged);
    Arr.forEach(merged, (entry) => {
      if (entry.present) return;
      const id = entry.toast.id;
      const running = timers.current.get(id);
      // Re-running for a new toast must not restart a leave already timed, but
      // a new window (the preference changed) must replace the old one.
      if (running !== undefined && running.ms === windowMs) return;
      if (running !== undefined) clearTimeout(running.handle);
      timers.current.set(id, {
        ms: windowMs,
        handle: setTimeout(() => {
          timers.current.delete(id);
          setEntries((list) =>
            Arr.filter(list, (item) => item.toast.id !== id),
          );
        }, windowMs),
      });
    });
  }, [windowMs, toasts]);

  useLayoutEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer.handle));
      timers.current.clear();
    },
    [],
  );

  return entries;
};

/** One card. Its tone icon carries the status; the surface is neutral. */
const ToastCard = ({
  toast,
  present,
  timing,
  fanLift,
  stackHovered,
  onHoverChange,
}: {
  readonly toast: Toast;
  readonly present: boolean;
  readonly timing: SurfaceTiming;
  readonly fanLift: number;
  readonly stackHovered: boolean;
  readonly onHoverChange: (hovered: boolean) => void;
}) => {
  const theme = useTheme();
  const { dismiss, pause, resume, actionFor } = useToast();
  const palette = tone(theme, asTone(toast.tone));
  const focus = useRef(0);
  const paused = useRef(false);

  /** Pause while the stack is hovered or a control holds focus; resume only
   *  when the last reason leaves. */
  const syncHold = (): void => {
    const after = stackHovered || focus.current > 0;
    if (after === paused.current) return;
    paused.current = after;
    if (after) pause(toast.id);
    else resume(toast.id);
  };

  /** The card's own hover feeds the stack fan; the hold reads `stackHovered`. */
  const setHover = (value: boolean): void => onHoverChange(value);

  /** Two controls can hold focus; a count keeps moving between them held. */
  const setFocus = (value: boolean): void => {
    focus.current = Math.max(0, focus.current + (value ? 1 : -1));
    syncHold();
  };

  useEffect(() => {
    syncHold();
  }, [stackHovered]);

  const action = Option.flatMap(toast.action, (candidate) =>
    Option.map(actionFor(toast.id), (onSelect) => ({
      candidate,
      onSelect,
    })),
  );
  // The provider prunes a toast's handler when it leaves the queue, while this
  // card is still painted for its exit: a ghost keeps the content it was
  // dismissed with, so the action it showed does not vanish under the fade.
  const lastAction = useRef(action);
  if (Option.isSome(action)) lastAction.current = action;

  return (
    <div
      testId={`toast-${toast.id}`}
      motion={presenceMotion(toastFrames(fanLift), {
        mounted: true,
        present,
        timing,
      })}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={mergeStyles(
        overlaySurfaceStyle(TOAST_CARD, undefined, theme),
        // A positioned box is what the leaving guard is inset against.
        { position: "relative", ...presenceStyle(present) },
      )}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
          flexGrow: 1,
          paddingTop: 14,
          paddingBottom: 14,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        <div
          style={mergeStyles(recipeStyle(TOAST_GLYPH, theme), {
            color: palette.fg,
            width: theme.iconSize.md,
          })}
        >
          <Icon
            name={glyph(toast.tone)}
            size="sm"
            color={palette.fg}
            label={toast.tone}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing["2xs"],
            flexGrow: 1,
            minWidth: 0,
          }}
        >
          <text style={recipeStyle(TOAST_TITLE, theme)}>{toast.title}</text>
          {Option.match(toast.description, {
            onNone: () => null,
            onSome: (description) => (
              <text style={recipeStyle(TOAST_DESCRIPTION, theme)}>
                {description}
              </text>
            ),
          })}
        </div>
        {Option.match(lastAction.current, {
          onNone: () => null,
          onSome: ({ candidate, onSelect }) => (
            <Button
              size="sm"
              variant="secondary"
              testId="toast-action"
              onClick={() => {
                onSelect();
                dismiss(toast.id);
              }}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
            >
              {candidate.label}
            </Button>
          ),
        })}
        <IconButton
          label="Dismiss"
          size="sm"
          testId="toast-dismiss"
          onClick={() => dismiss(toast.id)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
        >
          <Icon name="x" size="sm" color={theme.colors.foreground} />
        </IconButton>
      </div>
      <PresenceShield present={present} />
    </div>
  );
};

/** {@link ToastViewport} props: where the stack sits in the app root. */
export interface ToastViewportProps extends Props {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** An optional element before the toasts, e.g. a "dismiss all" action. */
  readonly children?: ReactNode;
}

/**
 * The bottom-right stack. Render it **last** in the app root: the runtime paints
 * in order, so anything after it would cover the toasts.
 */
export const ToastViewport = ({
  children,
  className,
  style,
  ...rest
}: ToastViewportProps) => {
  const theme = useTheme();
  const { toasts } = useToast();
  const timing = useToastTiming();
  const stack = useToastStack(toasts, timing);
  // The stack fans when the pointer rests on any card; a count survives moving
  // between two cards, whose leave precedes the next card's enter.
  const hoverCount = useRef(0);
  const [stackHovered, setStackHovered] = useState(false);
  const onHoverChange = (hovered: boolean): void => {
    hoverCount.current = Math.max(0, hoverCount.current + (hovered ? 1 : -1));
    setStackHovered(hoverCount.current > 0);
  };
  // The fan lifts the older cards: the newest rests still and each older card
  // sits one step higher, so hovering widens the gap between neighbours.
  const present = Arr.filter(stack, (entry) => entry.present);
  const rankById = HashMap.fromIterable(
    Arr.map(present, (entry, index) => [entry.toast.id, index] as const),
  );

  return (
    <div
      role="status"
      aria-label="Notifications"
      testId="toast-viewport"
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(TOAST_VIEWPORT, className), theme), {
          position: "absolute",
          right: theme.spacing.xl,
          bottom: theme.spacing.xl,
        }),
        style,
      )}
    >
      {children}
      {Arr.map(stack, (entry) => {
        const fanLift = Option.match(HashMap.get(rankById, entry.toast.id), {
          onNone: () => 0,
          onSome: (rank) =>
            stackHovered ? (HashMap.size(rankById) - 1 - rank) * FAN_STEP : 0,
        });
        return (
          <ToastCard
            key={entry.toast.id}
            toast={entry.toast}
            present={entry.present}
            timing={timing}
            fanLift={fanLift}
            stackHovered={stackHovered}
            onHoverChange={onHoverChange}
          />
        );
      })}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const toastMeta = {
  name: "Toasts / notifications",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "no zIndex: the viewport stacks by paint order, so render it last in the app root",
    "no progress indicator for the remaining auto-dismiss time",
  ],
  docs: "docs/toast.mdx",
  example: "examples/toast.example.tsx",
  testFile: "src/behaviour/toast.test.tsx",
} as const;
