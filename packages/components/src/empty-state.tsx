/** @jsxImportSource @gpuix/react */
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

const MEASURE = 360;

export interface EmptyStateProps extends Props {
  readonly icon?: ReactNode;

  readonly title: string;

  readonly description?: string;

  readonly action?: ReactNode;

  readonly className?: string;
}

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
