/**
 * The single point where a semantic decision becomes a GPUix `StyleDesc`.
 *
 * GPUix has no CSS: every visual property is a JavaScript value on the element.
 * If components built those values themselves, the library would have as many
 * design systems as it has components. So each component describes *what it is*
 * — a `ControlSpec`, a `TextSpec`, a `SurfaceSpec` — and this module decides how
 * that looks, once, from the theme.
 *
 * Everything here is pure, which is also what makes the visual layer provable
 * without a rendering runtime.
 */

import type { StyleDesc } from "@gpuix/react";
import {
  brandText,
  disabledAction,
  disabledOpacity,
  elevationShadow,
  targetSize,
  type FilledAction,
} from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import type {
  ColorRef,
  ControlSize,
  ElevationLevel,
  PrimitiveTheme,
  RadiusStep,
  SpaceStep,
  TextRole,
} from "./theme.js";
import { controlRing } from "./focus.js";
import { type Orientation, orientationOf } from "./keyboard.js";
import { pressWash } from "./pointer.js";
import {
  borderWidthOf,
  colorRole,
  controlHeightOf,
  controlPaddingOf,
  familyOf,
  iconSideOf,
  radiusStep,
  radiusValue,
  spaceValue,
  typeOf,
} from "./theme.js";
import { fieldVariant } from "./variants.js";

/**
 * A colour reference into the theme, or nothing at all.
 *
 * A spec deliberately has *no* background rather than a transparent one: an
 * absent paint leaves the surface alone, which is what makes a ghost control
 * work without relying on the runtime understanding `transparent`.
 */
type Paint = ColorRef | undefined;

const paint = (ref: Paint, theme: PrimitiveTheme): string | undefined =>
  Option.getOrUndefined(
    Option.map(Option.fromNullishOr(ref), (colorRef) => colorRef(theme)),
  );

// ── Controls: Button, Input, Select ──────────────────────────────────

/** A variant is a set of colour references, not colours. */
export interface ControlVariant {
  /** Absent for an outline or ghost control: it paints no fill at rest. */
  readonly background: Paint;
  readonly foreground: ColorRef;
  readonly border: Paint;
  /**
   * The action whose fill this variant paints, when the fill is one of the
   * three filled actions.
   *
   * A field paints a fill too, but its fill is a content surface rather than an
   * action, so it declares nothing here. The distinction decides the disabled
   * paint: a filled action wears the measured neutral pair, a field or an
   * unfilled control fades.
   */
  readonly filledAction?: FilledAction;
  /**
   * Declared verbatim in `style.hover`. A variant must give some feedback — a
   * change of fill, of border or of decoration — so this is not optional.
   */
  readonly hover: (theme: PrimitiveTheme) => StyleDesc;
  readonly active: (theme: PrimitiveTheme) => StyleDesc;
}

/** The gap between a control's icon and its label, on the spacing scale. */
const CONTROL_GAP: SpaceStep = "sm";

export interface ControlSpec {
  readonly variant: ControlVariant;
  readonly size: ControlSize;
  /** Equal width and height, and no horizontal padding: an icon-only control. */
  readonly square?: boolean;
  readonly fullWidth?: boolean;
  readonly disabled?: boolean;
  /**
   * Validation failed: the border and ring switch to the destructive role.
   *
   * The fill does not change. `destructive` is designed to carry
   * `destructiveForeground`, so painting it behind a field's value leaves the
   * text at 2.45:1 in the dark theme; `contrastPairs` measures the pair that
   * stays — `inputForeground` on `input` — and the edge is what says invalid.
   */
  readonly invalid?: boolean;
}

/**
 * Resolve a control's chrome.
 *
 * Hover and active are **declared** in `style.hover`/`style.active`, which GPUI
 * applies natively — no `onMouseEnter` state, no re-render per pointer move.
 */
