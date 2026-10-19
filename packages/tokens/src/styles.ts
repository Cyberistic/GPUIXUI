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
 * import { getTheme, textStyle } from "@gpuixui/tokens";
 *
 * const theme = getTheme("light");
 *
 * <text style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}>
 *   Save changes
 * </text>;
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

/** The soft status roles a tone-tinted Alert or Badge spreads. */
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
  /**
   * The solid fill and its one readable foreground — the third tonality the
   * status families publish, beside the soft surface and the plain-surface text.
   * The fill is measured on the eight surfaces a status chip sits on
   * (`statusFillPairs`) and the foreground on the fill; a status *dot* is
   * `text`, not this, because the light `warning` fill is 1.78:1 on the canvas,
   * under the 3:1 a mark needs.
   */
  readonly solid: {
    /** The solid fill: `info`, `success`, `warning` or `destructive`. */
    readonly background: string;
    /** The on-colour foreground (`xForeground`). */
    readonly foreground: string;
  };
}

/**
 * Resolve a status tone to the roles a status surface needs. The soft
 * foreground is designed per theme, so no component has to mix a readable text
 * colour from the solid status colour. `text` is the tone's plain-surface
 * foreground, for inline status labels, icons and indicator dots; `solid` is
 * the fill-and-on-colour pair a solid chip paints.
 *
 * A solid chip is a fill on the eight surfaces a chip sits on; a dot or label is
 * `text`, never the solid fill — the light `warning` fill is 1.78:1 on the
 * canvas, under the 3:1 a mark needs.
 *
 * @example
 * ```tsx
 * import { getTheme, statusTone } from "@gpuixui/tokens";
 *
 * const theme = getTheme("light");
 * const tone = statusTone(theme, "info");
 *
 * tone.solid.background; // "#2559D6" in the light theme — the solid chip fill
 * <div
 *   style={{
 *     backgroundColor: tone.background,
 *     borderColor: tone.border,
 *     borderWidth: theme.borderWidth.thin,
 *   }}
 * />;
 * ```
 */
