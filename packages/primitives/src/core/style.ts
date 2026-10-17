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
  const rest =
    spec.invalid === true
      ? theme.colors.destructive
      : paint(variant.background, theme);
  const border =
    spec.invalid === true
      ? theme.colors.destructive
      : paint(variant.border, theme);

  const style: StyleDesc = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[CONTROL_GAP],
    height,
    borderRadius: theme.radius.md,
    fontSize: label.fontSize,
    lineHeight: label.lineHeight,
    fontWeight: label.fontWeight,
    backgroundColor: rest,
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
    style.hover = { backgroundColor: rest };
    style.active = { backgroundColor: rest };
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
 * What a control adds while it holds keyboard focus.
 *
 * The geometry is `@gpuixui/tokens`' `focusRing` — a zero-offset, zero-blur
 * shadow spread by `borderWidth.strong`, the one shape GPUix 0.10.0's
 * `boxShadow` can draw that behaves like an outline and takes no layout space.
 * Only the colour changes for an invalid control. There is no `focusVisible`
 * state, so a component tracks focus itself (`onFocus`/`onBlur`) and merges
 * this over the resting style; a mouse press shows the ring too, which
 * `COMPONENTS.md` records.
 */
export const controlFocusStyle = (
  spec: ControlSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const ring = focusRing(theme);
  return spec.invalid === true
    ? { boxShadow: { ...ring.boxShadow, color: theme.colors.destructive } }
    : ring;
};

/**
 * What a text field adds over the shared control chrome.
 *
 * A field is not a button: its content starts at the left, it takes the body
 * type rather than the label type, and its text is selectable because it is
 * the user's content.
 */
export const fieldTextStyle = (theme: PrimitiveTheme): StyleDesc => ({
  justifyContent: "flex-start",
  fontSize: theme.typography.body.fontSize,
  lineHeight: theme.typography.body.lineHeight,
  fontWeight: theme.typography.body.fontWeight,
  cursor: "text",
  userSelect: "text",
});

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
  readonly truncate?: boolean;
  /** Maximum visible lines. GPUix clips after this many. */
  readonly clamp?: number;
  /** Selectable text: off by default for chrome, on for content. */
  readonly selectable?: boolean;
}

/** Roles whose family is the monospace face. */
const MONO_ROLES: ReadonlyArray<TextRole> = ["code", "codeBlock"];

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
  if (spec.align !== undefined) style.textAlign = spec.align;
  if (spec.truncate === true) {
    style.whiteSpace = "nowrap";
    style.textOverflow = "ellipsis";
  }
  if (spec.clamp !== undefined) {
    style.whiteSpace = "normal";
    style.lineClamp = spec.clamp;
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

/** The fill. A value outside 0–100 is clamped, never painted out of the track. */
export const progressFillStyle = (
  spec: ProgressSpec,
  theme: PrimitiveTheme,
): StyleDesc => ({
  height: "100%",
  width: `${progressPercent(spec.value ?? 0)}%`,
  borderRadius: theme.radius.full,
  backgroundColor: paint(progressTones[spec.tone], theme),
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
 * It paints nothing — the rail is the only visible chrome, so a slider does not
 * become a bar as tall as the control — and it still takes presses: GPUI makes a
 * hitbox for an element with mouse handlers (measured in plan 053 §11; an
 * unpositioned, unfilled box with handlers receives the press).
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
    cursor: spec.disabled === true ? "not-allowed" : "pointer",
  };
  if (spec.disabled === true) style.opacity = 0.5;
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
  if (spec.focused === true) style.boxShadow = focusRing(theme).boxShadow;
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
  if (spec.focused === true) style.boxShadow = focusRing(theme).boxShadow;
  return style;
};

/** A filled star takes the brand role; an empty one the muted text role. */
export const ratingStarColor = (
  filled: boolean,
  theme: PrimitiveTheme,
): string => (filled ? theme.colors.primary : theme.colors.mutedForeground);

// ── One-time-code fields ─────────────────────────────────────────────

/** The row the cells sit in. */
export const otpGroupStyle = (theme: PrimitiveTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing.sm,
});

export interface OtpCellSpec {
  readonly size: ControlSize;
  readonly invalid?: boolean;
  readonly disabled?: boolean;
  readonly focused?: boolean;
}

/**
 * One cell.
 *
 * It is a real `<input>`, so the cell's own surface is the field: the shared
 * control chrome resolves to one square per cell (equal width and height from
 * the density scale), the body type centres the character, and the focus ring
 * lands on the cell the caret is in rather than on the wrapper.
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
  return {
    ...control,
    justifyContent: "center",
    textAlign: "center",
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    fontWeight: theme.typography.body.fontWeight,
    cursor: spec.disabled === true ? "not-allowed" : "text",
    ...(spec.focused === true && spec.disabled !== true
      ? controlFocusStyle(
          { variant: fieldVariant, size: spec.size, invalid: spec.invalid },
          theme,
        )
      : {}),
  };
};
