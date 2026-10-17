import { systemMonoFamily, systemUiFont } from "./platforms.js";

/** Available font weights. GPUIX accepts numeric weights on `StyleDesc`. */
export type FontWeight = 400 | 500 | 600 | 700;

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
