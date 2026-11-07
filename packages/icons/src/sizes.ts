import { iconSize, isIconSize } from "@gpuixui/tokens";

export const ICON_SIZES = iconSize;

export type IconSize = keyof typeof ICON_SIZES;

export const iconPixels = (size: unknown): number => {
  if (typeof size === "number") {
    return Number.isFinite(size) && size > 0 ? size : ICON_SIZES.md;
  }
  return isIconSize(size) ? ICON_SIZES[size] : ICON_SIZES.md;
};
