/**
 * The field ink contract: what a native editor actually paints.
 *
 * `nativeTextTheme` (`@gpuixui/primitives`) is the one place the design system
 * reaches a native `<input>`/`<textarea>`, and it claims to keep the field's
 * "placeholder, caret and selection in the same palette". Nothing in either
 * registry reads a field's pixels, so a runtime that ignored the theme passed
 * every check. The pinned runtime reads **only** `caret`:
 *
 * - text ink        = the element's `style.color` (the shipped field's
 *                     `inputForeground`), never `theme.text`;
 * - placeholder ink = the fixed grey `#8F8F8F` (`input.rs` `layout_text`),
 *                     never `theme.textFaint`;
 * - selection wash  = the fixed `#7C86FF59` (the editor's prepaint), never
 *                     `theme.accent` and never our `selection` token;
 * - caret           = `theme.caret` — the one themed ink, painted only in an
 *                     **active** window and on the visible half of a 500 ms
 *                     blink (`caret_shown`).
 *
 * This module owns the fixture roles, the two runtime constants, the wash
 * arithmetic and the guards that keep the cross checks falsifiable. The frame is
 * the other witness.
 */
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import type { ThemeColors } from "@gpuixui/tokens";

/** The runtime's hard-coded placeholder ink (`input.rs`, release tag `9fcd6288`). */
export const RUNTIME_PLACEHOLDER = "#8f8f8f";

/** The runtime's hard-coded selection wash (`input.rs`, release tag `9fcd6288`). */
export const RUNTIME_SELECTION = "#7c86ff59";

/** Interior pixels that must carry an ink before it is evidence. */
export const FIELD_INK_MINIMUM = 400;

/** The three observed field inks and the surface they composite over. */
export interface FieldFixtures {
  readonly text: string;
  readonly placeholder: string;
  readonly selection: string;
  readonly input: string;
}

/** The fixture roles, read from the theme. */
export const fieldFixtures = (colors: ThemeColors): FieldFixtures => ({
  text: colors.inputForeground,
  placeholder: colors.placeholder,
  selection: colors.selection,
  input: colors.input,
});

/** `hex` at its own alpha over `under`, or `None` when either will not parse. */
export const washOver = (
  hex: string,
  under: string,
): Option.Option<Pixels.Rgba> =>
  Option.flatMap(Pixels.hexToRgba(hex), (over) =>
    Option.map(Pixels.hexToRgba(under), (base) =>
      Pixels.blendOver(over, over.a / 255, base),
    ),
  );

/**
 * Two washes (or inks) can be told apart at `tolerance`.
 *
 * A guard, not a frame check: if a palette edit made the token's wash equal to
 * the runtime's, the "token absent" check would pass without saying anything.
 */
export const tokensSeparate = (
  left: string,
  right: string,
  tolerance: number,
): boolean =>
  Option.match(Option.all([Pixels.hexToRgba(left), Pixels.hexToRgba(right)]), {
    onNone: () => false,
    onSome: ([first, second]) => !Pixels.rgbaNear(first, second, tolerance),
  });

/** Every fixture id, so the view and the checks cannot drift. */
export const FIELD_IDS = {
  stage: "field-ink-stage",
  text: "field-text",
  placeholder: "field-placeholder",
  selected: "field-selected",
} as const;
