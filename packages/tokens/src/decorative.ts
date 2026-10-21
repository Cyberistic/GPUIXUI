/**
 * The perceptibility contract for the surfaces that carry no text: dividers,
 * skeleton fills, the modal veil, a status message's edge, the scrollbar thumb
 * and the washes a control tints its surface with while it is hovered, pressed,
 * selected or accented.
 *
 * WCAG's text and non-text floors do not cover them — they are decorative, and
 * the veil's job is to suppress what is behind it — so they have no floor at all
 * unless this file states one. They still have a minimum job: be seen. A divider
 * that matches the page is a card without an edge; a skeleton that matches the
 * row it stands in is an empty list that looks loaded; a veil that dims nothing
 * is a dialog with no layer behind it; an edge that matches its tint is a
 * message with no boundary; a hover that matches the row it tints is a menu with
 * no feedback. One floor covers all six, the same 1.05:1 the soft status
 * surfaces are held to.
 */

import { alphaOf, blend, type ThemeColors } from "./color.js";
import { contrastRatio } from "./contrast.js";
import { statusEdgeAlpha, statusTones } from "./styles.js";

/**
 * The perceptibility floor a decorative surface meets: 1.05:1 against what it
 * is painted on. It is the threshold the soft status surfaces already use — a
 * difference smaller than this reads as the same fill.
 */
export const decorativeFloor = 1.05;

/** The non-text surfaces a theme paints, and what each must be visible against. */
export interface DecorativeSurface {
  /**
   * What the surface is for, so a failure names the design decision rather than
   * two roles: `divider` rules a region, `skeleton` stands in for content that
   * has not loaded, `scrim` is the veil under a modal, `statusEdge` bounds a
   * status message's soft surface, `scrollbar` is the thumb a scroller paints,
   * `stateWash` is the tint behind a hovered, pressed, selected or accented row.
   */
  readonly surface:
    | "divider"
    | "skeleton"
    | "scrim"
    | "statusEdge"
    | "scrollbar"
    | "stateWash";
  /** The role painted. Its alpha, if it has one, is part of the measurement. */
  readonly role: keyof ThemeColors;
  /** The role it is painted over, and must be distinguishable from. */
  readonly over: keyof ThemeColors;
  /**
   * The share of `role` painted over `over`. Absent means the role's own alpha
   * byte, which is how a translucent role carries its share in the theme; a
   * derived surface — a status edge — states the share its component paints.
   */
  readonly alpha?: number;
}

/**
 * A status message's edge: the tone's solid role at the share `statusTone`
 * paints, on the tint it bounds or on the page the message sits on.
 */
const statusEdge = (
  tone: (typeof statusTones)[number],
  over: keyof ThemeColors,
): DecorativeSurface => ({
  surface: "statusEdge",
  role: tone,
  over,
  alpha: statusEdgeAlpha,
});

/**
 * A state wash: the tint a hovered, pressed, selected or accented row paints
 * behind its content. A role that carries the strip's own value is a state the
 * reader never sees — the base dark theme shipped `hover` equal to `popover`, so
 * hovering a menu row repainted the surface it already sat on, and the base
 * light theme's `hover` was its `muted` toolbar. The strips are the four
 * surfaces a component paints a row on; a filled action's own hover is a derived
 * fill (`filledHover`) and measured by the contrast table instead.
 */
const stateWashRoles = ["hover", "active", "selected", "accent"] as const;
const stateWashStrips = ["background", "card", "popover", "muted"] as const;

/**
 * The decorative surfaces the library paints. Each is measured where it is
 * actually used rather than against a single generic surface: a divider sits on
 * the page, inside a card, in a popover and in a muted toolbar strip; a
 * skeleton stands in for a row on a page, in a card and in a muted list; a soft
 * status surface's edge sits between its own tint and the page it is placed on.
 */
export const decorativeSurfaces: readonly DecorativeSurface[] = [
  { surface: "divider", role: "border", over: "background" },
  { surface: "divider", role: "border", over: "card" },
  { surface: "divider", role: "border", over: "popover" },
  { surface: "divider", role: "border", over: "muted" },
  { surface: "skeleton", role: "skeleton", over: "background" },
  { surface: "skeleton", role: "skeleton", over: "card" },
  { surface: "skeleton", role: "skeleton", over: "muted" },
  // A veil is measured over the surfaces a modal covers that carry content, not
  // over the page's void: a black page cannot be darkened by any scrim, and a
  // theme with one separates its dialog with a border instead.
  { surface: "scrim", role: "overlay", over: "card" },
  { surface: "scrim", role: "overlay", over: "popover" },
  // A scrollbar thumb is chrome: the platform paints and sizes it, and the role
  // only tints it. A thumb that matches the strip it moves along is a scroller a
  // reader cannot find, so it is measured wherever a scroller can sit.
  { surface: "scrollbar", role: "scrollbar", over: "background" },
  { surface: "scrollbar", role: "scrollbar", over: "card" },
  { surface: "scrollbar", role: "scrollbar", over: "popover" },
  { surface: "scrollbar", role: "scrollbar", over: "muted" },
  ...stateWashRoles.flatMap((role) =>
    stateWashStrips.map((over): DecorativeSurface => ({
      surface: "stateWash",
      role,
      over,
    })),
  ),
  // A status message's edge is a decorative boundary — its text and icon carry
  // the meaning — so it is held to the perceptibility floor, not the boundary
  // floor, and measured on the tint it bounds and on both page surfaces.
  ...statusTones.flatMap((tone) => [
    statusEdge(tone, `${tone}Soft`),
    statusEdge(tone, "background"),
    statusEdge(tone, "card"),
  ]),
] satisfies ReadonlyArray<DecorativeSurface>;

/** One decorative surface that does not meet its floor. */
export interface DecorativeFailure {
  /** Which kind of surface — the decision a theme failed. */
  readonly surface: DecorativeSurface["surface"];
  /** The role painted. */
  readonly role: keyof ThemeColors;
  /** The role it was painted over. */
  readonly over: keyof ThemeColors;
  /**
   * The measured ratio of the painted result, or `undefined` when it could not
   * be measured because the surface or the result is not opaque. An
   * unverifiable surface is reported rather than skipped.
   */
  readonly ratio: number | undefined;
  /** The floor it had to reach. */
  readonly floor: number;
}

/**
 * Every decorative surface in a theme that misses its floor.
 *
 * The surface is composited over the role it is painted on first, so a
 * translucent veil is measured by the result a reader sees rather than rejected
 * as translucent, and a derived surface states the share it paints. `blend`
 * clamps the amount, so a theme cannot pass by carrying an alpha byte the
 * runtime would ignore.
 *
 * @example
 * ```ts
 * import { decorativeFailures, type Theme } from "@gpuixui/tokens";
 *
 * decorativeFailures(brandTheme).length === 0; // every divider, skeleton and veil is visible
 * ```
 */
export function decorativeFailures(
  theme: { readonly colors: ThemeColors },
  floor: number = decorativeFloor,
): readonly DecorativeFailure[] {
  return decorativeSurfaces.flatMap(({ surface, role, over, alpha }) => {
    const painted = blend(
      theme.colors[over],
      theme.colors[role],
      alpha ?? alphaOf(theme.colors[role]),
    );
    const ratio = contrastRatio(painted, theme.colors[over]);
    return ratio !== undefined && ratio >= floor
      ? []
      : [{ surface, role, over, ratio, floor }];
  });
}
