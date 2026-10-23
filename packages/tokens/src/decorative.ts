/**
 * The perceptibility contract for the surfaces that carry no text: dividers,
 * skeleton fills, the modal veil, a status message's soft surface and its edge,
 * the scrollbar thumb, the wash a control tints its surface with while it is
 * hovered, pressed, selected or accented — the wash a row is repainted with when
 * the pointer arrives or the press lands — the fill a tonal action rests on, the
 * rail a bar draws its value inside, the face a control wears while it is
 * unavailable, the derived hover and press a filled role paints, and the shadow a
 * raised surface drops.
 *
 * WCAG's text and non-text floors do not cover them — they are decorative, and
 * the veil's job is to suppress what is behind it — so they have no floor at all
 * unless this file states one. They still have a minimum job: be seen. A divider
 * that matches the page is a card without an edge; a skeleton that matches the
 * row it stands in is an empty list that looks loaded, and one that matches the
 * dialog it stands in is a loading dialog with nothing in it; a veil that dims
 * nothing is a dialog with no layer behind it; a tint that matches the strip it
 * sits in is a status message with no surface; an edge that matches its tint is
 * a message with no boundary; a hover that matches the row it tints is a menu
 * with no feedback, and a chosen row the pointer repaints in the fill it already
 * wears is a selection that cannot answer a click; a tonal action painted in its
 * toolbar's own colour is a
 * label a reader cannot tell is a button; a rail that matches the fill a bar sits
 * on is a bar with no total; a disabled control painted in the face
 * of the one it replaced looks available; a filled action's derived step that
 * lands on the fill it replaces is an action that does not answer the pointer; a
 * row's derived press that lands on the wash it replaces is a row that does not
 * answer the pointer either; a
 * shadow that cannot darken the page it falls on leaves every raised surface
 * flat. One floor covers all thirteen, 1.05:1.
 */

import { alphaOf, blend, type ThemeColors } from "./color.js";
import {
  contrastFloorsFor,
  contrastPairs,
  contrastRatio,
  type ContrastPair,
} from "./contrast.js";
import type { Elevation, ElevationLevel } from "./elevation.js";
import {
  filledFeedback,
  filledFeedbackStates,
  filledRoles,
  statusEdgeAlpha,
  statusTones,
  type FilledFeedbackState,
  type FilledRole,
} from "./styles.js";
import type { ThemeContrast } from "./theme.js";

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
   * action, `track` is the rail a progress bar, meter or slider draws its value
   * inside, `disabledFace` is the fill a control wears while it is unavailable,
   * `actionFeedback` is the derived hover or press a filled role paints (its
   * placements are {@link actionFeedbackPlacements}, because the paint is
   * derived rather than a role), `pointerWash` is the derived wash a row paints
   * over the wash it already wears (see {@link pointerWashTransitions}), and
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
    | "track"
    | "disabledFace"
    | "actionFeedback"
    | "pointerWash"
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
 * The row washes a soft badge's edge is measured on: the strips the one status
 * surface that sits **inside** a row crosses.
 *
 * A tone badge is the only message painted in a row rather than on a page — the
 * List example's status column puts one in a row's `trailing` slot — and its
 * recipe carries the tone's own 30% edge (`border border-success/30` and its
 * siblings in `packages/tw/src/recipes.ts`) while the row tints `accent` under
 * the pointer, `active` while pressed and fills `selected` once chosen
 * (`packages/components/src/list.tsx`). The edge is what keeps the pill a pill
 * there: the tint is a pale surface by design and a row's wash is a pale surface
 * too, so on a wash it is the boundary that carries the badge, not the fill. The
 * four strips are the same washes `stateWash` measures the row itself on.
 */
