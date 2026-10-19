/**
 * Badge: a short status label.
 *
 * Non-interactive by design — a badge is never a button and nothing inside one
 * is clickable. Colour comes from the theme's semantic roles, and the four
 * status variants from the soft-tone palette Alert and Toast share, so a custom
 * theme restyles every badge with no code change.
 */

import type { Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Match } from "effect";
import {
  textStyle,
  toneSurface,
  useTheme,
  type Theme,
} from "./internal/theme.js";

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
}

/** The type role a size uses wholesale, so line height sets the pill's height. */
const typeRole = { sm: "caption", md: "label" } as const;

/** One variant's fill, text colour and border. The four tones share a surface. */
const variantStyle = (theme: Theme, value: BadgeVariant): StyleDesc =>
  Match.value(value).pipe(
    Match.when("neutral", () => ({
      backgroundColor: theme.colors.muted,
      color: theme.colors.mutedForeground,
    })),
    Match.when("primary", () => ({
      backgroundColor: theme.colors.primary,
      color: theme.colors.primaryForeground,
    })),
    Match.when("outline", () => ({
      color: theme.colors.mutedForeground,
      borderWidth: theme.borderWidth.thin,
      borderColor: theme.colors.border,
    })),
    // The remaining variants are exactly the four status tones, so an eighth
    // variant cannot compile without its own case above.
    Match.orElse((tone) => toneSurface(theme, tone)),
  );

/** A status label: one line of text on a pill, sized by its type role. */
export const Badge = ({
  variant = "neutral",
  size = "md",
  style,
  ...rest
}: BadgeProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          ...textStyle(theme, typeRole[size]),
          ...variantStyle(theme, variant),
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          // A badge hugs its text inside a column layout instead of stretching.
          alignSelf: "flex-start",
          borderRadius: theme.radius.full,
          paddingTop: theme.spacing["2xs"],
          paddingBottom: theme.spacing["2xs"],
          paddingLeft: theme.spacing.md,
          paddingRight: theme.spacing.md,
          whiteSpace: "nowrap",
        },
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
  focusable: false,
  limitations: [],
  docs: "docs/badge.mdx",
  example: "examples/badge.example.tsx",
  testFile: "src/behaviour/badge.test.tsx",
} as const;
