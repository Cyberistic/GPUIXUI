/**
 * EmptyState: the "nothing here yet" panel for a list, table or panel.
 *
 * A panel, not a surface: it paints no background and no border, because it sits
 * inside a `Card`, a panel or a table body that already supplies one. Centred and
 * unfocusable — the only interactive thing in it is whatever the caller passes as
 * `action`. The resting appearance is a Tailwind recipe (`EMPTY_STATE_*`),
 * compiled against shadcn's fixed metrics; the caller's `className` is joined
 * after the root recipe and its `style` is merged last.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  cn,
  EMPTY_STATE_ACTION,
  EMPTY_STATE_DESCRIPTION,
  EMPTY_STATE_ICON,
  EMPTY_STATE_ROOT,
  EMPTY_STATE_TITLE,
} from "@gpuixui/tw";
import type { ReactNode } from "react";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";

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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** A centred panel for a collection that has nothing in it. */
export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
  style,
  ...rest
}: EmptyStateProps) => {
  const theme = useTheme();

  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(EMPTY_STATE_ROOT, className), theme),
        style,
      )}
    >
      {icon === undefined ? null : (
        <div style={recipeStyle(EMPTY_STATE_ICON, theme)}>{icon}</div>
      )}
      <text style={recipeStyle(EMPTY_STATE_TITLE, theme)}>{title}</text>
      {description === undefined ? null : (
        <text
          style={mergeStyles(recipeStyle(EMPTY_STATE_DESCRIPTION, theme), {
            maxWidth: MEASURE,
          })}
        >
          {description}
        </text>
      )}
      {action === undefined ? null : (
        <div style={recipeStyle(EMPTY_STATE_ACTION, theme)}>{action}</div>
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
