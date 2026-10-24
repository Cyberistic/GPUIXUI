import {
  alpha,
  blend,
  themeColors,
  type ColourSource,
  type ThemeColors,
} from "./color.js";
import {
  contrastFloorsFor,
  contrastRatio,
  type ContrastSource,
} from "./contrast.js";
import type { BoxShadow } from "./elevation.js";
import {
  borderWidth as shippedBorderWidth,
  isControlSize,
  type BorderWidth,
  type ControlSize,
} from "./scale.js";
import type { Stored, Theme } from "./theme.js";
import {
  isTextRole,
  typography as shippedTypography,
  type FontWeight,
  type TextStyle,
  type TextRole,
} from "./typography.js";

/** Text style properties accepted by GPUix's `StyleDesc`. */
export interface TextStyleProperties {
  /** Font size in pixels. */
  readonly fontSize: number;
  /** Line height in pixels. */
  readonly lineHeight: number;
  /** Font weight. */
  readonly fontWeight: FontWeight;
  /** Resolved family: sans for prose, mono for code roles. */
  readonly fontFamily: string;
}

const roleFamily: Readonly<Record<TextRole, "sans" | "mono">> = {
  display: "sans",
  h1: "sans",
  h2: "sans",
  h3: "sans",
  body: "sans",
  bodyStrong: "sans",
  label: "sans",
  caption: "sans",
  code: "mono",
  codeBlock: "mono",
};

/**
 * A theme, or anything shaped like one, as the type scale paints it.
 *
 * The group may be absent or `null` because a store can lose it, and a role may
 * be a partial record or `null` because JSON has no `undefined`. This is the
 * storage boundary {@link textStyle} accepts, so a decoded theme paints without
 * a cast to `Theme`.
 */
export interface TypeSource {
  readonly typography?:
    | ({
        readonly sans?: string | null;
        readonly mono?: string | null;
      } & Partial<Record<TextRole, Readonly<Partial<TextStyle>> | null>>)
    | null;
}

/**
 * Resolve a typographic role to inline style properties.
 *
 * A role name is content as often as a literal, so a name this release does not
 * ship reads as `body` rather than a lookup that answers `undefined`: the first
 * property read used to be `TypeError: Cannot read properties of undefined
 * (reading 'fontSize')` in the middle of a render. A theme's type group is the
 * same kind of input — a stored theme can predate it, JSON writes `null` where
 * it carried none, and a role can arrive with a value the renderer drops — and
 * this seam paints mid-render, so it answers the library's own role instead of
 * throwing: the gate (`missingTokens`) is what refuses such a theme, and a
 * surface can paint one nobody has audited yet, the rule `@gpuixui/primitives`'
 * `typeOf`/`familyOf` already follow.
 *
 * The input is a {@link TypeSource}, the shape a store hands back, so a decoded
 * theme is painted without the cast to `Theme` the type group used to require.
 *
 * @example
 * ```tsx
 * <text style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}>
 *   Save changes
 * </text>
 * ```
 */
export function textStyle(
  theme: TypeSource,
  role: TextRole,
): TextStyleProperties {
  const name = isTextRole(role) ? role : "body";
  const authored: unknown = theme.typography?.[name];
  const style = isTextStyle(authored) ? authored : shippedTypography[name];
  const family = theme.typography?.[roleFamily[name]];
  return {
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    fontWeight: style.fontWeight,
    fontFamily:
      typeof family === "string" && family.trim() !== ""
        ? family
        : shippedTypography[roleFamily[name]],
  };
}

/** A stored role's numbers, when the role carries every one this seam paints. */
const isTextStyle = (value: unknown): value is TextStyle =>
  typeof value === "object" &&
  value !== null &&
  "fontSize" in value &&
  isFiniteNumber(value.fontSize) &&
  "lineHeight" in value &&
  isFiniteNumber(value.lineHeight) &&
  "fontWeight" in value &&
  isFiniteNumber(value.fontWeight);

/** A number the runtime can lay out, as opposed to a dropped or dropped-looking one. */
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * A theme, or anything shaped like one, as the density metrics read it.
 *
 * A density group is a group a store can lose: JSON writes `null` where a theme
 * carried none, and a saved theme that predates the scale has neither. The
 * colour roles have the same port in {@link ColourSource} and the type group in
 * `TypeSource` (`packages/primitives/src/core/theme.ts`), for the same reason.
 */
