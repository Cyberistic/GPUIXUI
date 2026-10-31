/**
 * Materials: the surfaces a native window paints as the desktop blurred through
 * it, rather than as an opaque role.
 *
 * A window opened with `windowBackground: "blurred"` leaves every pixel the app
 * does not paint to the window server's vibrancy, and a translucent app fill
 * keeps its alpha over it (measured by the playground's `window-backdrop` probe,
 * plan 721): so a sidebar's tint is a translucent colour over the blur. In an
 * opaque window the same fill would composite against the window's own black
 * surface, so every material carries the opaque role it stands for, and
 * {@link materialFill} paints that role whenever the window is opaque or the
 * reader asked for less transparency.
 */

import type { ThemeColors } from "./color.js";
import type { Theme } from "./theme.js";

/** The surfaces a native window paints as a material, in documentation order. */
export const materialNames = [
  "sidebar",
  "titlebar",
  "popover",
  "hud",
  "sheet",
] as const;

/** A surface a native window paints as a material. */
export type MaterialName = (typeof materialNames)[number];

/** One mode's material fills; a material a theme omits paints its fallback. */
export type MaterialFills = Readonly<Partial<Record<MaterialName, string>>>;

/** The window background a theme's materials need. */
export type WindowBackground = "opaque" | "blurred";

/** The opaque role each material stands for. */
export const materialFallback: Readonly<
  Record<MaterialName, keyof ThemeColors>
> = {
  sidebar: "muted",
  titlebar: "background",
  popover: "popover",
  hud: "popover",
  sheet: "card",
};

/**
 * The fill a surface paints: the material over a blurred window, or the opaque
 * role it stands for. This is the one reader a component uses — none reads
 * `theme.materials` directly.
 */
export const materialFill = (theme: Theme, name: MaterialName): string => {
  const fill = theme.materials?.[name];
  return fill === undefined ||
    theme.window !== "blurred" ||
    theme.reduceTransparency === true
    ? theme.colors[materialFallback[name]]
    : fill;
};
