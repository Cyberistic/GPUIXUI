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
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button, IconButton } from "../internal/button.js";
import { overlaySurfaceStyle } from "../internal/overlay.js";
import {
  fadeFromSide,
  presenceMotion,
  useSurfaceTiming,
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

/** One painted card: a live toast, or one playing out its exit. */
interface StackEntry {
  readonly toast: Toast;
  readonly present: boolean;
}

/**
 * The stack with the cards that have just left it, kept for their exit tween.
 *
 * The store removes a dismissed toast immediately — its timers are Effect
 * `Clock` time, not animation frames — so the viewport is what remembers the
 * card long enough to run its exit. The entry list keeps its order: a card
 * leaving does not reorder the stack under the reader. A leave is timed by the
 * seam's exit duration, not by the runtime's clock, so a frozen motion clock
 * cannot strand a card on screen.
 */
const useToastStack = (
  toasts: ReadonlyArray<Toast>,
  timing: SurfaceTiming,
): ReadonlyArray<StackEntry> => {
  const [entries, setEntries] = useState<ReadonlyArray<StackEntry>>(() =>
    Arr.map(toasts, (toast) => ({ toast, present: true })),
  );
  const painted = useRef(entries);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

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
    const ms = Math.round((timing.exit.duration ?? 0) * 1000);
    setEntries(merged);
    Arr.forEach(merged, (entry) => {
      if (entry.present || timers.current.has(entry.toast.id)) return;
      timers.current.set(
        entry.toast.id,
        setTimeout(() => {
          timers.current.delete(entry.toast.id);
          setEntries((list) =>
            Arr.filter(list, (item) => item.toast.id !== entry.toast.id),
          );
        }, ms),
      );
    });
  }, [timing.exit.duration, toasts]);

  useLayoutEffect(
    () => () => {
      timers.current.forEach((handle) => clearTimeout(handle));
      timers.current.clear();
    },
    [],
  );

  return entries;
};

/** One card. Its left bar and tone icon carry the status; the surface is neutral. */
const ToastCard = ({
  toast,
  present,
  timing,
}: {
  readonly toast: Toast;
  readonly present: boolean;
  readonly timing: SurfaceTiming;
}) => {
  const theme = useTheme();
  const { dismiss, pause, resume, actionFor } = useToast();
  const palette = tone(theme, asTone(toast.tone));
  const held = useRef({ hover: false, focus: 0, paused: false });

  /** Pause while either reason holds; resume only when the last one leaves. */
  const syncHold = (): void => {
    const after = held.current.hover || held.current.focus > 0;
    if (after === held.current.paused) return;
    held.current.paused = after;
    if (after) pause(toast.id);
    else resume(toast.id);
  };

  const setHover = (value: boolean): void => {
    held.current.hover = value;
    syncHold();
  };

  /** Two controls can hold focus; a count keeps moving between them held. */
  const setFocus = (value: boolean): void => {
    held.current.focus = Math.max(0, held.current.focus + (value ? 1 : -1));
    syncHold();
  };

  const action = Option.flatMap(toast.action, (candidate) =>
    Option.map(actionFor(toast.id), (onSelect) => ({
      candidate,
      onSelect,
    })),
  );

  return (
    <div
      testId={`toast-${toast.id}`}
      motion={presenceMotion(fadeFromSide("right", 16), {
        mounted: true,
        present,
        timing,
      })}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={mergeStyles(overlaySurfaceStyle(TOAST_CARD, undefined, theme), {
        pointerEvents: present ? "auto" : "none",
      })}
    >
      <div
        style={{ width: 3, alignSelf: "stretch", backgroundColor: palette.fg }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: theme.spacing.lg,
          flexGrow: 1,
          padding: theme.spacing.lg,
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
        {Option.match(action, {
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
  const timing = useSurfaceTiming("notice");
  const stack = useToastStack(toasts, timing);

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
      {Arr.map(stack, (entry) => (
        <ToastCard
          key={entry.toast.id}
          toast={entry.toast}
          present={entry.present}
          timing={timing}
        />
      ))}
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
