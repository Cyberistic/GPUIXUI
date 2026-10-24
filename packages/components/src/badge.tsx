/** @jsxImportSource @gpuix/react */
/**
 * Badge: a short status label.
 *
 * Non-interactive by design — a badge is never a button and nothing inside one
 * is clickable, so the pill also stays out of the pointer: a badge paints a
 * fill, and a filled child is the boundary the hit test stops counting at, so
 * a status pill in a selectable row would swallow the row's press
 * (`list-row-press`). Colour comes from the theme's semantic roles, and the
 * four status variants from the soft-tone palette Alert and Toast share, so a
 * custom theme restyles every badge with no code change. The resting
 * appearance is a Tailwind recipe (`BADGE_*`), compiled against shadcn's fixed
 * metrics; the caller's `className` is joined after the recipe and its `style`
 * is merged last, so an interactive badge can opt back into the pointer.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { BADGE_BASE, BADGE_SIZES, BADGE_VARIANTS, cn } from "@gpuixui/tw";
import * as Schema from "effect/Schema";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";

/** The badge's colour family, as the guard reads it. */
const BadgeVariants = Schema.Literals([
  "neutral",
  "primary",
  "success",
  "warning",
  "danger",
  "info",
  "outline",
]);

/** The badge's colour family. */
export type BadgeVariant = typeof BadgeVariants.Type;

/** The two pill heights, as the guard reads them. */
const BadgeSizes = Schema.Literals(["sm", "md"]);

/** Two pill heights: `sm` is a caption, `md` a label. */
export type BadgeSize = typeof BadgeSizes.Type;

/**
 * The variant a stored name paints.
 *
 * A variant is a stored choice as often as a literal — a status pill in a saved
 * record, a list row's `trailing` slot, a table cell's value — so a name a
 * release renamed or dropped arrives as a string the union no longer carries.
 * The table read answered `undefined` and the recipe dropped the entry, so the
 * pill painted **no ink role and no fill** at all: an unreadable label, since
 * the base recipe paints structure and lets the variant paint the colour. A
 * name the table does not carry paints the documented default, `neutral`, the
 * rule `buttonVariantOf` follows in the primitives and `lookOf` in this
 * package's `internal/button.tsx`.
 */
const variantOf = (value: unknown): BadgeVariant =>
  Schema.is(BadgeVariants)(value) ? value : "neutral";

/** The type step a stored size paints; an unreadable name is `md`. */
const sizeOf = (value: unknown): BadgeSize =>
  Schema.is(BadgeSizes)(value) ? value : "md";

/** {@link Badge} props. */
export interface BadgeProps extends Props {
  /**
   * Default `"neutral"`. A name this release does not ship — a variant a store
   * wrote, or one a release renamed — reads as that default.
   */
  readonly variant?: BadgeVariant;
  /**
   * Default `"md"`. A name this release does not ship reads as that default.
   */
  readonly size?: BadgeSize;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** A status label: one line of text on a pill, sized by the recipe's type step. */
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
          // The pill takes no pointer input: its fill is the boundary a press
          // stops at, and the caller's `style` below can hand it back.
          { pointerEvents: "none" },
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
