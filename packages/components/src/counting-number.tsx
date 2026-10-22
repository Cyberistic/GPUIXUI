/**
 * CountingNumber: a number that counts to its value instead of jumping.
 *
 * The runtime can tween a numeric style value, but the digits of a text node are
 * not a style: nothing in `@gpuix/native@0.11.0` can interpolate the string
 * "1,284". So the physics does the interpolation here and the component paints
 * the sampled number each frame — `@gpuixui/motion`'s tween owns the curve, the
 * component owns the string. The hook's clock is real time, so a renderer whose
 * motion clock is paused does not freeze the count.
 *
 * The value is not a mount decoration: `from` names the first run's start, and
 * without it the number paints at rest. A later `value` retargets from the
 * number on screen, so a metric that updates mid-tween continues from where the
 * reader saw it rather than restarting.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { motionLevels } from "@gpuixui/motion/timing";
import { useTransition } from "@gpuixui/motion/react";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { countDuration, countedText } from "./counting-number/logic.js";
import { useMotionPreference } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { textStyle, useTheme, type TextRole } from "./internal/theme.js";

/** What a counting number draws at one frame. */
export interface CountingNumberState {
  /** The number currently painted, before formatting. */
  readonly value: number;
  /** Whether the painted number has reached `value` yet. */
  readonly counting: boolean;
  /** Whether the reader asked for less motion, which paints the target. */
  readonly reducedMotion: boolean;
}

/** {@link CountingNumber} props. */
export interface CountingNumberProps extends Omit<Props, "children" | "style"> {
  /** The number to count to. */
  readonly value: number;
  /**
   * The number the first run starts from. Default: `value`, so a number mounted
   * at its target does not animate. Pass `0` for a count-up on mount.
   */
  readonly from?: number;
  /** Milliseconds for one run. Default `320` (the `slow` motion level). */
  readonly durationMs?: number;
  /** Digits after the point in the default text. Default `0`. */
  readonly decimals?: number;
  /** Replace the default text whole, e.g. a currency formatter. */
  readonly format?: (value: number) => string;
  /**
   * The accessible name. Default: the **target**, so assistive technology hears
   * the settled number rather than every frame of the count.
   */
  readonly label?: string;
  /** A typographic role from the theme. Default `"body"`. */
  readonly role?: TextRole;
  /** A Tailwind class string, joined after the resting style so it wins. */
  readonly className?: string;
  /** A style, or a function of the sampled number. */
  readonly style?: StateStyle<CountingNumberState>;
}

/**
 * A number that counts to its value.
 *
 * Under `MotionProvider preference="reduced"` the target paints on the first
 * frame; the accessible name is the target either way.
 */
export const CountingNumber = ({
  value,
  from,
  durationMs,
  decimals,
  format,
  label,
  role = "body",
  className,
  style,
  ...rest
}: CountingNumberProps) => {
  const theme = useTheme();
  const reducedMotion = useMotionPreference() === "reduced";
  const duration = countDuration(
    Option.fromNullishOr(durationMs),
    motionLevels.slow,
  );
  const sampled = useTransition(
    value,
    { durationMs: duration },
    { initial: from ?? value, reducedMotion },
  );
  const painted = reducedMotion ? value : sampled.value;
  const text = countedText(painted, { decimals, format });
  const state: CountingNumberState = {
    value: painted,
    counting: painted !== value,
    reducedMotion,
  };

  return (
    <text
      {...rest}
      aria-label={label ?? countedText(value, { decimals, format })}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(className), theme), {
          ...textStyle(theme, role),
          color: theme.colors.foreground,
        }),
        resolveStyle(style, state),
      )}
    >
      {text}
    </text>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const countingNumberMeta = {
  name: "Counting number",
  tier: 5,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the count runs on a real-time clock, not the renderer's motion clock",
    "the digits are re-rendered text, not a rolling reel: the runtime has no transform",
    "one tween per value change; no spring, stagger or per-digit motion",
  ],
  docs: "docs/counting-number.mdx",
  example: "examples/counting-number.example.tsx",
  testFile: "src/behaviour/counting-number.test.tsx",
} as const;
