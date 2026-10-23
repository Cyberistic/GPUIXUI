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
 *
 * A row is one of those surfaces. The primitives paint `Text tone="primary"`
 * in the derived colour (and a `Button variant="link"` in it), a `Box` can fill
 * `accent` or `selected` behind that run, and the components package's list row
 * tints `accent` under the pointer and fills `selected` once chosen while its
 * documented `trailing` slot holds an explicit action. Nothing measured brand
 * text there: the sixteen shipped styles mostly cleared the row through the
 * derivation already, but the Luna look's dark brand landed at **4.50:1** on the
 * row it selects — under the 4.5:1 floor — so it steps once now. The two washes
 * are in the set, so the class cannot recur in a brand.
 *
 * **A message's own tint is not one of those surfaces, and it cannot be.** An
 * `Alert`'s description is a container — its documentation says so — and the
 * fill behind it is the tone's `xSoft` role, so a link placed inside a message
 * sits on a tint. Measured, the shared link colour is under the text floor in
 * **29 of the 64** tint placements across the sixteen styles (the worst is macOS
 * dark's brand on `warningSoft` at **3.43:1**; the raw fill role there is
 * 2.32:1), and no single colour can fix that without dragging every link on the
 * page away from the brand: a tint is one tone lighter or darker than the page it
 * sits in. So the answer is the surface a run actually knows:
 * {@link brandTextOn} derives the colour against one surface, and a message's
 * action link names the tint it lives on. The message's own copy keeps the tone's
 * readable role (`statusTone(theme, tone).foreground`), which the contrast table
 * measures on that tint at the body floor.
 */

import {
  blend,
  themeColors,
  type ColourSource,
  type ThemeColors,
} from "./color.js";
import {
  contrastFloorsFor,
  contrastRatio,
  type ContrastFloors,
} from "./contrast.js";
import type { Theme, ThemeContrast } from "./theme.js";

/**
 * The surfaces a piece of brand-coloured text can sit on: the four page
 * surfaces a reader reads on, the two washes a hovered or pressed link tints
 * behind itself, and the two washes a **row** paints under an action in its
 * `trailing` slot — `accent` while the pointer is over the row, `selected` once
 * the row is chosen (`packages/components/src/list.tsx`). A list row documents
 * that slot as the place for an explicit action control, and an action's
 * `link` variant paints `brandText`, so the row's wash is a surface brand text
 * is read on rather than decoration.
 */
export const brandTextSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

/**
 * The granularity of the derivation: 2% of the way from the brand to the
 * theme's foreground per step, so a link stays as close to the brand as the
 * floor allows instead of jumping to a contrast the brand never asked for.
 */
const TEXT_STEPS = 50;

/** A source the derivation reads: roles that may be gone, and the variant's floors. */
type BrandSource = ColourSource & { readonly contrast?: ThemeContrast };

/**
 * The ratio `colour` reaches on the surface it is least readable on, or
 * `undefined` when a value cannot be measured (translucent or not hex).
 */
const worstRatio = (
  theme: ColourSource,
  colour: string,
): number | undefined => {
  const colors = themeColors(theme);
  return brandTextSurfaces.reduce<number | undefined>((worst, surface) => {
    const ratio = contrastRatio(colour, colors[surface]);
    return worst === undefined || ratio === undefined
      ? undefined
      : Math.min(worst, ratio);
  }, Number.POSITIVE_INFINITY);
};

/**
 * The brand, moved toward the theme's foreground until `legible` accepts it.
 *
 * The 2% grid is the derivation both readers share: a colour that already reads
 * is returned unchanged (`step` 0), and one that never does stops at
 * `foreground`, the most readable text role the theme has.
 */
const derivedBrandText = (
  theme: ColourSource,
  legible: (colour: string) => boolean,
): string | undefined => {
  const { primary, foreground } = themeColors(theme);
  return primary === undefined || foreground === undefined
    ? undefined
    : (Array.from({ length: TEXT_STEPS + 1 }, (_, step) =>
        blend(primary, foreground, step / TEXT_STEPS),
      ).find(legible) ?? blend(primary, foreground, 1));
};

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
 * A {@link Theme} carries the group, so the answer is a colour outright. A source
 * that may have lost it reads through {@link themeColors} and answers `undefined`
 * when `primary` or `foreground` is gone: there is no brand to move, and the
 * runtime paints nothing rather than a colour the theme never stated.
 *
 * @example
 * ```tsx
 * <text style={{ ...textStyle(theme, "body"), color: brandText(theme) }}>Docs</text>
 * ```
 */
export function brandText(theme: Theme, floors?: ContrastFloors): string;
export function brandText(
  theme: BrandSource,
  floors?: ContrastFloors,
): string | undefined;
export function brandText(
  theme: BrandSource,
  floors: ContrastFloors = contrastFloorsFor(theme),
): string | undefined {
  const legible = (colour: string): boolean => {
    const ratio = worstRatio(theme, colour);
    return ratio === undefined || ratio >= floors.secondary;
  };
  return derivedBrandText(theme, legible);
}

/**
 * The colour a brand-coloured run paints on one **known** surface.
 *
 * {@link brandText} answers for a run that may sit anywhere, so it is held to
 * the least readable of every surface a link can occupy. A run that knows where
 * it sits — a link inside an `Alert`'s description, on that message's own
 * `xSoft` tint — is held to the surface it actually paints on, so it keeps as
 * much of the brand as that surface allows. It matters because the tints are not
 * in {@link brandTextSurfaces}' set by design: a tint is one tone away from the
 * page, and the shared colour is under the text floor on 29 of the 64 tint
 * placements in the shipped styles.
 *
 * The floor and the derivation are the same as {@link brandText}'s: the theme's
 * own contrast variant (4.5:1 default, 7:1 high contrast), a 2% step toward
 * `foreground`, no step past it, and a brand or surface it cannot measure is
 * returned unchanged rather than replaced by a guess.
 *
 * A source that has lost the group answers `undefined`, the same absence rule
 * {@link brandText} follows.
 *
 * @example
 * ```tsx
 * import { brandTextOn, type Theme } from "@gpuixui/tokens";
 *
 * <text style={{ color: brandTextOn(theme, "infoSoft") }}>Learn more</text>
 * ```
 */
export function brandTextOn(
  theme: Theme,
  surface: keyof ThemeColors,
  floors?: ContrastFloors,
): string;
export function brandTextOn(
  theme: BrandSource,
  surface: keyof ThemeColors,
  floors?: ContrastFloors,
): string | undefined;
export function brandTextOn(
  theme: BrandSource,
  surface: keyof ThemeColors,
  floors: ContrastFloors = contrastFloorsFor(theme),
): string | undefined {
  const legible = (colour: string): boolean => {
    const ratio = contrastRatio(colour, themeColors(theme)[surface]);
    return ratio === undefined || ratio >= floors.secondary;
  };
  return derivedBrandText(theme, legible);
}
