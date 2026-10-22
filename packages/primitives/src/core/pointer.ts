/**
 * The wash a control paints in a pointer state.
 *
 * A control's **hover** paints a wash on the strip it rests on — the page, a
 * card, a popover, a toolbar — and `@gpuixui/tokens` measures every wash role
 * against every strip (`decorativeSurfaces`' `stateWash`). A control's
 * **press** is a different measurement: it replaces the wash the control is
 * already wearing, so it has to be seen against *that* wash rather than
 * against the strip.
 *
 * The raw `active` role cannot always do that. Measured over the sixteen
 * shipped, high-contrast, platform and authored styles, Light · macOS's press
 * sat **1.037:1** from the `hover` wash it replaces — under the 1.05:1
 * perceptibility floor — so a ghost action, a toggle at rest, an empty
 * checkbox or a number field's stepper did not answer the pointer in that
 * style. Every other style already cleared it, so the derivation leaves a
 * palette that already answers the pointer painted as it is.
 *
 * The wash is therefore **derived**: the tokens' `pointerWash` takes the
 * smallest move toward the theme's `foreground` that clears the floor against
 * the wash being replaced, and never one that costs a label the floor it holds
 * on the role the wash plays.
 *
 * One rule, one seam: the button, the toggle, the selection controls and the
 * number field's stepper all read it here, and the recipe registry resolves
 * the same colour, so the two cannot drift.
 */

import { pointerWash, type ThemeColors, type ThemeContrast } from "@gpuixui/tokens";

/**
 * The fill a control paints while the pointer is down.
 *
 * The derived press wash — the smallest move that makes the press visible
 * against the hover wash it replaces — or the theme's own `active` role when
 * the derivation cannot be built. A theme restored from storage can predate
 * the role, and a control that cannot derive a press paints the role it has,
 * which is the absence rule every other contract follows.
 *
 * The source needs only the `active` role and whichever of `hover`,
 * `foreground` the stored theme still carries, so a partial record from storage
 * is a value this can be asked about rather than a cast.
 */
export const pressWash = (theme: {
  readonly colors: Partial<ThemeColors> & Pick<ThemeColors, "active">;
  readonly contrast?: ThemeContrast;
}): string => pointerWash(theme, "active", "hover") ?? theme.colors.active;
