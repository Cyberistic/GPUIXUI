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
 *
 * A fade is also a property of the strip behind it, not of the control: measured
 * on the shipped palettes, a faded filled action keeps the floor on the page and
 * lands at 1.47:1–1.49:1 on a card in four of the light styles (Linux, macOS,
 * Windows XP Luna, Windows 7 Aero). So the fade is a **page** mechanism for a
 * filled action, and {@link disabledAction} is the paint a disabled action wears
 * anywhere else.
 */

import { type ThemeColors } from "./color.js";
import { contrastFloors, contrastRatio } from "./contrast.js";
import { fadedPair, type FadeFailure, type FadePair } from "./fade.js";

/**
 * The share of itself a control keeps while disabled.
 *
 * It is a design constant rather than a theme group, for the same reason the
 * pressable-target floors are: every shipped recipe paints this one value, and a
 * brand that lowered it would make the library's own disabled state disappear.
 */
export const disabledOpacity = 0.5;

/** One control the fade is measured on: its fill, its label and its surface. */
export type DisabledFadePair = FadePair;

/**
 * The controls that fade rather than swap roles: the three filled actions and a
 * field, whose fill only replaces `input` on the content surfaces a field can
 * sit on.
 *
 * The filled actions are measured on the page only, because that is the strip
 * the fade keeps the floor on — see {@link disabledAction} for the paint a
 * disabled action wears on a card, a popover or a group strip.
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
export type DisabledFadeFailure = FadeFailure;

/**
 * Every faded control in a theme whose label misses the disabled floor.
 *
 * An empty array means the fade keeps the state readable. A pair that cannot be
 * composited — a translucent or non-hex role, or a role the theme does not carry
 * — is reported with `ratio: undefined` rather than skipped, as every other
 * report does.
 *
 * @example
 * ```ts
 * import { disabledFadeFailures, lightTheme } from "@gpuixui/tokens";
 *
 * disabledFadeFailures(lightTheme); // [] — every faded label clears 1.5:1
 * ```
 */
export function disabledFadeFailures(
  theme: { readonly colors: Partial<ThemeColors> },
  floor: number = contrastFloors.disabled,
): readonly DisabledFadeFailure[] {
  return disabledFadePairs.flatMap((pair) => {
    const faded = fadedPair(theme.colors, pair, disabledOpacity);
    const ratio = contrastRatio(faded.label, faded.fill);
    return ratio !== undefined && ratio >= floor
      ? []
      : [{ ...pair, ratio, floor }];
  });
}

/** The paint a disabled action wears off the page. */
export interface DisabledActionStyle {
  /**
   * The fill: the theme's neutral `disabled` role, not the action's own — and
   * not the face of an enabled control, which the decorative contract measures.
   */
  readonly backgroundColor: string;
  /** The label: `disabledForeground`, measured against that fill. */
  readonly color: string;
}

/**
 * The paint a disabled filled action wears where the fade is not the contract.
 *
 * A fade composites the fill with whatever is behind it, so the same action is a
 * different colour on the page and on a card — and on a card it is under the
 * floor. This is the alternative the design system calls the contract: the
 * neutral pair `contrastPairs` already measures on every surface a control sits
 * on. A control that can appear on a card or a popover paints this and removes
 * its fade; one that only ever sits on the page may keep fading.
 *
 * The fill replaces the control's own face rather than sitting on a strip, so it
 * must also stay distinguishable from every face an enabled control wears
 * (`decorative.ts` §disabledFace). Both high-contrast themes shipped it equal to
 * `secondary`; it is the quiet step now.
 *
 * @example
 * ```tsx
 * <div style={disabled ? disabledAction(theme) : undefined} />
 * ```
 */
export const disabledAction = (theme: {
  readonly colors: ThemeColors;
}): DisabledActionStyle => ({
  backgroundColor: theme.colors.disabled,
  color: theme.colors.disabledForeground,
});
