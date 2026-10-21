/**
 * The toast viewport: the notification stack in one corner of the app root.
 *
 * The stack is its own deferred anchored layer above every modal (plan 820), so
 * paint order no longer follows the tree. Its filler box and the column are
 * `pointerEvents: "none"` so the page underneath stays usable; each card turns
 * pointer events back on. A card's controls dismiss their own card, so the
 * viewport first hands focus to the next live card's dismiss control — the
 * control unmounts with its card (plan 770). The stack owns the presses on
 * everything it paints: each card registers its box (plan 820) and the viewport's
 * `children` slot registers its own (plan 823), so a control above a dialog runs
 * without dismissing it.
 */

import type { Props, PublicInstance } from "@gpuix/react";
import { AnimatePresence, useGpuix, useWindowSize } from "@gpuix/react";
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
import { registerPressSurface } from "../internal/dismiss-layer.js";
import {
  markFocusSuccessor,
  resolveFocusTarget,
} from "../internal/focus-successor.js";
import { HoverGroupContext, type HoverGroup } from "../internal/hover-group.js";
import { MotionSurface, motionProps } from "../internal/motion.js";
import { useNativeFocusId } from "../internal/native-focus.js";
import { ownsSurface } from "../internal/pointer.js";
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
const ToastCard = ({
  toast,
  focusNeighbour,
  registerDismiss,
}: {
  readonly toast: Toast;
  /** Hands focus to the next live card before this one is dismissed (plan 770). */
  readonly focusNeighbour: () => void;
  /** Publishes this card's dismiss host so a neighbour can be focused. */
  readonly registerDismiss: (id: string, host: number | null) => void;
}) => {
  const theme = useTheme();
  const { dismiss, pause, resume, actionFor, timingFor } = useToast();
  const palette = tone(theme, asTone(toast.tone));
  // A control's hover cancels the card's own crossing (plan 606), so the
  // controls report theirs through the group; either source holds the clock.
  // Keyboard focus is sampled from the renderer, because 0.10.0 delivers no
  // React focus/blur for a native focus change (plan 743).
  const held = useRef({ self: false, members: 0, focus: false, paused: false });
  const syncHold = useCallback((): void => {
    const { self, members, focus } = held.current;
    const after = self || members > 0 || focus;
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
  const [actionHost, setActionHost] = useState<number | null>(null);
  const [dismissHost, setDismissHost] = useState<number | null>(null);
  const focusedHost = useNativeFocusId(true);
  const renderer = useGpuix().renderer;
  // Where the user was when this notification arrived: a control that runs an
  // action keeps no host once its card leaves, so the modal it opened returns
  // here instead of to nothing (plan 830).
  const [origin] = useState<number | null>(
    () => renderer?.getFocusedElementId?.() ?? null,
  );
  // The card is a painted overlay surface, not a dismiss layer: a press on its
  // own controls belongs to the toast, so an overlay underneath never treats it
  // as an outside press (plan 820). `ownsSurface` reads the host at event time.
  const surface = useRef<PublicInstance | null>(null);
  useEffect(
    () =>
      registerPressSurface(ownsSurface(renderer, () => surface.current?.id)),
    [renderer],
  );
  const focusHeld =
    focusedHost !== null &&
    (focusedHost === actionHost || focusedHost === dismissHost);
  useEffect(() => {
    held.current.focus = focusHeld;
    syncHold();
  }, [focusHeld, syncHold]);
  const attachAction = useCallback(
    (instance: PublicInstance | null) => setActionHost(instance?.id ?? null),
    [],
  );
  const publishDismiss = useCallback(
    (host: number | null) => registerDismiss(toast.id, host),
    [registerDismiss, toast.id],
  );
  const attachDismiss = useCallback(
    (instance: PublicInstance | null) => {
      setDismissHost(instance?.id ?? null);
      publishDismiss(instance?.id ?? null);
    },
    [publishDismiss],
  );
  // The control unmounts with its card, so the next live card's dismiss control
  // takes the focus instead of leaving it on nothing (plan 770).
  const dismissAndFocus = (): void => {
    focusNeighbour();
    dismiss(toast.id);
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
        ref={surface}
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
                testId={`toast-${toast.id}-action`}
                ref={attachAction}
                onClick={() => {
                  focusNeighbour();
                  // A neighbour that took focus is a live opener, so it wins
                  // (plan 770). With no neighbour this action leaves with its
                  // card: name the place the user came from before the modal
                  // captures this control (plan 830).
                  const leaving =
                    actionHost !== null &&
                    renderer?.getFocusedElementId?.() === actionHost;
                  // The control that raised this toast may have left with its
                  // own surface (a menu row, a palette action); that surface
                  // named where focus went when it closed, so follow the chain
                  // instead of requiring the origin to still exist (plan 837).
                  const liveOrigin = Option.flatMap(
                    Option.fromNullishOr(origin),
                    (id) =>
                      resolveFocusTarget(
                        id,
                        (target) =>
                          renderer?.getElementBounds?.(target) !== null,
                      ),
                  );
                  if (
                    leaving &&
                    Option.isSome(liveOrigin) &&
                    liveOrigin.value !== actionHost
                  ) {
                    markFocusSuccessor(actionHost, liveOrigin.value);
                  }
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
            testId={`toast-${toast.id}-dismiss`}
            ref={attachDismiss}
            onClick={dismissAndFocus}
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
 * The stack in `position`'s corner. Render it once in the app root, before the
 * app's dialogs: it is its own anchored layer above every modal, so tree order
 * no longer decides paint order, and this binding can drop a viewport mounted
 * after a dialog (plan 820 §7).
 */
export const ToastViewport = ({
  position = "bottom-right",
  children,
  style,
  ...rest
}: ToastViewportProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const window = useWindowSize();
  const { toasts } = useToast();
  const cardMotion = motionProps(toastMotion(theme));
  // Each live card publishes its dismiss host, so dismissing one card can hand
  // focus to its neighbour before the card leaves the tree (plan 770).
  const dismissHosts = useRef(new Map<string, number>());
  const registerDismiss = useCallback(
    (id: string, host: number | null): void => {
      if (host === null) dismissHosts.current.delete(id);
      else dismissHosts.current.set(id, host);
    },
    [],
  );
  const focusNeighbour = (index: number): void => {
    const neighbour = toasts[index + 1] ?? toasts[index - 1];
    if (neighbour === undefined) return;
    const host = dismissHosts.current.get(neighbour.id);
    if (host !== undefined) renderer?.focusElement?.(host);
  };
  const slot = useRef<PublicInstance | null>(null);
  const hasSlot = children !== undefined && children !== null;
  // The stack paints its own controls in the same anchored layer as its cards, so
  // they own their presses too (plan 823). The host is read at event time: the
  // wrapper mounts after this effect.
  useEffect(() => {
    if (!hasSlot) return;
    return registerPressSurface(ownsSurface(renderer, () => slot.current?.id));
  }, [hasSlot, renderer]);
  const crossAlign =
    position === "top-left" || position === "bottom-left"
      ? "flex-start"
      : "flex-end";

  return (
    // A deferred anchored layer above every modal (priority 2): a dialog's veil
    // is itself an anchored layer at the default priority 1, so a plain tree
    // child would be painted under it and unreachable (plan 820).
    <anchored
      position={{ x: 0, y: 0 }}
      priority={2}
      occlude={false}
      style={{ position: "absolute" }}
    >
      <div
        style={{
          width: window.width,
          height: window.height,
          pointerEvents: "none",
        }}
      >
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
              alignItems: crossAlign,
              gap: theme.spacing.md,
              maxWidth: CARD_WIDTH,
              pointerEvents: "none",
            },
            style,
          )}
        >
          {hasSlot ? (
            <div
              ref={slot}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: theme.spacing.md,
                alignItems: crossAlign,
                pointerEvents: "none",
              }}
            >
              {children}
            </div>
          ) : null}
          <AnimatePresence initial={false}>
            {Arr.map(toasts, (toast, index) => (
              <MotionSurface
                key={toast.id}
                testId={`toast-${toast.id}-surface`}
                {...cardMotion}
              >
                <ToastCard
                  toast={toast}
                  focusNeighbour={() => focusNeighbour(index)}
                  registerDismiss={registerDismiss}
                />
              </MotionSurface>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </anchored>
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
    "the stack is a deferred anchored layer at priority 2 so it paints above a modal veil, and a card or the viewport's own control owns its presses (plans 820/823)",
    "no reduced-motion preference in 0.10.0: the 500 ms toast recipe is not switchable",
    "the keyboard hold samples the renderer's focused host every 50 ms, because 0.10.0 delivers no React focus/blur for a native focus change",
    "dismissing the last card leaves focus alone: a toast is pushed programmatically and has no trigger to return to",
  ],
  docs: "docs/toast.mdx",
  example: "examples/toast.example.tsx",
  testFile: "src/behaviour/toast.test.tsx",
} as const;
