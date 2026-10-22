/**
 * A link is text, not a fill.
 *
 * `primary` is designed as a **surface**: it carries `primaryForeground` and the
 * contrast table measures that pair. Written as text it is measured by nothing —
 * the only contracts that read the role are the mark contract (3:1, a bar or a
 * dot) and the fill pair (its own on-colour) — and it lands under the text floor
 * in most of the shipped styles: the base light theme's brand is 4.30:1 on the
 * wash a hovered link tints behind itself, macOS light 3.80:1, Linux light
 * 3.44:1, Luna light 3.53:1 and the Windows XP light page 4.31:1.
 *
 * A brand cannot carry a second palette just for links, so the colour is
 * derived: the theme's own `primary`, moved toward its `foreground` by the
 * smallest step that clears the floor on every surface a link can sit on. The
 * base theme returns its brand unchanged where it already reads, so the
 * derivation is only visible where the fill role genuinely cannot be read.
 */

import { blend } from "./color.js";
import {
  contrastFloorsFor,
  contrastRatio,
  type ContrastFloors,
} from "./contrast.js";
import type { Theme } from "./theme.js";

/**
 * The surfaces a piece of brand-coloured text can sit on: the four page
 * surfaces a reader reads on, plus the two washes a hovered or pressed link
 * tints behind itself.
 */
export const brandTextSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
] as const;

/**
 * The granularity of the derivation: 2% of the way from the brand to the
 * theme's foreground per step, so a link stays as close to the brand as the
 * floor allows instead of jumping to a contrast the brand never asked for.
 */
const TEXT_STEPS = 50;

/**
 * The ratio `colour` reaches on the surface it is least readable on, or
 * `undefined` when a value cannot be measured (translucent or not hex).
 */
const worstRatio = (theme: Theme, colour: string): number | undefined =>
  brandTextSurfaces.reduce<number | undefined>((worst, surface) => {
    const ratio = contrastRatio(colour, theme.colors[surface]);
    return worst === undefined || ratio === undefined
      ? undefined
      : Math.min(worst, ratio);
  }, Number.POSITIVE_INFINITY);

/**
 * The colour a link, a text action or any brand-coloured run paints.
 *
 * The theme's `primary` when it already clears the floor on every surface a
 * link can sit on, otherwise the smallest move toward the theme's `foreground`
 * (in 2% steps) that does. It never goes further than `foreground`, which is
 * the most readable text role the theme has, and a brand value the renderer
 * cannot measure is returned unchanged rather than replaced by a guess.
 *
 * The floor follows the theme's own contrast variant — 4.5:1 for a default
 * theme, 7:1 for a high-contrast one — through `contrastFloorsFor`, the same
 * rule the audit's contrast report uses.
 *
 * @example
 * ```tsx
 * <text style={{ ...textStyle(theme, "body"), color: brandText(theme) }}>Docs</text>
 * ```
 */
export function brandText(
  theme: Theme,
  floors: ContrastFloors = contrastFloorsFor(theme),
): string {
  const legible = (colour: string): boolean => {
    const ratio = worstRatio(theme, colour);
    return ratio === undefined || ratio >= floors.secondary;
  };
  const candidates = Array.from({ length: TEXT_STEPS + 1 }, (_, step) =>
    blend(theme.colors.primary, theme.colors.foreground, step / TEXT_STEPS),
  );
  return (
    candidates.find(legible) ??
    blend(theme.colors.primary, theme.colors.foreground, 1)
  );
}
