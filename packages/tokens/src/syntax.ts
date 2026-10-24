/**
 * The palette a native `<code>` host highlights with.
 *
 * `@gpuix/native@0.11.0` reads a code block's token colours from the theme
 * object's `syntax` field, and a host handed none falls back to the runtime's
 * built-in palette — the one designed for its own dark default, so a light
 * theme's code block paints comments and keywords chosen for a dark canvas.
 * This package shipped no syntax scale, which left the one native surface a
 * reader spends time in as the only themed surface with a foreign palette.
 *
 * A syntax colour is not a semantic role: `keyword` and `string` mean "a
 * category of token", not "danger" or "success", so reusing a role would make a
 * string literal read as a status and a brand's `primary` repaint would recolor
 * code. Nor is it a chart scale: a series asks "are these two categories
 * different", while a code block asks "can I read this token, and can I tell it
 * from the token beside it" — so the contract here is readability on the fill
 * the host paints, not categorical distinctness.
 *
 * Two tables per mode, as with the data series: a high-contrast variant holds
 * even its quiet run — a comment — at 7:1, so the light table's comment, which
 * is designed to sit back at the secondary floor, is one step short there. The
 * rest of the table is unchanged, because every role that names code was
 * authored at the body floor, which is 7:1 in both variants. A theme that wants
 * more saturation owns a palette through `syntax`, and every value it supplies
 * is measured by {@link syntaxFailures} exactly as the shipped ones are.
 *
 * The surfaces are not only the fills a caller paints. A `<code>` host is handed
 * one of those fills, but a `<markdown>` host's fenced block paints a fill of its
 * own — 3.5% of a neutral ink over the caller's fill, and another 2% under the
 * language strip (`nativeFenceFill` in the native text seam) — so the palette is
 * read on that composite too. A style that repaints the page the fence sits on
 * owns the table for it, which is why the three dark platform styles declare one
 * with a keyword a step brighter than this identity's.
 */

import {
  namesColour,
  themeColors,
  type ColourSource,
  type ThemeColors,
} from "./color.js";
import {
  contrastFloorsFor,
  contrastRatio,
  type ContrastFloors,
} from "./contrast.js";
import { themeContrastOf, themeModeOf } from "./mode.js";

/**
 * The token types a syntax theme paints, in the runtime's own order, so
 * `syntaxColors` answers every key a host can read and a palette cannot omit
 * one.
 */
export const syntaxRoles = [
  "comment",
  "keyword",
  "string",
  "stringSpecial",
  "escape",
  "number",
  "boolean",
  "typeName",
  "typeBuiltin",
  "constructor",
  "function",
  "functionBuiltin",
  "macroName",
  "property",
  "constant",
  "variable",
  "variableSpecial",
  "parameter",
  "operator",
  "punctuation",
  "tag",
  "attribute",
  "label",
  "invalid",
] as const;

/** One token type a syntax palette paints. */
export type SyntaxRole = (typeof syntaxRoles)[number];

/**
 * A complete syntax palette: one colour per token type.
 *
 * Complete rather than partial because the contract measures every role a host
 * can paint, and because the runtime's own fields are all optional: a palette
 * missing a key would silently inherit the runtime's foreign colour for it.
 */
export type SyntaxColors = Readonly<Record<SyntaxRole, string>>;

/**
 * A syntax palette as a store hands it back.
 *
 * A saved palette is not the tuple the paint path promises: a row written by a
 * release that shipped fewer token types holds a subset of {@link syntaxRoles},
 * JSON writes `null` for a token it never carried, and a palette exported by a
 * design tool names only the tokens someone edited. Widening the boundary to
 * this shape is what lets a consumer's own decoder hand its value over without
 * the cast `AGENTS.md` §2 forbids — the rule `SyntaxAuditSource` and every other
 * storage port in the package already follows.
 */
export type StoredSyntax = Readonly<Record<string, unknown>>;

/**
 * The contrast floor each token type is held to.
 *
 * A **comment** is an annotation about the code rather than the code, and every
 * shipped palette quiets it on purpose, so it answers to the secondary floor —
 * the same claim the package makes for a field's hint and a caption. Every role
 * that names code is read at the body floor: a keyword, a string or a name is
 * the text the reader came for.
 */
export const syntaxRoleFloors: Readonly<
  Record<SyntaxRole, keyof ContrastFloors>
> = {
  comment: "secondary",
  keyword: "body",
  string: "body",
  stringSpecial: "body",
  escape: "body",
  number: "body",
  boolean: "body",
  typeName: "body",
  typeBuiltin: "body",
  constructor: "body",
  function: "body",
  functionBuiltin: "body",
  macroName: "body",
  property: "body",
  constant: "body",
  variable: "body",
  variableSpecial: "body",
  parameter: "body",
  operator: "body",
  punctuation: "body",
  tag: "body",
  attribute: "body",
  label: "body",
  invalid: "body",
};