export const controlStyle = (
  spec: ControlSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const { variant, size } = spec;
  const height = controlHeightOf(theme, size);
  const padding = controlPaddingOf(theme, size);
  const label = typeOf(theme, "label");
  const rest = paint(variant.background, theme);
  const border =
    spec.invalid === true
      ? colorRole(theme, "destructive")
      : paint(variant.border, theme);

  const style: StyleDesc = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spaceValue(theme, CONTROL_GAP),
    height,
    borderRadius: radiusValue(theme, "md"),
    fontSize: label.fontSize,
    lineHeight: label.lineHeight,
    fontWeight: label.fontWeight,
    backgroundColor: rest,
    color: paint(variant.foreground, theme),
    borderWidth:
      variant.border === undefined ? 0 : borderWidthOf(theme, "thin"),
    borderColor: border,
    paddingLeft: padding,
    paddingRight: padding,
    cursor: spec.disabled === true ? "not-allowed" : "pointer",
  };

  if (spec.disabled === true) {
    // A disabled control must not respond to the pointer at all.
    //
    // A filled action wears the neutral pair `contrastPairs` measures on every
    // surface a control sits on: a 50% fade composites the label into whatever
    // is behind it and lands at 1.47:1–1.49:1 on the card of four light styles
    // (`disabled.test.ts` in `@gpuixui/tokens`). A field is measured on every
    // content surface it sits on and clears the floor there, and an unfilled
    // control has no fill to collapse into, so both keep the fade.
    const pair =
      variant.filledAction === undefined ? undefined : disabledAction(theme);
    if (pair === undefined) {
      style.opacity = disabledOpacity;
    } else {
      style.backgroundColor = pair.backgroundColor;
      style.color = pair.color;
    }
    style.hover = { backgroundColor: style.backgroundColor };
    style.active = { backgroundColor: style.backgroundColor };
  } else {
    style.hover = variant.hover(theme);
    style.active = variant.active(theme);
  }
  if (spec.square === true) {
    style.width = height;
    style.paddingLeft = 0;
    style.paddingRight = 0;
  }
  if (spec.fullWidth === true) style.width = "100%";
  return style;
};

/**
 * The keyboard ring a control declares at rest.
 *
 * `@gpuixui/tokens`' `keyboardFocusRing` is the runtime's `focusVisible` outline:
 * painted after keyboard input, never after a mouse press, and it takes no
 * layout space. Only the colour changes for an invalid control. It is merged by
 * the component, after the recipe, because the ring is state the paint declares
 * once and the resting style is what the recipe oracle compares.
 */
export const controlFocusStyle = (
  spec: ControlSpec,
  theme: PrimitiveTheme,
): StyleDesc =>
  controlRing(theme, { disabled: spec.disabled, invalid: spec.invalid });

/**
 * What a text field adds over the shared control chrome.
 *
 * A field is not a button: its content starts at the left, it takes the body
 * type rather than the label type, and its text is selectable because it is
 * the user's content.
 */
export const fieldTextStyle = (theme: PrimitiveTheme): StyleDesc => {
  const body = typeOf(theme, "body");
  return {
    justifyContent: "flex-start",
    fontSize: body.fontSize,
    lineHeight: body.lineHeight,
    fontWeight: body.fontWeight,
    cursor: "text",
    userSelect: "text",
    selectionColor: colorRole(theme, "selection"),
  };
};

/**
 * The native text theme for an `<input>`/`<textarea>`/`<code>` element.
 *
 * GPUix's native text components take their own `theme` prop, and a host given
 * none layers its text on the runtime's built-in dark palette. The mapping is
 * owned and measured by `@gpuixui/tokens` (`nativeTextTheme`), including the
 * fill its value and placeholder sit on; this package re-exports that one
 * function so a field and the token contract cannot disagree.
 */
export {
  nativeTextFills,
  nativeTextTheme,
  type NativeTextFill,
  type NativeTextTheme,
} from "@gpuixui/tokens";

// ── Text ─────────────────────────────────────────────────────────────

/** What a run of text means, which decides its colour. */
export const TEXT_TONES = [
  "default",
  "muted",
  "primary",
  "destructive",
  "inherit",
] as const;

export type TextTone = (typeof TEXT_TONES)[number];

const TEXT_TONE_NAMES: ReadonlyArray<string> = TEXT_TONES;

/**
 * Whether a value names a text tone.
 *
 * A tone is a stored choice as often as a literal — an audit row, a saved
 * message, a settings record carries the tone it was written with.
 */
export const isTextTone = (value: unknown): value is TextTone =>
  typeof value === "string" && Arr.contains(TEXT_TONE_NAMES, value);

/**
 * The tone a run paints with: the name, or the documented `default`.
 *
 * Indexed raw, a name a release renamed resolved to no colour at all, so the
 * run inherited the surface behind it instead of the ink the component
 * documents — an error line reading as ordinary copy.
 */
export const textToneOf = (value: unknown): TextTone =>
  isTextTone(value) ? value : "default";

