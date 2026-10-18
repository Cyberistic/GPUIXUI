/**
 * The cells a platform or recipe table prints.
 *
 * Test-shaped source beside the suites it serves, hoisted because the catalogue
 * and the README print the same row: two copies of a derivation drift. A row
 * states the theme a style resolves to, not the override record it is written
 * as — a style may name one radius or tune the preset its density starts from.
 */

import type { PlatformStyle } from "./platform-types.js";
import type { DensityName, Radius } from "./scale.js";
import { applyPlatformStyle, getTheme } from "./theme.js";

/** The values one table row prints. */
export interface PlatformTableCells {
  /** The four documented radius steps, inherited values included. */
  readonly radius: Radius;
  /** The density preset the resolved theme carries. */
  readonly density: DensityName;
  /** The light accent. */
  readonly light: string;
  /** The dark accent. */
  readonly dark: string;
  /** The light canvas, printed by the recipe table. */
  readonly background: string;
  /** The light selected-row fill, printed by the recipe table. */
  readonly selected: string;
}

/**
 * Resolve a platform style to the cells its documented row prints.
 *
 * @param style - A shipped or copied platform style.
 */
export const platformTableCells = (
  style: PlatformStyle,
): PlatformTableCells => {
  const light = applyPlatformStyle(getTheme("light"), style);
  const dark = applyPlatformStyle(getTheme("dark"), style);
  return {
    radius: light.radius,
    density: light.density.name,
    light: light.colors.primary,
    dark: dark.colors.primary,
    background: light.colors.background,
    selected: light.colors.selected,
  };
};
