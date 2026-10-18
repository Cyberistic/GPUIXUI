/**
 * The toast viewport: a paint-order stack in the bottom-right corner.
 *
 * GPUix has no `zIndex`; stacking is paint order, so the viewport must be the
 * **last child of the app root**. The container is `pointerEvents: "none"` so the
 * page underneath stays usable; each card turns pointer events back on.
 */

import type { Props } from "@gpuix/react";
import { AnimatePresence, motion } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon, type IconName } from "@gpuixui/icons";
import { toastMotion } from "@gpuixui/tw";
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useRef, type ReactNode } from "react";
import { Button, IconButton } from "../internal/button.js";
import { motionProps } from "../internal/motion.js";
import {
  elevationShadow,
  textStyle,
  tone,
  useTheme,
  type Tone,
} from "../internal/theme.js";
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

  // The card is the status region and its message is the accessible name:
  // 0.10.0 has no live region, so a named status node is the strongest signal.
  const accessibleName = Option.match(toast.description, {
    onNone: () => toast.title,
    onSome: (description) => `${toast.title}: ${description}`,
  });

  return (
    <div
      role="status"
      aria-label={accessibleName}
      testId={`toast-${toast.id}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        width: 380,
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
    </div>
  );
};

/** {@link ToastViewport} props: where the stack sits in the app root. */
export interface ToastViewportProps extends Props {
  /** An optional element before the toasts, e.g. a "dismiss all" action. */
  readonly children?: ReactNode;
}

/**
 * The bottom-right stack. Render it **last** in the app root: the runtime paints
 * in order, so anything after it would cover the toasts.
 */
export const ToastViewport = ({
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
          right: theme.spacing.xl,
          bottom: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: theme.spacing.md,
          maxWidth: 380,
          pointerEvents: "none",
        },
        style,
      )}
    >
      {children}
      <AnimatePresence initial={false}>
        {Arr.map(toasts, (toast) => (
          <motion.div key={toast.id} {...cardMotion}>
            <ToastCard toast={toast} />
          </motion.div>
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
  limitations: [
    "no zIndex: the viewport stacks by paint order, so render it last in the app root",
    "no progress indicator for the remaining auto-dismiss time",
    "no reduced-motion preference in 0.10.0: the 500 ms toast recipe is not switchable",
  ],
  docs: "docs/toast.mdx",
  example: "examples/toast.example.tsx",
  testFile: "src/behaviour/toast.test.tsx",
} as const;
