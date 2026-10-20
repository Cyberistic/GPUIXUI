/**
 * The toast viewport: a paint-order stack in one corner of the app root.
 *
 * GPUix has no `zIndex`; stacking is paint order, so the viewport must be the
 * **last child of the app root**. The container is `pointerEvents: "none"` so the
 * page underneath stays usable; each card turns pointer events back on.
 */

import type { Props } from "@gpuix/react";
import { AnimatePresence } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon, type IconName } from "@gpuixui/icons";
import { toastMotion } from "@gpuixui/tw";
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button, IconButton } from "../internal/button.js";
import { HoverGroupContext, type HoverGroup } from "../internal/hover-group.js";
import { MotionSurface, motionProps } from "../internal/motion.js";
import {
  elevationShadow,
  textStyle,
  tone,
  useTheme,
  type Theme,
  type Tone,
} from "../internal/theme.js";
import type { Toast, ToastTone } from "./model.js";
import { useToast } from "./provider.js";
import {
  PROGRESS_TICK_MS,
  progressPercent,
  tickTiming,
  type ToastTiming,
} from "./timing.js";

/** The status tone behind a toast's bar and icon. */
const asTone = (value: ToastTone): Tone =>
  Match.value(value).pipe(
    Match.when("info", () => "info" as const),
    Match.when("success", () => "success" as const),
    Match.when("warning", () => "warning" as const),
    Match.when("danger", () => "danger" as const),
    Match.exhaustive,
  );

/** The card's fixed width; the progress fill is a share of this track. */
const CARD_WIDTH = 380;

/** The mark each tone shows. */
const toneIcon = (value: ToastTone): IconName =>
  Match.value(value).pipe(
    Match.when("info", () => "info" as const),
    Match.when("success", () => "success" as const),
    Match.when("warning", () => "warning" as const),
    Match.when("danger", () => "error" as const),
    Match.exhaustive,
  );

/** One card. Its left bar and icon carry the tone; the surface is neutral. */
const ToastCard = ({ toast }: { readonly toast: Toast }) => {
  const theme = useTheme();
  const { dismiss, pause, resume, actionFor, timingFor } = useToast();
  const palette = tone(theme, asTone(toast.tone));
  // A control's hover cancels the card's own crossing (plan 606), so the
  // controls report theirs through the group; either source holds the clock.
  const held = useRef({ self: false, members: 0, focus: 0, paused: false });
  const syncHold = useCallback((): void => {
    const { self, members, focus } = held.current;
    const after = self || members > 0 || focus > 0;
    if (after === held.current.paused) return;
    held.current.paused = after;
    if (after) pause(toast.id);
    else resume(toast.id);
  }, [pause, resume, toast.id]);
  const hoverGroup = useMemo<HoverGroup>(
    () => ({
      enter: () => {
        held.current.members += 1;
        syncHold();
      },
      leave: () => {
        held.current.members = Math.max(0, held.current.members - 1);
        syncHold();
      },
    }),
    [syncHold],
  );
  const setSelfHover = (value: boolean): void => {
    held.current.self = value;
    syncHold();
  };
  /** Two controls can hold focus; a count keeps moving between them held. */
  const setFocus = (value: boolean): void => {
    held.current.focus = Math.max(0, held.current.focus + (value ? 1 : -1));
    syncHold();
  };
  const published = Option.match(timingFor(toast.id), {
    onNone: () => undefined,
    onSome: (timing) => timing,
  });
  const [shown, setShown] = useState<Option.Option<ToastTiming>>(
    Option.fromNullishOr(published),
  );

  useEffect(() => {
    setShown(Option.fromNullishOr(published));
    if (published === undefined || published.paused) return;
    const interval = setInterval(() => {
      setShown((current) => Option.map(current, tickTiming));
    }, PROGRESS_TICK_MS);
    return () => clearInterval(interval);
  }, [published]);

  const action = Option.flatMap(toast.action, (candidate) =>
    Option.map(actionFor(toast.id), (onSelect) => ({
      candidate,
      onSelect,
    })),
  );

  // The card is the status region and its message is the accessible name:
  // 0.10.0 has no live region, so a named status node is the strongest signal.
  const accessibleName = Option.match(toast.description, {
    onNone: () => toast.title,
    onSome: (description) => `${toast.title}: ${description}`,
  });

  return (
    <HoverGroupContext.Provider value={hoverGroup}>
      <div
        role="status"
        aria-label={accessibleName}
        testId={`toast-${toast.id}`}
        onMouseEnter={() => setSelfHover(true)}
        onMouseLeave={() => setSelfHover(false)}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          width: CARD_WIDTH,
          backgroundColor: theme.colors.popover,
          color: theme.colors.popoverForeground,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          boxShadow: elevationShadow(theme, "md"),
          overflow: "hidden",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            width: 3,
            alignSelf: "stretch",
            backgroundColor: palette.fg,
          }}
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
          <Icon
            name={toneIcon(toast.tone)}
            color={palette.fg}
            size="md"
            label={toast.tone}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: theme.spacing["2xs"],
              flexGrow: 1,
              minWidth: 0,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "bodyStrong"),
                color: theme.colors.popoverForeground,
              }}
            >
              {toast.title}
            </text>
            {Option.match(toast.description, {
              onNone: () => null,
              onSome: (description) => (
                <text
                  style={{
                    ...textStyle(theme, "caption"),
                    color: theme.colors.mutedForeground,
                  }}
                >
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
            <Icon name="x" color={theme.colors.mutedForeground} size="sm" />
          </IconButton>
        </div>
        {Option.match(shown, {
          onNone: () => null,
          onSome: (timing) =>
            timing.totalMs <= 0 ? null : (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: 0,
                  width: "100%",
                  height: 2,
                  backgroundColor: theme.colors.muted,
                  pointerEvents: "none",
                }}
              >
                <div
                  testId={`toast-${toast.id}-progress`}
                  style={{
                    width: Math.round(
                      (progressPercent(timing) / 100) * CARD_WIDTH,
                    ),
                    height: 2,
                    backgroundColor: palette.fg,
                    pointerEvents: "none",
                  }}
                />
              </div>
            ),
        })}
      </div>
    </HoverGroupContext.Provider>
  );
};

