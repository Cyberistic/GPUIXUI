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

/** Every status colour family, in documentation order. */
export const statusTones = [
  "info",
  "success",
  "warning",
  "destructive",
] as const;

/** The status colour families a component can announce. */
export type StatusTone = (typeof statusTones)[number];

/**
 * Narrow an unknown value — a tone in a server payload or a stored preference —
 * to a shipped status family. A consumer never retypes the four names.
 */
export const isStatusTone = (value: unknown): value is StatusTone =>
  statusTones.some((tone) => tone === value);

/** The soft status roles an Alert, Badge or Toast spreads. */
export interface StatusToneStyle {
  /** The tone's soft surface (`xSoft`). */
  readonly background: string;
  /** Readable text and icons for that surface (`xSoftForeground`). */
  readonly foreground: string;
  /** The designed edge around the surface (`xSoftBorder`). */
  readonly border: string;
  /**
   * Status text and indicators drawn on a plain surface — `background`, `card`
   * or `popover` (`xText`). The solid roles are fills, so they cannot carry
   * this: the light `warning` is 1.78:1 against the canvas.
   */
  readonly text: string;
}

/**
 * Resolve a status tone to the roles a soft status surface needs. The soft
 * foreground is designed per theme, so no component has to mix a readable text
 * colour from the solid status colour. `text` is the tone's plain-surface
 * foreground, for inline status labels, icons and indicator dots.
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
    border: theme.colors[`${tone}SoftBorder`],
    text: theme.colors[`${tone}Text`],
  };
}

/**
 * The filled control families, in documentation order. Each carries a resting
 * fill, a designed hover and press, and the one foreground that sits on all
 * three. `FilledControlFamily` derives from this list, so a fifth family joins
 * one place.
 */
export const filledControlFamilies = [
  "primary",
  "secondary",
  "destructive",
  "accent",
] as const;

/** A filled control family. */
export type FilledControlFamily = (typeof filledControlFamilies)[number];

/** The four roles a filled control paints. */
export interface FilledControlStyle {
  /** The resting fill (`primary`, `secondary`, `destructive` or `accent`). */
  readonly background: string;
  /** The family foreground, readable on all three fills (`xForeground`). */
  readonly foreground: string;
  /** The designed fill under the pointer (`xHover`). */
  readonly hover: string;
  /** The designed fill while pressed (`xActive`). */
  readonly active: string;
}

/**
 * Resolve a filled control family to its resting, hover and pressed fills and
 * the single foreground readable on all three.
 *
 * A filled control is never an alpha composite: `alpha(fill, 0.5)` takes its
 * colour from the surface behind the control, and the label was designed for
 * the opaque fill — the shipped half-alpha primary hover measures 2.06:1 on a
 * light card. These three roles are opaque, editable in a copied theme, and
 * held to the on-colour floor by the contrast contract.
 *
 * @example
 * ```tsx
 * const states = filledControl(theme, "primary");
 * <div
 *   style={{
 *     backgroundColor: states.background,
 *     color: states.foreground,
 *     hover: { backgroundColor: states.hover },
 *     active: { backgroundColor: states.active },
 *   }}
 * />
 * ```
 */
export function filledControl(
  theme: Theme,
  family: FilledControlFamily,
): FilledControlStyle {
  return {
    background: theme.colors[family],
    foreground: theme.colors[`${family}Foreground`],
    hover: theme.colors[`${family}Hover`],
    active: theme.colors[`${family}Active`],
  };
}

/**
 * Resolve the action family for a tone-tinted status panel.
 *
 * A canvas-tuned wash (`hover`, `active`) and the neutral fill (`secondary`)
 * cannot be perceived on a soft status fill: the four tints sit in a narrow
 * luminance band in each mode, and 80 of the 288 shipped fill-on-tint pairs are
 * under the 1.05:1 floor. An action inside an Alert, Badge or Toast paints this
 * raised family instead. A ghost action skips `background` and uses `hover` and
 * `active` on the panel; a filled action uses all three and its foreground.
 *
 * @example
 * ```ts
 * import { getTheme, softAction } from "@gpuixui/tokens";
 *
 * const action = softAction(getTheme("light"));
 * action.background; // "#FFFFFF"
 * ```
 */
export function softAction(theme: Theme): FilledControlStyle {
  return {
    background: theme.colors.softAction,
    foreground: theme.colors.softActionForeground,
    hover: theme.colors.softActionHover,
    active: theme.colors.softActionActive,
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
 * The published runtime has no `outline*` properties and no `focusVisible`
 * state, and `StyleDesc.boxShadow` is one shadow, so the ring is a zero-offset,
 * zero-blur shadow spread by the theme's `borderWidth.strong`. It draws outside
 * the border box and takes no layout space, which is what an outline would do.
 * Apply it while the control is focused: there is no way to tell a Tab from a
 * click.
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

/** The inherited text-selection style. */
export interface SelectionStyle {
  /** The theme's translucent selection wash. */
  readonly selectionColor: string;
}

/**
 * The text-selection style for a subtree.
 *
 * GPUix's `selectionColor` and `userSelect` inherit, so an application sets the
 * wash once on its root; a chrome subtree that must not be selectable sets
 * `userSelect: "none"` itself. The wash is translucent, so selected text keeps
 * the theme's foreground contrast on the canvas and card the contrast contract
 * measures. Content painted on a filled action uses
 * `selectionStyle(theme, "fill")`: the accent-tinted wash cannot be perceived on
 * the accent fill itself, while the neutral veil steps away from every filled
 * family in both modes.
 *
 * A native `<input>`/`<textarea>` paints its own fixed wash in GPUix 0.10.0 and
 * does not read this property, so a field does not inherit it.
 *
 * @example
 * ```tsx
 * <div style={selectionStyle(theme)}>{children}</div>;
 * ```
 */
export function selectionStyle(
  theme: Theme,
  on: "surface" | "fill" = "surface",
): SelectionStyle {
  return {
    selectionColor:
      on === "fill" ? theme.colors.selectionOnFill : theme.colors.selection,
  };
}
