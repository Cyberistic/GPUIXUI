export interface Spacing {
  readonly "2xs": number;

  readonly xs: number;

  readonly sm: number;

  readonly md: number;

  readonly lg: number;

  readonly xl: number;

  readonly "2xl": number;

  readonly "3xl": number;

  readonly "4xl": number;

  readonly "5xl": number;
}

export const spacing: Spacing = {
  "2xs": 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 24,
  "3xl": 32,
  "4xl": 48,
  "5xl": 64,
};

export const spacingSteps = [
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
] as const satisfies readonly (keyof Spacing)[];

export type SpacingStep = (typeof spacingSteps)[number];

type EverySpacingStepListed<Listed extends SpacingStep> =
  Exclude<keyof Spacing, Listed> extends never
    ? true
    : [
        "a spacing step is missing from the index",
        Exclude<keyof Spacing, Listed>,
      ];

const spacingIndex: EverySpacingStepListed<(typeof spacingSteps)[number]> =
  true;

void spacingIndex;

export const isSpacingStep = (value: unknown): value is SpacingStep =>
  spacingSteps.some((step) => step === value);

export interface Radius {
  readonly none: number;

  readonly sm: number;

  readonly md: number;

  readonly lg: number;

  readonly xl: number;

  readonly full: number;
}

export const radius: Radius = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
};

export const radiusSteps = [
  "none",
  "sm",
  "md",
  "lg",
  "xl",
  "full",
] as const satisfies readonly (keyof Radius)[];

export type RadiusStep = (typeof radiusSteps)[number];

type EveryRadiusStepListed<Listed extends RadiusStep> =
  Exclude<keyof Radius, Listed> extends never
    ? true
    : [
        "a radius step is missing from the index",
        Exclude<keyof Radius, Listed>,
      ];

const radiusIndex: EveryRadiusStepListed<(typeof radiusSteps)[number]> = true;

void radiusIndex;

export const isRadiusStep = (value: unknown): value is RadiusStep =>
  radiusSteps.some((step) => step === value);

export interface BorderWidth {
  readonly thin: number;

  readonly strong: number;
}

export const borderWidth: BorderWidth = { thin: 1, strong: 2 };

export interface IconSize {
  readonly xs: number;

  readonly sm: number;

  readonly md: number;

  readonly lg: number;

  readonly xl: number;
}

export const iconSize: IconSize = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 };

export const iconSizes = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
] as const satisfies readonly (keyof IconSize)[];

export type IconStep = (typeof iconSizes)[number];

type EveryIconStepListed<Listed extends IconStep> =
  Exclude<keyof IconSize, Listed> extends never
    ? true
    : [
        "an icon step is missing from the index",
        Exclude<keyof IconSize, Listed>,
      ];

const iconIndex: EveryIconStepListed<(typeof iconSizes)[number]> = true;

void iconIndex;

export const isIconSize = (value: unknown): value is IconStep =>
  iconSizes.some((step) => step === value);

export interface AvatarSize {
  readonly xs: number;

  readonly sm: number;

  readonly md: number;

  readonly lg: number;
}

export const avatarSize: AvatarSize = { xs: 20, sm: 26, md: 32, lg: 40 };

export const avatarSizes = [
  "xs",
  "sm",
  "md",
  "lg",
] as const satisfies readonly (keyof AvatarSize)[];

export type AvatarSizeName = (typeof avatarSizes)[number];

type EveryAvatarStepListed<Listed extends AvatarSizeName> =
  Exclude<keyof AvatarSize, Listed> extends never
    ? true
    : [
        "an avatar step is missing from the index",
        Exclude<keyof AvatarSize, Listed>,
      ];

const avatarIndex: EveryAvatarStepListed<(typeof avatarSizes)[number]> = true;

void avatarIndex;

export const isAvatarSize = (value: unknown): value is AvatarSizeName =>
  avatarSizes.some((step) => step === value);

export const avatarPixels = (size: unknown): number =>
  isAvatarSize(size) ? avatarSize[size] : avatarSize.md;

export interface TargetSize {
  readonly minimum: number;

  readonly comfortable: number;
}

export const targetSize: TargetSize = { minimum: 24, comfortable: 44 };

export function targetInset(
  visual: number,
  floor: number = targetSize.minimum,
): number {
  if (!Number.isFinite(visual) || !Number.isFinite(floor)) {
    return 0;
  }
  return Math.max(0, Math.ceil((floor - visual) / 2));
}

export const densityNames = ["compact", "comfortable", "spacious"] as const;

export type DensityName = (typeof densityNames)[number];

export const isDensityName = (value: unknown): value is DensityName =>
  densityNames.some((name) => name === value);

export const controlSizes = ["sm", "md", "lg"] as const;

export type ControlSize = (typeof controlSizes)[number];

export const isControlSize = (value: unknown): value is ControlSize =>
  controlSizes.some((size) => size === value);

export interface Density {
  readonly name: DensityName;

  readonly controlHeight: Readonly<Record<ControlSize, number>>;

  readonly controlPaddingX: Readonly<Record<ControlSize, number>>;

  readonly rowHeight: number;
}

export const densityPresets: Readonly<Record<DensityName, Density>> = {
  compact: {
    name: "compact",
    controlHeight: { sm: 24, md: 28, lg: 32 },
    controlPaddingX: { sm: 6, md: 8, lg: 10 },
    rowHeight: 28,
  },
  comfortable: {
    name: "comfortable",
    controlHeight: { sm: 28, md: 32, lg: 36 },
    controlPaddingX: { sm: 8, md: 10, lg: 12 },
    rowHeight: 32,
  },
  spacious: {
    name: "spacious",
    controlHeight: { sm: 32, md: 36, lg: 40 },
    controlPaddingX: { sm: 10, md: 12, lg: 14 },
    rowHeight: 36,
  },
};

export const defaultDensity: Density = densityPresets.comfortable;
