import {
  borderWidth as libraryBorderWidth,
  defaultDensity as libraryDensity,
  iconSize as libraryIconSize,
  isControlSize,
  isElevationLevel,
  isTextRole,
  radius as libraryRadius,
  spacing as librarySpacing,
  themeColors,
  typography as libraryTypography,
  type ControlSize,
  type ElevationLevel,
  type ThemeColors,
  type ThemeContrast,
} from "@gpuixui/tokens";
import type {
  BorderWidth,
  Density,
  IconSize,
  Radius,
  Spacing,
  TextRole,
  TextStyle,
} from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as R from "effect/Record";

export { isTextRole };

export type {
  BoxShadow as ThemeShadow,
  BorderWidth,
  ControlSize,
  Density,
  DensityName,
  Elevation,
  ElevationLevel,
  FontWeight,
  IconSize as ThemeIconSize,
  Radius,
  Spacing,
  TextStyle,
  TextRole,
  Theme as PrimitiveTheme,
  ThemeColors,
  ThemeMode,
  Typography,
} from "@gpuixui/tokens";

export const controlSize = (size: unknown): ControlSize =>
  isControlSize(size) ? size : "md";

export const elevationLevel = (level: unknown): ElevationLevel | undefined =>
  Option.match(Option.fromNullishOr(level), {
    onNone: () => undefined,
    onSome: (value) => (isElevationLevel(value) ? value : "md"),
  });

export type SpaceStep = keyof Spacing;

export type RadiusStep = keyof Radius;

export interface SpaceSource {
  readonly spacing?: Spacing | null;
}

export const isSpaceStep = (
  theme: SpaceSource,
  step: unknown,
): step is SpaceStep => {
  const scale = theme.spacing;
  if (scale === undefined || scale === null || !P.isString(step)) return false;
  return Arr.some(R.keys(scale), (name) => name === step);
};

export const spaceStep = (
  theme: SpaceSource,
  step: unknown,
): SpaceStep | undefined => (isSpaceStep(theme, step) ? step : undefined);

export const scaleValue = <Step extends string>(
  scale: Readonly<Partial<Record<Step, number>>> | null | undefined,
  library: Readonly<Record<Step, number>>,
  step: Step,
): number => {
  const value = scale === null || scale === undefined ? undefined : scale[step];
  return P.isNumber(value) && Number.isFinite(value) ? value : library[step];
};

export const spaceValue = (theme: SpaceSource, step: SpaceStep): number =>
  scaleValue(theme.spacing, librarySpacing, step);

export interface RadiusSource {
  readonly radius?: Radius | null;
}

export const radiusValue = (theme: RadiusSource, step: RadiusStep): number =>
  scaleValue(theme.radius, libraryRadius, step);

const RADIUS_STEPS: ReadonlyArray<string> = R.keys(libraryRadius);

export const isRadiusStep = (step: unknown): step is RadiusStep =>
  P.isString(step) && Arr.contains(RADIUS_STEPS, step);

export const radiusStep = (step: unknown): RadiusStep | undefined =>
  isRadiusStep(step) ? step : undefined;

export interface BorderWidthSource {
  readonly borderWidth?: Partial<BorderWidth> | null;
}

export const borderWidthOf = (
  theme: BorderWidthSource,
  step: keyof BorderWidth,
): number => scaleValue(theme.borderWidth, libraryBorderWidth, step);

export interface DensitySource {
  readonly density?: Density | null;
}

export const controlHeightOf = (
  theme: DensitySource,
  size: ControlSize,
): number =>
  scaleValue(
    theme.density?.controlHeight,
    libraryDensity.controlHeight,
    controlSize(size),
  );

export const controlPaddingOf = (
  theme: DensitySource,
  size: ControlSize,
): number =>
  scaleValue(
    theme.density?.controlPaddingX,
    libraryDensity.controlPaddingX,
    controlSize(size),
  );

export const rowHeightOf = (theme: DensitySource): number => {
  const height = theme.density?.rowHeight;
  return P.isNumber(height) && Number.isFinite(height)
    ? height
    : libraryDensity.rowHeight;
};

export interface IconSizeSource {
  readonly iconSize?: IconSize | null;
}

export const iconSideOf = (theme: IconSizeSource, size: ControlSize): number =>
  scaleValue(theme.iconSize, libraryIconSize, controlSize(size));

const ICON_STEPS: ReadonlyArray<string> = R.keys(libraryIconSize);

export const isIconStep = (step: unknown): step is keyof IconSize =>
  P.isString(step) && Arr.contains(ICON_STEPS, step);

export const iconStepValue = (theme: IconSizeSource, step: unknown): number =>
  scaleValue(theme.iconSize, libraryIconSize, isIconStep(step) ? step : "md");

export interface TypeSource {
  readonly typography?: {
    readonly sans?: string | null;
    readonly mono?: string | null;
  } & Partial<Record<TextRole, TextStyle | null>>;
}

const isTextStyle = (value: unknown): value is TextStyle =>
  typeof value === "object" &&
  value !== null &&
  "fontSize" in value &&
  "lineHeight" in value &&
  "fontWeight" in value &&
  P.isNumber(value.fontSize) &&
  P.isNumber(value.lineHeight) &&
  P.isNumber(value.fontWeight);

export const typeOf = (theme: TypeSource, role: unknown): TextStyle => {
  const name = isTextRole(role) ? role : "body";
  const style: unknown = theme.typography?.[name];
  return isTextStyle(style) ? style : libraryTypography[name];
};

export const familyOf = (
  theme: TypeSource,
  family: "sans" | "mono",
): string => {
  const name: unknown = theme.typography?.[family];
  return P.isString(name) && name !== "" ? name : libraryTypography[family];
};

export interface ColorSource {
  readonly colors?: Partial<ThemeColors>;
}

export type PaintSource = ColorSource & {
  readonly contrast?: ThemeContrast;
};

export const colorsOf = (theme: ColorSource): Partial<ThemeColors> =>
  themeColors(theme);

export const colorRole = (
  theme: ColorSource,
  role: keyof ThemeColors,
): string | undefined => colorsOf(theme)[role];

export type ColorRef = (theme: PaintSource) => string | undefined;
