/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { spaceValue, visibleCopy } from "@gpuixui/primitives/core";
import { statusTone } from "@gpuixui/tokens";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import type { ReactNode } from "react";
import { readable } from "../internal/readable.js";
import { recipeStyle } from "../recipe.js";
import { themeColors, useTheme } from "../theme.js";
import { STAT_CARD, STAT_HINT, STAT_LABEL, STAT_VALUE } from "./recipe.js";

export interface StatTrend {
  readonly direction: "up" | "down" | "flat";

  readonly text: string | null;
}

export interface StatCardProps extends Omit<Props, "children"> {
  readonly label: string;

  readonly value: ReactNode;

  readonly unit?: string;

  readonly hint?: ReactNode;

  readonly trend?: StatTrend;
  readonly className?: string;
}

export const trendTone = (
  direction: StatTrend["direction"],
  theme: ReturnType<typeof useTheme>,
): string | undefined =>
  direction === "up"
    ? statusTone(theme, "success").foreground
    : direction === "down"
      ? statusTone(theme, "destructive").foreground
      : themeColors(theme).mutedForeground;

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

  const movement = Option.fromNullishOr(trend);

  const title = visibleCopy(label);
  const unitCopy = visibleCopy(unit);
  const hintCopy = P.isString(hint) ? visibleCopy(hint) : hint;
  return (
    <div
      {...rest}
      role="group"
      style={mergeStyles(recipeStyle(cn(STAT_CARD, className), theme), style)}
    >
      {title === undefined ? undefined : (
        <text style={recipeStyle(STAT_LABEL, theme)}>{title}</text>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "baseline",
          gap: spaceValue(theme, "xs"),
        }}
      >
        {readable(value, { style: recipeStyle(STAT_VALUE, theme) })}
        {unitCopy === undefined ? undefined : (
          <text style={recipeStyle(STAT_HINT, theme)}>{unitCopy}</text>
        )}
        {Option.match(movement, {
          onNone: () => undefined,
          onSome: (shown) => {
            const words = visibleCopy(shown.text ?? undefined);
            return words === undefined ? undefined : (
              <text
                style={{
                  ...recipeStyle(STAT_HINT, theme),
                  color: trendTone(shown.direction, theme),
                }}
              >
                {words}
              </text>
            );
          },
        })}
      </div>
      {hintCopy === undefined
        ? undefined
        : readable(hintCopy, { style: recipeStyle(STAT_HINT, theme) })}
    </div>
  );
};
