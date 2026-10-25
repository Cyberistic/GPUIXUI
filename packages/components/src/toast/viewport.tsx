/** @jsxImportSource @gpuix/react */
/**
 * The toast viewport: a stacked notice queue in a corner.
 *
 * GPUix has no `transform` and no `zIndex`, so the stack is **flow plus
 * height** rather than a scaled fan: the newest card is the last child and the
 * only full one, and each older card is a short, dimmed, inset strip above it.
 * Hovering or focusing the stack gives every card its measured height and one
 * shared gap, so the strips unfold into a readable column; leaving folds them
 * back. The viewport is `position: absolute`, so neither shape moves the page.
 *
 * The measure is the inner content's `onLayout`, the same rule `AutoHeight`
 * uses: the outer box clips, the inner box keeps its natural height. A stack
 * card is therefore a surface that owns the border, radius and elevation, and a
 * body that owns the padding and reports what it needs.
 *
 * Timers are the store's Effect `Clock`, not animation frames; this file only
 * tells the store when the stack is held. The hold is the pointer anywhere in
 * the stack or a focus in one card's controls, with a short release grace so
 * moving between two cards cannot fold the stack between them.
 */

import type { EventPayload, Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import { motionTimingOf, type MotionTiming } from "@gpuixui/motion/timing";
import {
  cn,
  TOAST_BODY,
  TOAST_CARD,
  TOAST_COPY,
  TOAST_DESCRIPTION,
  TOAST_DRAG,
  TOAST_GLYPH,
  TOAST_STACK,
  TOAST_TITLE,
  TOAST_VIEWPORT,
} from "@gpuixui/tw";
import { HashMap, HashSet, Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { monotonicNanos } from "../internal/clock.js";
import { Button, IconButton } from "../internal/button.js";
import {
  measuredBox,
  measuredHeight,
  measuredPoint,
} from "../internal/measure.js";
import { overlaySurfaceStyle } from "../internal/overlay.js";
import {
  exitWindowMs,
  PresenceShield,
  presenceStyle,
  presenceTabStop,
  useMotionPreference,
  type SurfaceTiming,
} from "../internal/presence.js";
import { recipeStyle } from "../internal/recipe.js";
import { tone, useTheme, type Tone } from "../internal/theme.js";
import type { Toast, ToastTone } from "./model.js";
import { useToast } from "./provider.js";
import { stackGap, toastSlots, type ToastSlot } from "./stack.js";
import { swipeEdge } from "./swipe.js";

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
const glyph = (
  value: ToastTone,
): "info" | "success" | "warning" | "error" | "loader" =>
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
interface ToastTiming {
  readonly enter: MotionTiming;
  readonly exit: MotionTiming;
  readonly move: MotionTiming;
}

const useToastTiming = (): ToastTiming => {
  const preference = useMotionPreference();
  return {
    enter: motionTimingOf(220, { phase: "enter", preference }),
    exit: motionTimingOf(180, { phase: "exit", preference }),
    move: motionTimingOf(200, { phase: "standard", preference }),
  };
};

/** The horizontal distance a card arrives from and leaves toward, in pixels. */
const EDGE_TRAVEL = 16;

/** How long a lost pointer or focus may stay lost before the stack folds. */
const HOLD_GRACE_MS = 120;

/** A slot no card should need: a broken measurement paints nothing, not the stack. */
const EMPTY_SLOT: ToastSlot = {
  rank: 0,
  height: 0,
  inset: 0,
  opacity: 1,
  interactive: false,
};

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

/**
 * One card: a surface whose height is the slot's, around a body that measures
 * itself. The row is the same one the viewport has always painted — tone glyph,
 * title, description, one action, one dismiss — now split into a clipping
 * surface and a measured body so the shorter strip keeps the card's real edge.
 */
const ToastCard = ({
  toast,
  present,
  slot,
  stackWidth,
  timing,
  swipe,
  onMeasure,
  onHover,
  onFocusChange,
  onDrag,
}: {
  readonly toast: Toast;
  readonly present: boolean;
  readonly slot: ToastSlot;
  /** The stack's measured width, `0` until it reports. */
  readonly stackWidth: number;
  readonly timing: ToastTiming;
  readonly swipe: boolean;
  readonly onMeasure: (id: string, height: number) => void;
  readonly onHover: (entered: boolean) => void;
  readonly onFocusChange: (id: string, focused: boolean) => void;
  readonly onDrag: (active: boolean) => void;
}) => {
  const theme = useTheme();
  const { dismiss, actionFor } = useToast();
  const palette = tone(theme, asTone(toast.tone));
  const [drag, setDrag] = useState(0);
  const dragX = useRef(0);
  const press = useRef<
    Option.Option<{ readonly x: number; readonly at: bigint }>
  >(Option.none());
  const exitLeft = useRef(EDGE_TRAVEL);
  const fired = useRef(false);
  const entered = useRef(false);

  useEffect(() => {
    entered.current = true;
  }, []);

  const action = Option.flatMap(toast.action, (candidate) =>
    Option.map(actionFor(toast.id), (onSelect) => ({ candidate, onSelect })),
  );
  // The provider prunes a toast's handler when it leaves the queue, while this
  // card is still painted for its exit: a ghost keeps the content it was
  // dismissed with, so the action it showed does not vanish under the fade.
  const lastAction = useRef(action);
  if (Option.isSome(action)) lastAction.current = action;

  const measure = (event: EventPayload): void => {
    Option.match(measuredHeight(event), {
      onNone: () => undefined,
      onSome: (value) => onMeasure(toast.id, value),
    });
  };

  /** Pointer travel is the horizontal axis only; the card paints on `left`. */
  const startDrag = (event: EventPayload): void => {
    if (!present || !slot.interactive) return;
    Option.match(measuredPoint(event), {
      onNone: () => undefined,
      onSome: (point) => {
        press.current = Option.some({ x: point.x, at: monotonicNanos() });
        dragX.current = 0;
        onDrag(true);
      },
    });
  };

  const moveDrag = (event: EventPayload): void => {
    Option.match(press.current, {
      onNone: () => undefined,
      onSome: (begin) =>
        Option.match(measuredPoint(event), {
          onNone: () => undefined,
          onSome: (point) => {
            dragX.current = point.x - begin.x;
            setDrag(dragX.current);
          },
        }),
    });
  };

  const endDrag = (event: EventPayload): void => {
    Option.match(press.current, {
      onNone: () => undefined,
      onSome: (begin) => {
        press.current = Option.none();
        onDrag(false);
        const dx = Option.match(measuredPoint(event), {
          onNone: () => dragX.current,
          onSome: (point) => point.x - begin.x,
        });
        const elapsed = Number(monotonicNanos() - begin.at) / 1_000_000;
        Option.match(Option.fromNullishOr(swipeEdge(dx, elapsed)), {
          onNone: () => setDrag(0),
          onSome: (edge) => {
            exitLeft.current =
              dx + (edge === "left" ? -EDGE_TRAVEL : EDGE_TRAVEL);
            dismiss(toast.id);
          },
        });
      },
    });
  };

  const dragTransition: MotionTiming = { duration: 0 };

  const motion = present
    ? {
        initial: { opacity: 0, left: EDGE_TRAVEL, height: slot.height },
        animate: { opacity: slot.opacity, left: drag, height: slot.height },
        transition:
          drag !== 0
            ? dragTransition
            : entered.current
              ? timing.move
              : timing.enter,
      }
    : {
        initial: false as const,
        animate: {
          opacity: 0,
          left: exitLeft.current,
          height: slot.height,
        },
        transition: timing.exit,
      };

  return (
    <div
      testId={`toast-${toast.id}`}
      role={toast.tone === "danger" ? "alert" : "status"}
      aria-label={toast.title}
      motion={motion}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onFocusChange(toast.id, true)}
      onBlur={() => onFocusChange(toast.id, false)}
      style={mergeStyles(overlaySurfaceStyle(TOAST_CARD, undefined, theme), {
        position: "relative",
        // The card keeps its right edge and loses the same inset on both
        // sides, so a peeking strip reads as a smaller card, not a moved one.
        width: stackWidth > 0 ? stackWidth - slot.inset * 2 : "100%",
        marginRight: slot.inset,
        ...presenceStyle(present, "wrapper"),
      })}
    >
      <div
        onLayout={measure}
        style={mergeStyles(recipeStyle(TOAST_BODY, theme), {
          // The body always measures at the full stack width: a peeking card is
          // clipped, not reflowed, so expanding it cannot change its answer.
          width: stackWidth > 0 ? stackWidth : "100%",
        })}
      >
        <div
          onMouseDown={swipe ? startDrag : undefined}
          onMouseMove={swipe ? moveDrag : undefined}
          onMouseUp={swipe ? endDrag : undefined}
          style={recipeStyle(TOAST_DRAG, theme)}
        >
          <div
            style={mergeStyles(recipeStyle(TOAST_GLYPH, theme), {
              color: palette.fg,
              width: theme.iconSize.md,
            })}
          >
            <Icon
              name={toast.phase === "loading" ? "loader" : glyph(toast.tone)}
              size="sm"
              color={palette.fg}
              label={toast.phase === "loading" ? "loading" : toast.tone}
            />
          </div>
          <div style={recipeStyle(TOAST_COPY, theme)}>
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
        </div>
        {Option.match(lastAction.current, {
          onNone: () => null,
          onSome: ({ candidate, onSelect }) => (
            <Button
              size="sm"
              variant="secondary"
              testId={`toast-action-${toast.id}`}
              disabled={!present || !slot.interactive}
              // A live card's controls are the window's; a ghost's and a
              // peeking card's are not (the runtime decides the Tab order
              // element by element, so the control owns its own stop).
              {...presenceTabStop(present && slot.interactive)}
              onClick={() => {
                if (fired.current) return;
                fired.current = true;
                onSelect();
                dismiss(toast.id);
              }}
            >
              {candidate.label}
            </Button>
          ),
        })}
        <IconButton
          label="Dismiss"
          size="sm"
          testId={`toast-dismiss-${toast.id}`}
          disabled={!present || !slot.interactive}
          {...presenceTabStop(present && slot.interactive)}
          onClick={() => {
            exitLeft.current = EDGE_TRAVEL;
            dismiss(toast.id);
          }}
        >
          <Icon name="x" size="sm" color={theme.colors.foreground} />
        </IconButton>
      </div>
      <PresenceShield present={present} />
    </div>
  );
};

/** The invisible spacer that opens a gap between full cards. */
const ToastGap = ({
  held,
  timing,
}: {
  readonly held: boolean;
  readonly timing: ToastTiming;
}) => (
  <div
    style={{ width: "100%", pointerEvents: "none" }}
    motion={{
      initial: false,
      animate: { height: stackGap(held) },
      transition: timing.move,
    }}
  />
);

/** {@link ToastViewport} props: where the stack sits in the app root. */
export interface ToastViewportProps extends Props {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** An optional element before the toasts, e.g. a "dismiss all" action. */
  readonly children?: ReactNode;
  /** Whether a card may be swiped sideways to dismiss it. Default `true`. */
  readonly swipe?: boolean;
}

/**
 * The corner stack. Render it **last** in the app root: the runtime paints in
 * order, so anything after it would cover the toasts.
 */
export const ToastViewport = ({
  children,
  className,
  style,
  swipe = true,
  ...rest
}: ToastViewportProps) => {
  const theme = useTheme();
  const { toasts, hold } = useToast();
  const timing = useToastTiming();
  const stack = useToastStack(toasts, timing);
  const [held, setHeld] = useState(false);
  const [stackWidth, setStackWidth] = useState(0);
  const [heights, setHeights] = useState<HashMap.HashMap<string, number>>(
    HashMap.empty,
  );
  // The hold is built from three inputs and applied through one state, so a
  // card's mount, leave and drag cannot each own a competing pause. Hover and
  // focus are **sets of card ids**, read against the cards on screen: a card
  // dismissed under the pointer unmounts without hearing its leave, and a
  // boolean would keep the whole stack held forever.
  const hovered = useRef(HashSet.empty<string>());
  const focused = useRef(HashSet.empty<string>());
  const dragging = useRef(false);
  const heldNow = useRef(false);
  const grace = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearGrace = (): void => {
    if (grace.current === null) return;
    clearTimeout(grace.current);
    grace.current = null;
  };

  /** Apply a hold; a release waits out the grace so a card-to-card move holds. */
  const applyHold = (next: boolean): void => {
    if (next) {
      clearGrace();
      if (!heldNow.current) {
        heldNow.current = true;
        setHeld(true);
      }
      return;
    }
    if (!heldNow.current || grace.current !== null) return;
    grace.current = setTimeout(() => {
      grace.current = null;
      heldNow.current = false;
      setHeld(false);
    }, HOLD_GRACE_MS);
  };

  const syncHold = (): void => {
    applyHold(
      HashSet.size(hovered.current) > 0 ||
        HashSet.size(focused.current) > 0 ||
        dragging.current,
    );
  };

  useEffect(
    () => () => {
      clearGrace();
    },
    [],
  );

  // A toast pushed while the stack is held is born paused; releasing the stack
  // resumes every clock with the time it has left.
  useEffect(() => {
    hold(held);
  }, [held, hold]);

  useEffect(
    () => () => {
      hold(false);
    },
    [hold],
  );

  // A card that leaves cannot blur: the runtime unmounts the focused control
  // without a blur event on 0.11.0. Its id is dropped from the focus set with
  // the card, and an empty stack forgets a hover whose leave it never heard.
  useEffect(() => {
    if (!Arr.some(stack, (entry) => entry.present)) {
      hovered.current = HashSet.empty();
    }
    const live = HashSet.fromIterable(
      Arr.map(
        Arr.filter(stack, (entry) => entry.present),
        (entry) => entry.toast.id,
      ),
    );
    hovered.current = HashSet.filter(hovered.current, (id) =>
      HashSet.has(live, id),
    );
    focused.current = HashSet.filter(focused.current, (id) =>
      HashSet.has(live, id),
    );
    syncHold();
  }, [stack]);

  // The height a card reported belongs to that card; a card that unmounts does
  // not keep an entry in the measurement map.
  useEffect(() => {
    const live = HashSet.fromIterable(
      Arr.map(stack, (entry) => entry.toast.id),
    );
    setHeights((current) => {
      const next = HashMap.filter(current, (_, id) => HashSet.has(live, id));
      return HashMap.size(next) === HashMap.size(current) ? current : next;
    });
  }, [stack]);

  const onMeasure = (id: string, height: number): void => {
    setHeights((current) =>
      Option.match(HashMap.get(current, id), {
        onNone: () => HashMap.set(current, id, height),
        onSome: (known) =>
          known === height ? current : HashMap.set(current, id, height),
      }),
    );
  };

  const onHover = (id: string, entered: boolean): void => {
    hovered.current = entered
      ? HashSet.add(hovered.current, id)
      : HashSet.remove(hovered.current, id);
    syncHold();
  };

  const onFocusChange = (id: string, focusedNow: boolean): void => {
    focused.current = focusedNow
      ? HashSet.add(focused.current, id)
      : HashSet.remove(focused.current, id);
    syncHold();
  };

  const onDrag = (active: boolean): void => {
    dragging.current = active;
    syncHold();
  };

  const slots = toastSlots(
    Arr.map(stack, (entry) =>
      Option.getOrElse(HashMap.get(heights, entry.toast.id), () => 0),
    ),
    held,
  );

  return (
    <div
      role="group"
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
      <div
        testId="toast-stack"
        onLayout={(event) => {
          Option.match(measuredBox(event), {
            onNone: () => undefined,
            onSome: (box) => setStackWidth(box.width),
          });
        }}
        style={recipeStyle(TOAST_STACK, theme)}
      >
        {Arr.map(stack, (entry, index) => {
          const slot = slots[index] ?? EMPTY_SLOT;
          return (
            <Fragment key={entry.toast.id}>
              {index === 0 ? null : <ToastGap held={held} timing={timing} />}
              <ToastCard
                toast={entry.toast}
                present={entry.present}
                slot={slot}
                stackWidth={stackWidth}
                timing={timing}
                swipe={swipe}
                onMeasure={onMeasure}
                onHover={(entered) => onHover(entry.toast.id, entered)}
                onFocusChange={onFocusChange}
                onDrag={onDrag}
              />
            </Fragment>
          );
        })}
      </div>
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
    "no aria-live or aria-atomic: a card paints role=status (alert for danger) and does not claim an announcement",
    "the stack shows three cards while collapsed; more stay queued and unfold only when the stack is expanded",
    "no progress indicator for the remaining auto-dismiss time",
    "swipe travels one axis (horizontal), because the runtime has no transform and an arbitrary-angle card would cover the page",
  ],
  docs: "docs/toast.mdx",
  example: "examples/toast.example.tsx",
  testFile: "src/behaviour/toast.test.tsx",
} as const;
