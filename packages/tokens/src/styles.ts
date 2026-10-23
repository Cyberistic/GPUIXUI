import {
  alpha,
  blend,
  themeColors,
  type ColourSource,
  type ThemeColors,
} from "./color.js";
import { contrastFloorsFor, contrastRatio } from "./contrast.js";
import type { BoxShadow } from "./elevation.js";
import type { ControlSize } from "./scale.js";
import type { Theme, ThemeContrast } from "./theme.js";
import type { FontWeight, TextRole } from "./typography.js";

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
 * Resolve a typographic role to inline style properties.
 *
 * @example
 * ```tsx
 * <text style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}>
 *   Save changes
 * </text>
 * ```
 */
export function textStyle(theme: Theme, role: TextRole): TextStyleProperties {
  const style = theme.typography[role];
  return {
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    fontWeight: style.fontWeight,
    fontFamily: theme.typography[roleFamily[role]],
  };
}

/** Control or input height for a size at the theme's density. */
export const controlHeight = (theme: Theme, size: ControlSize): number =>
  theme.density.controlHeight[size];

/** Horizontal control padding for a size at the theme's density. */
export const controlPaddingX = (theme: Theme, size: ControlSize): number =>
  theme.density.controlPaddingX[size];

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
  const colors = themeColors(theme);
  const background = colors[`${tone}Soft`];
  const foreground = colors[`${tone}SoftForeground`];
  const edge = colors[tone];
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
 * The unconditional focus ring.
 *
 * A zero-offset, zero-blur shadow spread by the theme's `borderWidth.strong`:
 * it draws outside the border box and takes no layout space. Paint it while a
 * control holds focus when the focus arrived programmatically before any
 * keyboard input — a dialog or menu opened by a mouse. For keyboard focus use
 * {@link keyboardFocusRing}, which the runtime paints itself.
 *
 * @example
 * ```tsx
 * <div style={focused ? focusRing(theme) : undefined} />
 * ```
 */
export function focusRing(theme: Theme): FocusRing {
  return {
    boxShadow: {
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadRadius: theme.borderWidth.strong,
      color: theme.colors.ring,
    },
  };
}

/** The outline the runtime paints while a control is focused after keyboard input. */
export interface FocusVisibleOutline {
  /** Line thickness in pixels, from the theme's strong border. */
  readonly outlineWidth: number;
  /** Outline colour, the theme's `ring` role. */
  readonly outlineColor: string;
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
 * @example
 * ```tsx
 * <div style={{ ...keyboardFocusRing(theme), backgroundColor: theme.colors.input }} />
 * ```
 */
export function keyboardFocusRing(theme: Theme): KeyboardFocusRing {
  return {
    focusVisible: {
      outlineWidth: theme.borderWidth.strong,
      outlineColor: theme.colors.ring,
      outlineOffset: theme.borderWidth.strong,
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
  theme: Theme,
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
          outlineColor: theme.colors.destructive,
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
export interface FilledFeedbackSource extends ColourSource {
  /** The contrast variant, whose label floor clamps the step. */
  readonly contrast?: ThemeContrast;
}

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
 * @example
 * ```tsx
 * <div style={{ backgroundColor: filledHover(theme, "primary") }} />
 * ```
 */
export function filledHover(theme: Theme, role: FilledRole): string {
  return blend(
    theme.colors[role],
    theme.colors.foreground,
    readableStep(theme, role, HOVER_STEP),
  );
}

/**
 * The fill a filled role paints while it is pressed. The press is a further
 * step from the fill than the hover, so a held control reads as held — unless
 * the role's label floor stops the step short, which the accent face does in
 * three shipped styles (see `docs/tokens.md` §Action fills).
 *
 * @example
 * ```tsx
 * <div style={{ backgroundColor: filledPressed(theme, "accent") }} />
 * ```
 */
export function filledPressed(theme: Theme, role: FilledRole): string {
  return blend(
    theme.colors[role],
    theme.colors.foreground,
    readableStep(theme, role, PRESS_STEP),
  );
}
