/**
 * Countdown: a formatted remaining duration.
 *
 * The component does not tick. A renderer timer would keep running after
 * unmount and would make the application's clock and the display disagree; the
 * application ticks with Effect `Clock` and passes `remainingMs` on each render.
 * Formatting lives in `countdown/logic.ts` so it is testable without a renderer.
 */

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

/** {@link Countdown} props. */
export interface CountdownProps extends Omit<Props, "children" | "style"> {
  /**
   * Whole milliseconds left. A negative time, or one the clock cannot read
   * (`NaN` from a deadline that never decoded, an infinity), renders `00:00`
   * and reports `expired`.
   */
  readonly remainingMs: number;
  /** The accessible name; the value is the text. */
  readonly label?: string;
  /** Render `Nd HH:MM:SS` for a day or more. Default `false`. */
  readonly showDays?: boolean;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** A style, or a function of the remaining time. */
  readonly style?: StateStyle<CountdownState>;
}

/** What the countdown draws: the duration it paints and whether it expired. */
export interface CountdownState {
  /** The remaining time the clock is drawn from, readable and never negative. */
  readonly remainingMs: number;
  readonly expired: boolean;
}

/** A remaining duration as clock text. */
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

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
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
