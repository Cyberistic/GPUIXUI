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

type Paint = ColorRef | undefined;

const paint = (ref: Paint, theme: PrimitiveTheme): string | undefined =>
  Option.getOrUndefined(
    Option.map(Option.fromNullishOr(ref), (colorRef) => colorRef(theme)),
  );

export interface ControlVariant {
  readonly background: Paint;
  readonly foreground: ColorRef;
  readonly border: Paint;

  readonly filledAction?: FilledAction;

  readonly hover: (theme: PrimitiveTheme) => StyleDesc;
  readonly active: (theme: PrimitiveTheme) => StyleDesc;
}

const CONTROL_GAP: SpaceStep = "sm";

export interface ControlSpec {
  readonly variant: ControlVariant;
  readonly size: ControlSize;

  readonly square?: boolean;
  readonly fullWidth?: boolean;
  readonly disabled?: boolean;

  readonly invalid?: boolean;
}

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
    if (theme.interaction !== "appkit") style.hover = variant.hover(theme);
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

export const controlFocusStyle = (
  spec: ControlSpec,
  theme: PrimitiveTheme,
): StyleDesc =>
  controlRing(theme, { disabled: spec.disabled, invalid: spec.invalid });

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

export {
  nativeTextFills,
  nativeTextTheme,
  type NativeTextFill,
  type NativeTextTheme,
} from "@gpuixui/tokens";

export const TEXT_TONES = [
  "default",
  "muted",
  "primary",
  "destructive",
  "inherit",
] as const;

export type TextTone = (typeof TEXT_TONES)[number];

const TEXT_TONE_NAMES: ReadonlyArray<string> = TEXT_TONES;

export const isTextTone = (value: unknown): value is TextTone =>
  typeof value === "string" && Arr.contains(TEXT_TONE_NAMES, value);

export const textToneOf = (value: unknown): TextTone =>
  isTextTone(value) ? value : "default";

const tones: Record<TextTone, Paint> = {
  default: (theme) => colorRole(theme, "foreground"),
  muted: (theme) => colorRole(theme, "mutedForeground"),

  primary: brandText,

  destructive: (theme) => colorRole(theme, "destructiveSoftForeground"),

  inherit: undefined,
};

export const toneColor = (
  theme: PrimitiveTheme,
  tone: TextTone,
): string | undefined => paint(tones[textToneOf(tone)], theme);

export const TEXT_ALIGNMENTS = ["start", "center", "end"] as const;
export type TextAlign = (typeof TEXT_ALIGNMENTS)[number];

const ALIGN_VALUES: Readonly<Record<TextAlign, "left" | "center" | "right">> = {
  start: "left",
  center: "center",
  end: "right",
};

export const textAlignValue = (align: TextAlign): "left" | "center" | "right" =>
  ALIGN_VALUES[align];

export const isTextAlign = (align: unknown): align is TextAlign =>
  P.isString(align) && Arr.contains(TEXT_ALIGNMENTS, align);

export const textAlignOf = (align: unknown): TextAlign | undefined =>
  isTextAlign(align) ? align : undefined;

export interface TextSpec {
  readonly role: TextRole;
  readonly tone: TextTone;
  readonly align?: TextAlign;
  readonly truncate?: boolean;

  readonly clamp?: number;

  readonly selectable?: boolean;
}

const MONO_ROLES: ReadonlyArray<TextRole> = ["code", "codeBlock"];

export const clampLines = (clamp: unknown): number =>
  typeof clamp === "number" && Number.isFinite(clamp)
    ? Math.max(1, Math.floor(clamp))
    : 1;

export const lineClampOf = (clamp: unknown): number | undefined =>
  Option.match(Option.fromNullishOr(clamp), {
    onNone: () => undefined,
    onSome: (count) => clampLines(count),
  });

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

  if (spec.selectable === true)
    style.selectionColor = colorRole(theme, "selection");
  if (spec.truncate === true) {
    style.whiteSpace = "nowrap";
    style.textOverflow = "ellipsis";
  }
  const clamp = lineClampOf(spec.clamp);
  if (clamp !== undefined) {
    style.whiteSpace = "normal";
    style.height = role.lineHeight * clamp;
    style.overflow = "hidden";
  }
  return style;
};

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

