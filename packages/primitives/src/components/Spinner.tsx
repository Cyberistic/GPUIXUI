/**
 * `Spinner` — an activity indicator.
 *
 * **The runtime cannot rotate** (its `motion` has no rotation; see
 * `docs/gpuix-capabilities.md`), so there is no spinning arc. This is a row of
 * dots whose lit dot advances one place per step and whose trail fades — the
 * discrete-step alternative the capability map allows. A `Progress` bar with no
 * `value` is the other option.
 */

import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import * as Arr from "effect/Array";
import { cn } from "@gpuixui/tw";
import {
  SPINNER_SEGMENTS,
  spinnerDots,
  type SpinnerAccent,
} from "../core/loading.js";
import { accessibleName } from "../core/a11y.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { spinnerDotClass, spinnerGroupClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle, useStep } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface SpinnerProps {
  /** Dot side in pixels. Defaults to the theme's icon size for `md`. */
  readonly size?: number;
  /** Defaults to `primary`. */
  readonly accent?: SpinnerAccent;
  /** Accessible name. Defaults to "Loading". */
  readonly label?: string;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

export const renderSpinner = (
  {
    size,
    accent = "primary",
    label = "Loading",
    style,
    className,
    testId,
  }: SpinnerProps,
  theme: PrimitiveTheme,
  step: number,
): ReactElement => {
  const dot = size ?? theme.iconSize.md;
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
  return (
    <div
      role="status"
      aria-label={accessibleName(label)}
      testId={testId}
      style={group}
    >
      {Arr.map(spinnerDots(step, 3), (point, index) => (
        <div key={index} style={dotStyle(point.opacity)} />
      ))}
    </div>
  );
};

/** A three-dot activity indicator. */
export const Spinner = (props: SpinnerProps): ReactElement =>
  renderSpinner(props, useTheme(), useStep(SPINNER_SEGMENTS, 120));
