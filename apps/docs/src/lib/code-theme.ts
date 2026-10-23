import {
  syntaxColors,
  syntaxRoles,
  themes,
  type SyntaxRole,
  type ThemeMode,
} from "@gpuixui/tokens";

/**
 * The TextMate scopes each token type paints.
 *
 * Shiki picks a token's colour by its **most specific** matching scope, so a
 * narrower entry wins over the family above it: `keyword.operator` paints as the
 * operator while every other `keyword.*` keeps the keyword colour, and
 * `string.regexp` paints as a special string. Each role names at least one
 * scope, so no token falls back to the runtime's foreign palette.
 */
const syntaxScopes: Readonly<Record<SyntaxRole, readonly string[]>> = {
  comment: ["comment", "punctuation.definition.comment"],
  keyword: ["keyword", "storage"],
  string: ["string"],
  stringSpecial: ["string.regexp", "string.special", "string.template"],
  escape: ["constant.character.escape"],
  number: ["constant.numeric"],
  boolean: [
    "constant.language.boolean",
    "constant.language.null",
    "constant.language",
  ],
  typeName: ["entity.name.type", "support.type"],
  typeBuiltin: [
    "support.type.primitive",
    "support.type.builtin",
    "entity.name.type.primitive",
  ],
  constructor: ["entity.name.function.constructor", "support.class"],
  function: ["entity.name.function"],
  functionBuiltin: ["support.function"],
  macroName: [
    "entity.name.function.preprocessor",
    "entity.name.function.macro",
  ],
  property: [
    "variable.other.property",
    "support.variable.property",
    "meta.object-literal.key",
  ],
  constant: ["variable.other.constant", "constant.other", "constant"],
  variable: ["variable"],
  variableSpecial: ["variable.language", "variable.other.special"],
  parameter: ["variable.parameter"],
  operator: ["keyword.operator"],
  punctuation: ["punctuation", "meta.brace"],
  tag: ["entity.name.tag", "support.class.component"],
  attribute: ["entity.other.attribute-name"],
  label: ["entity.name.label", "entity.name.section", "meta.label"],
  invalid: ["invalid", "invalid.illegal"],
};

/**
 * A Shiki theme registration, the shape Fumadocs' code plugin accepts.
 *
 * The array is mutable because Shiki's `ThemeRegistration` declares `settings`
 * as one; the values are never written.
 */
export interface CodeTheme {
  readonly name: string;
  readonly type: ThemeMode;
  readonly settings: Array<{
    readonly scope?: string[];
    readonly settings: { readonly foreground: string };
  }>;
}

/** One mode's theme, every rule derived from the library's syntax palette. */
const codeTheme = (mode: ThemeMode): CodeTheme => {
  const palette = syntaxColors(themes[mode]);

  return {
    name: `gpuixui-${mode}`,
    type: mode,
    settings: [
      // Unscoped text — the default rule Shiki applies to every token it has no
      // narrower scope for — is the palette's variable ink.
      { settings: { foreground: palette.variable } },
      ...syntaxRoles.map((role) => ({
        scope: [...syntaxScopes[role]],
        settings: { foreground: palette[role] },
      })),
    ],
  };
};

/**
 * The two themes the docs site's code blocks highlight with, and the options a
 * render-time block hands Shiki.
 *
 * The site's chrome has its own palette, and its code samples used to be the
 * one surface carrying a third party's: Fumadocs' default `github-light`/
 * `github-dark`. `@gpuixui/tokens` ships a syntax palette measured for
 * readability in both modes, so the site builds its Shiki themes from it and a
 * code sample reads in the colours the library's native `<code>` host paints.
 *
 * A page's MDX fences take the themes through `source.config.ts`; the blocks a
 * component renders at run time take `codeOptions` through `HighlightedCode`.
 *
 * @example
 * ```ts
 * import { codeThemes } from "@/lib/code-theme";
 *
 * codeThemes.light.settings[0]; // the palette's variable ink, for plain text
 * ```
 */
export const codeThemes = {
  light: codeTheme("light"),
  dark: codeTheme("dark"),
} as const satisfies Readonly<Record<ThemeMode, CodeTheme>>;

/** The Shiki options both the build and a render-time code block pass. */
export const codeOptions = {
  themes: codeThemes,
  defaultColor: false,
} as const;
