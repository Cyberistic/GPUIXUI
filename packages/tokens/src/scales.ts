import {
  type BoxShadow,
  type Elevation,
  elevationLevels,
  elevationShadow,
} from "./elevation.js";
import { isStepRecord, requireGroups } from "./missing.js";
import {
  controlSizes,
  type BorderWidth,
  type ControlSize,
  type Density,
  type DensityName,
  type IconSize,
  type Radius,
  type Spacing,
} from "./scale.js";
import type { Stored } from "./theme.js";
import type { TextRole, Typography } from "./typography.js";

export type ScaleGroup =
  | "spacing"
  | "radius"
  | "borderWidth"
  | "iconSize"
  | "typography"
  | "density"
  | "elevation";

export interface InvalidScale {
  readonly group: ScaleGroup;

  readonly path: string;

  readonly value: number;

  readonly previous: {
    readonly path: string;

    readonly value: number;
  };
}

export type ScaleSource = {
  readonly spacing?: Stored<Spacing>;
  readonly radius?: Stored<Radius>;
  readonly borderWidth?: Stored<BorderWidth>;
  readonly iconSize?: Stored<IconSize>;
  readonly density?: Stored<Density> | DensityName;
  readonly typography?: Stored<Typography>;

  readonly elevation?: Stored<Elevation>;
};

const spacingKeys = [
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
] as const;

const radiusKeys = ["none", "sm", "md", "lg", "xl", "full"] as const;

const borderKeys = ["thin", "strong"] as const;

const iconKeys = ["xs", "sm", "md", "lg", "xl"] as const;

const typeKeys = [
  "caption",
  "label",
  "body",
  "h3",
  "h2",
  "h1",
  "display",
] as const satisfies readonly TextRole[];

const notRungs = {
  bodyStrong: "emphasis",

  code: "mono",
  codeBlock: "mono",
} as const satisfies Partial<Record<TextRole, string>>;

type EveryStepListed<Step extends string, Listed extends Step> =
  Exclude<Step, Listed> extends never
    ? true
    : ["a scale step is missing from its order ladder", Exclude<Step, Listed>];

const spacingLadder: EveryStepListed<
  keyof Spacing,
  (typeof spacingKeys)[number]
> = true;
const radiusLadder: EveryStepListed<keyof Radius, (typeof radiusKeys)[number]> =
  true;
const borderLadder: EveryStepListed<
  keyof BorderWidth,
  (typeof borderKeys)[number]
> = true;
const iconLadder: EveryStepListed<keyof IconSize, (typeof iconKeys)[number]> =
  true;
const typeLadder: EveryStepListed<
  TextRole,
  (typeof typeKeys)[number] | keyof typeof notRungs
> = true;

void spacingLadder;
void radiusLadder;
void borderLadder;
void iconLadder;
void typeLadder;

type Step = readonly [path: string, value: number];

const keyed = <Key extends string>(
  keys: readonly Key[],
  read: (key: Key) => number,
): readonly Step[] => keys.map((key) => [key, read(key)] as const);

const sized = (
  prefix: string,
  read: (size: ControlSize) => number,
): readonly Step[] =>
  controlSizes.map((size) => [`${prefix}.${size}`, read(size)] as const);

const stepNumber = (value: unknown): number =>
  typeof value === "number" ? value : Number.NaN;

const stepValue = (scale: unknown, key: string): number =>
  stepNumber(isStepRecord(scale) ? scale[key] : undefined);

const reach = ({ offsetY, blurRadius, spreadRadius }: BoxShadow): number =>
  offsetY + blurRadius + spreadRadius;

const elevationSteps = (
  elevation: Stored<Elevation> | undefined,
): readonly Step[] =>
  elevationLevels.flatMap((level) => {
    const shadow = elevationShadow({ elevation }, level);
    if (shadow === undefined) {
      return [];
    }
    const value = reach(shadow);
    return Number.isFinite(value) ? [[level, value] as const] : [];
  });

const ordered = (
  group: ScaleGroup,
  steps: readonly Step[],
  allowEqual = false,
): readonly InvalidScale[] =>
  steps.slice(1).flatMap(([path, value], offset) => {
    const previous = steps[offset];
    if (previous === undefined) {
      return [];
    }
    const [previousPath, previousValue] = previous;
    if (!Number.isFinite(value) || !Number.isFinite(previousValue)) {
      return [];
    }
    return value > previousValue || (allowEqual && value === previousValue)
      ? []
      : [
          {
            group,
            path,
            value,
            previous: { path: previousPath, value: previousValue },
          },
        ];
  });

export function invalidScales(theme: ScaleSource): readonly InvalidScale[] {
  requireGroups(theme);
  const density: unknown = theme.density;
  const types: unknown = theme.typography;
  const controlScale = (metric: "controlHeight" | "controlPaddingX"): unknown =>
    isStepRecord(density) ? density[metric] : undefined;
  return [
    ...ordered(
      "spacing",
      keyed(spacingKeys, (key) => stepValue(theme.spacing, key)),
    ),
    ...ordered(
      "radius",
      keyed(radiusKeys, (key) => stepValue(theme.radius, key)),
      true,
    ),
    ...ordered(
      "borderWidth",
      keyed(borderKeys, (key) => stepValue(theme.borderWidth, key)),
    ),
    ...ordered(
      "iconSize",
      keyed(iconKeys, (key) => stepValue(theme.iconSize, key)),
    ),
    ...ordered(
      "typography",

      typeKeys.flatMap((role) => {
        const style: unknown = isStepRecord(types) ? types[role] : undefined;
        return isStepRecord(style)
          ? [[`${role}.fontSize`, stepNumber(style.fontSize)] as const]
          : [];
      }),
    ),
    ...ordered(
      "density",
      sized("controlHeight", (size) =>
        stepValue(controlScale("controlHeight"), size),
      ),
    ),
    ...ordered(
      "density",
      sized("controlPaddingX", (size) =>
        stepValue(controlScale("controlPaddingX"), size),
      ),
    ),
    ...ordered("elevation", elevationSteps(theme.elevation)),
  ];
}