export function statusTone(theme: Theme, tone: StatusTone): StatusToneStyle {
  return {
    background: theme.colors[`${tone}Soft`],
    foreground: theme.colors[`${tone}SoftForeground`],
    border: theme.colors[`${tone}SoftBorder`],
    text: theme.colors[`${tone}Text`],
    solid: {
      background: theme.colors[tone],
      foreground: theme.colors[`${tone}Foreground`],
    },
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
 * import { filledControl, getTheme } from "@gpuixui/tokens";
 *
 * const theme = getTheme("light");
 * const states = filledControl(theme, "primary");
 *
 * <div
 *   style={{
 *     backgroundColor: states.background,
 *     color: states.foreground,
 *     hover: { backgroundColor: states.hover },
 *     active: { backgroundColor: states.active },
 *   }}
 * />;
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

/** The inset focus indicator a filled control paints inside its own box. */
export interface InsetFocusRing {
  /** The family's on-colour, readable on its resting, hover and pressed fills. */
  readonly borderColor: string;
  /** The indicator thickness, the same as the outer ring's spread. */
  readonly borderWidth: number;
}

/**
 * The focus indicator for a filled control that cannot draw the outer shadow —
 * a clipped button inside a group, a calendar day whose cell is the fill, or a
 * selection box. `ring` is designed for the surface behind a control and
 * measures 1.000:1 against `primary` in sixteen shipped sets, so an inset ring
 * painted with it disappears. This returns the family's on-colour instead, which
 * the on-colour pairs already hold on the resting, hover and pressed fill
 * (4.697:1 at the tightest in the shipped sets), at the outer ring's
 * `borderWidth.strong`. A control that already carries a border can apply
 * `borderColor` alone.
 *
 * @example
 * ```ts
 * import { getTheme, insetFocusRing } from "@gpuixui/tokens";
 *
 * const focused = insetFocusRing(getTheme("dark"), "primary");
 * focused.borderColor; // primaryForeground
 * ```
 */
export function insetFocusRing(
  theme: Theme,
  family: FilledControlFamily,
): InsetFocusRing {
  return {
    borderColor: filledControl(theme, family).foreground,
    borderWidth: theme.borderWidth.strong,
  };
}

/**
 * Resolve the action family for a tone-tinted status panel.
 *
 * A canvas-tuned wash (`hover`, `active`) and the neutral fill (`secondary`)
 * cannot be perceived on a soft status fill: the four tints sit in a narrow
 * luminance band in each mode, and 84 of the 288 shipped fill-on-tint pairs are
 * under the 1.05:1 floor. An action inside a tone-tinted Alert or Badge paints
 * this raised family instead. A ghost action skips `background` and paints
 * `softActionHover` and `softActionActive` on the panel; a filled action uses
 * all three and its foreground.
 * A Toast is a `popover` card, so its action paints the canvas neutral family
 * (`filledControl(theme, "secondary")`) — `softAction` equals the card in every
 * light shipped set.
 *
 * A disabled filled action keeps this resting `background` and paints
 * `disabledForeground` instead of the foreground; it does not step, because a
 * disabled control receives no pointer state. The canvas `disabled` fill is not
 * a panel shape (1.0066:1 on XP light's `warningSoft`), so the raised fill is
 * the action's outline in both states. `inactivePanelActionPairs` measures the
 * label.
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

/** The style properties a disabled control paints. */
export interface DisabledControlStyle {
  /** `1`, so a parent's dim cannot reach the control. */
  readonly opacity: number;
  /** The disabled fill (`disabled`). */
  readonly backgroundColor: string;
  /** The unavailable label (`disabledForeground`). */
  readonly color: string;
  /** The control edge that carries the shape (`border`). */
  readonly borderColor: string;
}

/**
 * The designed disabled state for a control on a normal panel.
 *
 * A disabled control is three roles, not a fade. GPUI composites an element and
 * its children as one group (`StyleDesc.opacity`), so `opacity: 0.5` dims the
 * label with the fill it sits on: a filled primary action's label measures
 * **1.575:1** on the identity light canvas and **1.468:1** at worst (Linux
 * light, a card), and a disabled field's typed text **3.273:1** on the macOS
 * light `input` fill, under the 3:1 `inactive` floor. The fill is allowed to sit
 * near the panel — no neutral clears both a white card and the quiet panel — so
 * the `border` edge carries the control's shape.
 *
 * Inside a tone-tinted status panel the canvas `disabled` fill is not a panel
 * shape: keep the resting `softAction` fill and paint `disabledForeground`
 * (`inactivePanelActionPairs`). A disabled control receives no pointer state,
 * so it never steps to a hover or press fill.
 *
 * @example
 * ```ts
 * import { disabledControl, getTheme } from "@gpuixui/tokens";
 *
 * const style = disabledControl(getTheme("light"));
 * style.opacity; // 1
 * style.backgroundColor; // the disabled fill
 * ```
 */
export function disabledControl(theme: Theme): DisabledControlStyle {
  return {
    opacity: 1,
    backgroundColor: theme.colors.disabled,
    color: theme.colors.disabledForeground,
    borderColor: theme.colors.border,
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
 * import { focusRing, getTheme } from "@gpuixui/tokens";
 *
 * const theme = getTheme("light");
 * const focused = true;
 *
 * <div style={focused ? focusRing(theme) : undefined} />;
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
 * measures. Content painted on an opaque filled surface — a filled action such
 * as `softAction`, or a solid status chip — uses `selectionStyle(theme, "fill")`:
 * the accent-tinted wash cannot be perceived on those fills, while the neutral
 * veil steps away from every one of them in both modes.
 *
 * A native `<input>`/`<textarea>` paints its own fixed wash in GPUix 0.10.0 and
 * does not read this property, so a field does not inherit it.
 *
 * @example
 * ```tsx
 * import { getTheme, selectionStyle } from "@gpuixui/tokens";
 *
 * const theme = getTheme("light");
 *
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

/** The runtime `theme` prop subset a native text field reads. */
export interface NativeFieldTheme {
  /** The text-insertion caret the native editor paints. */
  readonly caret: string;
}

/**
 * The `theme` prop for a native `<input>`/`<textarea>`.
 *
 * GPUix 0.10.0's editor takes typed text from the element's `style.color`,
 * paints its own fixed placeholder and selection, and reads exactly one field
 * from its `theme` prop: `caret`. The caret is the accent's readable **ink** —
 * `primaryText` — not the `primary` fill: a caret is a 1px mark painted on the
 * field's surface, and the fill is tuned for a label on top of it. On the
 * shipped macOS dark set the fill measures **2.748:1** on a selected row and
 * **2.836:1** on a pressed one, under the 3:1 mark floor, so a caret in an
 * in-place editor (`InlineEdit`, which plan 527 holds on the four row washes)
 * vanished there. `primaryText` clears the floor on every surface a field sits
 * on — {@link caretPairs} publishes the nine — in all 24 shipped sets (5.587:1
 * at the tightest).
 *
 * Without this prop the field keeps the runtime's built-in dark caret, which
 * measures 3.129:1 on the AAA light `input` and 2.795:1 on its quiet panel,
 * under the 4.5:1 mark floor. A consumer that wants a different caret replaces
 * the field of the returned object.
 *
 * @example
 * ```tsx
 * import { nativeFieldTheme } from "@gpuixui/tokens";
 *
 * <input
 *   style={{ color: theme.colors.inputForeground }}
 *   theme={nativeFieldTheme(theme)}
 * />;
 * ```
 */
export function nativeFieldTheme(theme: Theme): NativeFieldTheme {
  return { caret: theme.colors.primaryText };
}
