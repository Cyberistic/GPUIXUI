import {
  syntaxColors,
  syntaxRoles,
  themes,
  type SyntaxRole,
  type ThemeMode,
} from "@gpuixui/tokens";

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

export interface CodeTheme {
  readonly name: string;
  readonly type: ThemeMode;
  readonly settings: Array<{
    readonly scope?: string[];
    readonly settings: { readonly foreground: string };
  }>;
}

const codeTheme = (mode: ThemeMode): CodeTheme => {
  const palette = syntaxColors(themes[mode]);

  return {
    name: `gpuixui-${mode}`,
    type: mode,
    settings: [
      { settings: { foreground: palette.variable } },
      ...syntaxRoles.map((role) => ({
        scope: [...syntaxScopes[role]],
        settings: { foreground: palette[role] },
      })),
    ],
  };
};

export const codeThemes = {
  light: codeTheme("light"),
  dark: codeTheme("dark"),
} as const satisfies Readonly<Record<ThemeMode, CodeTheme>>;

export const codeOptions = {
  themes: codeThemes,
  defaultColor: false,
} as const;
