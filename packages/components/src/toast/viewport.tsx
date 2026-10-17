/**
 * The toast viewport: a paint-order stack in the bottom-right corner.
 *
 * GPUix has no `zIndex`; stacking is paint order, so the viewport must be the
 * **last child of the app root**. The container is `pointerEvents: "none"` so the
 * page underneath stays usable; each card turns pointer events back on.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { IconButton } from "../internal/button.js";
import {
  elevation,
  textStyle,
  tone,
  useTheme,
  type Tone,
} from "../internal/theme.js";
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
  const { dismiss, pause, resume } = useToast();
  const palette = tone(theme, asTone(toast.tone));

  return (
    <div
      testId={`toast-${toast.id}`}
      onMouseEnter={() => pause(toast.id)}
      onMouseLeave={() => resume(toast.id)}
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
        boxShadow: elevation(theme, "md"),
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
        <text
          aria-label={toast.tone}
          style={{
            ...textStyle(theme, "label"),
            color: palette.fg,
            width: theme.iconSize.md,
          }}
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
        <IconButton
          label="Dismiss"
          size="sm"
          testId="toast-dismiss"
          onClick={() => dismiss(toast.id)}
        >
          <text>✕</text>
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

  return (
    <div
      role="status"
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
