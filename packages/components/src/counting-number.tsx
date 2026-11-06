/** @jsxImportSource @gpuix/react */
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
import { nameOf } from "./internal/text.js";
import { textStyle, useTheme, type TextRole } from "./internal/theme.js";

export interface CountingNumberState {
  readonly value: number;

  readonly counting: boolean;

  readonly reducedMotion: boolean;
}

export interface CountingNumberProps extends Omit<Props, "children" | "style"> {
  readonly value: number;

  readonly from?: number;

  readonly durationMs?: number;

  readonly decimals?: number;

  readonly format?: (value: number) => string;

  readonly label?: string;

  readonly role?: TextRole;

  readonly className?: string;

  readonly style?: StateStyle<CountingNumberState>;
}

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
      aria-label={nameOf(label) ?? countedText(value, { decimals, format })}
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
