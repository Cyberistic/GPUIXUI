/**
 * The composite two runtime mechanisms share: a control that says something by
 * fading itself.
 *
 * `disabledOpacity` (a control a consumer cannot use) and
 * `keyboardFocusDimOpacity` (every other focusable while one has keyboard
 * focus) are the same paint: the element keeps a share of itself and shows the
 * surface behind it. The label is faded over the *faded fill*, not over the
 * surface, because the runtime dims each element's own paint — measured, not
 * assumed: see `dim.test.ts`.
 */

import { blend, type ThemeColors } from "./color.js";

/** A control the fade is measured on: its fill, its label and its surface. */
export interface FadePair {
  /** The role the control is filled with. */
  readonly fill: keyof ThemeColors;
  /** The role its text is painted in. */
  readonly label: keyof ThemeColors;
  /** The surface the control sits on, which the fade lets through. */
  readonly over: keyof ThemeColors;
}

/** One faded control whose label is too close to the faded fill it sits on. */
export interface FadeFailure extends FadePair {
  /**
   * The composited label against the composited fill, or `undefined` when a
   * role is not an opaque hex colour and the result cannot be measured.
   */
  readonly ratio: number | undefined;
  /** The floor it had to reach. */
  readonly floor: number;
}

/**
 * The label and fill a reader sees on a control faded to `opacity`.
 *
 * The control shows that share of its fill over the surface, and the label is
 * faded the same way over the *faded* fill — that second composite is the one a
 * hand calculation usually forgets, and it is why the label falls so much
 * further than the fill.
 */
export const fadedPair = (
  colors: ThemeColors,
  { fill, label, over }: FadePair,
  opacity: number,
): { readonly label: string; readonly fill: string } => {
  const fadedFill = blend(colors[fill], colors[over], 1 - opacity);
  return {
    label: blend(colors[label], fadedFill, 1 - opacity),
    fill: fadedFill,
  };
};
