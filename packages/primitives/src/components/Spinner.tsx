/**
 * `Spinner` — an activity indicator.
 *
 * **The runtime cannot rotate** (its `motion` has no rotation; see
 * `docs/gpuix-capabilities.md`), so there is no spinning arc. This is a row of
 * dots whose lit dot advances one place per step and whose trail fades — the
 * discrete-step alternative the capability map allows. A `Progress` bar with no
 * `value` is the other option.
 *
 * `reducedMotion` is the caller's answer to a preference the runtime does not
 * expose: the dots stay a status indicator but hold one frame and schedule no
 * interval.
 */

import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import * as Arr from "effect/Array";
import { useMotionPreference } from "@gpuixui/motion/react";
import { iconPixels } from "@gpuixui/icons";
import { cn } from "@gpuixui/tw";
import {
  SPINNER_DOTS,
  STEP_INTERVAL_MS,
  spinnerDots,
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
import { spinnerDotClass, spinnerGroupClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle, useStep } from "./internal.js";
import { useMessages } from "./MessagesProvider.js";
import { useTheme } from "./ThemeProvider.js";

export interface SpinnerProps {
  /**
   * Dot side: a step on the theme's icon scale, or raw pixels for a mark that
   * is not lining up with text. Defaults to the theme's `md` icon step.
   */
  readonly size?: keyof PrimitiveTheme["iconSize"] | number;
  /** Defaults to `primary`. */
  readonly accent?: SpinnerAccent;
  /** Accessible name. Defaults to the provider's `loading.busy` ("Loading"). */
  readonly label?: string;
  /**
   * Hold the lit dot and schedule no interval. Defaults to the motion
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
  }: SpinnerProps,
  theme: PrimitiveTheme,
  step: number,
  messages: PrimitiveMessages = defaultMessages,
): ReactElement => {
  // A named step and a raw count both go through the icon scale's own resolver:
  // a measurement that never arrived (or zero, or negative) must not reach
  // `width` as `NaN`, which the runtime paints as no dot at all.
  const dot = iconPixels(size ?? "md");
  const group = mergeStyle(
    recipeTw.classesToStyle(cn(spinnerGroupClass, className), theme).style,
    style,
  );
  const dotStyle = (opacity: number): StyleDesc =>
    mergeStyle(recipeTw.classesToStyle(spinnerDotClass(accent), theme).style, {
      width: dot,
      height: dot,
      opacity,
    });
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
      role={name === undefined ? "presentation" : "status"}
      aria-label={name}
      testId={testId}
      style={group}
    >
      {Arr.map(spinnerDots(stillFrame(step, reducedMotion)), (point, index) => (
        <div key={index} style={dotStyle(point.opacity)} />
      ))}
    </div>
  );
};

/** A three-dot activity indicator. */
export const Spinner = (props: SpinnerProps): ReactElement => {
  // The provider states the preference once; the prop is the per-control answer.
  const reducedMotion = reducedMotionOf(
    props.reducedMotion,
    useMotionPreference(),
  );
  return renderSpinner(
    { ...props, reducedMotion },
    useTheme(),
    // One step per dot on the house timing's step level: the timer's cycle is
    // the row's own length, so a full turn lights 0, 1, 2 and repeats — never
    // 0, 1, 2, 0, 1, 2, 0, 1, which stepped the lit dot backwards when the
    // eight-segment bar period wrapped.
    useStep(SPINNER_DOTS, STEP_INTERVAL_MS, !reducedMotion),
    useMessages(),
  );
};
