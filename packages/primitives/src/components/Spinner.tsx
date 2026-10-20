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
  SPINNER_DOTS,
  SPINNER_SEGMENTS,
  spinnerDotStyle,
  spinnerDots,
  spinnerRowStyle,
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
  /**
   * A resolved dot colour. Use the surrounding surface's foreground on a filled
   * control; `Button` passes its variant's. It overrides `accent` for every dot,
   * so the lit dot cannot disappear into the surface behind it (plan `754`).
   */
  readonly color?: string;
  /** Accessible name. Defaults to "Loading". */
  readonly label?: string;
  /**
   * Paint without an accessibility node.
   *
   * Use it where the surrounding control already announces the busy state — a
   * `Button` says "Loading" in its description — so the indicator is decoration
   * instead of a second `Status` node. The dots are unchanged.
   */
  readonly decorative?: boolean;
  readonly style?: StyleDesc;
  readonly testId?: string;
}

/** The element tree `Spinner` renders with its lit dot at the given index. */
export const renderSpinner = (
  {
    size,
    accent = "primary",
    color,
    label = "Loading",
    decorative,
    style,
    testId,
  }: SpinnerProps,
  theme: PrimitiveTheme,
  step: number,
): ReactElement => {
  const dot = size ?? theme.iconSize.md;
  const decoration = decorative === true;
  return (
    <div
      role={decoration ? "presentation" : "status"}
      aria-label={decoration ? undefined : ariaNameOr(label, "Loading")}
      testId={testId}
      style={mergeStyle(spinnerRowStyle(theme), style)}
    >
      {Arr.map(spinnerDots(step, SPINNER_DOTS), (point, index) => (
        <div
          key={index}
          style={spinnerDotStyle({ size: dot, accent, color }, point, theme)}
        />
      ))}
    </div>
  );
};

/** A three-dot activity indicator. */
export const Spinner = (props: SpinnerProps): ReactElement =>
  renderSpinner(props, useTheme(), useStep(SPINNER_SEGMENTS, 120));
