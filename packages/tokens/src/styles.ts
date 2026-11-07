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

export interface TextStyleProperties {
  readonly fontSize: number;

  readonly lineHeight: number;

  readonly fontWeight: FontWeight;

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

export interface TypeSource {
  readonly typography?:
    | ({
        readonly sans?: string | null;
        readonly mono?: string | null;
      } & Partial<Record<TextRole, Readonly<Partial<TextStyle>> | null>>)
    | null;
}

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

const isTextStyle = (value: unknown): value is TextStyle =>
  typeof value === "object" &&
  value !== null &&
  "fontSize" in value &&
  isFiniteNumber(value.fontSize) &&
  "lineHeight" in value &&
  isFiniteNumber(value.lineHeight) &&
  "fontWeight" in value &&
  isFiniteNumber(value.fontWeight);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

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

export const statusTones = [
  "info",
  "success",
  "warning",
  "destructive",
] as const;

export type StatusTone = (typeof statusTones)[number];

export const isStatusTone = (value: unknown): value is StatusTone =>
  statusTones.some((tone) => tone === value);

const defaultStatusTone: StatusTone = "info";

export const statusEdgeAlpha = 0.3;

export interface StatusToneStyle {
  readonly background: string;

  readonly foreground: string;

  readonly border: string;
}

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

export interface FocusRing {
  readonly boxShadow: BoxShadow;
}

export interface BorderSource {
  readonly borderWidth?: Stored<BorderWidth>;
}

const borderStep = (source: BorderSource, step: keyof BorderWidth): number => {
  const value = source.borderWidth?.[step];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : shippedBorderWidth[step];
};

export interface FocusRingSource extends ColourSource, BorderSource {}

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

export interface FocusVisibleOutline {
  readonly outlineWidth: number;

  readonly outlineColor?: string;

  readonly outlineOffset: number;
}

export interface KeyboardFocusRing {
  readonly focusVisible: FocusVisibleOutline;
}

export function keyboardFocusRing(theme: FocusRingSource): KeyboardFocusRing {
  const line = borderStep(theme, "strong");
  return {
    focusVisible: {
      outlineWidth: line,

      outlineColor: themeColors(theme).ring,
      outlineOffset: line,
    },
  };
}

export interface ControlFocusState {
  readonly disabled?: boolean;

  readonly invalid?: boolean;
}

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

          outlineColor:
            themeColors(theme).destructive ?? ring.focusVisible.outlineColor,
        },
      }
    : ring;
}

export type FilledAction = "primary" | "secondary" | "destructive";

export const filledRoles = [
  "primary",
  "secondary",
  "destructive",
  "accent",
] as const;

export type FilledRole = (typeof filledRoles)[number];

export const filledFeedbackStates = ["hover", "pressed"] as const;

export type FilledFeedbackState = (typeof filledFeedbackStates)[number];

export type FilledFeedbackSource = ColourSource & ContrastSource;

const filledOnColour: Readonly<Record<FilledRole, keyof ThemeColors>> = {
  primary: "primaryForeground",
  secondary: "secondaryForeground",
  destructive: "destructiveForeground",
  accent: "accentForeground",
};

const HOVER_STEP = 0.12;

const PRESS_STEP = 0.18;

const STEP_LADDER: readonly number[] = Array.from(
  { length: Math.round(PRESS_STEP * 100) + 1 },
  (_, offset) => (Math.round(PRESS_STEP * 100) - offset) / 100,
);

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
