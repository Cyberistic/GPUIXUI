/**
 * The typeface half of the theme contract.
 *
 * `typography.sans` and `typography.mono` are painted as
 * `StyleDesc.fontFamily`, which GPUix 0.10.0 takes as **one** family string —
 * not a CSS stack — and GPUI resolves by name, falling back silently when the
 * name is unknown (plan 051). A copied theme therefore has a silent failure
 * mode the colour, contrast and metric checks cannot see: `sans: "Inter,
 * system-ui, sans-serif"` (the CSS habit) or `sans: ""` paints every label in a
 * face the author did not choose while `themeFailures` returns `[]`.
 */

import type { Theme } from "./theme.js";

/** The family fields a theme paints with, in documentation order. */
export const typefaceRoles = ["sans", "mono"] as const;

/** A family field a theme paints with. */
export type TypefaceRole = (typeof typefaceRoles)[number];

/** The forms a family name must hold, in documentation order. */
export const typefaceRules = ["non-empty", "single-family"] as const;

/** A form a family name can miss. */
export type TypefaceRule = (typeof typefaceRules)[number];

/** One family name that misses a form in a theme. */
export interface TypefaceFailure {
  /** The family field: `sans` or `mono`. */
  readonly role: TypefaceRole;
  /** The form the value broke. */
  readonly rule: TypefaceRule;
  /** The value the theme carried. */
  readonly value: string;
}

/**
 * Every family name in a theme the runtime cannot resolve as written.
 *
 * A `single-family` failure is a value containing a comma: `fontFamily` is one
 * string, so a CSS stack names a family no machine has and the text falls back
 * silently. A `non-empty` failure is a value that is empty or whitespace-only,
 * which names nothing at all. A name with spaces inside it (`Helvetica Neue`)
 * is a valid single family and is not reported; neither is the `.SystemUIFont`
 * sentinel every shipped theme uses.
 *
 * @example
 * ```ts
 * import { extendTheme, getTheme, themeTypefaceFailures } from "@gpuixui/tokens";
 *
 * const stacked = extendTheme(getTheme("light"), {
 *   typography: { sans: "Inter, system-ui, sans-serif" },
 * });
 *
 * themeTypefaceFailures(stacked); // [{ role: "sans", rule: "single-family", … }]
 * ```
 */
export function themeTypefaceFailures(
  theme: Theme,
): ReadonlyArray<TypefaceFailure> {
  return typefaceRoles.flatMap((role): ReadonlyArray<TypefaceFailure> => {
    const value = theme.typography[role];
    return [
      ...(value.trim() === ""
        ? [{ role, rule: "non-empty" as const, value }]
        : []),
      ...(value.includes(",")
        ? [{ role, rule: "single-family" as const, value }]
        : []),
    ];
  });
}
