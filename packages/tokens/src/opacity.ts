import { colorRoles, isHexColor, type ThemeColors } from "./color.js";
import type { Theme } from "./theme.js";

/** The alpha form a colour role's value must take. */
export type ColorForm = "opaque" | "translucent";

/**
 * The roles the runtime composites. A wash is painted over content, so it needs
 * an alpha channel; every other role is opaque, and the elevation tint is the
 * opposite case — `alpha(theme.colors.shadow, levelAlpha)` writes the fourth
 * byte, so a tint authored at 50% paints at the level's own 8/12/16%.
 */
export const translucentRoles = [
  "selection",
  "overlay",
  "selectionOnFill",
] as const;

/** A role from {@link translucentRoles}. */
export type TranslucentRole = (typeof translucentRoles)[number];

/**
 * The form a colour role's value must take. Total over `colorRoles`: the three
 * veils are translucent and every other role is opaque, so a role added to the
 * palette is governed without a second list.
 *
 * @example
 * ```ts
 * import { roleForm } from "@gpuixui/tokens";
 *
 * roleForm("overlay"); // "translucent"
 * roleForm("shadow"); // "opaque"
 * ```
 */
export const roleForm = (role: keyof ThemeColors): ColorForm =>
  translucentRoles.some((translucent) => translucent === role)
    ? "translucent"
    : "opaque";

/** A colour role whose alpha channel is not the form it is painted in. */
export interface OpacityFailure {
  /** The role, named the way the catalogue names it. */
  readonly role: keyof ThemeColors;
  /** The value the theme carried. */
  readonly value: string;
  /** The form the role must take. */
  readonly expected: ColorForm;
}

/**
 * Whether the value paints solid: six digits, or eight with a fully opaque
 * byte. A redundant `FF` on an opaque role is accepted — the role paints the
 * same colour either way.
 */
const paintsSolid = (value: string): boolean => {
  const alpha = value.slice(7);
  return alpha.length !== 2 || Number.parseInt(alpha, 16) === 0xff;
};

/**
 * Whether the value is a veil: eight digits with a byte strictly between `00`
 * and `FF`. A fully transparent byte paints nothing and a fully opaque one is a
 * solid block, so neither is a wash.
 */
const paintsVeil = (value: string): boolean => {
  const alpha = value.slice(7);
  if (alpha.length !== 2) {
    return false;
  }
  const byte = Number.parseInt(alpha, 16);
  return byte > 0x00 && byte < 0xff;
};

/**
 * Every colour role whose alpha channel does not match the form it is painted
 * in — the alpha half of the editable-theme guarantee.
 *
 * `themeColorFailures` accepts six- and eight-digit hex because the token maths
 * parses both; this check asks which of the two the role needs. The three veils
 * composite over content, so each needs an alpha byte strictly between `00` and
 * `FF`; every other role is opaque, so a partial alpha is a value the paint does
 * not use — `elevationShadow` replaces the tint's byte with the level's own. A
 * value the hex parser cannot read is `themeColorFailures`' diagnostic and is
 * skipped here, so one defect keeps one report.
 *
 * @example
 * ```ts
 * import { extendTheme, getTheme, themeOpacityFailures } from "@gpuixui/tokens";
 *
 * const tinted = extendTheme(getTheme("light"), {
 *   colors: { shadow: "#191D2580" },
 * });
 *
 * themeOpacityFailures(tinted);
 * // [{ role: "shadow", value: "#191D2580", expected: "opaque" }]
 * ```
 */
export function themeOpacityFailures(
  theme: Theme,
): ReadonlyArray<OpacityFailure> {
  return colorRoles.flatMap((role) => {
    const value = theme.colors[role];
    if (!isHexColor(value)) {
      return [];
    }
    const expected = roleForm(role);
    const holds =
      expected === "translucent" ? paintsVeil(value) : paintsSolid(value);
    return holds ? [] : [{ role, value, expected }];
  });
}
