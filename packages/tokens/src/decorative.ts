/**
 * The perceptibility contract for the surfaces that carry no text: dividers,
 * skeleton fills, the modal veil, a status message's soft surface and its edge,
 * the scrollbar thumb, the wash a control tints its surface with while it is
 * hovered, pressed, selected or accented, the fill a tonal action rests on, the
 * face a control wears while it is unavailable, and the shadow a raised surface
 * drops.
 *
 * WCAG's text and non-text floors do not cover them — they are decorative, and
 * the veil's job is to suppress what is behind it — so they have no floor at all
 * unless this file states one. They still have a minimum job: be seen. A divider
 * that matches the page is a card without an edge; a skeleton that matches the
 * row it stands in is an empty list that looks loaded; a veil that dims nothing
 * is a dialog with no layer behind it; a tint that matches the strip it sits in
 * is a status message with no surface; an edge that matches its tint is a
 * message with no boundary; a hover that matches the row it tints is a menu with
 * no feedback; a tonal action painted in its toolbar's own colour is a label a
 * reader cannot tell is a button; a disabled control painted in the face of the
 * one it replaced looks available; a shadow that cannot darken the page it falls
 * on leaves every raised surface flat. One floor covers all ten, 1.05:1.
 */

import { alphaOf, blend, type ThemeColors } from "./color.js";
import { contrastRatio } from "./contrast.js";
import type { Elevation, ElevationLevel } from "./elevation.js";
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
   * has not loaded, `scrim` is the veil under a modal, `statusTint` is the soft
   * fill behind a status message, `statusEdge` bounds it, `scrollbar` is the
   * thumb a scroller paints, `stateWash` is the tint behind a hovered, pressed,
   * selected or accented row, `filledAction` is the resting fill of a tonal
   * action, `disabledFace` is the fill a control wears while it is unavailable,
   * `elevation` is the shadow a raised surface drops.
   */
  readonly surface:
    | "divider"
    | "skeleton"
    | "scrim"
    | "statusTint"
    | "statusEdge"
    | "scrollbar"
    | "stateWash"
    | "filledAction"
    | "disabledFace"
    | "elevation";
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
  /**
   * Read the painted colour from this elevation level instead of from `role`:
   * a level is a geometry plus a share of the `shadow` role, so its painted
   * colour is the level's own, not the role's untinted value.
   */
  readonly level?: ElevationLevel;
}

/**
 * A status message's edge: the tone's solid role at the share `statusTone`
 * paints, on the tint it bounds or on the strip the message sits on.
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
 * A status message's soft surface, on every strip a message is painted on. The
 * tint is what tells an alert or a soft badge apart from the surface behind it,
 * and the four strips are the ones a component paints a message on: a page, a
 * card, a popover and a muted toolbar (or sidebar) — the same four a state wash
 * is measured on. It was the one status part measured by nothing: `xSoft` only
 * ever appeared as the background a `statusEdge` was measured over, so a tint
 * equal to its strip read as every surface passing. Measured, the light base
 * theme shipped `successSoft` on `muted` at 1.006:1, Luna light's `infoSoft` was
 * its own page at 1.00:1, and eleven more looks or platforms were within 5% of
 * the surface they tinted.
 */
const statusTintStrips = ["background", "card", "popover", "muted"] as const;

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
 * The tonal action's resting fill, on every strip a filled control can sit on.
 *
 * `secondary` is the one filled action with no brand colour of its own, so its
 * fill is the only thing that separates it from the surface behind it: the
 * variant paints no border (`packages/primitives/src/core/variants.ts`), and its
 * own hover and press are derived from the fill rather than from a wash role.
 * The base light theme shipped it equal to `muted`, so a secondary button inside
 * a muted toolbar was a label with no button around it; macOS light was 1.015:1
 * from its own window, Linux light 1.040:1 and Windows light 1.021:1, while the
 * dark platform palettes fell under the floor on their lighter popovers.
 *
 * This is the perceptibility claim, not the 3:1 control-boundary claim: a
 * component that needs a hard edge paints `borderStrong`, which `contrastPairs`
 * measures. A `primary` or `destructive` fill is measured as a mark on the page
 * by `indicatorFailures`, because a brand fill is also the role a progress bar
 * or a slider's span paints.
 */
const filledActionRole = "secondary" as const;
const filledActionStrips = ["background", "card", "popover", "muted"] as const;

/**
 * The faces a control can wear while it is available.
 *
 * A disabled control replaces one of these rather than sitting on a strip, so
 * the comparison is face against face: an unavailable action that wears the same
 * fill as an enabled one tells the reader it is available. `secondary` is the
 * action it collides with most easily — both are neutral — `accent` is the
 * toggle's on-state and `input` is the fill of an available field, while
 * `primary` and `destructive` are the saturated faces a quiet neutral can never
 * reach in a palette that keeps them readable.
 *
 * The strip behind the control is deliberately **not** measured: the neutral
 * `disabled` fill is a quiet surface by design, and in four shipped styles it
 * carries a quiet strip's own value (the base light theme's `disabled` *is* its
 * `muted`, the base dark theme's is its `popover` and toolbar, both
 * high-contrast variants' is their `secondary`). A fill that matched an enabled
 * face is the state defect; a fill that matches a toolbar is a quiet control on
 * a quiet strip.
 */