/** The syntax palette for a light theme. */
export const lightSyntax: SyntaxColors = {
  comment: "#545D6C",
  keyword: "#3B2C8F",
  string: "#0E5135",
  stringSpecial: "#0A3A26",
  escape: "#4B3100",
  number: "#2A1B00",
  boolean: "#173A88",
  typeName: "#2E2370",
  typeBuiltin: "#1C1547",
  constructor: "#152F6B",
  function: "#0C1D42",
  functionBuiltin: "#152F6B",
  macroName: "#5C1619",
  property: "#173A88",
  constant: "#3A0B0D",
  variable: "#191D25",
  variableSpecial: "#5C1619",
  parameter: "#3D4552",
  operator: "#2A303B",
  punctuation: "#3D4552",
  tag: "#7E1D21",
  attribute: "#4B3100",
  label: "#0B0D11",
  invalid: "#3A0B0D",
};

/** The syntax palette for a dark theme. */
export const darkSyntax: SyntaxColors = {
  comment: "#A1A9B7",
  keyword: "#A7A9FF",
  string: "#6FE0A3",
  stringSpecial: "#A8F0C6",
  escape: "#FFDE8A",
  number: "#FFC94D",
  boolean: "#9FBEFF",
  typeName: "#C7CBFF",
  typeBuiltin: "#E0E3FF",
  constructor: "#C5D8FF",
  function: "#DEE9FF",
  functionBuiltin: "#C5D8FF",
  macroName: "#FF9E9E",
  property: "#9FBEFF",
  constant: "#FFC6C6",
  variable: "#E1E5EC",
  variableSpecial: "#FFC6C6",
  parameter: "#CBD1DB",
  operator: "#E1E5EC",
  punctuation: "#CBD1DB",
  tag: "#FF9E9E",
  attribute: "#FFDE8A",
  label: "#EEF1F5",
  invalid: "#FF9E9E",
};

/** The syntax palette for a high-contrast light theme: the light table, with its quiet run darkened to the AAA floor. */
export const highContrastLightSyntax: SyntaxColors = {
  ...lightSyntax,
  comment: "#3D4552",
};

/** The syntax palette for a high-contrast dark theme: the dark table, with its quiet run lightened to the AAA floor. */
export const highContrastDarkSyntax: SyntaxColors = {
  ...darkSyntax,
  comment: "#CBD1DB",
};

/**
 * The fills a native code host paints behind its tokens, so every role is
 * measured on the surface it is actually read on: the page role a code block
 * paints (`CODE_BLOCK_ROOT` is `bg-background`), and a field's `input` fill,
 * which is the other fill `nativeTextTheme` can hand a host.
 */
export const syntaxSurfaces = ["input", "background"] as const;

/** A theme's mode, contrast variant and optional authored syntax palette. */
export interface SyntaxSource extends ColourSource {
  /** The theme's mode. A stored name is read through `themeModeOf`. */
  readonly mode?: unknown;
  /** The contrast variant. A stored name is read through `themeContrastOf`. */
  readonly contrast?: unknown;
  /**
   * The palette the theme authors, when it carries one. A store writes `null`
   * for a table it never carried and a shorter table for the tokens it does
   * not name, so a saved theme reaches this seam without a cast — the rule
   * {@link StoredSyntax} describes. A theme's own complete palette is handed
   * back as the object it is; a short one is read role by role
   * ({@link syntaxPalette}).
   */
  readonly syntax?: StoredSyntax | null;
}

/** The table a theme with no palette of its own resolves, by mode and variant. */
const shippedSyntax = (theme: SyntaxSource): SyntaxColors => {
  const mode = themeModeOf(theme);
  if (themeContrastOf(theme) === "high") {
    return mode === "dark" ? highContrastDarkSyntax : highContrastLightSyntax;
  }
  return mode === "dark" ? darkSyntax : lightSyntax;
};

/** Whether a stored palette names a colour for every token the runtime reads. */
const isCompleteSyntax = (palette: StoredSyntax): palette is SyntaxColors =>
  syntaxRoles.every((role) => namesColour(palette[role]));

/**
 * A stored palette read over the table it inherits from.
 *
 * A token the store named as a colour is its own; a token it did not name — one
 * an older release had not shipped, one JSON wrote as `null`, one a field
 * cleared to `""` — answers the fallback's value rather than being handed to a
 * host, whose own palette for a missing key is the dark-designed one this seam
 * exists to replace. That is the rule every colour role follows: the paint
 * answers the value the theme carries, and the report (`syntaxFailures`) names
 * the value the store wrote, so the gate still refuses a theme that lost a
 * token.
 *
 * @example
 * ```ts
 * import { darkSyntax, lightSyntax, syntaxPalette } from "@gpuixui/tokens";
 *
 * // A stored palette that names one token, read over the light table:
 * syntaxPalette({ keyword: "#7A1F5C" }, lightSyntax).number; // lightSyntax.number
 * ```
 */
export function syntaxPalette(
  stored: StoredSyntax,
  fallback: SyntaxColors,
): SyntaxColors {
  if (isCompleteSyntax(stored)) {
    return stored;
  }
  return syntaxRoles.reduce<SyntaxColors>((palette, role) => {
    const value = stored[role];
    return namesColour(value) ? { ...palette, [role]: value } : palette;
  }, fallback);
}

