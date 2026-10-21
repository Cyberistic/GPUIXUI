/**
 * The other way a control can say "unavailable": fading itself.
 *
 * Two mechanisms ship in this workspace. A disabled field, a select's value and
 * a fieldset legend paint the role pair (`disabled` behind
 * `disabledForeground`), which `contrastPairs` measures. The recipes and the
 * primitive cores instead fade the whole control — `disabled:opacity-50` in
 * `@gpuixui/tw`, `opacity = 0.5` in the primitives' core styles and in a menu
 * row — and a translucent control is invisible to `contrastRatio`: its result
 * depends on the surface behind it, so no role pair can measure it.
 *
 * This module measures the fade by compositing it, so both mechanisms are held
 * to a floor instead of only the one that happens to use roles. The floor is the
 * default `contrastFloors.disabled` for every variant, deliberately: the fade
 * cannot express more (a high-contrast filled action still lands near 2:1), and
 * a contract that demanded more would be measuring a mechanism the library does
 * not have. That gap is the argument for the role pair, not a second floor.
 */

import { blend, type ThemeColors } from "./color.js";
import { contrastFloors, contrastRatio } from "./contrast.js";

/**
 * The share of itself a control keeps while disabled.
 *
 * It is a design constant rather than a theme group, for the same reason the
 * pressable-target floors are: every shipped recipe paints this one value, and a
 * brand that lowered it would make the library's own disabled state disappear.
 */
export const disabledOpacity = 0.5;

/** One control the fade is measured on: its fill, its label and its surface. */
export interface DisabledFadePair {
  /** The role the control is filled with while it is enabled. */
  readonly fill: keyof ThemeColors;
  /** The role its text is painted in while it is enabled. */
  readonly label: keyof ThemeColors;
  /** The surface the control sits on, which the fade lets through. */
  readonly over: keyof ThemeColors;
}

/**
 * The controls that fade rather than swap roles: the three filled actions and a
 * field, whose fill only replaces `input` on the content surfaces a field can
 * sit on.
 */
export const disabledFadePairs: readonly DisabledFadePair[] = [
  { fill: "primary", label: "primaryForeground", over: "background" },
  { fill: "destructive", label: "destructiveForeground", over: "background" },
  { fill: "secondary", label: "secondaryForeground", over: "background" },
  { fill: "input", label: "inputForeground", over: "background" },
  { fill: "input", label: "inputForeground", over: "card" },
  { fill: "input", label: "inputForeground", over: "popover" },
];

/** One faded control whose label is too close to the faded fill it sits on. */
export interface DisabledFadeFailure {
  /** The fill role, before the fade. */
  readonly fill: keyof ThemeColors;
  /** The label role, before the fade. */
  readonly label: keyof ThemeColors;
  /** The surface the control sits on. */
  readonly over: keyof ThemeColors;
  /**
   * The composited label against the composited fill, or `undefined` when a
   * role is not an opaque hex colour and the result cannot be measured.
   */
  readonly ratio: number | undefined;
  /** The floor it had to reach. */
  readonly floor: number;
}

/**
 * The composited label a reader sees on a disabled control.
 *
 * A control at `disabledOpacity` shows that share of its fill over the surface,
 * and its label is faded the same way over the faded fill — that second
 * composite is the one a hand calculation usually forgets, and it is why the
 * label falls so much further than the fill.
 */
const fadedLabelOnFill = (
  colors: ThemeColors,
  { fill, label, over }: DisabledFadePair,
): { readonly label: string; readonly fill: string } => {
  const behind = colors[over];
  const fadedFill = blend(colors[fill], behind, 1 - disabledOpacity);
  return {
    label: blend(colors[label], fadedFill, 1 - disabledOpacity),
    fill: fadedFill,
  };
};

/**
 * Every faded control in a theme whose label misses the disabled floor.
 *
 * An empty array means the fade keeps the state readable. A pair that cannot be
 * composited — a translucent or non-hex role — is reported with `ratio:
 * undefined` rather than skipped, as every other report does.
 *
 * @example
 * ```ts
 * import { disabledFadeFailures, lightTheme } from "@gpuixui/tokens";
 *
 * disabledFadeFailures(lightTheme); // [] — every faded label clears 1.5:1
 * ```
 */
export function disabledFadeFailures(
  theme: { readonly colors: ThemeColors },
  floor: number = contrastFloors.disabled,
): readonly DisabledFadeFailure[] {
  return disabledFadePairs.flatMap((pair) => {
    const faded = fadedLabelOnFill(theme.colors, pair);
    const ratio = contrastRatio(faded.label, faded.fill);
    return ratio !== undefined && ratio >= floor
      ? []
      : [{ ...pair, ratio, floor }];
  });
}