export interface DensitySource {
  readonly density?: {
    readonly controlHeight?: Readonly<
      Partial<Record<ControlSize, number>>
    > | null;
    readonly controlPaddingX?: Readonly<
      Partial<Record<ControlSize, number>>
    > | null;
  } | null;
}

/**
 * The number a density table holds for a step, or nothing where the theme paints
 * none.
 *
 * A value that is not a finite number is the same absence: a stored theme that
 * wrote `"8"` where a length belongs is reported by `inspectLengths`, and the
 * runtime drops the string rather than painting it, so the seam answers no box
 * instead of handing one over.
 */
const densityMetric = (
  theme: DensitySource,
  metric: "controlHeight" | "controlPaddingX",
  size: ControlSize,
): number | undefined => {
  const scale = theme.density?.[metric];
  if (scale === undefined || scale === null) return undefined;
  const value = scale[isControlSize(size) ? size : "md"];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
};

/**
 * Control or input height for a size at the theme's density.
 *
 * A control size is a stored preference as often as a literal — a toolbar's
 * compact mode, a settings row, a saved panel — so a name this release does not
 * ship reads as the `md` default rather than the `undefined` the lookup answered,
 * which a caller spread into `style.height` as a `number` and the serialiser
 * dropped: the box laid out at its content's height. Narrow a stored size with
 * `isControlSize` where the caller can tell the reader what it substituted.
 *
 * A {@link Theme} carries the group, so the answer is a height outright. A
 * source that may have lost it — a theme restored from storage — answers
 * `undefined`, and the runtime paints the box the caller did not size, rather
 * than throwing from the first control it lays out.
 */
export function controlHeight(theme: Theme, size: ControlSize): number;
export function controlHeight(
  theme: DensitySource,
  size: ControlSize,
): number | undefined;
export function controlHeight(
  theme: DensitySource,
  size: ControlSize,
): number | undefined {
  return densityMetric(theme, "controlHeight", size);
}

/**
 * Horizontal control padding for a size at the theme's density.
 *
 * The same two answers {@link controlHeight} gives: the `md` step for a size
 * this release does not ship, and no padding for a density group the theme lost.
 */
export function controlPaddingX(theme: Theme, size: ControlSize): number;
export function controlPaddingX(
  theme: DensitySource,
  size: ControlSize,
): number | undefined;
export function controlPaddingX(
  theme: DensitySource,
  size: ControlSize,
): number | undefined {
  return densityMetric(theme, "controlPaddingX", size);
}

/**
 * The four status colour families a component can announce, in documentation
 * order. `StatusTone` derives from this list, so a new tone must also gain its
 * roles in every theme.
 */
export const statusTones = [
  "info",
  "success",
  "warning",
  "destructive",
] as const;

/** The four status colour families a component can announce. */
export type StatusTone = (typeof statusTones)[number];

/**
 * Narrow unknown input — a stored preference or a URL parameter — to a status
 * tone. A consumer iterates {@link statusTones} instead of retyping them.
 */
export const isStatusTone = (value: unknown): value is StatusTone =>
  statusTones.some((tone) => tone === value);

/**
 * The tone a name this release does not ship paints as: `info`, the neutral
 * family, and the tone the boundary resolver substitutes for a stored value it
 * cannot narrow (`persisted-choices.example.ts`), so the seam every component
 * paints through and the narrowing a consumer does at the boundary agree.
 */
const defaultStatusTone: StatusTone = "info";

/**
 * The share of a status tone's solid role that its soft surface's edge paints.
 * The edge sits between the tone's own tint and the page, so both sides are held
 * to the decorative perceptibility floor (`decorative.ts`).
 */
export const statusEdgeAlpha = 0.3;

/** The readable text and soft surface roles of a status tone. */
export interface StatusToneStyle {
  /** The tone's soft surface (`xSoft`). */
  readonly background: string;
  /**
   * The tone's readable text (`xSoftForeground`): on that soft surface, and as
   * page text on `background` or `card`. Both are measured at the body floor, so
   * a field error or inline warning needs no colour of its own.
   */
  readonly foreground: string;
  /**
   * The tone's solid colour at {@link statusEdgeAlpha} alpha, for the surface
   * edge. It is a decorative boundary, measured against both the soft surface
   * and the page.
   */
  readonly border: string;
}

