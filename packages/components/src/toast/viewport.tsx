/**
 * The toast viewport: a paint-order stack in the bottom-right corner.
 *
 * GPUix has no `zIndex`; stacking is paint order, so the viewport must be the
 * **last child of the app root**. The container is `pointerEvents: "none"` so the
 * page underneath stays usable; each card turns pointer events back on.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  cn,
  TOAST_CARD,
  TOAST_DESCRIPTION,
  TOAST_GLYPH,
  TOAST_TITLE,
  TOAST_VIEWPORT,
} from "@gpuixui/tw";
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useRef, type ReactNode } from "react";
import { Button, IconButton } from "../internal/button.js";
import { overlaySurfaceStyle } from "../internal/overlay.js";
import { recipeStyle } from "../internal/recipe.js";
import { tone, useTheme, type Tone } from "../internal/theme.js";
import type { Toast, ToastTone } from "./model.js";
import { useToast } from "./provider.js";

/** The status tone behind a toast's bar and glyph. */
const asTone = (value: ToastTone): Tone =>
  Match.value(value).pipe(
    Match.when("info", () => "info" as const),
    Match.when("success", () => "success" as const),
    Match.when("warning", () => "warning" as const),
    Match.when("danger", () => "danger" as const),
    Match.exhaustive,
  );

/** The glyph each tone shows until an icon set lands. */
const glyph = (value: ToastTone): string =>
  Match.value(value).pipe(
    Match.when("info", () => "i"),
    Match.when("success", () => "✓"),
    Match.when("warning", () => "!"),
    Match.when("danger", () => "✕"),
    Match.exhaustive,
  );

/** One card. Its left bar and glyph carry the tone; the surface is neutral. */
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

  return (
    <div
      testId={`toast-${toast.id}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={overlaySurfaceStyle(TOAST_CARD, undefined, theme)}
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
        <text
          aria-label={toast.tone}
          style={mergeStyles(recipeStyle(TOAST_GLYPH, theme), {
            color: palette.fg,
            width: theme.iconSize.md,
          })}
        >
          {glyph(toast.tone)}
        </text>
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
          <text>✕</text>
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
      {Arr.map(toasts, (toast) => (
        <ToastCard key={toast.id} toast={toast} />
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
    "the tone glyph is text until an icon set lands",
  ],
  docs: "docs/toast.mdx",
  example: "examples/toast.example.tsx",
  testFile: "src/behaviour/toast.test.tsx",
} as const;
