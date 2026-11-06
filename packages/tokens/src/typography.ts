import { systemMonoFamily, systemUiFont } from "./platforms.js";

export type FontWeight = number;

export interface TextStyle {
  readonly fontSize: number;

  readonly lineHeight: number;

  readonly fontWeight: FontWeight;
}

export interface Typography {
  readonly sans: string;

  readonly mono: string;

  readonly display: TextStyle;

  readonly h1: TextStyle;

  readonly h2: TextStyle;

  readonly h3: TextStyle;

  readonly body: TextStyle;

  readonly bodyStrong: TextStyle;

  readonly label: TextStyle;

  readonly caption: TextStyle;

  readonly code: TextStyle;

  readonly codeBlock: TextStyle;
}

export type TextRole = Exclude<keyof Typography, "sans" | "mono">;

export const textRoles = [
  "display",
  "h1",
  "h2",
  "h3",
  "body",
  "bodyStrong",
  "label",
  "caption",
  "code",
  "codeBlock",
] as const satisfies readonly TextRole[];

type EveryRoleListed<Listed extends TextRole> =
  Exclude<TextRole, Listed> extends never
    ? true
    : ["a text role is missing from the index", Exclude<TextRole, Listed>];

const roleIndex: EveryRoleListed<(typeof textRoles)[number]> = true;

void roleIndex;

export const isTextRole = (value: unknown): value is TextRole =>
  textRoles.some((role) => role === value);

const text = (
  fontSize: number,
  lineHeight: number,
  fontWeight: FontWeight,
): TextStyle => ({ fontSize, lineHeight, fontWeight });

export const typography: Typography = {
  sans: systemUiFont,
  mono: systemMonoFamily,
  display: text(28, 36, 600),
  h1: text(24, 32, 600),
  h2: text(20, 28, 600),
  h3: text(16, 24, 600),
  body: text(14, 20, 400),
  bodyStrong: text(14, 20, 600),
  label: text(13, 18, 500),
  caption: text(12, 16, 400),
  code: text(13, 20, 400),
  codeBlock: text(12, 18, 400),
};
