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
 * without a rendering runtime (see
 * `.agents/slop/plans/020-gpuix-runtime-capability.md` §3).
 */

import type { GpuixTheme, StyleDesc } from "@gpuix/react";
import { elevationShadow, focusRing } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type {
  ColorRef,
  ControlSize,
  ElevationLevel,
  PrimitiveTheme,
  RadiusStep,
  SpaceStep,
  TextRole,
  ThemeShadow,
} from "./theme.js";

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
  /** Corner radius, on the theme's scale. Defaults to `md`. */
  readonly radius?: RadiusStep;
  readonly fullWidth?: boolean;
  readonly disabled?: boolean;
  /** Validation failed: the border and ring switch to the destructive role. */
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
  const height = theme.density.controlHeight[size];
  const padding = theme.density.controlPaddingX[size];
  const label = theme.typography.label;
  const fill = paint(variant.background, theme);
  const border =
    spec.invalid === true
      ? theme.colors.destructive
      : paint(variant.border, theme);
  /**
   * Interaction feedback keeps the error boundary.
   *
   * A field's hover/press rule is a border change, so applying the variant's
   * rule verbatim would paint the healthy border over a failed validation. Only
   * a variant that has a border to recolour is affected; a filled button keeps
   * its fill feedback untouched.
   */
  const interactive = (style: StyleDesc): StyleDesc =>
    spec.invalid === true && variant.border !== undefined
      ? { ...style, borderColor: theme.colors.destructive }
      : style;

  const style: StyleDesc = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[CONTROL_GAP],
    height,
    borderRadius: theme.radius[spec.radius ?? "md"],
    fontSize: label.fontSize,
    lineHeight: label.lineHeight,
    fontWeight: label.fontWeight,
    backgroundColor: fill,
    color: paint(variant.foreground, theme),
    borderWidth: variant.border === undefined ? 0 : theme.borderWidth.thin,
    borderColor: border,
    paddingLeft: padding,
    paddingRight: padding,
    cursor: spec.disabled === true ? "not-allowed" : "pointer",
  };

  if (spec.disabled === true) {
    // A disabled control must not respond to the pointer at all.
    style.opacity = 0.5;
    style.hover = { backgroundColor: fill };
    style.active = { backgroundColor: fill };
  } else {
    style.hover = interactive(variant.hover(theme));
    style.active = interactive(variant.active(theme));
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
 * What a control adds while it holds keyboard focus.
 *
 * The geometry is `@gpuixui/tokens`' `focusRing` — a zero-offset, zero-blur
 * shadow spread by `borderWidth.strong`, the one shape GPUix 0.10.0's
 * `boxShadow` can draw that behaves like an outline and takes no layout space.
 * Only the colour changes for an invalid control. There is no `focusVisible`
 * state, so a component tracks focus itself (`onFocus`/`onBlur`) and merges
 * this over the resting style; a mouse press shows the ring too, which
 * `COMPONENTS.md` records.
 *
 * A **disabled** control paints no ring. Focus outlives a `disabled` prop change
 * — the runtime never blurs a host element whose tab stop disappears — and a
 * control that cannot act must not advertise the caret (measured, plan `332`).
 * That is the one rule every ring painter follows; a caller must not re-test
 * `disabled` before asking.
 */
export const controlFocusStyle = (
  spec: ControlSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  if (spec.disabled === true) return {};
  const ring = focusRing(theme);
  return spec.invalid === true
    ? { boxShadow: { ...ring.boxShadow, color: theme.colors.destructive } }
    : ring;
};

/**
 * The same focus ring, drawn **inside** a clipped surface.
 *
 * An attached `ButtonGroup` clips at its buttons' outer edge, so a ring painted
 * outside a button is cut away by the group (plan `344`). This overlay covers
 * the button and draws the ring as an inside border — the shadow helper cannot
 * be reused directly, because a transparent element lets its shadow's interior
 * show through as a filled block. The width and colour still come from
 * `focusRing`, so the ring has one definition. Absolute, so it takes no layout
 * space.
 */
export const clippedFocusRingStyle = (
  ring: ThemeShadow | undefined,
): StyleDesc => ({
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  borderWidth: ring?.spreadRadius ?? 0,
  borderColor: ring?.color,
  pointerEvents: "none",
});

/**
 * A fixed-height control's label: one line, clipped with an ellipsis.
 *
 * A text run is a flex item, and the runtime does not shrink one: a 70-character
 * label painted 80 px outside a 220 px button, 141 px outside a checkbox row,
 * and pushed a select's chevron out of its own field (measured, plan `368`).
 * Wrapping the label in a div that can shrink — and clipping it here — keeps
 * every control's text inside the control and leaves the trailing affordance
 * where it belongs.
 */
export const controlLabelStyle: StyleDesc = {
  flexShrink: 1,
  minWidth: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

/**
 * A flex item that may shrink: a text run in a row, or a group item whose width
 * is imposed.
 *
 * A `Label` and a group row may grow taller, so their text takes the row's width
 * and wraps; truncating a form label or an option description would hide the
 * words the user needs. The same two facts let a `ToggleGroup` item share a
 * constrained group's width instead of overflowing it (plan `368`).
 */
export const shrinkLayoutStyle: StyleDesc = {
  flexShrink: 1,
  minWidth: 0,
};

/**
 * The native text theme for an `<input>`/`<textarea>`/`<code>` element.
 *
 * GPUix's native text components take their own `theme` prop; mapping the
 * design system onto it here keeps a field's placeholder, caret and selection
 * in the same palette as everything else.
 */
export const nativeTextTheme = (theme: PrimitiveTheme): GpuixTheme => ({
  appearance: theme.mode,
  bg: theme.colors.input,
  text: theme.colors.inputForeground,
  textMuted: theme.colors.mutedForeground,
  textFaint: theme.colors.placeholder,
  accent: theme.colors.primary,
  caret: theme.colors.primary,
  fontSans: theme.typography.sans,
  fontMono: theme.typography.mono,
});

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

const tones: Record<TextTone, Paint> = {
  default: (theme) => theme.colors.foreground,
  muted: (theme) => theme.colors.mutedForeground,
  primary: (theme) => theme.colors.primary,
  destructive: (theme) => theme.colors.destructive,
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
): string | undefined => paint(tones[tone], theme);

export interface TextSpec {
  readonly role: TextRole;
  readonly tone: TextTone;
  readonly align?: "start" | "center" | "end";
  /** Inline decoration the runtime paints; omitted means none. */
  readonly decoration?: TextDecoration;
  readonly truncate?: boolean;
  /** Maximum visible lines. GPUix clips after this many. */
  readonly clamp?: number;
  /** Selectable text: off by default for chrome, on for content. */
  readonly selectable?: boolean;
}

/** The inline decorations the runtime paints; absence is the third state. */
export type TextDecoration = "underline" | "line-through";

/** Roles whose family is the monospace face. */
const MONO_ROLES: ReadonlyArray<TextRole> = ["code", "codeBlock"];

/**
 * The line count a clamp can enforce, or `None` for a value that cannot.
 *
 * `Math.trunc` rather than rounding: `clamp={2.7}` is "at most two lines", the
 * same reading as a CSS `line-clamp`. Zero, negative and non-finite values are
 * refused instead of collapsing the element.
 */
const clampLines = (clamp: number | undefined): Option.Option<number> =>
  Option.flatMap(Option.fromNullishOr(clamp), (value) =>
    Number.isFinite(value) && value >= 1
      ? Option.some(Math.trunc(value))
      : Option.none(),
  );

/** Resolve a text role and tone to the runtime's text style. */
export const textStyle = (spec: TextSpec, theme: PrimitiveTheme): StyleDesc => {
  const role = theme.typography[spec.role];
  const style: StyleDesc = {
    fontSize: role.fontSize,
    lineHeight: role.lineHeight,
    fontWeight: role.fontWeight,
    fontFamily: Arr.contains(MONO_ROLES, spec.role)
      ? theme.typography.mono
      : theme.typography.sans,
    color: toneColor(theme, spec.tone),
    userSelect: spec.selectable === true ? "text" : "none",
  };
  // The runtime maps `center`, `right` and `left`/`start`; `end` was in its
  // style type but implemented nowhere, so our `end` went nowhere at all
  // (measured, plan 365). There is no text direction in `StyleDesc`, so the end
  // of a left-to-right box is `right`.
  if (spec.align !== undefined) {
    style.textAlign = spec.align === "end" ? "right" : spec.align;
  }
  if (spec.decoration !== undefined) style.textDecoration = spec.decoration;
  if (spec.truncate === true) {
    style.whiteSpace = "nowrap";
    style.textOverflow = "ellipsis";
  }
  const lines = clampLines(spec.clamp);
  if (Option.isSome(lines)) {
    // The runtime's `lineClamp` is not part of its text-layout cache key, so the
    // first layout of a string decides the clamp for every identical copy at the
    // same width (plan 082). A per-element height cap cannot leak.
    style.whiteSpace = "normal";
    style.maxHeight = lines.value * role.lineHeight;
    style.overflow = "hidden";
  }
  return style;
};

// ── Surfaces ─────────────────────────────────────────────────────────

/** The surfaces a container can paint: page, card, popover and their siblings. */
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
  background: (theme) => theme.colors.background,
  card: (theme) => theme.colors.card,
  popover: (theme) => theme.colors.popover,
  muted: (theme) => theme.colors.muted,
  accent: (theme) => theme.colors.accent,
  selected: (theme) => theme.colors.selected,
  skeleton: (theme) => theme.colors.skeleton,
};

export interface SurfaceSpec {
  readonly tone: SurfaceTone;
  /** A step on the theme's spacing scale, or absent for no padding. */
  readonly padding?: SpaceStep;
  readonly radius?: RadiusStep;
  readonly border?: boolean;
  readonly elevation?: ElevationLevel;
}

/** Resolve a surface tone, padding, radius and elevation to a container style. */
export const surfaceStyle = (
  spec: SurfaceSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const style: StyleDesc = {
    display: "flex",
    flexDirection: "column",
    backgroundColor: paint(surfaces[spec.tone], theme),
  };
  if (spec.padding !== undefined) style.padding = theme.spacing[spec.padding];
  if (spec.radius !== undefined) style.borderRadius = theme.radius[spec.radius];
  if (spec.border === true) {
    style.borderWidth = theme.borderWidth.thin;
    style.borderColor = theme.colors.border;
  }
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
  readonly orientation: "horizontal" | "vertical";
  /** A step on the spacing scale, applied to both ends of the rule. */
  readonly inset?: SpaceStep;
}

/** A separator: one border, on the theme's border colour, never a literal. */
export const ruleStyle = (spec: RuleSpec, theme: PrimitiveTheme): StyleDesc => {
  const inset = spec.inset === undefined ? 0 : theme.spacing[spec.inset];
  return spec.orientation === "horizontal"
    ? {
        height: theme.borderWidth.thin,
        flexShrink: 0,
        backgroundColor: theme.colors.border,
        marginLeft: inset,
        marginRight: inset,
      }
    : {
        width: theme.borderWidth.thin,
        flexShrink: 0,
        backgroundColor: theme.colors.border,
        marginTop: inset,
        marginBottom: inset,
      };
};

export interface ScrollSpec {
  readonly axis: "vertical" | "horizontal" | "both";
}

/**
 * A scrollable container.
 *
 * Only the overflow axes are ours. GPUix 0.10.0 paints the scrollbar with the
 * platform theme and exposes no `scrollbarColor`/`scrollbarWidth` (those are on
 * GPUix's unreleased `main`), so `theme.colors.scrollbar` cannot be applied and
 * there is no fade mask to configure. Both are recorded as limitations in
 * `COMPONENTS.md` rather than faked.
 */
export const scrollStyle = (spec: ScrollSpec): StyleDesc => ({
  overflowY: spec.axis === "horizontal" ? "hidden" : "scroll",
  overflowX: spec.axis === "vertical" ? "hidden" : "scroll",
});

/**
 * Clamp a progress value to the 0–100 the track can actually paint.
 *
 * A value that is not a number at all is treated as empty rather than full: an
 * unknown progress must never look finished. Infinity means "past the end",
 * which is the whole track.
 */
export const progressPercent = (value: number): number =>
  Number.isNaN(value) ? 0 : Math.min(100, Math.max(0, value));

/** The tones a progress bar can paint; `primary` by default. */
export const PROGRESS_TONES = [
  "primary",
  "success",
  "destructive",
  "muted",
] as const;

export type ProgressTone = (typeof PROGRESS_TONES)[number];

const progressTones: Record<ProgressTone, ColorRef> = {
  primary: (theme) => theme.colors.primary,
  success: (theme) => theme.colors.success,
  destructive: (theme) => theme.colors.destructive,
  muted: (theme) => theme.colors.mutedForeground,
};

export interface ProgressSpec {
  readonly value?: number;
  readonly tone: ProgressTone;
  readonly size: "sm" | "md";
}

const PROGRESS_HEIGHT: Record<ProgressSpec["size"], SpaceStep> = {
  sm: "xs",
  md: "sm",
};

/** The track: full width, one spacing step tall, one step off the surface. */
export const progressTrackStyle = (
  spec: ProgressSpec,
  theme: PrimitiveTheme,
): StyleDesc => ({
  width: "100%",
  height: theme.spacing[PROGRESS_HEIGHT[spec.size]],
  borderRadius: theme.radius.full,
  backgroundColor: theme.colors.muted,
  overflow: "hidden",
});

/**
 * The colour role a progress tone paints.
 *
 * Exported so the indeterminate segment resolves the same map as the determinate
 * fill: a bar asked for `success` must paint success in both modes (plan 328).
 */
export const progressToneColor = (
  tone: ProgressTone,
  theme: PrimitiveTheme,
): string => progressTones[tone](theme);

/** The fill. A value outside 0–100 is clamped, never painted out of the track. */
export const progressFillStyle = (
  spec: ProgressSpec,
  theme: PrimitiveTheme,
): StyleDesc => ({
  height: "100%",
  width: `${progressPercent(spec.value ?? 0)}%`,
  borderRadius: theme.radius.full,
  backgroundColor: progressToneColor(spec.tone, theme),
});

// ── Value controls: Slider, RangeSlider ──────────────────────────────

export interface SliderSpec {
  readonly size: ControlSize;
  readonly invalid?: boolean;
  readonly disabled?: boolean;
  readonly focused?: boolean;
}

/**
 * Half a thumb — the track's inset, and the same number `pointerValue` takes.
 *
 * The usable span runs from one thumb radius inside each end to the other, so
 * a thumb at either end is centred on the end of the span instead of hanging
 * off it.
 */
export const sliderInset = (size: ControlSize, theme: PrimitiveTheme): number =>
  Math.round(theme.iconSize[size] / 2);

/**
 * The slider's hit area.
 *
 * At rest it paints nothing — the rail is the only visible chrome, so a slider
 * does not become a bar as tall as the control — and it still takes presses:
 * GPUI makes a hitbox for an element with mouse handlers (measured in plan 053
 * §11; an unpositioned, unfilled box with handlers receives the press).
 *
 * Because the track is the element that owns the press and the captured drag,
 * it is also the element that owes the pointer feedback: a hover wash and a
 * press wash, and neither while disabled (plan `361`). The thumb cannot carry
 * it — it is `pointerEvents: "none"` so a press on it reaches this track.
 */
export const sliderTrackStyle = (
  spec: SliderSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const inset = sliderInset(spec.size, theme);
  const style: StyleDesc = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: theme.density.controlHeight[spec.size],
    paddingLeft: inset,
    paddingRight: inset,
    borderRadius: theme.radius.sm,
    cursor: spec.disabled === true ? "not-allowed" : "pointer",
  };
  if (spec.disabled === true) {
    style.opacity = 0.5;
  } else {
    style.hover = { backgroundColor: theme.colors.hover };
    style.active = { backgroundColor: theme.colors.active };
  }
  return style;
};