const tones: Record<TextTone, Paint> = {
  default: (theme) => colorRole(theme, "foreground"),
  muted: (theme) => colorRole(theme, "mutedForeground"),
  /** `primary` is a fill role, so brand text is the derived colour, as a link. */
  primary: brandText,
  /** The status text role tokens measure as page text, not the solid fill. */
  destructive: (theme) => colorRole(theme, "destructiveSoftForeground"),
  /** Take the colour already in effect — for text on a coloured surface. */
  inherit: undefined,
};

/**
 * The colour a tone resolves to, or nothing for `inherit`.
 *
 * Exported so an icon can take the same tone as the text beside it without
 * naming a colour.
 */
export const toneColor = (
  theme: PrimitiveTheme,
  tone: TextTone,
): string | undefined => paint(tones[textToneOf(tone)], theme);

export const TEXT_ALIGNMENTS = ["start", "center", "end"] as const;
export type TextAlign = (typeof TEXT_ALIGNMENTS)[number];

/**
 * The alignment values the runtime parses.
 *
 * GPUix has no writing direction, so its text host understands `left`, `center`
 * and `right` (and reads `start` as left) but **not** `end`: handed `end` it
 * paints the default, so a right-aligned run stayed left. The API keeps the
 * direction-neutral names and every painter resolves through this one table.
 */
const ALIGN_VALUES: Readonly<Record<TextAlign, "left" | "center" | "right">> = {
  start: "left",
  center: "center",
  end: "right",
};

/**
 * A value of the runtime's text-alignment grammar.
 *
 * The mapping lives here so the resolver and the recipe cannot disagree: a
 * caller's `end` reaches the runtime as `right`, which it paints.
 */
export const textAlignValue = (align: TextAlign): "left" | "center" | "right" =>
  ALIGN_VALUES[align];

/**
 * Whether a value names an alignment.
 *
 * An alignment is a stored choice as often as a literal — a saved caption, a
 * restored column — so a name a release does not carry is the runtime's own
 * default (no declaration) rather than an unknown string handed to the host.
 */
export const isTextAlign = (align: unknown): align is TextAlign =>
  P.isString(align) && Arr.contains(TEXT_ALIGNMENTS, align);

/** The alignment a stored name stands for, or absence where it carries none. */
export const textAlignOf = (align: unknown): TextAlign | undefined =>
  isTextAlign(align) ? align : undefined;

export interface TextSpec {
  readonly role: TextRole;
  readonly tone: TextTone;
  readonly align?: TextAlign;
  readonly truncate?: boolean;
  /** Maximum visible lines: a box at the role's leading, clipped below it. */
  readonly clamp?: number;
  /** Selectable text: off by default for chrome, on for content. */
  readonly selectable?: boolean;
}

/** Roles whose family is the monospace face. */
const MONO_ROLES: ReadonlyArray<TextRole> = ["code", "codeBlock"];

/**
 * The line count a clamp asks for, floored to at least one.
 *
 * A count that never arrived (`NaN`) or a non-positive one would resolve a
 * zero-height box that paints nothing; one line is the minimum a clamp can
 * mean, the same floor the grid's track count takes.
 */
export const clampLines = (clamp: number): number =>
  Number.isFinite(clamp) ? Math.max(1, Math.floor(clamp)) : 1;

export const textStyle = (spec: TextSpec, theme: PrimitiveTheme): StyleDesc => {
  const role = typeOf(theme, spec.role);
  const style: StyleDesc = {
    fontSize: role.fontSize,
    lineHeight: role.lineHeight,
    fontWeight: role.fontWeight,
    fontFamily: Arr.contains(MONO_ROLES, spec.role)
      ? familyOf(theme, "mono")
      : familyOf(theme, "sans"),
    color: toneColor(theme, spec.tone),
    userSelect: spec.selectable === true ? "text" : "none",
  };
  const align = textAlignOf(spec.align);
  if (align !== undefined) style.textAlign = textAlignValue(align);
  // A selectable run paints the design system's wash, not the runtime's
  // accent-at-35% default: `selection` is the role the token contract measures.
  if (spec.selectable === true)
    style.selectionColor = colorRole(theme, "selection");
  if (spec.truncate === true) {
    style.whiteSpace = "nowrap";
    style.textOverflow = "ellipsis";
  }
  if (spec.clamp !== undefined) {
    // `lineClamp` is declared by 0.11.0 and paints every line (measured by the
    // playground's `text-truncation` probe), so the cut is a definite box: the
    // line count times the role's own leading, with a hidden overflow.
    style.whiteSpace = "normal";
    style.height = role.lineHeight * clampLines(spec.clamp);
    style.overflow = "hidden";
  }
  return style;
};

