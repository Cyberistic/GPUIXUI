/**
 * EmptyState: the "nothing here yet" panel for a list, table or panel.
 *
 * A panel, not a surface: it paints no background and no border, because it sits
 * inside a `Card`, a panel or a table body that already supplies one. Centred and
 * unfocusable — the only interactive thing in it is whatever the caller passes as
 * `action`.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import type { ReactNode } from "react";
import { textStyle, useTheme } from "./internal/theme.js";

/** The widest a description is allowed to run before it wraps. */
const MEASURE = 360;

/** {@link EmptyState} props. */
export interface EmptyStateProps extends Props {
  /** Optional glyph above the title. Purely decorative. */
  readonly icon?: ReactNode;
  /** What is missing, in a few words. */
  readonly title: string;
  /** Why it is missing, or what to do about it. */
  readonly description?: string;
  /** The way out: usually a `Button`. */
  readonly action?: ReactNode;
}

/** A centred panel for a collection that has nothing in it. */
export const EmptyState = ({
  icon,
  title,
  description,
  action,
  style,
  ...rest
}: EmptyStateProps) => {
  const theme = useTheme();

  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.lg,
          padding: theme.spacing["3xl"],
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
            color: theme.colors.mutedForeground,
          }}
        >
          {icon}
        </div>
      )}
      <text
        style={{
          ...textStyle(theme, "bodyStrong"),
          color: theme.colors.foreground,
          textAlign: "center",
        }}
      >
        {title}
      </text>
      {description === undefined ? null : (
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.mutedForeground,
            textAlign: "center",
            maxWidth: MEASURE,
          }}
        >
          {description}
        </text>
      )}
      {action === undefined ? null : (
        <div style={{ display: "flex", flexDirection: "row" }}>{action}</div>
      )}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const emptyStateMeta = {
  name: "Empty states",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [],
  docs: "docs/empty-state.mdx",
  example: "examples/empty-state.example.tsx",
  testFile: "src/behaviour/empty-state.test.tsx",
} as const;