/**
 * The syntax palette a theme's code blocks paint in.
 *
 * A theme that carries `syntax` owns it — every role it names is its own — and
 * every role it does not name answers the shipped table for its mode and
 * contrast variant, so a saved palette that predates a token type paints this
 * package's colour for it rather than the host's foreign default. A complete
 * palette is handed back as the object it is, and every other theme resolves the
 * table for its mode and contrast variant.
 *
 * **A table a store wrote as `null` is the absence it is**: JSON has no
 * `undefined`, so a saved theme comes back with `null` where it carried no
 * palette, and handing that to a code host is a painter reading a token off
 * `null`. The palette is the theme's own where it holds one, and the shipped
 * table for its mode and variant otherwise.
 *
 * @example
 * ```ts
 * import { syntaxColors, themes } from "@gpuixui/tokens";
 *
 * syntaxColors(themes.dark); // the dark table, one colour per token type
 * ```
 */
export function syntaxColors(theme: SyntaxSource): SyntaxColors {
  const table = shippedSyntax(theme);
  return theme.syntax == null ? table : syntaxPalette(theme.syntax, table);
}

/** One token colour a reader cannot read, or cannot be measured. */
export interface SyntaxFailure {
  /** The token type the palette paints. */
  readonly role: SyntaxRole;
  /** The fill it is read on. */
  readonly surface: keyof ThemeColors;
  /**
   * The measured ratio, or `undefined` when the colour is not in the measured
   * dialect. An unverifiable token is reported rather than skipped.
   */
  readonly ratio: number | undefined;
  /** The floor it had to reach. */
  readonly floor: number;
}

/**
 * The palette a syntax audit reads: the theme's own **as the store wrote it**,
 * or the shipped table for its mode and variant.
 *
 * It is the stored shape rather than `SyntaxColors` on purpose: the report's job
 * is to name a token a theme lost, so it reads the table the store handed over
 * and not the completed one the paint seam builds from it — a palette that names
 * three tokens is three colours and twenty-one absences, which is exactly what
 * fails the gate.
 */
const readPalette = (theme: SyntaxAuditSource): StoredSyntax =>
  theme.syntax ??
  syntaxColors({
    mode: theme.mode,
    contrast: theme.contrast,
    colors: theme.colors,
  });

/**
 * A theme with the fields a syntax audit reads.
 *
 * One token name is `constructor`, so a hand-written palette that omits it
 * answers `Object.prototype.constructor` — a function, not a colour. Reading
 * only a **string** is what makes that the missing token it is rather than a
 * value the contract tries to measure.
 */
export interface SyntaxAuditSource extends ColourSource {
  /** The theme's mode. A stored name is read through `themeModeOf`. */
  readonly mode?: unknown;
  /** The contrast variant. A stored name is read through `themeContrastOf`. */
  readonly contrast?: unknown;
  /**
   * The palette the theme authors, or `null` for a table a store never
   * carried. Read as an open record — a decoded palette can hold a subset of
   * the tokens, or one a store wrote as `null`.
   */
  readonly syntax?: Readonly<Record<string, unknown>> | null;
}

/** The colour a palette names for a token, or `undefined` when it names none. */
const tokenColour = (
  palette: Readonly<Record<string, unknown>>,
  role: SyntaxRole,
): string | undefined => {
  const value = palette[role];
  return typeof value === "string" ? value : undefined;
};

/**
 * Every token colour in a theme's syntax palette that misses its floor.
 *
 * An empty array means a code block is readable in the theme: every role that
 * names code reaches the body floor on both fills a host paints, and the
 * comment reaches the secondary floor. The floors follow the theme's own
 * `contrast` declaration unless one is passed, and a palette value the contract
 * cannot measure — a translucent or non-hex colour — is reported unmeasurable
 * rather than counted as a pass.
 *
 * **A token the palette does not carry is one of those unmeasurable values**, so
 * every one of {@link syntaxRoles} is reported. The paint seam completes the
 * table ({@link syntaxColors}), so the theme still paints a readable colour for
 * the token it lost — but the gate's job is to name the field to repair, not to
 * pass a palette the store no longer carries.
 *
 * @example
 * ```ts
 * import { syntaxFailures, themes } from "@gpuixui/tokens";
 *
 * syntaxFailures(themes.light); // [] — every token clears its floor
 * ```
 */
export function syntaxFailures(
  theme: SyntaxAuditSource,
  floors: ContrastFloors = contrastFloorsFor(theme),
): readonly SyntaxFailure[] {
  const palette = readPalette(theme);
  const colors = themeColors(theme);
  return syntaxRoles.flatMap((role) =>
    syntaxSurfaces.flatMap((surface): ReadonlyArray<SyntaxFailure> => {
      const floor = floors[syntaxRoleFloors[role]];
      const ratio = contrastRatio(tokenColour(palette, role), colors[surface]);
      return ratio !== undefined && ratio >= floor
        ? []
        : [{ role, surface, ratio, floor }];
    }),
  );
}
