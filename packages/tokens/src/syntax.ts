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
 */

import type { ThemeColors } from "./color.js";
import {
  contrastFloorsFor,
  contrastRatio,
  type ContrastFloors,
} from "./contrast.js";

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
export interface SyntaxSource {
  readonly mode: "light" | "dark";
  readonly contrast?: "default" | "high";
  readonly syntax?: SyntaxColors;
}

/**
 * The syntax palette a theme's code blocks paint in.
 *
 * A theme that carries `syntax` owns it — every role is its own, merged key by
 * key by `extendTheme` — and every other theme resolves the table for its mode
 * and contrast variant.
 *
 * @example
 * ```ts
 * import { syntaxColors, themes } from "@gpuixui/tokens";
 *
 * syntaxColors(themes.dark); // the dark table, one colour per token type
 * ```
 */
export function syntaxColors(theme: SyntaxSource): SyntaxColors {
  if (theme.syntax !== undefined) {
    return theme.syntax;
  }
  if (theme.contrast === "high") {
    return theme.mode === "dark"
      ? highContrastDarkSyntax
      : highContrastLightSyntax;
  }
  return theme.mode === "dark" ? darkSyntax : lightSyntax;
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
 * Every token colour in a theme's syntax palette that misses its floor.
 *
 * An empty array means a code block is readable in the theme: every role that
 * names code reaches the body floor on both fills a host paints, and the
 * comment reaches the secondary floor. The floors follow the theme's own
 * `contrast` declaration unless one is passed, and a palette value the contract
 * cannot measure — a translucent or non-hex colour — is reported unmeasurable
 * rather than counted as a pass.
 *
 * @example
 * ```ts
 * import { syntaxFailures, themes } from "@gpuixui/tokens";
 *
 * syntaxFailures(themes.light); // [] — every token clears its floor
 * ```
 */
export function syntaxFailures(
  theme: SyntaxSource & {
    readonly colors: Partial<ThemeColors>;
    readonly contrast?: "default" | "high";
  },
  floors: ContrastFloors = contrastFloorsFor(theme),
): readonly SyntaxFailure[] {
  const syntax = syntaxColors(theme);
  return syntaxRoles.flatMap((role) =>
    syntaxSurfaces.flatMap((surface): ReadonlyArray<SyntaxFailure> => {
      const floor = floors[syntaxRoleFloors[role]];
      const ratio = contrastRatio(syntax[role], theme.colors[surface]);
      return ratio !== undefined && ratio >= floor
        ? []
        : [{ role, surface, ratio, floor }];
    }),
  );
}