// ── Surfaces ─────────────────────────────────────────────────────────

export const SURFACE_TONES = [
  "none",
  "background",
  "card",
  "popover",
  "muted",
  "accent",
  "selected",
  "skeleton",
] as const;

export type SurfaceTone = (typeof SURFACE_TONES)[number];

const surfaces: Record<SurfaceTone, Paint> = {
  none: undefined,
  background: (theme) => colorRole(theme, "background"),
  card: (theme) => colorRole(theme, "card"),
  popover: (theme) => colorRole(theme, "popover"),
  muted: (theme) => colorRole(theme, "muted"),
  accent: (theme) => colorRole(theme, "accent"),
  selected: (theme) => colorRole(theme, "selected"),
  skeleton: (theme) => colorRole(theme, "skeleton"),
};

/** The two edge styles the runtime paints. */
export const BORDER_STYLES = ["solid", "dashed"] as const;
export type BorderStyle = (typeof BORDER_STYLES)[number];

export interface SurfaceSpec {
  readonly tone: SurfaceTone;
  /** A step on the theme's spacing scale, or absent for no padding. */
  readonly padding?: SpaceStep;
  /** A step on the theme's spacing scale, or absent to keep `padding`. */
  readonly paddingX?: SpaceStep;
  /** A step on the theme's spacing scale, or absent to keep `padding`. */
  readonly paddingY?: SpaceStep;
  readonly radius?: RadiusStep;
  readonly border?: boolean;
  /**
   * The edge a border paints. Defaults to the runtime's solid, and does nothing
   * without `border`: a style is not a rule.
   */
  readonly borderStyle?: BorderStyle;
  /**
   * Width divided by height. The runtime fills in whichever axis has no
   * definite size, so a thumbnail needs one side, not two.
   *
   * A ratio the renderer cannot divide by (`NaN`, `0`, a negative) is dropped
   * rather than painted as a square.
   */
  readonly aspectRatio?: number;
  readonly elevation?: ElevationLevel;
}

/** The padding each side resolves to, after `paddingX`/`paddingY` override. */
export interface PaddingSides {
  readonly top?: SpaceStep;
  readonly right?: SpaceStep;
  readonly bottom?: SpaceStep;
  readonly left?: SpaceStep;
}

/** `padding` sets all four sides; an axis prop overrides only its own. */
export const paddingSides = ({
  padding,
  paddingX,
  paddingY,
}: Pick<SurfaceSpec, "padding" | "paddingX" | "paddingY">): PaddingSides =>
  paddingX === undefined && paddingY === undefined
    ? { top: padding, right: padding, bottom: padding, left: padding }
    : {
        top: paddingY ?? padding,
        right: paddingX ?? padding,
        bottom: paddingY ?? padding,
        left: paddingX ?? padding,
      };

/** A ratio the renderer can divide by, or nothing. */
export const paintableAspectRatio = (
  aspectRatio: number | undefined,
): number | undefined =>
  aspectRatio !== undefined && Number.isFinite(aspectRatio) && aspectRatio > 0
    ? aspectRatio
    : undefined;

export const surfaceStyle = (
  spec: SurfaceSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const style: StyleDesc = {
    display: "flex",
    flexDirection: "column",
    backgroundColor: paint(surfaces[spec.tone], theme),
  };
  const sides = paddingSides(spec);
  if (spec.paddingX === undefined && spec.paddingY === undefined) {
    if (sides.top !== undefined) style.padding = spaceValue(theme, sides.top);
  } else {
    if (sides.top !== undefined)
      style.paddingTop = spaceValue(theme, sides.top);
    if (sides.right !== undefined)
      style.paddingRight = spaceValue(theme, sides.right);
    if (sides.bottom !== undefined)
      style.paddingBottom = spaceValue(theme, sides.bottom);
    if (sides.left !== undefined)
      style.paddingLeft = spaceValue(theme, sides.left);
  }
  const corner = radiusStep(spec.radius);
  if (corner !== undefined) style.borderRadius = radiusValue(theme, corner);
  if (spec.border === true) {
    style.borderWidth = borderWidthOf(theme, "thin");
    style.borderColor = colorRole(theme, "border");
    if (spec.borderStyle === "dashed") style.borderStyle = "dashed";
  }
  Option.map(
    Option.fromNullishOr(paintableAspectRatio(spec.aspectRatio)),
    (ratio) => {
      style.aspectRatio = ratio;
    },
  );
  if (spec.elevation !== undefined) {
    Option.map(
      Option.fromNullishOr(elevationShadow(theme, spec.elevation)),
      (shadow) => {
        style.boxShadow = shadow;
      },
    );
  }
  return style;
};

