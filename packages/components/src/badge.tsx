/**
 * Badge: a short status label.
 *
 * Non-interactive by design — a badge is never a button and nothing inside one
 * is clickable. Colour comes from the theme's semantic roles, and the four
 * status variants from the soft-tone palette Alert and Toast share, so a custom
 * theme restyles every badge with no code change. The resting appearance is a
 * Tailwind recipe (`BADGE_*`), compiled against shadcn's fixed metrics; the
 * caller's `className` is joined after the recipe and its `style` is merged
 * last.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { BADGE_BASE, BADGE_SIZES, BADGE_VARIANTS, cn } from "@gpuixui/tw";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";

/** The badge's colour family. */
export type BadgeVariant =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

/** Two pill heights: `sm` is a caption, `md` a label. */
export type BadgeSize = "sm" | "md";

/** {@link Badge} props. */
export interface BadgeProps extends Props {
  /** Default `"neutral"`. */
  readonly variant?: BadgeVariant;
  /** Default `"md"`. */
  readonly size?: BadgeSize;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** A status label: one line of text on a pill, sized by the recipe's type step. */
export const Badge = ({
  variant = "neutral",
  size = "md",
  className,
  style,
  ...rest
}: BadgeProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(
          cn(BADGE_BASE, BADGE_SIZES[size], BADGE_VARIANTS[variant], className),
          theme,
        ),
        style,
      )}
    />
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const badgeMeta = {
  name: "Badges",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [],
  docs: "docs/badge.mdx",
  example: "examples/badge.example.tsx",
  testFile: "src/behaviour/badge.test.tsx",
} as const;
