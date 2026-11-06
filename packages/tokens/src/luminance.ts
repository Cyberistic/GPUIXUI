import { opaqueRgb } from "./measure.js";

const channel = (rgb: string, at: number): number => {
  const srgb = Number.parseInt(rgb.slice(at, at + 2), 16) / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = (
  color: string | undefined,
): number | undefined => {
  const rgb = color === undefined ? undefined : opaqueRgb(color);
  return rgb === undefined
    ? undefined
    : 0.2126 * channel(rgb, 1) +
        0.7152 * channel(rgb, 3) +
        0.0722 * channel(rgb, 5);
};

export const pageMode = (
  background: string | undefined,
): "light" | "dark" | undefined => {
  const page = relativeLuminance(background);
  if (page === undefined) {
    return undefined;
  }

  return 1.05 / (page + 0.05) > (page + 0.05) / 0.05 ? "dark" : "light";
};