// ── Rules, scrollers, progress ───────────────────────────────────────

export interface RuleSpec {
  /**
   * Which way the rule runs.
   *
   * An orientation is a stored layout choice — a saved workspace records the
   * axis each divider runs on — so a name this release renamed or dropped
   * arrives as a string the union no longer names. Read raw, the two paint
   * paths disagreed: the rule drew the **vertical** hairline while the caption
   * branch kept the caption, which is the one shape a separator cannot be. The
   * name is resolved once through `orientationOf`, against the horizontal rule
   * a region divider is drawn in.
   */
  readonly orientation: Orientation;
  /** A step on the spacing scale, applied to both ends of the rule. */
  readonly inset?: SpaceStep;
}

/** A separator: one border, on the theme's border colour, never a literal. */
export const ruleStyle = (spec: RuleSpec, theme: PrimitiveTheme): StyleDesc => {
  const inset = spec.inset === undefined ? 0 : spaceValue(theme, spec.inset);
  return orientationOf(spec.orientation, "horizontal") === "horizontal"
    ? {
        height: borderWidthOf(theme, "thin"),
        flexShrink: 0,
        backgroundColor: colorRole(theme, "border"),
        marginLeft: inset,
        marginRight: inset,
      }
    : {
        width: borderWidthOf(theme, "thin"),
        flexShrink: 0,
        backgroundColor: colorRole(theme, "border"),
        marginTop: inset,
        marginBottom: inset,
      };
};

/** The axes a scroll container can paint. */
export const SCROLL_AXES = ["vertical", "horizontal", "both"] as const;

/** The overflow axes a scroll container paints. */
export type ScrollAxis = (typeof SCROLL_AXES)[number];

const SCROLL_AXIS_NAMES: ReadonlyArray<string> = SCROLL_AXES;

/** Whether a value names a scroll axis. */
export const isScrollAxis = (value: unknown): value is ScrollAxis =>
  P.isString(value) && Arr.contains(SCROLL_AXIS_NAMES, value);

/**
 * The axis a scroll container paints and moves on.
 *
 * An axis is a stored layout choice as often as a literal — a restored panel, a
 * split-pane record, a workspace layout — so a name this release renamed or
 * dropped arrives as a string the union no longer names. `ScrollArea` documents
 * `vertical` as its default, so that is what such a name reads as; read raw, an
 * unknown name painted **both** scrollbars and left the keyboard contract with
 * no axis to move on, so the one tab stop in the region answered no key at all.
 */
export const scrollAxis = (value: unknown): ScrollAxis =>
  isScrollAxis(value) ? value : "vertical";

export interface ScrollSpec {
  readonly axis: ScrollAxis;
}

/**
 * A scrollable container's overflow axes.
 *
 * The axes are theme-free, so they stay in this resolver. The thumb tint
 * (`colorRole(theme, "scrollbar")`) and thickness belong to the viewport, which has a
 * theme: `ScrollArea`'s `ScrollAreaViewport` sets the runtime's real
 * `scrollbarColor`/`scrollbarWidth` (verified on 0.11.0). There is still no
 * fade mask and no per-part thumb to configure.
 */
export const scrollStyle = (spec: ScrollSpec): StyleDesc => {
  const axis = scrollAxis(spec.axis);
  return {
    overflowY: axis === "horizontal" ? "hidden" : "scroll",
    overflowX: axis === "vertical" ? "hidden" : "scroll",
  };
};

/**
 * Clamp a progress value to the 0–100 the track can actually paint.
 *
 * A share reaches a bar from a saved record as often as from a literal, so it is
 * read as the data it is: a number is clamped, `Infinity` means "past the end"
 * and is the whole track, and anything else is **empty** — a numeric `NaN`, text
 * a store wrote, an absent field. `Number.isNaN` answers `true` only for a
 * numeric `NaN`, so a share written as text passed the guard and left `Math.max`
 * as `NaN`: the fill's width became `"NaN%"`, which the runtime paints as no
 * width at all, and the announced share read `"NaN%"`. An unknown progress must
 * never look finished.
 */
