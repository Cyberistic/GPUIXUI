/** @jsxImportSource @gpuix/react */
/**
 * A statistic card: a label, a reading and a hint.
 *
 * The reading is **derived**, never stored twice: the card is handed the value
 * it shows, so an edit that reaches the object reaches the card in the same
 * frame (`inspector-lifecycle` measured the area card following a width change
 * in the same frame as the preview box and the readout).
 *
 * ```tsx
 * <StatCard label="Area" value={`${width * height}`} unit="px²" />
 * ```
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { spaceValue } from "@gpuixui/primitives/core";
import { statusTone } from "@gpuixui/tokens";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { readable } from "../internal/readable.js";
import { recipeStyle } from "../recipe.js";
import { themeColors, useTheme } from "../theme.js";
import { STAT_CARD, STAT_HINT, STAT_LABEL, STAT_VALUE } from "./recipe.js";

/** Which way a reading moved, and by how much. */
export interface StatTrend {
  readonly direction: "up" | "down" | "flat";
  /** The trend's own words, e.g. `+12%`. */
  readonly text: string;
}

/** {@link StatCard} props. */
export interface StatCardProps extends Omit<Props, "children"> {
  /** What the reading measures. */
  readonly label: string;
  /** The reading, already rendered by the caller. */
  readonly value: ReactNode;
  /** The unit the reading is in, beside it. */
  readonly unit?: string;
  /** A line under the reading. */
  readonly hint?: ReactNode;
  /** The movement of the reading. */
  readonly trend?: StatTrend;
  readonly className?: string;
}

/**
 * The colour a trend's direction paints.
 *
 * A trend's words are **text on the card**, so they take the status tone's
 * readable role (`statusTone(...).foreground`, held to the body floor on
 * `card`), never the solid fill role — a fill is measured at the 3:1 mark floor
 * and can fall under the text floor on the page (the base light `success` is
 * 4.26:1 on the page, one authored look 3.92:1).
 */
export const trendTone = (
  direction: StatTrend["direction"],
  theme: ReturnType<typeof useTheme>,
): string | undefined =>
  direction === "up"
    ? statusTone(theme, "success").foreground
    : direction === "down"
      ? statusTone(theme, "destructive").foreground
      : themeColors(theme).mutedForeground;

/** A card that shows one derived reading. */
export const StatCard = ({
  label,
  value,
  unit,
  hint,
  trend,
  className,
  style,
  ...rest
}: StatCardProps) => {
  const theme = useTheme();
  // A saved card writes `null` for the fields it never set, so the trend is
  // read as the absence the prop already means rather than dereferenced.
  const movement = Option.fromNullishOr(trend);
  return (
    <div
      {...rest}
      role="group"
      style={mergeStyles(recipeStyle(cn(STAT_CARD, className), theme), style)}
    >
      <text style={recipeStyle(STAT_LABEL, theme)}>{label}</text>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "baseline",
          gap: spaceValue(theme, "xs"),
        }}
      >
        {readable(value, { style: recipeStyle(STAT_VALUE, theme) })}
        {unit === undefined ? undefined : (
          <text style={recipeStyle(STAT_HINT, theme)}>{unit}</text>
        )}
        {Option.match(movement, {
          onNone: () => undefined,
          onSome: (shown) => (
            <text
              style={{
                ...recipeStyle(STAT_HINT, theme),
                color: trendTone(shown.direction, theme),
              }}
            >
              {shown.text}
            </text>
          ),
        })}
      </div>
      {hint === undefined
        ? undefined
        : readable(hint, { style: recipeStyle(STAT_HINT, theme) })}
    </div>
  );
};
