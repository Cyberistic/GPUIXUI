import { systemMonoFamily, systemUiFont } from "./platform-types.js";

/**
 * A CSS numeric font weight, `1…1000`. The shipped scale uses `400` regular,
 * `500` medium and `600` semibold — {@link fontWeights} is that set — but a
 * brand may name any weight its installed family provides, including a
 * variable font's intermediate step. GPUix receives the number on
 * `StyleDesc.fontWeight`.
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

/**
 * Every type role, in the order the token documentation lists them. A
 * documentation site iterates this to build a type table from the package
 * without an unsafe cast, the way `colorRoles` indexes the colour roles.
 *
 * @example
 * ```ts
 * import { textRoles, typography } from "@gpuixui/tokens";
 *
 * const rows = textRoles.map((role) => ({ role, ...typography[role] }));
 * ```
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
] as const;

/** A typographic role name, excluding the font family fields. */
export type TextRole = (typeof textRoles)[number];

/**
 * The prose size ladder, largest first. `bodyStrong` is a weight variant of
 * `body` rather than a step, so it is on neither ladder. The numeric contract
 * and the type-scale test both read this order, so the shipped scale and the
 * edited-theme check cannot list different ladders.
 *
 * @example
 * ```ts
 * import { proseLadder, typography } from "@gpuixui/tokens";
 *
 * const rows = proseLadder.map((role) => [role, typography[role].fontSize]);
 * ```
 */
export const proseLadder = [
  "display",
  "h1",
  "h2",
  "h3",
  "body",
  "label",
  "caption",
] as const satisfies ReadonlyArray<TextRole>;

/** The code size ladder, largest first: `code`, then `codeBlock`. */
export const codeLadder = [
  "code",
  "codeBlock",
] as const satisfies ReadonlyArray<TextRole>;

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

/**
 * The font weights the shipped type scale uses, ascending. This is the set to
 * load for the shipped scale; it is not a restriction — {@link FontWeight}
 * accepts any CSS weight in `1…1000`, and a brand's own role may name another.
 * Derived from the roles rather than a second literal, like `shippedThemes`.
 */
export const fontWeights: ReadonlyArray<FontWeight> = [
  ...new Set(textRoles.map((role) => typography[role].fontWeight)),
].toSorted((left, right) => left - right);