/** The rail: the whole width, one spacing step tall, and never a hit target. */
export const sliderRailStyle = (theme: PrimitiveTheme): StyleDesc => ({
  width: "100%",
  height: theme.spacing.xs,
  borderRadius: theme.radius.full,
  backgroundColor: theme.colors.muted,
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  pointerEvents: "none",
});

/** The filled part of the rail, up to the value. */
export const sliderFillStyle = (
  fraction: number,
  spec: SliderSpec,
  theme: PrimitiveTheme,
): StyleDesc => ({
  width: `${(Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0) * 100}%`,
  height: "100%",
  flexShrink: 0,
  borderRadius: theme.radius.full,
  backgroundColor:
    spec.invalid === true ? theme.colors.destructive : theme.colors.primary,
  pointerEvents: "none",
});

/**
 * The thumb.
 *
 * The negative margins are load-bearing: they pull half a thumb out of the
 * layout on each side, so the thumb's **centre** lands on the fraction the fill
 * ends at. Without them the thumb would sit half a thumb to the right of the
 * value it represents. Measured in plan 053 §11.
 */
export const sliderThumbStyle = (
  spec: SliderSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const side = theme.iconSize[spec.size];
  const half = Math.round(side / 2);
  const style: StyleDesc = {
    width: side,
    height: side,
    flexShrink: 0,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.input,
    borderWidth: theme.borderWidth.strong,
    borderColor:
      spec.invalid === true ? theme.colors.destructive : theme.colors.primary,
    marginLeft: -half,
    marginRight: -half,
    pointerEvents: "none",
  };
  if (spec.focused === true && spec.disabled !== true)
    style.boxShadow = focusRing(theme).boxShadow;
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
  width: theme.iconSize.md + theme.spacing.sm,
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
    borderRadius: theme.radius.sm,
    cursor: spec.disabled === true ? "not-allowed" : "pointer",
  };
  if (spec.disabled !== true) {
    style.hover = { backgroundColor: theme.colors.hover };
    style.active = { backgroundColor: theme.colors.active };
  }
  return style;
};

