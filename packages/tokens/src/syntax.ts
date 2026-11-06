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

export type SyntaxRole = (typeof syntaxRoles)[number];

export type SyntaxColors = Readonly<Record<SyntaxRole, string>>;

export type StoredSyntax = Readonly<Record<string, unknown>>;

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

export const highContrastLightSyntax: SyntaxColors = {
  ...lightSyntax,
  comment: "#3D4552",
};

export const highContrastDarkSyntax: SyntaxColors = {
  ...darkSyntax,
  comment: "#CBD1DB",
};

export const syntaxSurfaces = ["input", "background"] as const;

export interface SyntaxSource extends ColourSource {
  readonly mode?: unknown;

  readonly contrast?: unknown;

  readonly syntax?: StoredSyntax | null;
}

const shippedSyntax = (theme: SyntaxSource): SyntaxColors => {
  const mode = themeModeOf(theme);
  if (themeContrastOf(theme) === "high") {
    return mode === "dark" ? highContrastDarkSyntax : highContrastLightSyntax;
  }
  return mode === "dark" ? darkSyntax : lightSyntax;
};

const isCompleteSyntax = (palette: StoredSyntax): palette is SyntaxColors =>
  syntaxRoles.every((role) => namesColour(palette[role]));

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

export function syntaxColors(theme: SyntaxSource): SyntaxColors {
  const table = shippedSyntax(theme);
  return theme.syntax == null ? table : syntaxPalette(theme.syntax, table);
}

export interface SyntaxFailure {
  readonly role: SyntaxRole;

  readonly surface: keyof ThemeColors;

  readonly ratio: number | undefined;

  readonly floor: number;
}

const readPalette = (theme: SyntaxAuditSource): StoredSyntax =>
  theme.syntax ??
  syntaxColors({
    mode: theme.mode,
    contrast: theme.contrast,
    colors: theme.colors,
  });

export interface SyntaxAuditSource extends ColourSource {
  readonly mode?: unknown;

  readonly contrast?: unknown;

  readonly syntax?: Readonly<Record<string, unknown>> | null;
}

const tokenColour = (
  palette: Readonly<Record<string, unknown>>,
  role: SyntaxRole,
): string | undefined => {
  const value = palette[role];
  return typeof value === "string" ? value : undefined;
};

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