/**
 * Resolve a status tone to the roles a status message needs. The readable
 * colour is designed per theme, so no component has to mix a readable text
 * colour from the solid status colour — and it is the same role whether the
 * message sits on its soft tint or directly on the page (a field error, an
 * inline warning), with both surfaces held to the body contrast floor.
 *
 * A {@link Theme} carries the group, so the answer is a tone outright. A source
 * that may have lost it — a theme restored from storage, read through
 * {@link themeColors} — answers `undefined` when any of the three roles is gone,
 * and the runtime paints nothing, the rule {@link elevationShadow} follows for an
 * absent level.
 *
 * A **tone name is content too**: a notification record, a log line's level or a
 * saved status item carries the family it was written with, and a release that
 * renames one hands this function a name `statusTones` no longer carries. It
 * reads that name as `info` — the tone
 * [`persisted-choices.example.ts`](./persisted-choices.example.ts) substitutes —
 * rather than looking up `dangerSoft`, painting nothing and answering `undefined`
 * where the `Theme` overload promises a tone. Narrow a stored tone with
 * {@link isStatusTone} where the caller can tell the reader what it substituted;
 * a theme that lost the *roles* is the gate's report, not a name to replace.
 *
 * @example
 * ```tsx
 * const tone = statusTone(theme, "info");
 * <div
 *   style={{
 *     backgroundColor: tone.background,
 *     borderColor: tone.border,
 *     borderWidth: theme.borderWidth.thin,
 *   }}
 * />
 * ```
 */
export function statusTone(theme: Theme, tone: StatusTone): StatusToneStyle;
export function statusTone(
  theme: ColourSource,
  tone: StatusTone,
): StatusToneStyle | undefined;
export function statusTone(
  theme: ColourSource,
  tone: StatusTone,
): StatusToneStyle | undefined {
  const name = isStatusTone(tone) ? tone : defaultStatusTone;
  const colors = themeColors(theme);
  const background = colors[`${name}Soft`];
  const foreground = colors[`${name}SoftForeground`];
  const edge = colors[name];
  return background === undefined ||
    foreground === undefined ||
    edge === undefined
    ? undefined
    : { background, foreground, border: alpha(edge, statusEdgeAlpha) };
}

/** A focus ring, as the runtime's single-shadow shape. */
export interface FocusRing {
  /**
   * The shadow a component paints while it holds focus, including when a mouse
   * press moved the focus.
   */
  readonly boxShadow: BoxShadow;
}

/**
 * A theme, or anything shaped like one, as the border scale is read.
 *
 * The ring's line is the one paint that is a length rather than a colour, and a
 * group a store truncated past is the same absence there: a theme restored from
 * storage that predates the scale has no group, and JSON writes `null` where one
 * was never carried. The colour roles have the same port in {@link ColourSource}.
 */
export interface BorderSource {
  /** The scale, as a store hands it back: a step may be absent or `null`. */
  readonly borderWidth?: Stored<BorderWidth>;
}

/**
 * The width a border scale holds for a step, or the library's own where the
 * theme paints none.
 *
 * A paint seam cannot be the gate: `missingTokens` refuses a theme that lost the
 * group, but a surface can paint one nobody has audited yet, and the ring is the
 * affordance a reader needs to find where Tab went — so a lost group paints the
 * library's line rather than throwing out of a focused control. The rule
 * `textStyle` and `nativeTextTheme` follow for a lost type, radius or spacing
 * step; a stored value that is not a finite number is the same absence, because
 * the runtime drops a `"2"` where a length belongs.
 */
const borderStep = (source: BorderSource, step: keyof BorderWidth): number => {
  const value = source.borderWidth?.[step];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : shippedBorderWidth[step];
};

/**
 * The source a ring reads: the roles, and the width of the line it draws.
 * A {@link Theme} is one; a theme restored from storage that lost a role or the
 * whole border scale is the other, which is why both are optional.
 */
export interface FocusRingSource extends ColourSource, BorderSource {}

/**
 * The unconditional focus ring.
 *
 * A zero-offset, zero-blur shadow spread by the theme's `borderWidth.strong`:
 * it draws outside the border box and takes no layout space. Paint it while a
 * control holds focus when the focus arrived programmatically before any
 * keyboard input — a dialog or menu opened by a mouse. For keyboard focus use
 * {@link keyboardFocusRing}, which the runtime paints itself.
 *
 * A theme restored from storage that lost its `ring` role answers `undefined`
 * rather than throwing — the rule {@link controlFocusRing} follows for a
 * disabled control — so a programmatic focus paints no ring instead of losing
 * the window; a `Theme` answers a ring outright. A theme that lost the border
 * scale keeps its ring and spreads by the library's `borderWidth.strong`: a
 * missing colour is a ring nobody can see, but a missing length is a line the
 * library ships.
 *
 * @example
 * ```tsx
 * <div style={focused ? focusRing(theme) : undefined} />
 * ```
 */