// ── Rating ───────────────────────────────────────────────────────────

export interface RatingStarSpec {
  readonly size: ControlSize;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly focused?: boolean;
}

/** One star's hit area: the icon plus a hairline of padding for the ring. */
export const ratingStarStyle = (
  spec: RatingStarSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const interactive = spec.disabled !== true && spec.readOnly !== true;
  const style: StyleDesc = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing["2xs"],
    borderRadius: theme.radius.full,
    cursor: interactive ? "pointer" : "not-allowed",
  };
  if (spec.disabled === true) style.opacity = 0.5;
  if (spec.focused === true && spec.disabled !== true)
    style.boxShadow = focusRing(theme).boxShadow;
  return style;
};

/**
 * A filled star takes the brand role; an empty one the muted text role.
 *
 * A failed validation marks the **empty** stars destructive — what is missing,
 * not what is chosen — the same rule as `RadioGroup` (plan `061`).
 */
export const ratingStarColor = (
  filled: boolean,
  theme: PrimitiveTheme,
  invalid = false,
): string =>
  filled
    ? theme.colors.primary
    : invalid
      ? theme.colors.destructive
      : theme.colors.mutedForeground;

// ── One-time-code fields ─────────────────────────────────────────────

/** The row the cells sit in. */
export const otpGroupStyle = (theme: PrimitiveTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing.sm,
});

// The cell itself is a square field, so its chrome lives with the field
// recipe (`core/recipes.ts`) rather than with the density-driven controls.
