import {
  avatarSize,
  avatarSizeSteps,
  borderWidth,
  borderWidthSteps,
  dimensionNames,
  dimensions,
  iconSize,
  iconSizeSteps,
  radius,
  radiusSteps,
  spacing,
  spacingSteps,
} from "./index.js";

/**
 * The numeric scales as documentation tables. Every index is `keyof` its scale,
 * so the lookup is typed and no cast is needed; a member added to a scale but
 * not its index fails `scale-indexes.test.ts`.
 */
export const scaleTables = () => ({
  spacing: spacingSteps.map((token) => ({ token, value: spacing[token] })),
  radius: radiusSteps.map((token) => ({ token, value: radius[token] })),
  borderWidth: borderWidthSteps.map((token) => ({
    token,
    value: borderWidth[token],
  })),
  iconSize: iconSizeSteps.map((token) => ({ token, value: iconSize[token] })),
  avatarSize: avatarSizeSteps.map((token) => ({
    token,
    value: avatarSize[token],
  })),
  dimensions: dimensionNames.map((token) => ({
    token,
    value: dimensions[token],
  })),
});
