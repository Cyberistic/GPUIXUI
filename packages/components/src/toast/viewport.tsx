/** @jsxImportSource @gpuix/react */
import type { EventPayload, Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import {
  motionTimingOf,
  type MotionCurve,
  type MotionTiming,
} from "@gpuixui/motion/timing";
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
import { stackGap, toastSlotOf, type ToastSlot } from "./stack.js";
import { swipeEdge } from "./swipe.js";

const asTone = (value: ToastTone): Tone =>
  Match.value(value).pipe(
    Match.when("info", () => "info" as const),
    Match.when("success", () => "success" as const),
    Match.when("warning", () => "warning" as const),
    Match.when("danger", () => "danger" as const),
    Match.exhaustive,
  );

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

interface ToastTiming {
  readonly enter: MotionTiming;
  readonly exit: MotionTiming;
  readonly move: MotionTiming;
}

const STACK_CURVE: MotionCurve = [0.22, 1, 0.36, 1];

const useToastTiming = (): ToastTiming => {
  const preference = useMotionPreference();
  return {
    enter: motionTimingOf(240, { phase: "enter", preference }),
    exit: motionTimingOf(180, { phase: "exit", preference }),
    move: motionTimingOf(260, {
      phase: "standard",
      preference,
      ease: STACK_CURVE,
    }),
  };
};

const EDGE_TRAVEL = 16;

const HOLD_GRACE_MS = 120;

const EMPTY_SLOT: ToastSlot = {
  rank: 0,
  height: 0,
  inset: 0,
  interactive: false,
};

interface StackEntry {
  readonly toast: Toast;
  readonly present: boolean;
}

interface ExitTimer {
  readonly handle: ReturnType<typeof setTimeout>;
  readonly ms: number;
}

const useToastStack = (
  toasts: ReadonlyArray<Toast>,
  timing: SurfaceTiming,
): ReadonlyArray<StackEntry> => {
  const [entries, setEntries] = useState<ReadonlyArray<StackEntry>>(() =>
    Arr.map(toasts, (toast) => ({ toast, present: true })),
  );
  const painted = useRef(entries);
  const timers = useRef(new Map<string, ExitTimer>());

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

    setEntries((list) =>
      list.length === merged.length &&
      list.every(
        (entry, index) =>
          entry.toast === merged[index]?.toast &&
          entry.present === merged[index]?.present,
      )
        ? list
        : merged,
    );
    Arr.forEach(merged, (entry) => {
      if (entry.present) return;
      const id = entry.toast.id;
      const running = timers.current.get(id);

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

const ToastCard = ({
  toast,
  present,
  slot,
  naturalHeight,
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

  readonly naturalHeight: number;

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

  const placed = useRef(false);

  useEffect(() => {
    if (slot.height > 0) placed.current = true;
  }, [slot.height]);

  const action = Option.flatMap(toast.action, (candidate) =>
    Option.map(actionFor(toast.id), (onSelect) => ({ candidate, onSelect })),
  );

  const lastAction = useRef(action);
  if (Option.isSome(action)) lastAction.current = action;

  const measure = (event: EventPayload): void => {
    Option.match(measuredHeight(event), {
      onNone: () => undefined,
      onSome: (value) => onMeasure(toast.id, value),
    });
  };

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

  const width = stackWidth > 0 ? stackWidth - slot.inset * 2 : undefined;
  const frame = width === undefined ? {} : { width };

  const live = present && slot.height > 0;

  const motion = present
    ? {
        initial: { opacity: 0, left: EDGE_TRAVEL, height: 0, ...frame },
        animate: {
          opacity: live ? 1 : 0,
          left: live ? drag : EDGE_TRAVEL,
          height: live ? slot.height : 0,
          ...frame,
        },
        transition:
          drag !== 0
            ? dragTransition
            : placed.current
              ? timing.move
              : timing.enter,
      }
    : {
        initial: false as const,
        animate: { opacity: 0, left: exitLeft.current, height: 0, ...frame },
        transition: timing.exit,
      };

  const surface = overlaySurfaceStyle(TOAST_CARD, undefined, theme);

  const whole = naturalHeight > 0 && slot.height >= naturalHeight;
  const edge = whole
    ? { borderRadius: surface.borderRadius, boxShadow: surface.boxShadow }
    : {};

  return (
    <div
      testId={`toast-${toast.id}`}
      role={toast.tone === "danger" ? "alert" : "status"}
      aria-label={toast.title}
      motion={motion}
      style={mergeStyles(edge, {
        position: "relative",
        overflow: "hidden",
        width: width === undefined ? "100%" : undefined,

        ...presenceStyle(present, "target"),
      })}
    >
      <div
        style={surface}
        testId={`toast-surface-${toast.id}`}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onFocus={() => onFocusChange(toast.id, true)}
        onBlur={() => onFocusChange(toast.id, false)}
      >
        <div
          onLayout={measure}
          style={mergeStyles(recipeStyle(TOAST_BODY, theme), {
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
      </div>
      <PresenceShield present={present} />
    </div>
  );
};

const ToastGap = ({
  open,
  timing,
}: {
  readonly open: boolean;
  readonly timing: ToastTiming;
}) => (
  <div
    style={{ width: "100%", pointerEvents: "none" }}
    motion={{
      initial: false,
      animate: { height: stackGap(open) },
      transition: timing.move,
    }}
  />
);

export interface ToastViewportProps extends Props {
  readonly className?: string;

  readonly children?: ReactNode;

  readonly swipe?: boolean;
}

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

  useEffect(() => {
    hold(held);
  }, [held, hold]);

  useEffect(
    () => () => {
      hold(false);
    },
    [hold],
  );

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

  const present = Arr.filter(stack, (entry) => entry.present);
  const presentCount = Arr.length(present);
  const liveSlots = HashMap.fromIterable(
    Arr.map(
      present,
      (entry, index) =>
        [
          entry.toast.id,
          toastSlotOf(
            presentCount - 1 - index,
            Option.getOrElse(HashMap.get(heights, entry.toast.id), () => 0),
            held,
          ),
        ] as const,
    ),
  );

  const lastSlots = useRef(HashMap.empty<string, ToastSlot>());

  const slotFor = (entry: StackEntry): ToastSlot =>
    Option.getOrElse(
      HashMap.get(
        entry.present ? liveSlots : lastSlots.current,
        entry.toast.id,
      ),
      () => EMPTY_SLOT,
    );
  const slots = Arr.map(stack, slotFor);

  useLayoutEffect(() => {
    const live = HashSet.fromIterable(
      Arr.map(stack, (entry) => entry.toast.id),
    );
    lastSlots.current = Arr.reduce(
      present,
      HashMap.filter(lastSlots.current, (_, id) => HashSet.has(live, id)),
      (map, entry) => HashMap.set(map, entry.toast.id, slotFor(entry)),
    );
  }, [present, stack, liveSlots, held, heights]);

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
          const above = stack[index - 1];
          return (
            <Fragment key={entry.toast.id}>
              {index === 0 ? null : (
                <ToastGap
                  open={held && entry.present && above?.present === true}
                  timing={timing}
                />
              )}
              <ToastCard
                toast={entry.toast}
                present={entry.present}
                slot={slot}
                naturalHeight={Option.getOrElse(
                  HashMap.get(heights, entry.toast.id),
                  () => 0,
                )}
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
