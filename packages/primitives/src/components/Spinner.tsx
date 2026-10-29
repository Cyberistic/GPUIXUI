/** @jsxImportSource @gpuix/react */
/**
 * `Spinner` — an activity indicator.
 *
 * **The runtime cannot rotate** (its `motion` has no rotation; see
 * `docs/gpuix-capabilities.md`), so there is no spinning arc. The mark is the
 * reference's own anatomy composed from static parts: a ring of ticks whose
 * lit arc steps around the circle, head first and tail fading. The geometry is
 * `spinnerTicks` — pure, relative to the size the caller asked for — so a ring
 * is the same shape at every step, and only its brightness moves.
 *
 * `reducedMotion` is the caller's answer to a preference the runtime does not
 * expose: the ring keeps its resting arc and schedules no interval.
 */

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
  /**
   * Ring side: a step on the theme's icon scale, or raw pixels for a mark that
   * is not lining up with text. Defaults to the theme's `md` icon step.
   */
  readonly size?: keyof PrimitiveTheme["iconSize"] | number;
  /** Defaults to `primary`. */
  readonly accent?: SpinnerAccent;
  /** Accessible name. Defaults to the provider's `loading.busy` ("Loading"). */
  readonly label?: string;
  /**
   * Hold the resting arc and schedule no interval. Defaults to the motion
   * provider's preference (`MotionProvider`); the runtime exposes none of its
   * own, so the application states it once.
   */
  readonly reducedMotion?: boolean;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
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
  // A named step and a raw count both go through the icon scale's own resolver:
  // a measurement that never arrived (or zero, or negative) must not reach
  // `width` as `NaN`, which the runtime paints as no ring at all.
  const side = iconPixels(size ?? "md");
  const ring = mergeStyle(
    recipeTw.classesToStyle(cn(spinnerGroupClass, className), theme).style,
    mergeStyle({ width: side, height: side }, style),
  );
  // The caller's own word wins; the provider's `loading.busy` is what a
  // localised tree otherwise has to spell out on every indicator, and a blank
  // row there is a missing translation rather than a silence, so the shipped
  // word stands (`busyWord`). A **blank prop** is the deliberate silence
  // `Button`'s blank `loadingLabel` composes, and silence is decoration: a
  // `status` node with no name is still a node an assistive technology walks
  // into, so it paints `presentation` instead (`Icon`'s blank-label rule).
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

/** A ring of ticks whose lit arc steps around the circle. */
export const Spinner = (props: SpinnerProps): ReactElement => {
  // The provider states the preference once; the prop is the per-control answer.
  const reducedMotion = reducedMotionOf(
    props.reducedMotion,
    useMotionPreference(),
  );
  return renderSpinner(
    { ...props, reducedMotion },
    useTheme(),
    // One tick per step: a full turn is the ring's own length, so the head
    // visits every tick exactly once and never jumps backwards at a cycle edge.
    useStep(SPINNER_RING_TICKS, STEP_INTERVAL_MS, !reducedMotion),
    useMessages(),
  );
};
