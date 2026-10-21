import { alpha, blend } from "./color.js";
import type { BoxShadow } from "./elevation.js";
import type { ControlSize } from "./scale.js";
import type { Theme } from "./theme.js";
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

/** The four status colour families a component can announce. */
export type StatusTone = "info" | "success" | "warning" | "destructive";

/** The soft status roles an Alert, Badge or Toast spreads. */
export interface StatusToneStyle {
  /** The tone's soft surface (`xSoft`). */
  readonly background: string;
  /** Readable text and icons for that surface (`xSoftForeground`). */
  readonly foreground: string;
  /** The tone's solid colour at 30% alpha, for the surface edge. */
  readonly border: string;
}

/**
 * Resolve a status tone to the roles a soft status surface needs. The soft
 * foreground is designed per theme, so no component has to mix a readable text
 * colour from the solid status colour.
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
export function statusTone(theme: Theme, tone: StatusTone): StatusToneStyle {
  return {
    background: theme.colors[`${tone}Soft`],
    foreground: theme.colors[`${tone}SoftForeground`],
    border: alpha(theme.colors[tone], 0.3),
  };
}

/** A focus ring, as the runtime's single-shadow shape. */
export interface FocusRing {
  /** The shadow a component paints while it holds focus. */
  readonly boxShadow: BoxShadow;
}

/**
 * The keyboard-focus ring.
 *
 * A zero-offset, zero-blur shadow spread by the theme's `borderWidth.strong`: it
 * draws outside the border box and takes no layout space, which is what an
 * outline does. The library paints it while the control holds focus, so a mouse
 * press shows it too. The published runtime at the time had no `outline*` and no
 * `focusVisible`; `@gpuix/native@0.11.0` declares both, and plan 053 replaces
 * this shape once a native probe proves the paint.
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

/**
 * The action families a control paints as a solid fill.
 *
 * Each one has a role of its own (`primary`, `secondary`, `destructive`) and a
 * matching foreground, so a filled control states its intent in colour and
 * keeps its label readable.
 */
export type FilledAction = "primary" | "secondary" | "destructive";

/**
 * How far a filled action's hover moves from its fill, as a share of the way
 * to the theme's foreground.
 */
const HOVER_STEP = 0.12;

/**
 * How far a filled action's press moves from its fill. A press is a further
 * step than the hover, and it stops where the on-colour text would lose its
 * contrast floor: in the high-contrast dark theme a filled secondary button
 * has room for 18% and no more.
 */
const PRESS_STEP = 0.18;

/** A filled action's fill after moving `step` of the way to the foreground. */
const filledFill = (theme: Theme, action: FilledAction, step: number): string =>
  blend(theme.colors[action], theme.colors.foreground, step);

/**
 * The fill a filled action paints while it is hovered.
 *
 * The fill moves toward the theme's **foreground** — away from the canvas: a
 * step darker in a light theme, a step lighter in a dark one. The result is an
 * opaque colour that does not depend on what is painted behind the control,
 * which is what a half-alpha fill (`alpha(primary, 0.5)`) got wrong: it let
 * the parent surface through, so the same button hovered on a card and on a
 * dialog read as two different colours.
 *
 * The rule is derived from the theme rather than stored as a role, so a brand
 * that overrides `primary` gets a hover that belongs to it.
 *
 * @example
 * ```tsx
 * <div style={{ backgroundColor: filledHover(theme, "primary") }} />
 * ```
 */
export function filledHover(theme: Theme, action: FilledAction): string {
  return filledFill(theme, action, HOVER_STEP);
}

/**
 * The fill a filled action paints while it is pressed. The press is a further
 * step from the fill than the hover, so a held button reads as held.
 *
 * @example
 * ```tsx
 * <div style={{ backgroundColor: filledPressed(theme, "primary") }} />
 * ```
 */
export function filledPressed(theme: Theme, action: FilledAction): string {
  return filledFill(theme, action, PRESS_STEP);
}
