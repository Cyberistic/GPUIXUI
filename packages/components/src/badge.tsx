/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { BADGE_BASE, BADGE_SIZES, BADGE_VARIANTS, cn } from "@gpuixui/tw";
import * as Schema from "effect/Schema";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";

const BadgeVariants = Schema.Literals([
  "neutral",
  "primary",
  "success",
  "warning",
  "danger",
  "info",
  "outline",
]);

export type BadgeVariant = typeof BadgeVariants.Type;

const BadgeSizes = Schema.Literals(["sm", "md"]);

export type BadgeSize = typeof BadgeSizes.Type;

const variantOf = (value: unknown): BadgeVariant =>
  Schema.is(BadgeVariants)(value) ? value : "neutral";

const sizeOf = (value: unknown): BadgeSize =>
  Schema.is(BadgeSizes)(value) ? value : "md";

export interface BadgeProps extends Props {
  readonly variant?: BadgeVariant;

  readonly size?: BadgeSize;

  readonly className?: string;
}

export const Badge = ({
  variant,
  size,
  className,
  style,
  ...rest
}: BadgeProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(
          recipeStyle(
            cn(
              BADGE_BASE,
              BADGE_SIZES[sizeOf(size)],
              BADGE_VARIANTS[variantOf(variant)],
              className,
            ),
            theme,
          ),

          { pointerEvents: "none" },
        ),
        style,
      )}
    />
  );
};

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
