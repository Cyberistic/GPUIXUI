/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { COUNTDOWN, cn } from "@gpuixui/tw";
import { formatCountdown, readableRemaining } from "./countdown/logic.js";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";

export interface CountdownProps extends Omit<Props, "children" | "style"> {
  readonly remainingMs: number;

  readonly label?: string;

  readonly showDays?: boolean;

  readonly className?: string;

  readonly style?: StateStyle<CountdownState>;
}

export interface CountdownState {
  readonly remainingMs: number;
  readonly expired: boolean;
}

export const Countdown = ({
  remainingMs,
  label,
  showDays = false,
  className,
  style,
  ...rest
}: CountdownProps) => {
  const theme = useTheme();
  const remaining = readableRemaining(remainingMs);
  const expired = remaining <= 0;

  return (
    <text
      {...(label === undefined ? {} : { "aria-label": label })}
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(COUNTDOWN, className), theme), {
          color: expired
            ? theme.colors.mutedForeground
            : theme.colors.foreground,
        }),
        resolveStyle(style, { remainingMs: remaining, expired }),
      )}
    >
      {formatCountdown(remaining, { showDays })}
    </text>
  );
};

export const countdownMeta = {
  name: "Countdown",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "display-only: the application ticks with Effect Clock and passes remainingMs; the component owns no timer",
    "a remaining time the clock cannot read (NaN, an infinity) is no time left: it renders 00:00 in the expired role",
    "fixed locale-free clock format; days are 24-hour units, not calendar days",
    "the runtime announces no live region (no aria-live), so the label names the text rather than pushing changes",
  ],
  docs: "docs/countdown.mdx",
  example: "examples/countdown.example.tsx",
  testFile: "src/behaviour/countdown.test.tsx",
} as const;
