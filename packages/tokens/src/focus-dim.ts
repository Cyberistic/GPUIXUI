/**
 * The dim every other control paints while one has keyboard focus.
 *
 * `@gpuix/native` multiplies the opacity of each focusable element by 0.4 while
 * a different element holds keyboard focus (`keyboardFocusDim`, on by default);
 * an element that draws its own focus look opts out with
 * `keyboardFocusDim: false`. That is a paint mechanism every focused state in
 * the library triggers, and `contrastRatio` cannot see it — the result depends
 * on the surface behind the control, so no role pair measures it.
 *
 * The factor is the runtime's, not a theme's: `keyboardFocusDimOpacity` records
 * what `0.11.0` paints, measured from the `keyboard-focus-dim` window capture
 * (the dark theme's `muted` fill `#222730` paints `#181C23` over the page, and
 * its `foreground` text `#EEF1F5` paints `#6E7177` over that fill — both
 * `blend(colour, behind, 1 - 0.4)`, and the text over the *dimmed* fill rather
 * than over the page, which is the composite this module shares with the
 * disabled fade).
 */

import type { ThemeColors } from "./color.js";
import { contrastRatio } from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import { fadedPair, type FadeFailure, type FadePair } from "./fade.js";

/**
 * The share of itself a control keeps while another control has keyboard focus.
 *
 * It is a runtime constant rather than a theme group, for the same reason
 * `disabledOpacity` is: every element the runtime dims gets this one share, so
 * a brand that set its own would describe a paint the library does not have.
 */
export const keyboardFocusDimOpacity = 0.4;

/** One control the keyboard dim is measured on. */
export type KeyboardDimPair = FadePair;

/** The surfaces a control or a row can sit on. */
const strips = ["background", "card", "popover", "muted"] as const;

/**
 * The fills a field paints: a plain field's `input`, and the page role a
 * composite field (search, tag, mention, inline edit, chat composer, the colour
 * picker's hex field) paints as its own fill.
 */
const fieldFills = ["input", "background"] as const;

/** The two labels a field carries: its value and its hint. */
const fieldLabels = ["inputForeground", "placeholder"] as const;

/**
 * Every control the keyboard dim is measured on: the three filled actions, a
 * field (both of its fills, its value and its placeholder), a focusable row's
 * own text, and a selected row, on each strip a control sits on.
 *
 * A focusable row with no fill of its own — a menu row, a tab, a checkbox's
 * label — names the surface it sits on as its own fill: that composite is the
 * one the runtime paints, because the fill blends with itself and stays put
 * while the text fades over it. A composite field is not one of those: it has a
 * fill, it is just the page role, so it is listed by that fill.
 */
export const keyboardDimPairs: readonly KeyboardDimPair[] = strips.flatMap(
  (over) => [
    { fill: "primary", label: "primaryForeground", over },
    { fill: "secondary", label: "secondaryForeground", over },
    { fill: "destructive", label: "destructiveForeground", over },
    ...fieldFills.flatMap((fill) =>
      fieldLabels.map((label) => ({ fill, label, over })),
    ),
    { fill: over, label: "foreground", over },
    { fill: over, label: "mutedForeground", over },
    { fill: "selected", label: "selectedForeground", over },
  ],
);

/**
 * One dimmed control whose label is too close to the dimmed fill it sits on.
 *
 * The ratio is the composited label against the composited fill, or `undefined`
 * when a role is not an opaque hex colour and the result cannot be measured.
 */
export type KeyboardDimFailure = FadeFailure;

/**
 * Every dimmed control in a theme whose label is no longer distinguishable from
 * the fill behind it.
 *
 * The floor is `decorativeFloor` (1.05:1) and deliberately **not** a
 * readability floor: the dim is the runtime's "where can Tab go" cue, so the
 * claim is only that the label is still a label. A filled action's label lands
 * between 1.27:1 and 2.99:1 while dimmed, so a control whose text must stay
 * readable while the focus is elsewhere opts out of the dim
 * (`keyboardFocusDim: false`) rather than asking the palette for a contrast the
 * mechanism cannot keep. A pair that cannot be composited — a translucent or
 * non-hex role, or a role the theme does not carry — is reported with `ratio:
 * undefined` rather than skipped.
 *
 * @example
 * ```ts
 * import { keyboardDimFailures, lightTheme } from "@gpuixui/tokens";
 *
 * keyboardDimFailures(lightTheme); // [] — every dimmed label stays visible
 * ```
 */
export function keyboardDimFailures(
  theme: { readonly colors: Partial<ThemeColors> },
  floor: number = decorativeFloor,
): readonly KeyboardDimFailure[] {
  return keyboardDimPairs.flatMap((pair) => {
    const dimmed = fadedPair(theme.colors, pair, keyboardFocusDimOpacity);
    const ratio = contrastRatio(dimmed.label, dimmed.fill);
    return ratio !== undefined && ratio >= floor
      ? []
      : [{ ...pair, ratio, floor }];
  });
}