export const progressPercent = (value: unknown): number =>
  typeof value === "number" && !Number.isNaN(value)
    ? Math.min(100, Math.max(0, value))
    : 0;

export const PROGRESS_TONES = [
  "primary",
  "success",
  "destructive",
  "muted",
] as const;

export type ProgressTone = (typeof PROGRESS_TONES)[number];

const PROGRESS_TONE_NAMES: ReadonlyArray<string> = PROGRESS_TONES;

const progressTones: Record<ProgressTone, ColorRef> = {
  primary: brandText,
  success: (theme) => colorRole(theme, "success"),
  destructive: (theme) => colorRole(theme, "destructive"),
  muted: (theme) => colorRole(theme, "mutedForeground"),
};

/**
 * The two heights a bar is built in — a progress and a meter share the table.
 *
 * A bar is a widget a dashboard stores, so its size is a name from another
 * release as often as a literal: indexing the height table with one answered
 * `undefined`, and the recipe asked the compiler for `h-space-undefined` — a
 * track with no height at all.
 */
export const PROGRESS_SIZES = ["sm", "md"] as const;
export type ProgressSize = (typeof PROGRESS_SIZES)[number];

const PROGRESS_SIZE_NAMES: ReadonlyArray<string> = PROGRESS_SIZES;

/** Whether a value names a bar height. */
export const isProgressSize = (value: unknown): value is ProgressSize =>
  typeof value === "string" && Arr.contains(PROGRESS_SIZE_NAMES, value);

/** The bar's height step: the name, or the documented `md` default. */
export const progressSizeOf = (value: unknown): ProgressSize =>
  isProgressSize(value) ? value : "md";

/** Whether a value names a bar tone. */
export const isProgressTone = (value: unknown): value is ProgressTone =>
  typeof value === "string" && Arr.contains(PROGRESS_TONE_NAMES, value);

/**
 * The tone a bar paints with: the name, or the documented `primary` default.
 *
 * Indexed raw, a stored tone resolved to no colour at all — the value's whole
 * fill was transparent, so a finished task or a measured gauge read as an empty
 * track while its label announced the number.
 */
export const progressToneOf = (value: unknown): ProgressTone =>
  isProgressTone(value) ? value : "primary";

export interface ProgressSpec {
  readonly value?: number;
  readonly tone: ProgressTone;
  readonly size: ProgressSize;
}

const PROGRESS_HEIGHT: Record<ProgressSize, SpaceStep> = {
  sm: "xs",
  md: "sm",
};

/** The track: full width, one spacing step tall, one step off the surface. */
export const progressTrackStyle = (
  spec: ProgressSpec,
  theme: PrimitiveTheme,
): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  width: "100%",
  height: spaceValue(theme, PROGRESS_HEIGHT[progressSizeOf(spec.size)]),
  borderRadius: radiusValue(theme, "full"),
  backgroundColor: colorRole(theme, "muted"),
  overflow: "hidden",
});

/** The fill. A value outside 0–100 is clamped, never painted out of the track. */
export const progressFillStyle = (
  spec: ProgressSpec,
  theme: PrimitiveTheme,
): StyleDesc => ({
  height: "100%",
  width: `${progressPercent(spec.value ?? 0)}%`,
  borderRadius: radiusValue(theme, "full"),
  backgroundColor: paint(progressTones[progressToneOf(spec.tone)], theme),
});

// ── Value controls: Slider, RangeSlider ──────────────────────────────

/** The axis a value control runs along. */
export const SLIDER_ORIENTATIONS = ["horizontal", "vertical"] as const;
export type SliderOrientation = (typeof SLIDER_ORIENTATIONS)[number];

export interface SliderSpec {
  readonly size: ControlSize;
  readonly invalid?: boolean;
  readonly disabled?: boolean;
  /** Defaults to `horizontal`. A vertical track needs a definite height. */
  readonly orientation?: SliderOrientation;
}

const isVertical = (spec: Pick<SliderSpec, "orientation">): boolean =>
  spec.orientation === "vertical";

/**
 * Half a thumb — the track's inset, and the same number `pointerValue` takes.
 *
 * The usable span runs from one thumb radius inside each end to the other, so
 * a thumb at either end is centred on the end of the span instead of hanging
 * off it.
 */
export const sliderInset = (size: ControlSize, theme: PrimitiveTheme): number =>
  Math.round(iconSideOf(theme, size) / 2);