const disabledFaceRole = "disabled" as const;
const enabledFaces = [
  "primary",
  "secondary",
  "destructive",
  "accent",
  "input",
] as const;

/**
 * The shadow a raised surface drops, on every strip it can float over.
 *
 * A level's strength lives in its own alpha byte, so the painted colour is the
 * level's and a placement names the level it measures. `lg` is the deepest step
 * the scale ships, and the claim is deliberately the weakest one a blurred
 * geometry supports: if even the strongest level cannot differ from the strip,
 * the whole scale is flat there, and a lighter step being subtler than `lg` is
 * the design rather than a defect. The measured result is a ceiling (a blurred
 * edge casts less than its full alpha), so this reports only a shadow that
 * cannot be seen at all — which is exactly the case that shipped: the
 * high-contrast dark theme's black tint on its pure-black page measured 1.00:1
 * at every level, so no raised surface in that variant had a shadow.
 */
const elevationRole = "shadow" as const;
const elevationLevel = "lg" as const;
const elevationStrips = ["background", "card", "popover", "muted"] as const;

/**
 * The decorative surfaces the library paints. Each is measured where it is
 * actually used rather than against a single generic surface: a divider sits on
 * the page, inside a card, in a popover and in a muted toolbar strip; a
 * skeleton stands in for a row on a page, in a card and in a muted list; a soft
 * status surface is the tint a message sits in and its edge bounds it, on every
 * strip a message is placed on; a tonal action sits on any of the four strips,
 * because a toolbar, a card and a popover all hold buttons; a raised surface
 * floats over the same four, and its shadow is what tells it apart from them;
 * and a disabled control's face is measured against each face it can replace.
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
  ...filledActionStrips.map(
    (over): DecorativeSurface => ({
      surface: "filledAction",
      role: filledActionRole,
      over,
    }),
  ),
  ...elevationStrips.map(
    (over): DecorativeSurface => ({
      surface: "elevation",
      role: elevationRole,
      over,
      level: elevationLevel,
    }),
  ),
  ...enabledFaces.map(
    (over): DecorativeSurface => ({
      surface: "disabledFace",
      role: disabledFaceRole,
      over,
    }),
  ),
  ...stateWashRoles.flatMap((role) =>
    stateWashStrips.map(
      (over): DecorativeSurface => ({
        surface: "stateWash",
        role,
        over,
      }),
    ),
  ),
  // A status message's edge is a decorative boundary — its text and icon carry
  // the meaning — so it is held to the perceptibility floor, not the boundary
  // floor, and measured on the tint it bounds and on every strip the tint is
  // measured on. The tint placements are the four surfaces a message sits on, so
  // the edge has to answer on all four: a warning alert in a confirmation
  // dialog's body sits on that dialog's `popover` fill, and a soft badge in a
  // muted sidebar sits on `muted`. The edge was measured on the two page
  // surfaces only, so a message on a floating surface had a measured tint and an
  // edge nothing checked.
  ...statusTones.flatMap((tone) => [
    ...statusTintStrips.map(
      (over): DecorativeSurface => ({
        surface: "statusTint",
        role: `${tone}Soft`,
        over,
      }),
    ),
    statusEdge(tone, `${tone}Soft`),
    ...statusTintStrips.map((over) => statusEdge(tone, over)),
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
 * runtime would ignore. A surface whose role, strip or elevation level the theme
 * does not carry is reported unmeasurable — `invalidColorRoles` names the
 * absence, and this report does not pretend a surface it could not composite is
 * visible.
 *
 * @example
 * ```ts
 * import { decorativeFailures, type Theme } from "@gpuixui/tokens";
 *
 * decorativeFailures(brandTheme).length === 0; // every divider, skeleton, veil and shadow is visible
 * ```
 */
export function decorativeFailures(
  theme: {
    readonly colors: Partial<ThemeColors>;
    readonly elevation?: Partial<Elevation>;
  },
  floor: number = decorativeFloor,
): readonly DecorativeFailure[] {
  return decorativeSurfaces.flatMap(({ surface, role, over, alpha, level }) => {
    const paintedOver = theme.colors[over];
    const paintedRole =
      level === undefined
        ? theme.colors[role]
        : theme.elevation?.[level]?.[0]?.color;
    const painted =
      paintedOver === undefined || paintedRole === undefined
        ? undefined
        : blend(paintedOver, paintedRole, alpha ?? alphaOf(paintedRole));
    const ratio = contrastRatio(painted, paintedOver);
    return ratio !== undefined && ratio >= floor
      ? []
      : [{ surface, role, over, ratio, floor }];
  });
}