const statusWashStrips = ["hover", "active", "selected", "accent"] as const;

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
 * The tonal action's resting fill, on every content strip a filled control can
 * sit on.
 *
 * `secondary` is the one filled action with no brand colour of its own, so its
 * fill is what separates it from the surface behind it, and its own hover and
 * press are derived from the fill rather than from a wash role. The base light
 * theme shipped it equal to `muted`, so a secondary button inside a muted
 * toolbar was a label with no button around it; macOS light was 1.015:1 from its
 * own window, Linux light 1.040:1 and Windows light 1.021:1, while the dark
 * platform palettes fell under the floor on their lighter popovers.
 *
 * A **row's wash** is deliberately not a fill placement. Both packages' tonal
 * action paints the `borderStrong` edge (`packages/primitives/src/core/
 * variants.ts` and the components' `Button`), and on a wash that edge is what
 * carries the control: over the sixteen shipped styles the fill reads
 * **1.0000:1** against `hover` in both high-contrast variants and **32 of the
 * 64** wash placements are under the floor, so no fill answers them — while
 * `contrastPairs` holds `borderStrong` to the boundary floor on all four and it
 * clears them everywhere (tightest 3.73:1, Windows light's `active`). The
 * fill claim stays on the four content strips and the wash is the edge's.
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
 * The rail a bar's value is drawn inside.
 *
 * `Progress`, `Meter` and `Slider` paint their track `colors.muted`
 * (`progressTrackClass` and `sliderRailClass` in `@gpuixui/primitives`), and a
 * rail that matches the fill behind it leaves a 40% bar reading as a small
 * floating pill with no total. The strips are the three surfaces a bar is
 * placed on: the page, a card, and the floating `popover` fill of a dialog or a
 * popover. The `muted` strip is deliberately **not** one of them — the quiet
 * fill *is* the strip there, the same exemption `disabledFace` makes — so the
 * rail is never measured against itself.
 *
 * Measured, the base dark theme's `muted` was its own `popover` (**1.000:1**), so
 * a progress bar in a dialog had no track whatsoever; Windows dark sat at
 * 1.014:1 on its card and 1.042:1 on its popover, Aero dark at 1.013:1, macOS
 * dark at 1.028:1 and Luna dark at 1.045:1. The five dark `muted` roles are a
 * step darker now, between the card and the popover, which is what gives the
 * rail a step to be seen against.
 */
const trackRole = "muted" as const;
const trackStrips = ["background", "card", "popover"] as const;

/**
 * The pointer feedback a filled role paints: its hover and its press, each a
 * derived fill the role moves toward the theme's foreground (`filledHover` /
 * `filledPressed`).
 *
 * This is the one surface a control cannot do without — it is the whole of what
 * happens between the pointer arriving and the press landing — and nothing
 * measured it, because the two fills are derived rather than stored, so neither
 * the contrast table (a role pair) nor the state-wash placements (a role over a
 * strip) could name it. A step that is invisible is a step the reader never
 * sees: the derivation moves 12% / 18% of the way toward `foreground`, which
 * assumes the foreground is far from the action fill. That holds in every
 * shipped theme and is not guaranteed by the type — a brand built in one hue
 * (`foreground` and `primary` both a dark navy, so the page text reads and the
 * fill carries its own on-colour) paints a hover the fill cannot show.
 *
 * The fill it replaces is the role itself, so `over` is the same role: the
 * comparison is the resting face against the pointer's face.
 */
export interface ActionFeedbackPlacement {
  /** The role whose resting fill the pointer state replaces. */
  readonly role: FilledRole;
  /** The pointer state whose derived fill is measured. */
  readonly state: FilledFeedbackState;
}

/** Every filled role's hover and press, the two states a control paints. */
export const actionFeedbackPlacements: readonly ActionFeedbackPlacement[] =
  filledRoles.flatMap((role) =>
    filledFeedbackStates.map(
      (state): ActionFeedbackPlacement => ({ role, state }),
    ),
  );

/**
 * The derived pointer fills of a theme that cannot be seen against the fill they
 * replace.
 *
 * Held to {@link decorativeFloor}: a pointer step is a state change, not text,
 * and a step under the floor is a control that does not answer the pointer. A
 * source that does not carry the role, `foreground` or the on-colour the step is
 * clamped by reports the placement **unmeasurable** rather than skipping it, the
 * same rule every other contract follows for a theme stored by an older release.
 *
 * @example
 * ```ts
 * import { actionFeedbackFailures, type Theme } from "@gpuixui/tokens";
 *
 * actionFeedbackFailures(brandTheme); // [] when every hover and press is visible
 * ```
 */
export function actionFeedbackFailures(
  theme: {
    readonly colors: Partial<ThemeColors>;
    readonly contrast?: ThemeContrast;
  },
  floor: number = decorativeFloor,
): readonly DecorativeFailure[] {
  return actionFeedbackPlacements.flatMap(({ role, state }) => {
    const resting = theme.colors[role];
    const painted = filledFeedback(theme, role, state);
    const ratio =
      resting === undefined || painted === undefined
        ? undefined
        : contrastRatio(painted, resting);
    return ratio !== undefined && ratio >= floor
      ? []
      : [
          {
            surface: "actionFeedback" as const,
            role,
            over: role,
            ratio,
            floor,
          },
        ];
  });
}

/**
 * The wash a row is wearing when a pointer state replaces it: the `selected`
 * fill a chosen list row holds, the `accent` a list row tints under the pointer,
 * or the `hover` a menu, ghost action or table row tints.
 */
export type PointerWashSurface = "selected" | "accent" | "hover";

/** The role a pointer state derives its wash from. */
export type PointerWashRole = "accent" | "active";

/** One wash a pointer step replaces, and the role it paints instead. */
export interface PointerWashTransition {
  /** The role the pointer state derives a wash from. */
  readonly wash: PointerWashRole;
  /** The wash the row already wears, which the step must be seen against. */
  readonly replaced: PointerWashSurface;
}

/**
 * The three steps a row's pointer states take.
 *
 * A chosen list row is filled `selected` and tints `accent` when the pointer
 * arrives, then `active` while the press is down (`list.tsx`); a menu row, a
 * ghost action or a table row tints `hover` and repaints `active` under the
 * press. Every one of them replaces a wash the row is already wearing, so the
 * step is not "a wash on a strip" — it is the wash against the wash.
 */
export const pointerWashTransitions: readonly PointerWashTransition[] = [
  { wash: "accent", replaced: "selected" },
  { wash: "active", replaced: "accent" },
  { wash: "active", replaced: "hover" },
];

/**
 * The label pairs the derived wash must still carry.
 *
 * Read from {@link contrastPairs} rather than restated, and keyed by the role the
 * derived wash **plays** rather than by the wash it replaces. The derived wash is
 * a `hover` wash or a press wash, so it is held to the labels the table measures
 * on that role — the row's own text, the secondary line beside it, a checked
 * row's tick and the ring and edge drawn over the fill (the ring sits one border
 * width outside the control, on the strip the control's gap exposes). The
 * labels of the wash it *replaces* are the labels of a different state: a menu
 * row's `popoverForeground` and a navigation link's `accentForeground` belong to
 * the wash the row is leaving, and holding the derived wash to them would pin a
 * palette that has no room for the step. A pair added to the table clamps the
 * derivation without an edit here.
 */
const pointerWashLabels: Readonly<
  Record<PointerWashRole, readonly ContrastPair[]>
> = {
  accent: contrastPairs.filter(({ background }) => background === "accent"),
  active: contrastPairs.filter(({ background }) => background === "active"),
};

/**
 * The share of the way to the foreground a pointer step may move.
 *
 * The ceiling is the press step a filled action takes: a row that needed more
 * than a fifth of the way would be a row whose palette has no room left for the
 * state.
 */
const POINTER_STEP_CEILING = 0.18;

/**
 * Candidate steps, smallest first, so the derivation takes the least paint.
 *
 * Zero is a step: the wash a theme authors is painted as it is when it already
 * answers the pointer, so the derivation only moves a palette that cannot.
 */
const POINTER_STEPS: readonly number[] = [
  0,
  ...Array.from(
    { length: Math.round(POINTER_STEP_CEILING * 100) },
    (_, offset) => (offset + 1) / 100,
  ),
];

/**
 * The wash a row paints in a pointer state, derived from the role it names.
 *
 * A role cannot close this on its own. `active` has to be seen against the
 * `accent` a hovered list row wears and the `hover` a menu row wears, while the
 * same `active` carries the row's title in `selectedForeground` at the body floor
 * and, in macOS dark, a checked row's `primary` tick at 3.06:1 — a palette with
 * room to separate the washes has none left for the label above them. Measured,
 * six of the sixteen shipped styles painted the press in the wash it replaced,
 * and macOS light's press in its hover (see `docs/tokens.md` §Decorative
 * surfaces).
 *
 * The step is therefore the smallest move toward the theme's `foreground` that
 * clears {@link decorativeFloor} against the wash it replaces, and never one that
 * costs a label the floor it holds on the role the wash plays. Zero is a step
 * too: a palette whose own wash already answers the pointer is painted as it
 * is. A theme with no feasible step paints the strongest one its labels allow,
 * and {@link pointerWashFailures} reports that the state cannot be seen.
 *
 * `undefined` when the source lacks the role, the wash it replaces or the
 * `foreground` it moves toward: the absence rule {@link elevationShadow} follows,
 * rather than a colour the derivation could not build.
 *
 * @example
 * ```tsx
 * <div style={{ backgroundColor: pointerWash(theme, "active", "accent") }} />
 * ```
 */
export function pointerWash(
  source: {
    readonly colors: Partial<ThemeColors>;
    readonly contrast?: ThemeContrast;
  },
  wash: PointerWashRole,
  replaced: PointerWashSurface,
  floor: number = decorativeFloor,
): string | undefined {
  const base = source.colors[wash];
  const over = source.colors[replaced];
  const toward = source.colors.foreground;
  if (base === undefined || over === undefined || toward === undefined) {
    return undefined;
  }
  const floors = contrastFloorsFor(source);
  const paintedAt = (step: number): string => blend(base, toward, step);
  const seenAt = (step: number): boolean => {
    const ratio = contrastRatio(paintedAt(step), over);
    return ratio !== undefined && ratio >= floor;
  };
  const readableAt = (step: number): boolean =>
    pointerWashLabels[wash].every(({ foreground, floor: kind }) => {
      const ratio = contrastRatio(source.colors[foreground], paintedAt(step));
      return ratio !== undefined && ratio >= floors[kind];
    });
  const firstSeen = POINTER_STEPS.find(seenAt);
  const lastReadable = [...POINTER_STEPS].reverse().find(readableAt);
  return paintedAt(
    Math.min(
      firstSeen ?? POINTER_STEP_CEILING,
      lastReadable ?? POINTER_STEP_CEILING,
    ),
  );
}

/**
 * The pointer washes a theme cannot paint visibly.
 *
 * Each transition is held to {@link decorativeFloor} against the wash it
 * replaces: a press that lands on the wash the row already wears is a row that
 * does not answer the pointer. A source that lacks a role reports the placement
 * unmeasurable rather than skipping it. The failure names the role the wash is
 * derived from and the wash it replaces, so a reader can tell which state broke.
 *
 * @example
 * ```ts
 * import { pointerWashFailures, type Theme } from "@gpuixui/tokens";
 *
 * pointerWashFailures(brandTheme); // [] when every row answers the pointer
 * ```
 */
export function pointerWashFailures(
  theme: {
    readonly colors: Partial<ThemeColors>;
    readonly contrast?: ThemeContrast;
  },
  floor: number = decorativeFloor,
): readonly DecorativeFailure[] {
  return pointerWashTransitions.flatMap(({ wash, replaced }) => {
    const painted = pointerWash(theme, wash, replaced, floor);
    const ratio =
      painted === undefined
        ? undefined
        : contrastRatio(painted, theme.colors[replaced]);
    return ratio !== undefined && ratio >= floor
      ? []
      : [
          {
            surface: "pointerWash" as const,
            role: wash,
            over: replaced,
            ratio,
            floor,
          },
        ];
  });
}

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
 * `muted`, the base dark theme's is its `popover`, and both high-contrast
 * variants' is their `muted`). A fill that matched an enabled
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
 * The strips a loading placeholder stands in: a page, a card, a muted toolbar
 * and the `popover` fill a dialog or a popover paints.
 *
 * The floating strip is the one the table missed, and it is where a placeholder
 * does its real work: a dialog whose body is still loading paints skeleton rows
 * on the dialog's own `popover` fill (`DIALOG_CONTENT`), so a placeholder that
 * matches that fill is a dialog with nothing in it. Measured, the three dark
 * platform styles carried a skeleton 1.03–1.05:1 from their own popover, and the
 * base dark theme's own popover happens to sit one step from it as well.
 */
const skeletonStrips = ["background", "card", "popover", "muted"] as const;

/**
 * The shadow a raised surface drops, on every strip it can float over.
 *
 * A level's strength lives in its own alpha byte, so the painted colour is the
 * level's and a placement names the level it measures. Every level a component
 * raises a surface to is measured — a card's `sm`, the `md` a toast, a preview
 * card and a navigation panel paint, and the `lg` of a dialog, popover, menu or
 * drawer — because each is a decision a brand can supply whole: the strongest
 * level says nothing about a weaker one, which is *less* visible than it by
 * design. Measured on the deepest level alone, a brand whose `sm` paints the
 * card's own fill shipped a raised card with no lift while the dialog's shadow
 * passed. The measured result is still a ceiling (a blurred edge casts less than
 * its full alpha), so this reports only a shadow that cannot be seen at all —
 * which is exactly the case that shipped: the high-contrast dark theme's black
 * tint on its pure-black page measured 1.00:1 at every level, so no raised
 * surface in that variant had a shadow.
 *
 * The strips are the four content surfaces a raised surface floats over, the two
 * window fills the veil already names — a segmented `secondary` panel (a filled
 * panel as well as a tonal action's face) and a field's own `input` fill, which
 * a picker's panel overlaps — every wash a row can be wearing when the surface
 * opens, and the four soft tints a message is painted on, because an action
 * inside an alert can open a menu over its own tint. The veil and the shadow
 * cover the same window, so a strip the veil names and the shadow does not was
 * the hole: the high-contrast dark `secondary` **is** the shadow's tint, so a
 * dialog opened over a segmented panel there cast no shadow at all (1.00:1).
 *
 * The washes: a context menu opens over the row the reader right-clicked, so the
 * shadow falls on that row's own fill — the `selected` a chosen row holds, the
 * `accent` a list row tints under the pointer, and the `active` a row keeps
 * while the press that opened the surface is down. The `hover` wash is the one
 * the pointer leaves behind when the press ends: a submenu opens from the
 * **menu row** whose submenu was chosen, and that row is hovered
 * (`menu/item.tsx`), while a dialog or popover opened by a click is still under
 * a pointer that hovers its ghost trigger (`internal/button.tsx`).
 */
const elevationRole = "shadow" as const;

/**
 * The levels a component raises a surface to, in the order it paints them.
 *
 * `overlay` is reserved and empty — layering is paint order, not a shadow — so it
 * is not a placement: a level that paints nothing has no colour to measure, and
 * `decorativeFailures` reports it as the absent level it is if a theme carries it
 * empty.
 */
const raisedLevels = [
  "sm",
  "md",
  "lg",
] as const satisfies ReadonlyArray<ElevationLevel>;

/**
 * The soft status tints a message's own action opens a surface over. An
 * `Alert`'s description is a container, and the action a consumer places in it
 * — the package's documented text `AlertLink` or a filled `Button` — can open a
 * menu, so a menu opened from one casts its shadow over the tint the message is
 * painted on, and a confirmation dialog opened from it veils the message that
 * asked for the confirmation — the same composition the row washes are measured
 * for, one surface over.
 */
const messageTintStrips = statusTones.map((tone) => `${tone}Soft` as const);

/**
 * The strips a raised surface casts its shadow on.
 *
 * A surface opens *from* a control, not only from a row: a popover or menu
 * opened by a filled action keeps that action on screen under the surface, so
 * the shadow falls on the action's own face. `secondary` and `accent` are the
 * two faces the table already names (`secondary` as a filled action's fill and
 * a segmented panel, `accent` as a wash); `primary` and `destructive` are the
 * two brand faces, measured here as **strips** even though they are indicator
 * marks rather than decorative roles of their own.
 */
const elevationStrips = [
  "background",
  "card",
  "popover",
  "muted",
  "secondary",
  "primary",
  "destructive",
  "input",
  "selected",
  "active",
  "accent",
  "hover",
  ...messageTintStrips,
] as const;

/**
 * The decorative surfaces the library paints. Each is measured where it is
 * actually used rather than against a single generic surface: a divider sits on
 * the page, inside a card, in a popover and in a muted toolbar strip; a
 * skeleton stands in for a row on a page, in a card, in a dialog or popover whose
 * content has not loaded and in a muted list; a soft status surface is the tint a
 * message sits in and its edge bounds it, on every strip a message is placed on;
 * a tonal action sits on any of the four strips, because a toolbar, a card and a
 * popover all hold buttons; a raised surface floats over the same four, and its
 * shadow is what tells it apart from them; and a disabled control's face is
 * measured against each face it can replace.
 */
export const decorativeSurfaces: readonly DecorativeSurface[] = [
  { surface: "divider", role: "border", over: "background" },
  { surface: "divider", role: "border", over: "card" },
  { surface: "divider", role: "border", over: "popover" },
  { surface: "divider", role: "border", over: "muted" },
  ...skeletonStrips.map(
    (over): DecorativeSurface => ({
      surface: "skeleton",
      role: "skeleton",
      over,
    }),
  ),
  // A veil is measured over the surfaces a modal covers that carry content, not
  // over the page's void: a black page cannot be darkened by any scrim, and a
  // theme with one separates its dialog with a border instead. The strips are
  // the ones a window actually holds behind a modal — a card, a floating
  // surface, a sidebar's `muted` toolbar, a segmented `secondary` panel, a
  // field's `input` fill and the `selected` wash a chosen row wears — because
  // the veil covers the whole window: measured on the two page surfaces only, a
  // modal over an undimmed sidebar passed.
  { surface: "scrim", role: "overlay", over: "card" },
  { surface: "scrim", role: "overlay", over: "popover" },
  { surface: "scrim", role: "overlay", over: "muted" },
  { surface: "scrim", role: "overlay", over: "secondary" },
  // A filled action is part of the window too: a dialog opened over a page
  // holds that page's primary and danger actions behind the same veil. A veil
  // painted in the brand's own fill leaves the one control the reader may be
  // about to press at full brightness.
  { surface: "scrim", role: "overlay", over: "primary" },
  { surface: "scrim", role: "overlay", over: "destructive" },
  { surface: "scrim", role: "overlay", over: "input" },
  // A chosen row is part of that window too: opening a confirmation dialog over
  // the row the reader just selected is the library's own pattern, so the veil
  // has to recede the selection as well as the content around it.
  { surface: "scrim", role: "overlay", over: "selected" },
  // And the row under the pointer is the one a menu or dialog is opened *from*:
  // a context menu, a confirmation dialog or a command palette opened on a list
  // row covers the wash that row is wearing — `accent` under the pointer and
  // `active` while the press that opened the surface is down. A veil painted in
  // that wash leaves the thing the surface is about at full brightness, which is
  // the same defect the chosen row closed one state over.
  { surface: "scrim", role: "overlay", over: "active" },
  { surface: "scrim", role: "overlay", over: "accent" },
  // A surface opened by a click paints after the press has cleared, so the
  // control it was opened from is wearing `hover` by then: a dialog opened from
  // a ghost toolbar action, or a popover from an outlined trigger. The veil
  // covers that control too, so the wash a reader actually leaves behind is
  // measured beside the pressed one.
  { surface: "scrim", role: "overlay", over: "hover" },
  // A message is part of the window too, and its own action can open the modal:
  // a confirmation dialog opened from an alert's retry covers the alert that
  // asked for it, so the veil has to recede the tint the message sits in.
  ...messageTintStrips.map(
    (over): DecorativeSurface => ({
      surface: "scrim",
      role: "overlay",
      over,
    }),
  ),
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
  ...trackStrips.map(
    (over): DecorativeSurface => ({
      surface: "track",
      role: trackRole,
      over,
    }),
  ),
  ...raisedLevels.flatMap((level) =>
    elevationStrips.map(
      (over): DecorativeSurface => ({
        surface: "elevation",
        role: elevationRole,
        over,
        level,
      }),
    ),
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
  // A **chosen row answers the pointer by repainting the wash it is already
  // wearing**: a selectable list row fills `selected` once chosen and tints
  // `accent` under the pointer (`list.tsx`), so the fill that replaces a wash is
  // a surface nothing measured — the four strips are the page under a row, not
  // the state a row is in. A theme whose `accent` is its `selected` leaves a
  // chosen row with no feedback at all, which is what eleven shipped styles did,
  // the four base and high-contrast palettes at **1.00:1**. The press that
  // follows is the same defect one state over: a menu row's press replaces its
  // own hover, and a list row's press replaces the accent it hovers with. Those
  // two transitions are not role pairs — the palette has no room for them in six
  // styles — so they are derived by `pointerWash` and held beside this placement
  // by `pointerWashTransitions`.
  { surface: "stateWash", role: "accent", over: "selected" },
  // A status message's edge is a decorative boundary — its text and icon carry
  // the meaning — so it is held to the perceptibility floor, not the boundary
  // floor, and measured on the tint it bounds and on every strip the tint is
  // measured on. The tint placements are the four surfaces a message sits on, so
  // the edge has to answer on all four: a warning alert in a confirmation
  // dialog's body sits on that dialog's `popover` fill, and a soft badge in a
  // muted sidebar sits on `muted`. The edge was measured on the two page
  // surfaces only, so a message on a floating surface had a measured tint and an
  // edge nothing checked. A soft **badge** is the message that sits inside a row
  // instead of on a strip, so the four washes a row tints under itself are
  // measured too — on a wash the edge is the whole badge.
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
    ...statusWashStrips.map((over) => statusEdge(tone, over)),
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
   * The elevation level whose shadow failed, for an `elevation` placement.
   * Absent for every other surface, and for a level the theme does not carry
   * (there is no level to name beyond the one the placement asks for).
   */
  readonly level?: ElevationLevel;
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
 * The derived fills a filled role paints answer to the same floor through
 * {@link actionFeedbackPlacements}: a hover or press that lands on the fill it
 * replaces is an action that never answers the pointer, and the derivation's
 * step is relative to `foreground`, which a brand is free to put on top of its
 * own action role. The derived washes a row paints answer it the same way
 * through {@link pointerWashTransitions}: a press that lands on the wash the row
 * already wears is a row that does not answer the pointer.
 *
 * @example
 * ```ts
 * import { decorativeFailures, type Theme } from "@gpuixui/tokens";
 *
 * decorativeFailures(brandTheme).length === 0; // every divider, skeleton, veil, pointer step and shadow is visible
 * ```
 */
export function decorativeFailures(
  theme: {
    readonly colors: Partial<ThemeColors>;
    readonly elevation?: Partial<Elevation>;
    readonly contrast?: ThemeContrast;
  },
  floor: number = decorativeFloor,
): readonly DecorativeFailure[] {
  const surfaces = decorativeSurfaces.flatMap(
    ({ surface, role, over, alpha, level }) => {
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
        : [
            {
              surface,
              role,
              over,
              ...(level === undefined ? {} : { level }),
              ratio,
              floor,
            },
          ];
    },
  );
  const feedback = actionFeedbackFailures(theme, floor);
  const washes = pointerWashFailures(theme, floor);
  return [...surfaces, ...feedback, ...washes];
}
