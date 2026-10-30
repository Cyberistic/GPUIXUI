/**
 * A theme magnified k× for the film's macro shots: every length the tokens own
 * scales, so a control renders natively large instead of being upscaled.
 * Colours, weights and unitless ratios are not lengths and stay put.
 */
import type { Theme } from "@gpuixui/tokens";

const unitless = new Set(["fontWeight", "opacity", "name", "mode", "contrast"]);

const scale = (value: unknown, k: number, key: string): unknown => {
  if (unitless.has(key)) return value;
  if (typeof value === "number") return key === "lineHeight" && value < 4 ? value : value * k;
  if (Array.isArray(value)) return value.map((item) => scale(item, k, key));
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [name, scale(item, k, name)]),
    );
  return value;
};

export const magnify = (theme: Theme, k: number): Theme => {
  const { colors, ...lengths } = theme;
  return { ...(scale(lengths, k, "") as Omit<Theme, "colors">), colors };
};
