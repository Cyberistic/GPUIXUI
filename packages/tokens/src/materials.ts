import type { ThemeColors } from "./color.js";
import type { Theme } from "./theme.js";

export const materialNames = [
  "sidebar",
  "titlebar",
  "popover",
  "hud",
  "sheet",
] as const;

export type MaterialName = (typeof materialNames)[number];

export type MaterialFills = Readonly<Partial<Record<MaterialName, string>>>;

export type WindowBackground = "opaque" | "blurred";

export const materialFallback: Readonly<
  Record<MaterialName, keyof ThemeColors>
> = {
  sidebar: "muted",
  titlebar: "background",
  popover: "popover",
  hud: "popover",
  sheet: "card",
};

export const materialFill = (theme: Theme, name: MaterialName): string => {
  const fill = theme.materials?.[name];
  return fill === undefined ||
    theme.window !== "blurred" ||
    theme.reduceTransparency === true
    ? theme.colors[materialFallback[name]]
    : fill;
};
