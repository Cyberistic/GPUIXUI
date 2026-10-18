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

/**
 * The forms a family name must hold, in documentation order. `trimmed` and
 * `css-generic` close two forms a reader brings from the web: a stray space is
 * not part of an installed name, and a CSS generic keyword is syntax the native
 * runtime does not resolve — `.SystemUIFont` is its sentinel. `quoted` closes
 * the third: CSS quotes around a multi-word family are not part of the name the
 * runtime looks up.
 */
export const typefaceRules = [
  "non-empty",
  "trimmed",
  "single-family",
  "quoted",
  "css-generic",
] as const;

/** A form a family name can miss. */
export type TypefaceRule = (typeof typefaceRules)[number];

/**
 * CSS's generic family keywords, in CSS Fonts 4 order. The native runtime has
 * no CSS generics: `StyleDesc.fontFamily` is a family name looked up in the
 * font database, and `.SystemUIFont` is the sentinel for the operating system's
 * UI face. A theme that names one of these paints the silent fallback, so
 * {@link themeTypefaceFailures} reports it.
 */
export const cssGenericFamilies = [
  "serif",
  "sans-serif",
  "cursive",
  "fantasy",
  "monospace",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "math",
  "emoji",
  "fangsong",
] as const;

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
 * A family wrapped in CSS quotes, or with one unmatched quote at an edge. The
 * runtime looks the string up verbatim, so the quote characters are part of the
 * name it searches for. A padded value is the `trimmed` rule's diagnostic alone,
 * so one bad value keeps one report, and an apostrophe inside a name
 * (`D'Nealian`) is a character of that name and is not reported.
 */
const isQuoted = (value: string): boolean =>
  value === value.trim() &&
  ['"', "'"].some((quote) => value.startsWith(quote) || value.endsWith(quote));

/**
 * Every family name in a theme the runtime cannot resolve as written.
 *
 * A `non-empty` failure is a value that is empty or whitespace-only, which
 * names nothing at all. A `trimmed` failure is a name with surrounding
 * whitespace — `" Inter"` — because the runtime matches the family string it is
 * given and the installed name has none; a whitespace-only value is the
 * `non-empty` rule's diagnostic alone, so one bad value keeps one diagnostic. A
 * `single-family` failure is a value containing a comma: `fontFamily` is one
 * string, so a CSS stack names a family no machine has and the text falls back
 * silently. A `quoted` failure is a name wrapped in CSS quotes — or a
 * half-copied declaration with one quote at an edge — because the runtime looks
 * the string up verbatim and the quote characters are part of the family name it
 * searches for; an apostrophe inside a name (`D'Nealian`) is a character of that
 * name and is not reported. A `css-generic` failure is one of
 * {@link cssGenericFamilies} as the whole value: CSS syntax, not a family the
 * font database holds. The generic test reads the value as written, so a padded
 * keyword reports `trimmed`.
 * A name with a space inside it (`Helvetica Neue`) is a valid single family and
 * is not reported; neither is the `.SystemUIFont` sentinel every shipped theme
 * uses.
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
    const trimmed = value.trim();
    return [
      ...(trimmed === "" ? [{ role, rule: "non-empty" as const, value }] : []),
      ...(trimmed !== "" && value !== trimmed
        ? [{ role, rule: "trimmed" as const, value }]
        : []),
      ...(value.includes(",")
        ? [{ role, rule: "single-family" as const, value }]
        : []),
      ...(isQuoted(value) ? [{ role, rule: "quoted" as const, value }] : []),
      ...(cssGenericFamilies.some((family) => family === value.toLowerCase())
        ? [{ role, rule: "css-generic" as const, value }]
        : []),
    ];
  });
}