/**
 * The slider's hit area.
 *
 * It paints nothing — the rail is the only visible chrome, so a slider does not
 * become a bar as tall as the control — and it still takes presses: GPUI makes a
 * hitbox for an element with mouse handlers (measured in plan 053 §11; an
 * unpositioned, unfilled box with handlers receives the press).
 *
 * The vertical axis is the same box turned on its side: the control's height
 * becomes its width and the track takes the caller's height, because a value
 * that runs up has no natural length.
 */
export const sliderTrackStyle = (
  spec: SliderSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const inset = sliderInset(spec.size, theme);
  const control = controlHeightOf(theme, spec.size);
  const style: StyleDesc = isVertical(spec)
    ? {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: control,
        height: "100%",
        paddingTop: inset,
        paddingBottom: inset,
      }
    : {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        height: control,
        paddingLeft: inset,
        paddingRight: inset,
      };
  style.cursor = spec.disabled === true ? "not-allowed" : "pointer";
  if (spec.disabled === true) style.opacity = disabledOpacity;
  return style;
};

/**
 * The rail: the whole length, one spacing step thick, and never a hit target.
 *
 * The length follows the axis, so a vertical rail is as tall as the rotated
 * track and one spacing step wide.
 */
export const sliderRailStyle = (
  spec: SliderSpec,
  theme: PrimitiveTheme,
): StyleDesc =>
  isVertical(spec)
    ? {
        width: spaceValue(theme, "xs"),
        height: "100%",
        borderRadius: radiusValue(theme, "full"),
        backgroundColor: colorRole(theme, "muted"),
        display: "flex",
        // The runtime has no `column-reverse`, so the track reverses its parts
        // and packs them to the floor: the start's fill is the bottom one and
        // the axis reads from the value's floor to its ceiling.
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        pointerEvents: "none",
      }
    : {
        width: "100%",
        height: spaceValue(theme, "xs"),
        borderRadius: radiusValue(theme, "full"),
        backgroundColor: colorRole(theme, "muted"),
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        pointerEvents: "none",
      };

/** The filled part of the rail, up to the value. */
export const sliderFillStyle = (
  fraction: number,
  spec: SliderSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const share = `${(Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0) * 100}%`;
  const style: StyleDesc = isVertical(spec)
    ? { width: "100%", height: share }
    : { width: share, height: "100%" };
  style.flexShrink = 0;
  style.borderRadius = radiusValue(theme, "full");
  style.backgroundColor =
    spec.invalid === true
      ? colorRole(theme, "destructive")
      : colorRole(theme, "primary");
  style.pointerEvents = "none";
  return style;
};

/**
 * The thumb.
 *
 * The negative margins are load-bearing: they pull half a thumb out of the
 * layout on each side, so the thumb's **centre** lands on the fraction the fill
 * ends at. Without them the thumb would sit half a thumb past the value it
 * represents. Measured in plan 053 §11.
 *
 * A vertical track pulls on the vertical axis for the same reason.
 */
export const sliderThumbStyle = (
  spec: SliderSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const side = iconSideOf(theme, spec.size);
  const half = Math.round(side / 2);
  const style: StyleDesc = {
    width: side,
    height: side,
    flexShrink: 0,
    borderRadius: radiusValue(theme, "full"),
    backgroundColor: colorRole(theme, "input"),
    borderWidth: borderWidthOf(theme, "strong"),
    borderColor:
      spec.invalid === true
        ? colorRole(theme, "destructive")
        : colorRole(theme, "primary"),
    ...(isVertical(spec)
      ? { marginTop: -half, marginBottom: -half }
      : { marginLeft: -half, marginRight: -half }),
    pointerEvents: "none",
  };
  return style;
};

// ── Number fields ────────────────────────────────────────────────────

/**
 * The text part of a number field.
 *
 * It paints no chrome of its own: the wrapper is the field, so the row's border,
 * fill and focus ring are one surface rather than an input with a box inside a
 * box.
 */
export const numberInputStyle = (): StyleDesc => ({
  flexGrow: 1,
  height: "100%",
  minWidth: 0,
  paddingLeft: 0,
  paddingRight: 0,
  borderWidth: 0,
});

/** The spin column: two equal halves, one step each, on the field's right. */
export const numberStepperColumnStyle = (theme: PrimitiveTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "column",
  width: iconSideOf(theme, "md") + spaceValue(theme, "sm"),
  height: "100%",
  flexShrink: 0,
});