export function focusRing(theme: Theme): FocusRing;
export function focusRing(source: FocusRingSource): FocusRing | undefined;
export function focusRing(source: FocusRingSource): FocusRing | undefined {
  const color = themeColors(source).ring;
  if (color === undefined) {
    return undefined;
  }
  return {
    boxShadow: {
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadRadius: borderStep(source, "strong"),
      color,
    },
  };
}

/** The outline the runtime paints while a control is focused after keyboard input. */
export interface FocusVisibleOutline {
  /** Line thickness in pixels, from the theme's strong border. */
  readonly outlineWidth: number;
  /**
   * Outline colour, the theme's `ring` role — absent when a stored theme lost
   * it, so the runtime paints its own outline colour rather than the `null` a
   * store wrote.
   */
  readonly outlineColor?: string;
  /**
   * Distance outside the border box, one line's width. A separated line is read
   * against the strip behind the control rather than the fill it paints, which
   * is the only geometry a filled action can be found in: `ring` is the brand,
   * so a line flush with a brand face is drawn in its own colour.
   */
  readonly outlineOffset: number;
}

/** The keyboard-only ring, as the runtime's `focusVisible` state. */
export interface KeyboardFocusRing {
  /**
   * Painted by the runtime only while focused after keyboard input (Tab); a
   * mouse press never shows it.
   */
  readonly focusVisible: FocusVisibleOutline;
}

/**
 * The keyboard-focus ring.
 *
 * An outline in the runtime's `focusVisible` state — "while focused after
 * keyboard input (Tab), like CSS `:focus-visible`". Apply it **at rest**: the
 * runtime decides when to paint it, so a control never tracks focus to draw a
 * ring, and a Tab and a click finally look different.
 *
 * A programmatic focus before any keyboard input does not paint it, so a
 * mouse-opened overlay keeps {@link focusRing} for that path.
 *
 * The line is **separated from the control's own fill** by one strong-border
 * width, so the strip behind the control shows through the gap and the ring is
 * read against that strip. A flush line would be drawn in a filled action's own
 * colour (measured at 1.00–1.38:1 on `primary`), because `ring` is the brand.
 * The playground's `focus-ring-offset` probe measured the geometry in a window:
 * a two-point offset paints the ring three points out with the strip showing
 * through the gap, and the control and its sibling keep their boxes.
 *
 * A theme restored from storage is unknown input at this seam: a lost `ring`
 * role keeps the geometry and hands the runtime no colour, and a lost border
 * scale paints the library's own line rather than throwing out of a focused
 * control — the gate (`missingTokens`) is what refuses that theme, not the paint.
 *
 * @example
 * ```tsx
 * <div style={{ ...keyboardFocusRing(theme), backgroundColor: theme.colors.input }} />
 * ```
 */
export function keyboardFocusRing(theme: FocusRingSource): KeyboardFocusRing {
  const line = borderStep(theme, "strong");
  return {
    focusVisible: {
      outlineWidth: line,
      // A role a stored theme lost is a colour the runtime does not get, so it
      // paints its own outline rather than the `null` JSON wrote.
      outlineColor: themeColors(theme).ring,
      outlineOffset: line,
    },
  };
}

/** What a control's own state changes about the ring it declares. */
export interface ControlFocusState {
  /**
   * The control cannot act. Its ring goes with its tab stop: the runtime does
   * not move the focus off an element that becomes disabled, so a declaration
   * made anyway stays painted on a control that refuses every key.
   */
  readonly disabled?: boolean;
  /**
   * The control failed validation. The outline takes the `destructive` role,
   * the same role the field's edge and the invalid message paint.
   */
  readonly invalid?: boolean;
}

