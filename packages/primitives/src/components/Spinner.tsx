/**
 * `Spinner` — an activity indicator.
 *
 * **The runtime cannot rotate** (plan 020 §1.2: `motion` has no rotation), so
 * there is no spinning arc. This is a row of dots whose lit dot advances one
 * place per step and whose trail fades — the discrete-step alternative the
 * capability map allows. A `Progress` bar with no `value` is the other option.
 */

import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import * as Arr from "effect/Array";
import {
  SPINNER_SEGMENTS,
  spinnerDotStyle,
  spinnerDots,
  type SpinnerAccent,
} from "../core/loading.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { ariaNameOr, mergeStyle, useStep } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface SpinnerProps {
  /** Dot side in pixels. Defaults to the theme's icon size for `md`. */
  readonly size?: number;
  /** Defaults to `primary`. */
  readonly accent?: SpinnerAccent;
  /** Accessible name. Defaults to "Loading". */
  readonly label?: string;
  readonly style?: StyleDesc;
  readonly testId?: string;
}

/** The element tree `Spinner` renders with its lit dot at the given index. */
export const renderSpinner = (
  { size, accent = "primary", label = "Loading", style, testId }: SpinnerProps,
  theme: PrimitiveTheme,
  step: number,
): ReactElement => {
  const dot = size ?? theme.iconSize.md;
  return (
    <div
      role="status"
      aria-label={ariaNameOr(label, "Loading")}
      testId={testId}
      style={mergeStyle(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing["2xs"],
        },
        style,
      )}
    >
      {Arr.map(spinnerDots(step, 3), (point, index) => (
        <div
          key={index}
          style={spinnerDotStyle({ size: dot, accent }, point, theme)}
        />
      ))}
    </div>
  );
};

/** A three-dot activity indicator. */
export const Spinner = (props: SpinnerProps): ReactElement =>
  renderSpinner(props, useTheme(), useStep(SPINNER_SEGMENTS, 120));
