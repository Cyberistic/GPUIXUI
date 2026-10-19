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
import { formatCountdown } from "./countdown/logic.js";
import { textStyle, useTheme } from "./internal/theme.js";

/** {@link Countdown} props. */
export interface CountdownProps extends Omit<Props, "children" | "style"> {
  /** Whole milliseconds left; negative values render `00:00`. */
  readonly remainingMs: number;
  /** The accessible name; the value is the text. */
  readonly label?: string;
  /** Render `Nd HH:MM:SS` for a day or more. Default `false`. */
  readonly showDays?: boolean;
  /** A style, or a function of the remaining time. */
  readonly style?: StateStyle<CountdownState>;
}

/** What the countdown draws: the duration and whether it has expired. */
export interface CountdownState {
  readonly remainingMs: number;
  readonly expired: boolean;
}

/** A remaining duration as clock text. */
export const Countdown = ({
  remainingMs,
  label,
  showDays = false,
  style,
  ...rest
}: CountdownProps) => {
  const theme = useTheme();
  // A non-finite duration has no remaining time: paint the settled `00:00`
  // state the component promises for a negative value (plan 650).
  const remaining = Number.isFinite(remainingMs) ? remainingMs : 0;
  const expired = remaining <= 0;

  return (
    <text
      {...(label === undefined ? {} : { "aria-label": label })}
      {...rest}
      style={mergeStyles(
        {
          ...textStyle(theme, "caption"),
          color: expired
            ? theme.colors.mutedForeground
            : theme.colors.foreground,
        },
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
  focusable: false,
  limitations: [
    "display-only: the application ticks with Effect Clock and passes remainingMs; the component owns no timer",
    "fixed locale-free clock format; days are 24-hour units, not calendar days",
    "no role=timer in 0.10.0; the label names the text",
  ],
  docs: "docs/countdown.mdx",
  example: "examples/countdown.example.tsx",
  testFile: "src/behaviour/countdown.test.tsx",
} as const;