export const BORDER_STYLES = ["solid", "dashed"] as const;
export type BorderStyle = (typeof BORDER_STYLES)[number];

export interface SurfaceSpec {
  readonly tone: SurfaceTone;

  readonly padding?: SpaceStep;

  readonly paddingX?: SpaceStep;

  readonly paddingY?: SpaceStep;
  readonly radius?: RadiusStep;
  readonly border?: boolean;

  readonly borderStyle?: BorderStyle;

  readonly aspectRatio?: number;
  readonly elevation?: ElevationLevel;
}

export interface PaddingSides {
  readonly top?: SpaceStep;
  readonly right?: SpaceStep;
  readonly bottom?: SpaceStep;
  readonly left?: SpaceStep;
}

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

export interface RuleSpec {
  readonly orientation: Orientation;

  readonly inset?: SpaceStep;
}

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

export const SCROLL_AXES = ["vertical", "horizontal", "both"] as const;

export type ScrollAxis = (typeof SCROLL_AXES)[number];

const SCROLL_AXIS_NAMES: ReadonlyArray<string> = SCROLL_AXES;

export const isScrollAxis = (value: unknown): value is ScrollAxis =>
  P.isString(value) && Arr.contains(SCROLL_AXIS_NAMES, value);

export const scrollAxis = (value: unknown): ScrollAxis =>
  isScrollAxis(value) ? value : "vertical";

export interface ScrollSpec {
  readonly axis: ScrollAxis;
}

export const scrollStyle = (spec: ScrollSpec): StyleDesc => {
  const axis = scrollAxis(spec.axis);
  return {
    overflowY: axis === "horizontal" ? "hidden" : "scroll",
    overflowX: axis === "vertical" ? "hidden" : "scroll",
  };
};

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

export const PROGRESS_SIZES = ["sm", "md"] as const;
export type ProgressSize = (typeof PROGRESS_SIZES)[number];

const PROGRESS_SIZE_NAMES: ReadonlyArray<string> = PROGRESS_SIZES;

export const isProgressSize = (value: unknown): value is ProgressSize =>
  typeof value === "string" && Arr.contains(PROGRESS_SIZE_NAMES, value);

export const progressSizeOf = (value: unknown): ProgressSize =>
  isProgressSize(value) ? value : "md";

export const isProgressTone = (value: unknown): value is ProgressTone =>
  typeof value === "string" && Arr.contains(PROGRESS_TONE_NAMES, value);

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

export const progressFillStyle = (
  spec: ProgressSpec,
  theme: PrimitiveTheme,
): StyleDesc => ({
  height: "100%",
  width: `${progressPercent(spec.value ?? 0)}%`,
  borderRadius: radiusValue(theme, "full"),
  backgroundColor: paint(progressTones[progressToneOf(spec.tone)], theme),
});

export const SLIDER_ORIENTATIONS = ["horizontal", "vertical"] as const;
export type SliderOrientation = (typeof SLIDER_ORIENTATIONS)[number];

export interface SliderSpec {
  readonly size: ControlSize;
  readonly invalid?: boolean;
  readonly disabled?: boolean;

  readonly orientation?: SliderOrientation;
}

const isVertical = (spec: Pick<SliderSpec, "orientation">): boolean =>
  spec.orientation === "vertical";

export const sliderInset = (size: ControlSize, theme: PrimitiveTheme): number =>
  Math.round(iconSideOf(theme, size) / 2);

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

export const numberInputStyle = (): StyleDesc => ({
  flexGrow: 1,
  height: "100%",
  minWidth: 0,
  paddingLeft: 0,
  paddingRight: 0,
  borderWidth: 0,
});

export const numberStepperColumnStyle = (theme: PrimitiveTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "column",
  width: iconSideOf(theme, "md") + spaceValue(theme, "sm"),
  height: "100%",
  flexShrink: 0,
});

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

    style.active = { backgroundColor: pressWash(theme) };
  }
  return style;
};

export interface RatingStarSpec {
  readonly size: ControlSize;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
}

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

export const ratingPartialStyle = (fill: number): StyleDesc => ({
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  width: `${Math.min(1, Math.max(0, fill)) * 100}%`,
  overflow: "hidden",
  pointerEvents: "none",
});

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