/**
 * The keyboard ring a **control** declares at rest, once its own state is known:
 * {@link keyboardFocusRing}, recoloured while invalid and **absent** while
 * disabled.
 *
 * `undefined` rather than an empty object, because a disabled control has no
 * ring to paint — the same absence {@link elevationShadow} returns for the
 * reserved overlay level. Spreading it into a style is still the call site:
 * `{ ...controlFocusRing(theme, { disabled }), backgroundColor }` paints no
 * ring while disabled and needs no branch.
 *
 * The rule is the theme's, not a component's: the colours are the `ring` and
 * `destructive` roles, and the width is `borderWidth.strong`.
 * `@gpuixui/primitives` and `@gpuixui/components` both **delegate** to this
 * helper from their ring seams (`core/focus.ts`, `internal/theme.ts`) and turn
 * the absent ring into an empty style, so the rule has one home.
 *
 * @example
 * ```tsx
 * <div style={{ ...controlFocusRing(theme, { invalid }), backgroundColor: theme.colors.input }} />
 * ```
 */
export function controlFocusRing(
  theme: FocusRingSource,
  state: ControlFocusState = {},
): KeyboardFocusRing | undefined {
  if (state.disabled === true) {
    return undefined;
  }
  const ring = keyboardFocusRing(theme);
  return state.invalid === true
    ? {
        focusVisible: {
          ...ring.focusVisible,
          // An invalid control's line takes the status role; a theme that lost
          // it keeps the ring's own colour rather than painting nothing.
          outlineColor:
            themeColors(theme).destructive ?? ring.focusVisible.outlineColor,
        },
      }
    : ring;
}

/**
 * The action families a control paints as a solid fill.
 *
 * Each one has a role of its own (`primary`, `secondary`, `destructive`) and a
 * matching foreground, so a filled control states its intent in colour and
 * keeps its label readable.
 */
export type FilledAction = "primary" | "secondary" | "destructive";

/**
 * Every role a control can paint as its whole face while it accepts pointer
 * feedback, so the fill owns a paired on-colour and the pair can be measured.
 *
 * The three {@link FilledAction} families are the buttons. `accent` is the one
 * non-action face: a toggle's on-state paints it, and its hover and press used
 * to lift the role's alpha, which let the surface behind the control through —
 * the defect the derived fills were written for.
 */
export const filledRoles = [
  "primary",
  "secondary",
  "destructive",
  "accent",
] as const;

/** A role a control paints as its whole face, in documentation order. */
export type FilledRole = (typeof filledRoles)[number];

/** The two pointer states a filled role derives a fill for. */
export const filledFeedbackStates = ["hover", "pressed"] as const;

/** A pointer state a filled role paints a derived fill for. */
export type FilledFeedbackState = (typeof filledFeedbackStates)[number];

/**
 * A colour source the derived fills read. A {@link Theme} is one; a theme
 * restored from storage that predates a role is the other, which is why the
 * roles are optional — the derivation answers `undefined` rather than a colour
 * it could not build.
 */
/**
 * What a filled action's derived states read: the roles, and the contrast
 * variant whose label floor clamps the press. The variant is the storage shape
 * (`ContrastSource`), so a brand a store handed back reaches the derivation
 * without a cast — the rule every report follows.
 */
export type FilledFeedbackSource = ColourSource & ContrastSource;

/** The label role each filled role carries its text and marks in. */
const filledOnColour: Readonly<Record<FilledRole, keyof ThemeColors>> = {
  primary: "primaryForeground",
  secondary: "secondaryForeground",
  destructive: "destructiveForeground",
  accent: "accentForeground",
};

/**
 * How far a filled role's hover moves from its fill, as a share of the way to
 * the theme's foreground.
 */
const HOVER_STEP = 0.12;

/**
 * How far a filled role's press moves from its fill. A press is a further step
 * than the hover, and it is a ceiling rather than a promise: the step stops
 * where the on-colour text would lose its contrast floor.
 */
const PRESS_STEP = 0.18;

/** Candidate shares, largest first, so a clamp takes the biggest that reads. */
const STEP_LADDER: readonly number[] = Array.from(
  { length: Math.round(PRESS_STEP * 100) + 1 },
  (_, offset) => (Math.round(PRESS_STEP * 100) - offset) / 100,
);

/**
 * The largest step no bigger than `nominal` whose fill still carries the
 * role's label.
 *
 * A filled action has 18% of headroom in every shipped theme, but the accent
 * face does not: pressed, macOS dark's accent label lands at 4.42:1 under its
 * 4.5 floor at the full step, and both high-contrast themes at 6.90:1 and
 * 6.94:1 under 7:1, so the fixed step was a label the theme could not carry.
 * The clamp keeps the derived fill opaque and the label measured. A theme whose
 * resting pair already misses its floor has nothing left to protect — the gate
 * reports it — so it keeps the nominal step rather than losing the pointer cue
 * as well as the contrast.
 */