/** Where the stack sits in the app root. */
export type ToastPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

/** The two edges a corner pins, as token offsets from the app root. */
const corner = (
  theme: Theme,
  position: ToastPosition,
): {
  readonly top?: number;
  readonly bottom?: number;
  readonly left?: number;
  readonly right?: number;
} =>
  Match.value(position).pipe(
    Match.when("top-left", () => ({
      top: theme.spacing.xl,
      left: theme.spacing.xl,
    })),
    Match.when("top-right", () => ({
      top: theme.spacing.xl,
      right: theme.spacing.xl,
    })),
    Match.when("bottom-left", () => ({
      bottom: theme.spacing.xl,
      left: theme.spacing.xl,
    })),
    Match.when("bottom-right", () => ({
      bottom: theme.spacing.xl,
      right: theme.spacing.xl,
    })),
    Match.exhaustive,
  );

/** {@link ToastViewport} props: where the stack sits in the app root. */
export interface ToastViewportProps extends Props {
  /** The corner the stack grows from. Default `"bottom-right"`. */
  readonly position?: ToastPosition;
  /** An optional element before the toasts, e.g. a "dismiss all" action. */
  readonly children?: ReactNode;
}

/**
 * The stack in `position`'s corner. Render it **last** in the app root: the
 * runtime paints in order, so anything after it would cover the toasts.
 */
export const ToastViewport = ({
  position = "bottom-right",
  children,
  style,
  ...rest
}: ToastViewportProps) => {
  const theme = useTheme();
  const { toasts } = useToast();
  const cardMotion = motionProps(toastMotion(theme));

  return (
    <div
      role="group"
      aria-label="Notifications"
      testId="toast-viewport"
      {...rest}
      style={mergeStyles(
        {
          position: "absolute",
          ...corner(theme, position),
          display: "flex",
          flexDirection: "column",
          alignItems:
            position === "top-left" || position === "bottom-left"
              ? "flex-start"
              : "flex-end",
          gap: theme.spacing.md,
          maxWidth: CARD_WIDTH,
          pointerEvents: "none",
        },
        style,
      )}
    >
      {children}
      <AnimatePresence initial={false}>
        {Arr.map(toasts, (toast) => (
          <MotionSurface
            key={toast.id}
            testId={`toast-${toast.id}-surface`}
            {...cardMotion}
          >
            <ToastCard toast={toast} />
          </MotionSurface>
        ))}
      </AnimatePresence>
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const toastMeta = {
  name: "Toasts / notifications",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  focusable: true,
  limitations: [
    "no zIndex: the viewport stacks by paint order, so render it last in the app root",
    "no reduced-motion preference in 0.10.0: the 500 ms toast recipe is not switchable",
  ],
  docs: "docs/toast.mdx",
  example: "examples/toast.example.tsx",
  testFile: "src/behaviour/toast.test.tsx",
} as const;