/** One step button.
 *
 * It is a pointer affordance, not a tab stop: the input's own arrow keys are the
 * keyboard path, so a number field does not add two stops to the tab order.
 */
export const numberStepperStyle = (
  spec: { readonly disabled?: boolean },
  theme: PrimitiveTheme,
): StyleDesc => {
  const style: StyleDesc = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    borderRadius: radiusValue(theme, "sm"),
    cursor: spec.disabled === true ? "not-allowed" : "pointer",
  };
  if (spec.disabled !== true) {
    style.hover = { backgroundColor: colorRole(theme, "hover") };
    // The press replaces the hover, so it is derived against it (`core/pointer.ts`).
    style.active = { backgroundColor: pressWash(theme) };
  }
  return style;
};

// ── Rating ───────────────────────────────────────────────────────────

export interface RatingStarSpec {
  readonly size: ControlSize;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
}

/**
 * One star's hit area: the icon plus a hairline of padding for the ring.
 *
 * The glyph is icon-sized, so the padding alone would leave a 20px press target
 * at `md`; the box reserves the WCAG 2.2 SC 2.5.8 floor instead and centres the
 * glyph in it (`targetSize.minimum`), the same rule a checkbox's target uses.
 */
export const ratingStarStyle = (
  spec: RatingStarSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const interactive = spec.disabled !== true && spec.readOnly !== true;
  const style: StyleDesc = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: spaceValue(theme, "2xs"),
    minWidth: targetSize.minimum,
    minHeight: targetSize.minimum,
    borderRadius: radiusValue(theme, "full"),
    cursor: interactive ? "pointer" : "not-allowed",
  };
  if (spec.disabled === true) style.opacity = disabledOpacity;
  return style;
};

/**
 * The clipped box a **half** star is cut in.
 *
 * A half star is the filled glyph painted whole inside a box as wide as the
 * share it holds, with `overflow: hidden` cutting it at the star's midpoint:
 * the runtime has no transform, but it clips content (measured by the
 * `motion-geometry` probe), and clipping at the *cell's* midpoint is the
 * glyph's midpoint because the glyph is centred.
 */
export const ratingPartialStyle = (fill: number): StyleDesc => ({
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  width: `${Math.min(1, Math.max(0, fill)) * 100}%`,
  overflow: "hidden",
  pointerEvents: "none",
});

/**
 * The full star cell inside a clipped half.
 *
 * It repeats the resting cell's own padding and floor, so the filled glyph
 * lands exactly where the outline glyph is and only the clip differs. Its width
 * is the cell's: `minWidth` plus the icon and its hairline.
 */
export const ratingPartialCellStyle = (theme: PrimitiveTheme): StyleDesc => ({
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: spaceValue(theme, "2xs"),
  minWidth: targetSize.minimum,
});

/**
 * A filled star takes the brand role; an empty one the muted text role.
 *
 * A failed validation keeps the empty stars muted but paints the chosen ones
 * destructive, so the rating's state reads at a glance.
 */
export const ratingStarColor = (
  filled: boolean,
  theme: PrimitiveTheme,
  invalid?: boolean,
): string | undefined =>
  filled
    ? invalid === true
      ? colorRole(theme, "destructive")
      : colorRole(theme, "primary")
    : colorRole(theme, "mutedForeground");

// ── One-time-code fields ─────────────────────────────────────────────

/** The row the cells sit in. */
export const otpGroupStyle = (theme: PrimitiveTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: spaceValue(theme, "sm"),
});

export interface OtpCellSpec {
  readonly size: ControlSize;
  readonly invalid?: boolean;
  readonly disabled?: boolean;
}

/**
 * One cell.
 *
 * It is a real `<input>`, so the cell's own surface is the field: the shared
 * control chrome resolves to one square per cell (equal width and height from
 * the density scale), the body type centres the character, and the keyboard ring
 * is declared on every cell — the runtime paints it on the one holding the caret.
 */
export const otpCellStyle = (
  spec: OtpCellSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const control = controlStyle(
    {
      variant: fieldVariant,
      size: spec.size,
      square: true,
      invalid: spec.invalid,
      disabled: spec.disabled,
    },
    theme,
  );
  const body = typeOf(theme, "body");
  return {
    ...control,
    justifyContent: "center",
    textAlign: "center",
    fontSize: body.fontSize,
    lineHeight: body.lineHeight,
    fontWeight: body.fontWeight,
    cursor: spec.disabled === true ? "not-allowed" : "text",
  };
};
