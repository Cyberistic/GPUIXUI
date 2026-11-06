/** @jsxImportSource @gpuix/react */
import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import * as Arr from "effect/Array";
import { useMotionPreference } from "@gpuixui/motion/react/presence";
import { iconPixels } from "@gpuixui/icons";
import { cn } from "@gpuixui/tw";
import {
  SPINNER_RING_TICKS,
  STEP_INTERVAL_MS,
  spinnerTickStyle,
  spinnerTicks,
  type SpinnerAccent,
} from "../core/loading.js";
import { accessibleName } from "../core/a11y.js";
import {
  busyWord,
  defaultMessages,
  type PrimitiveMessages,
} from "../core/messages.js";
import { reducedMotionOf, stillFrame } from "../core/motion.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { spinnerGroupClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle, useStep, type ElementHostProps } from "./internal.js";
import { useMessages } from "./MessagesProvider.js";
import { useTheme } from "./ThemeProvider.js";

export interface SpinnerProps extends ElementHostProps {
  readonly size?: keyof PrimitiveTheme["iconSize"] | number;

  readonly accent?: SpinnerAccent;

  readonly label?: string;

  readonly reducedMotion?: boolean;
  readonly style?: StyleDesc;

  readonly className?: string;
  readonly testId?: string;
}

export const renderSpinner = (
  {
    size,
    accent = "primary",
    label,
    reducedMotion,
    style,
    className,
    testId,
    ref,
    "aria-id": controlId,
    onLayout,
  }: SpinnerProps,
  theme: PrimitiveTheme,
  step: number,
  messages: PrimitiveMessages = defaultMessages,
): ReactElement => {
  const side = iconPixels(size ?? "md");
  const ring = mergeStyle(
    recipeTw.classesToStyle(cn(spinnerGroupClass, className), theme).style,
    mergeStyle({ width: side, height: side }, style),
  );

  const name = accessibleName(label ?? busyWord(messages.loading));
  return (
    <div
      ref={ref}
      role={name === undefined ? "presentation" : "status"}
      aria-label={name}
      aria-id={controlId}
      onLayout={onLayout}
      testId={testId}
      style={ring}
    >
      {Arr.map(
        spinnerTicks(stillFrame(step, reducedMotion), side),
        (tick, index) => (
          <div
            key={index}
            style={spinnerTickStyle({ size: side, accent }, tick, theme)}
          />
        ),
      )}
    </div>
  );
};

export const Spinner = (props: SpinnerProps): ReactElement => {
  const reducedMotion = reducedMotionOf(
    props.reducedMotion,
    useMotionPreference(),
  );
  return renderSpinner(
    { ...props, reducedMotion },
    useTheme(),

    useStep(SPINNER_RING_TICKS, STEP_INTERVAL_MS, !reducedMotion),
    useMessages(),
  );
};
