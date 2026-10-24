import { systemMonoFamily, systemUiFont } from "./platforms.js";

/**
 * A font weight, as the runtime paints it.
 *
 * GPUIX takes a numeric weight and clamps it into its `1–1000` range
 * (`parse_font_weight` in the pinned `@gpuix/native@0.11.0` source), so this is
 * a number like the size and the leading beside it rather than a four-value
 * union: the scale ships `400`/`500`/`600`/`700`, a variable face's `450` is a
 * real step, and a display role's `800` is a decision the renderer accepts.
 * `invalidNumbers` holds a weight to a finite number, because a `NaN` reaches
 * native as `null` and the property is dropped.
 */
export type FontWeight = number;

/** A single typographic role: size, leading and weight. */
export interface TextStyle {
  /** Font size in pixels. */
  readonly fontSize: number;
  /** Line height in pixels. */
  readonly lineHeight: number;
  /** Font weight. */
  readonly fontWeight: FontWeight;
}

/** Font families and the named type roles components use. */
export interface Typography {
  /** UI font family. */
  readonly sans: string;
  /** Monospace font family for code and tabular figures. */
  readonly mono: string;
  /** Largest display text. */
  readonly display: TextStyle;
  /** First-level page heading. */
  readonly h1: TextStyle;
  /** Section heading. */
  readonly h2: TextStyle;
  /** Subsection heading. */
  readonly h3: TextStyle;
  /** Default body copy. */
  readonly body: TextStyle;
  /** Emphasised body copy. */
  readonly bodyStrong: TextStyle;
  /** Form labels, buttons and compact controls. */
  readonly label: TextStyle;
  /** Captions, metadata and helper text. */
  readonly caption: TextStyle;
  /** Inline code. */
  readonly code: TextStyle;
  /** Code blocks and terminal output. */
  readonly codeBlock: TextStyle;
}

/** A typographic role name, excluding the font family fields. */
export type TextRole = Exclude<keyof Typography, "sans" | "mono">;

/**
 * The type roles in documentation order — largest to smallest, with the two mono
 * roles last.
 *
 * A role name is content before it is a literal: a saved markdown node, a
 * rich-text span or a restored inspector row carries one, so the index is what a
 * consumer iterates and what {@link isTextRole} checks a restored value against.
 */
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

/**
 * A role the index does not list, as a build error.
 *
 * `TextRole` derives from `Typography`, so a role added to the scale is one edit
 * away from shipping unlisted — and a role the index does not name is one
 * `isTextRole` refuses and a consumer's loop never paints. The assignment below
 * fails the package's type check with the missing role named.
 */
type EveryRoleListed<Listed extends TextRole> =
  Exclude<TextRole, Listed> extends never
    ? true
    : ["a text role is missing from the index", Exclude<TextRole, Listed>];

const roleIndex: EveryRoleListed<(typeof textRoles)[number]> = true;
// Keep the guard live under `noUnusedLocals`; the value is never produced.
void roleIndex;

/**
 * Narrow unknown input — a saved document's role, a stored inspector row — to a
 * role of this release's type scale.
 *
 * The scale's own list is the membership test, so a role added to the scale is
 * accepted without a second list to edit and a name a release dropped is refused.
 */
export const isTextRole = (value: unknown): value is TextRole =>
  textRoles.some((role) => role === value);

const text = (
  fontSize: number,
  lineHeight: number,
  fontWeight: FontWeight,
): TextStyle => ({ fontSize, lineHeight, fontWeight });

/** The default type scale. Density does not change type sizes. */
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
