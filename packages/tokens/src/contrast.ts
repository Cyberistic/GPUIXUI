/**
 * The accessibility contract a theme is held to, as data plus one function.
 *
 * A brand that edits a role needs the same check the built-in themes pass, so
 * the floors and the pairs they apply to are exported rather than hidden in the
 * test suite.
 */

import type { ThemeColors } from "./color.js";

const opaqueHex = /^#[0-9A-Fa-f]{6}$/;

const channel = (color: string, at: number): number => {
  const srgb = Number.parseInt(color.slice(at, at + 2), 16) / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.1 relative luminance of an opaque `#RRGGBB` colour. */
const relativeLuminance = (color: string): number | undefined =>
  opaqueHex.test(color)
    ? 0.2126 * channel(color, 1) +
      0.7152 * channel(color, 3) +
      0.0722 * channel(color, 5)
    : undefined;

/**
 * The WCAG 2.1 contrast ratio between two opaque `#RRGGBB` colours: 1 for
 * identical colours, 21 for black on white.
 *
 * Returns `undefined` when either value is not an opaque hex colour. A
 * translucent colour's contrast depends on the surface painted behind it, so a
 * single ratio would be a guess; composite it first if it needs measuring.
 *
 * @example
 * ```ts
 * import { contrastFloors, contrastRatio, type Theme } from "@gpuixui/tokens";
 *
 * const ratio = contrastRatio(
 *   brand.colors.mutedForeground,
 *   brand.colors.muted,
 * );
 * const readable = ratio !== undefined && ratio >= contrastFloors.secondary;
 * ```
 */
export function contrastRatio(
  foreground: string,
  background: string,
): number | undefined {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  if (first === undefined || second === undefined) {
    return undefined;
  }
  const high = Math.max(first, second);
  const low = Math.min(first, second);
  return (high + 0.05) / (low + 0.05);
}

/** The contrast floors every shipped theme meets. */
export interface ContrastFloors {
  /** Body text. AAA. */
  readonly body: number;
  /** Secondary text, and text on a coloured fill. AA. */
  readonly secondary: number;
  /** Essential boundaries and focus rings. AA for non-text. */
  readonly boundary: number;
  /**
   * Inactive text and the control it labels. WCAG exempts a disabled component
   * from the text and non-text floors, so this is not a readability claim: it
   * says a disabled control is still *seen* as one, rather than as an empty box.
   */
  readonly disabled: number;
}

/** The floors of a default-contrast theme. */
export const contrastFloors: ContrastFloors = {
  body: 7,
  secondary: 4.5,
  boundary: 3,
  disabled: 1.5,
};

/**
 * The floors of a high-contrast theme: every text pair reaches AAA and every
 * boundary AA, so a high-contrast theme is a real accessibility mode rather
 * than a darker palette. Inactive text is held higher too, because a reader who
 * needs the mode still has to find the control that is unavailable.
 */
export const highContrastFloors: ContrastFloors = {
  body: 7,
  secondary: 7,
  boundary: 4.5,
  disabled: 3,
};

/** One role pair a theme is measured on, and the floor it must reach. */
export interface ContrastPair {
  /** The role carrying text, an icon or a boundary. */
  readonly foreground: keyof ThemeColors;
  /** The role painted behind it. */
  readonly background: keyof ThemeColors;
  /** Which floor applies to this pair. */
  readonly floor: keyof ContrastFloors;
}

/**
 * The role pairs the floors apply to. Every theme the library ships — both
 * modes, both contrast variants and every platform style — is measured on all
 * of them, so a palette edit that makes text unreadable fails a test rather
 * than shipping.
 */
export const contrastPairs: readonly ContrastPair[] = [
  { foreground: "foreground", background: "background", floor: "body" },
  { foreground: "foreground", background: "card", floor: "body" },
  { foreground: "cardForeground", background: "card", floor: "body" },
  { foreground: "popoverForeground", background: "popover", floor: "body" },
  { foreground: "inputForeground", background: "input", floor: "body" },
  {
    foreground: "mutedForeground",
    background: "background",
    floor: "secondary",
  },
  { foreground: "mutedForeground", background: "card", floor: "secondary" },
  { foreground: "mutedForeground", background: "muted", floor: "secondary" },
  {
    foreground: "mutedForeground",
    background: "popover",
    floor: "secondary",
  },
  {
    foreground: "secondaryForeground",
    background: "secondary",
    floor: "secondary",
  },
  {
    foreground: "primaryForeground",
    background: "primary",
    floor: "secondary",
  },
  {
    foreground: "destructiveForeground",
    background: "destructive",
    floor: "secondary",
  },
  {
    foreground: "successForeground",
    background: "success",
    floor: "secondary",
  },
  {
    foreground: "warningForeground",
    background: "warning",
    floor: "secondary",
  },
  { foreground: "infoForeground", background: "info", floor: "secondary" },
  { foreground: "infoSoftForeground", background: "infoSoft", floor: "body" },
  {
    foreground: "successSoftForeground",
    background: "successSoft",
    floor: "body",
  },
  {
    foreground: "warningSoftForeground",
    background: "warningSoft",
    floor: "body",
  },
  {
    foreground: "destructiveSoftForeground",
    background: "destructiveSoft",
    floor: "body",
  },
  // A status message written as text on the page rather than on its own tinted
  // surface: a field error or an inline warning. The same role carries it, so
  // the page it sits on is measured too.
  { foreground: "infoSoftForeground", background: "background", floor: "body" },
  { foreground: "infoSoftForeground", background: "card", floor: "body" },
  {
    foreground: "successSoftForeground",
    background: "background",
    floor: "body",
  },
  { foreground: "successSoftForeground", background: "card", floor: "body" },
  {
    foreground: "warningSoftForeground",
    background: "background",
    floor: "body",
  },
  { foreground: "warningSoftForeground", background: "card", floor: "body" },
  {
    foreground: "destructiveSoftForeground",
    background: "background",
    floor: "body",
  },
  {
    foreground: "destructiveSoftForeground",
    background: "card",
    floor: "body",
  },
  // A status message also sits on a floating surface: a destructive menu row
  // inside a popover, an inline warning on a command panel. The popover paints
  // the same role, so it is the third page a tone's text is measured on.
  { foreground: "infoSoftForeground", background: "popover", floor: "body" },
  {
    foreground: "successSoftForeground",
    background: "popover",
    floor: "body",
  },
  {
    foreground: "warningSoftForeground",
    background: "popover",
    floor: "body",
  },
  {
    foreground: "destructiveSoftForeground",
    background: "popover",
    floor: "body",
  },
  {
    foreground: "accentForeground",
    background: "accent",
    floor: "secondary",
  },
  {
    foreground: "selectedForeground",
    background: "selected",
    floor: "secondary",
  },
  // A state wash is painted under a control's existing text, which keeps its
  // resting role: hovering a ghost button or a menu row tints the surface and
  // leaves the label `foreground`, and secondary text keeps `mutedForeground`.
  // So the wash is a surface those roles are measured on.
  { foreground: "foreground", background: "hover", floor: "body" },
  { foreground: "foreground", background: "active", floor: "body" },
  { foreground: "foreground", background: "accent", floor: "body" },
  { foreground: "mutedForeground", background: "hover", floor: "secondary" },
  { foreground: "mutedForeground", background: "active", floor: "secondary" },
  { foreground: "mutedForeground", background: "accent", floor: "secondary" },
  { foreground: "placeholder", background: "input", floor: "secondary" },
  { foreground: "borderStrong", background: "background", floor: "boundary" },
  { foreground: "borderStrong", background: "card", floor: "boundary" },
  { foreground: "borderStrong", background: "input", floor: "boundary" },
  { foreground: "ring", background: "background", floor: "boundary" },
  { foreground: "ring", background: "card", floor: "boundary" },
  { foreground: "ring", background: "popover", floor: "boundary" },
  // A focused control inside a tinted strip — a toolbar on `muted`, a
  // segmented group on `secondary` — draws its ring on that strip, not on the
  // page beneath it.
  { foreground: "ring", background: "muted", floor: "boundary" },
  { foreground: "ring", background: "secondary", floor: "boundary" },
  // A control boundary sits on the same strips: an outline button in a toolbar
  // draws its edge on `muted`, and a bordered control in a filled panel draws it
  // on `secondary`. The edge must stay findable there for the same reason.
  { foreground: "borderStrong", background: "muted", floor: "boundary" },
  { foreground: "borderStrong", background: "secondary", floor: "boundary" },
  // A bordered control tints its own surface while it is hovered or pressed and
  // keeps its edge — the secondary action paints `borderStrong` and hands the
  // same element to the `hover` and `active` washes — so those washes are strips
  // the edge must stay findable on, not just the resting surface.
  { foreground: "borderStrong", background: "hover", floor: "boundary" },
  { foreground: "borderStrong", background: "active", floor: "boundary" },
  // A failed validation swaps a control's edge — and the focus line it paints
  // while invalid — to the `destructive` role, so that role is a boundary on
  // every strip a control sits on. The page, card, popover and `muted` strips
  // are already held to the same floor as an indicator mark; a field's own fill
  // and a filled panel are the two strips no contract measured.
  { foreground: "destructive", background: "input", floor: "boundary" },
  { foreground: "destructive", background: "secondary", floor: "boundary" },
  // A disabled control is exempt from WCAG's text floors, not from being found:
  // a field whose unavailable value matches its fill reads as an empty box.
  {
    foreground: "disabledForeground",
    background: "disabled",
    floor: "disabled",
  },
  // A disabled label also sits on the page beside enabled text — a fieldset
  // legend, a field's value the component leaves unfilled, an unavailable item
  // in a popover.
  {
    foreground: "disabledForeground",
    background: "background",
    floor: "disabled",
  },
  { foreground: "disabledForeground", background: "card", floor: "disabled" },
  {
    foreground: "disabledForeground",
    background: "popover",
    floor: "disabled",
  },
  // A disabled control also sits inside a group strip: a toolbar's `muted`
  // surface, a segmented `secondary` panel. The disabled fill can be the strip's
  // own value (base light `disabled` *is* `muted`), so the label's only
  // background is the toolbar or the panel around it.
  { foreground: "disabledForeground", background: "muted", floor: "disabled" },
  {
    foreground: "disabledForeground",
    background: "secondary",
    floor: "disabled",
  },
  // A selected row keeps the secondary text role its siblings use, so the
  // selection tint is a surface that text sits on.
  {
    foreground: "mutedForeground",
    background: "selected",
    floor: "secondary",
  },
];

/** One role pair that does not meet its floor. */
export interface ContrastFailure {
  /** The role carrying text, an icon or a boundary. */
  readonly foreground: keyof ThemeColors;
  /** The role painted behind it. */
  readonly background: keyof ThemeColors;
  /**
   * The measured ratio, or `undefined` when the pair could not be measured
   * because a value is translucent or not hex. An unmeasurable pair is reported
   * rather than skipped: a pair nobody can verify is not a pass.
   */
  readonly ratio: number | undefined;
  /** The floor it had to reach. */
  readonly floor: number;
}

/**
 * Every role pair in a theme's colours that misses its floor.
 *
 * An empty array means the theme meets the contract. Runs the same pairs the
 * built-in themes are tested against, so a brand theme is held to the floors
 * the library publishes rather than to a second set.
 *
 * @example
 * ```ts
 * import { contrastFailures, type Theme } from "@gpuixui/tokens";
 *
 * const failures = contrastFailures(brandTheme);
 * failures.length === 0; // the theme is readable
 * ```
 */
export function contrastFailures(
  theme: { readonly colors: ThemeColors },
  floors: ContrastFloors = contrastFloors,
): readonly ContrastFailure[] {
  return contrastPairs.flatMap(({ foreground, background, floor }) => {
    const ratio = contrastRatio(
      theme.colors[foreground],
      theme.colors[background],
    );
    return ratio !== undefined && ratio >= floors[floor]
      ? []
      : [{ foreground, background, ratio, floor: floors[floor] }];
  });
}
