/**
 * Alert: a persistent, in-flow message about the current context.
 *
 * In-flow, not floating: an alert occupies its place in the layout and stays
 * until the state it describes changes. A message that appears and leaves on its
 * own is a toast; a message that blocks the window is a dialog.
 *
 * `role="alert"` marks it as a live region, so assistive technology announces it
 * when it appears.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import type { ReactNode } from "react";
import { IconButton } from "./internal/button.js";
import { textStyle, tone, toneSurface, useTheme } from "./internal/theme.js";

/** The four status tones an alert can carry. */
export type AlertTone = "info" | "success" | "warning" | "danger";

/** {@link Alert} props. */
export interface AlertProps extends Props {
  /** Default `"info"`. */
  readonly tone?: AlertTone;
  /** The alert's heading — always present, so an alert is never a bare sentence. */
  readonly title: string;
  /** Optional glyph before the text. */
  readonly icon?: ReactNode;
  /** Renders the dismiss control when given. */
  readonly onDismiss?: () => void;
  /** The dismiss control's accessible name. Default `"Dismiss"`. */
  readonly dismissLabel?: string;
}

/**
 * A message that stays in the flow: a tone-tinted surface, a heading and a body.
 * Defaults to `info`, so an unqualified alert reads as neutral information.
 */
export const Alert = ({
  tone: value = "info",
  title,
  icon,
  onDismiss,
  dismissLabel = "Dismiss",
  children,
  style,
  ...rest
}: AlertProps) => {
  const theme = useTheme();
  const { fg } = tone(theme, value);

  return (
    <div
      role="alert"
      {...rest}
      style={mergeStyles(
        {
          ...toneSurface(theme, value),
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: theme.spacing.lg,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.md,
        },
        style,
      )}
    >
      {icon === undefined ? null : (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            flexShrink: 0,
            color: fg,
          }}
        >
          {icon}
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing["2xs"],
          flexGrow: 1,
        }}
      >
        <text style={{ ...textStyle(theme, "bodyStrong"), color: fg }}>
          {title}
        </text>
        {children === undefined ? null : (
          <div
            style={{
              ...textStyle(theme, "body"),
              // The surface sets the tone's text colour; the body is prose. A
              // container, not a `text`: a body may hold a retry action.
              color: theme.colors.foreground,
            }}
          >
            {children}
          </div>
        )}
      </div>
      {onDismiss === undefined ? null : (
        <IconButton
          size="sm"
          label={dismissLabel}
          testId="alert-dismiss"
          onClick={onDismiss}
        >
          ✕
        </IconButton>
      )}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const alertMeta = {
  name: "Alerts",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the dismiss control is this package's local button until @gpuixui/primitives lands",
  ],
  docs: "docs/alert.mdx",
  example: "examples/alert.example.tsx",
  testFile: "src/behaviour/alert.test.tsx",
} as const;