const readableStep = (
  source: FilledFeedbackSource,
  role: FilledRole,
  nominal: number,
): number => {
  const colors = themeColors(source);
  const fill = colors[role];
  const foreground = colors.foreground;
  if (fill === undefined || foreground === undefined) {
    return nominal;
  }
  const onColour = colors[filledOnColour[role]];
  const floor = contrastFloorsFor(source).secondary;
  const reads = (step: number): boolean => {
    const ratio = contrastRatio(onColour, blend(fill, foreground, step));
    return ratio !== undefined && ratio >= floor;
  };
  return reads(0)
    ? (STEP_LADDER.find((step) => step <= nominal && reads(step)) ?? 0)
    : nominal;
};

/**
 * The fill a filled role paints in a pointer state, from a source that may be a
 * theme restored without every role.
 *
 * `undefined` when the source lacks the role or the `foreground` it moves
 * toward: the derivation reports the absence rather than inventing a colour, the
 * same rule {@link elevationShadow} follows for an absent level. A complete
 * theme always has both, which is why {@link filledHover} and
 * {@link filledPressed} return a colour outright.
 *
 * @example
 * ```ts
 * import { filledFeedback } from "@gpuixui/tokens";
 *
 * filledFeedback(theme, "primary", "hover"); // the paint
 * filledFeedback(storedTheme, "primary", "pressed"); // undefined when the role is gone
 * ```
 */
export function filledFeedback(
  source: FilledFeedbackSource,
  role: FilledRole,
  state: FilledFeedbackState,
): string | undefined {
  const colors = themeColors(source);
  const fill = colors[role];
  const foreground = colors.foreground;
  if (fill === undefined || foreground === undefined) {
    return undefined;
  }
  const nominal = state === "hover" ? HOVER_STEP : PRESS_STEP;
  return blend(fill, foreground, readableStep(source, role, nominal));
}

/**
 * The fill a filled role paints while it is hovered.
 *
 * The fill moves toward the theme's **foreground** — away from the canvas: a
 * step darker in a light theme, a step lighter in a dark one. The result is an
 * opaque colour that does not depend on what is painted behind the control,
 * which is what a half-alpha fill (`alpha(primary, 0.5)`) got wrong: it let
 * the parent surface through, so the same button hovered on a card and on a
 * dialog read as two different colours.
 *
 * The rule is derived from the theme rather than stored as a role, so a brand
 * that overrides `primary` gets a hover that belongs to it — and the step is
 * **seen** against the fill it replaces: `decorativeFailures` measures it at the
 * perceptibility floor, so a theme whose `foreground` sits on its own action
 * role cannot ship a hover that paints nothing.
 *
 * A theme restored from storage that lost the role or the `foreground` it moves
 * toward answers `undefined` rather than throwing — the rule
 * {@link filledFeedback} and {@link statusTone} follow, so a control keeps its
 * resting fill instead of losing the window — while a `Theme` answers a colour
 * outright.
 *
 * @example
 * ```tsx
 * <div style={{ backgroundColor: filledHover(theme, "primary") }} />
 * ```
 */
export function filledHover(theme: Theme, role: FilledRole): string;
export function filledHover(
  source: FilledFeedbackSource,
  role: FilledRole,
): string | undefined;
export function filledHover(
  source: FilledFeedbackSource,
  role: FilledRole,
): string | undefined {
  return filledFeedback(source, role, "hover");
}

/**
 * The fill a filled role paints while it is pressed. The press is a further
 * step from the fill than the hover, so a held control reads as held — unless
 * the role's label floor stops the step short, which the accent face does in
 * three shipped styles (see `docs/tokens.md` §Action fills). A theme a store
 * truncated answers `undefined`, the absence rule {@link filledHover} follows.
 *
 * @example
 * ```tsx
 * <div style={{ backgroundColor: filledPressed(theme, "accent") }} />
 * ```
 */
export function filledPressed(theme: Theme, role: FilledRole): string;
export function filledPressed(
  source: FilledFeedbackSource,
  role: FilledRole,
): string | undefined;
export function filledPressed(
  source: FilledFeedbackSource,
  role: FilledRole,
): string | undefined {
  return filledFeedback(source, role, "pressed");
}
