import type { ThemeColors } from "./color.js";
import type { Theme } from "./theme.js";

/**
 * The syntax capture classes the native `<code>`, `<diff>` and `<markdown>`
 * elements colour. The names are the runtime's `SyntaxTheme` fields
 * (`@gpuix/native@0.10.0`, `dist/host.d.ts`), so the object is passed straight
 * to the `theme` prop.
 */
export interface NativeSyntaxTheme {
  /** Line and block comments. */
  readonly comment: string;
  /** Keywords and control flow. */
  readonly keyword: string;
  /** String literals. */
  readonly string: string;
  /** Interpolated or otherwise special strings. */
  readonly stringSpecial: string;
  /** Escape sequences. */
  readonly escape: string;
  /** Numeric literals. */
  readonly number: string;
  /** Boolean literals. */
  readonly boolean: string;
  /** A declared type name. */
  readonly typeName: string;
  /** A built-in type. */
  readonly typeBuiltin: string;
  /** A constructor or class reference. */
  readonly constructor: string;
  /** A function name. */
  readonly function: string;
  /** A built-in function. */
  readonly functionBuiltin: string;
  /** A macro name. */
  readonly macroName: string;
  /** A property or field access. */
  readonly property: string;
  /** A constant. */
  readonly constant: string;
  /** A variable. */
  readonly variable: string;
  /** A variable with a language-specific sigil. */
  readonly variableSpecial: string;
  /** A function parameter. */
  readonly parameter: string;
  /** An operator. */
  readonly operator: string;
  /** Punctuation and embedded content. */
  readonly punctuation: string;
  /** A markup tag. */
  readonly tag: string;
  /** A markup attribute. */
  readonly attribute: string;
  /** A label. */
  readonly label: string;
  /** Invalid or error content. */
  readonly invalid: string;
}

/**
 * The native text layout metrics this package derives from the theme's type,
 * spacing and radius scales. The runtime's remaining fields — the code gutter's
 * floor, the diff accent bar and its hardcoded per-digit estimate, and the
 * table's max-content share — have no token source and keep the runtime's
 * defaults; see `docs/tokens.md`.
 */
export interface NativeTextMetrics {
  /** Code block text size; the `codeBlock` role. */
  readonly codeTextSize: number;
  /** Code block line height; the `codeBlock` role. */
  readonly codeLineHeight: number;
  /**
   * Width of one line-number digit; `codeBlock.fontSize` at the runtime's own
   * 7px-per-digit proportion for 12.5px type, so a larger code role widens the
   * gutter instead of overlapping its digits.
   */
  readonly codeGutterDigitWidth: number;
  /** Right padding of the code gutter; `spacing.lg`. */
  readonly codeGutterPaddingRight: number;
  /** Diff text size; the `codeBlock` role. */
  readonly diffTextSize: number;
  /** Diff line height; the `codeBlock` role. */
  readonly diffLineHeight: number;
  /** Diff file header height; a `label` line plus two `spacing.md` insets. */
  readonly diffFileHeaderHeight: number;
  /** Diff hunk header height; a `caption` line plus two `spacing.xs` insets. */
  readonly diffHunkHeaderHeight: number;
  /** Diff notice height; a `caption` line plus two hairline insets. */
  readonly diffNoticeHeight: number;
  /** Padding below the diff body; `spacing.md`. */
  readonly diffBodyBottomPad: number;
  /**
   * Minimum width of one line-number gutter column; `codeBlock.fontSize` at the
   * runtime's own 36px-at-12px proportion. The runtime still computes its
   * per-digit advance from a constant, so this is a floor, not the whole width.
   */
  readonly diffGutterWidth: number;
  /** Width of the `+`/`−` column; `spacing["2xl"]`. */
  readonly diffMarkerWidth: number;
  /** Horizontal padding of a diff row; `spacing.xl`. */
  readonly diffRowPaddingX: number;
  /** Markdown body size; the `body` role. */
  readonly mdTextSize: number;
  /** Markdown body leading; the `body` role. */
  readonly mdLineHeight: number;
  /** Gap between markdown blocks; `spacing.lg`. */
  readonly mdBlockGap: number;
  /** Markdown heading sizes, `[h1, h2, h3, h4to6]`; the last is `body`. */
  readonly mdHeadingSizes: ReadonlyArray<number>;
  /** Markdown heading leadings, in the same order as `mdHeadingSizes`. */
  readonly mdHeadingLineHeights: ReadonlyArray<number>;
  /** Markdown table cell padding; `spacing.lg`. */
  readonly mdTableCellPadding: number;
  /**
   * Width below which a markdown table column stops shrinking;
   * `body.fontSize` at the runtime's 96px-at-14px proportion.
   */
  readonly mdTableMinColumnWidth: number;
  /**
   * Floor for a markdown column's max-content share; `body.fontSize` at the
   * runtime's 48px-at-14px proportion.
   */
  readonly mdTableMinColumnContent: number;
  /** Inline-code corner radius; `radius.sm`. */
  readonly mdInlineCodeRadius: number;
  /** Fenced code block horizontal padding; `spacing.lg`. */
  readonly mdCodePaddingX: number;
  /** Fenced code block vertical padding; `spacing.md`. */
  readonly mdCodePaddingY: number;
  /** Fenced code block corner radius; `radius.lg`. */
  readonly mdCodeRadius: number;
  /** Fenced code block language header vertical padding; `spacing.xs`. */
  readonly mdCodeHeaderPaddingY: number;
  /** Fenced code block language header size; the `caption` role. */
  readonly mdCodeHeaderTextSize: number;
}

/**
 * The `theme` prop for a native `<code>`, `<diff>` or `<markdown>`.
 *
 * The pinned runtime layers these fields on a built-in dark theme, or on its
 * light base when `appearance` is `"light"` — which is why the field is not
 * optional here. A light theme without it paints code and markdown dark.
 */
export interface NativeTextTheme {
  /** The runtime's base to layer on: the theme's mode. */
  readonly appearance: "dark" | "light";
  /** Content plane behind code and diff bodies; `card` by default. */
  readonly bg: string;
  /** Hairline border and code-card edge; `border`. */
  readonly border: string;
  /** Body text; `foreground`. */
  readonly text: string;
  /** Secondary labels; `mutedForeground`. */
  readonly textMuted: string;
  /** Gutter numbers and hints; `placeholder`. */
  readonly textFaint: string;
  /** Diff file paths; `mutedForeground`. */
  readonly textDim: string;
  /** Accent marks and links; `primaryText`, the accent's ink. The runtime also
   * seeds its default find-highlight wash from this field, where the ink is not
   * readable; pass `nativeHighlight(theme)` for a find bar. */
  readonly accent: string;
  /** The editor caret; `primaryText`. */
  readonly caret: string;
  /** Inline-code text; `primaryText`. */
  readonly codeText: string;
  /** Inline-code wash; `accent`. */
  readonly codeWash: string;
  /** Added diff lines; `successText`. */
  readonly diffAdd: string;
  /** Removed diff lines; `destructiveText`. */
  readonly diffDel: string;
  /** Hunk header wash; `hover`. */
  readonly diffHunkBg: string;
  /** UI family; `typography.sans`. */
  readonly fontSans: string;
  /** Mono family; `typography.mono`. */
  readonly fontMono: string;
  /** The syntax capture palette. */
  readonly syntax: NativeSyntaxTheme;
  /** The layout numbers the theme's scales own. */
  readonly metrics: NativeTextMetrics;
}

/**
 * The four `Surface` tones a native text document may paint on. `bg` is `card`
 * by default; a document painted directly on the canvas overrides it with
 * `background`, and a document in a command palette or sidebar uses `popover`
 * or `muted`. The syntax pairs and the suite's runtime ink-wash guard measure
 * the same list.
 */
export const nativeTextSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
] as const satisfies ReadonlyArray<keyof ThemeColors>;

/**
 * The semantic role each native text colour paints. A capture class is a use of
 * a role, not a new role: the palette stays inside the measured semantic set,
 * so a copied theme retints code, diffs and markdown with every other surface.
 */
export const nativeTextRoles = {
  bg: "card",
  border: "border",
  text: "foreground",
  textMuted: "mutedForeground",
  textFaint: "placeholder",
  textDim: "mutedForeground",
  accent: "primaryText",
  caret: "primaryText",
  codeText: "primaryText",
  codeWash: "accent",
  diffAdd: "successText",
  diffDel: "destructiveText",
  diffHunkBg: "hover",
} as const satisfies Readonly<
  Record<
    Exclude<
      keyof NativeTextTheme,
      "appearance" | "fontSans" | "fontMono" | "syntax" | "metrics"
    >,
    keyof ThemeColors
  >
>;

/**
 * The role each syntax capture paints. Every entry is a **text** role measured
 * on the code surface: a solid status fill here would be a fill used as a
 * glyph, the defect plan 057 fixed for status labels.
 */
export const nativeSyntaxRoles = {
  comment: "mutedForeground",
  keyword: "primaryText",
  string: "successText",
  stringSpecial: "warningText",
  escape: "warningText",
  number: "warningText",
  boolean: "warningText",
  typeName: "infoText",
  typeBuiltin: "infoText",
  constructor: "infoText",
  function: "primaryText",
  functionBuiltin: "primaryText",
  macroName: "destructiveText",
  property: "foreground",
  constant: "warningText",
  variable: "foreground",
  variableSpecial: "warningText",
  parameter: "foreground",
  operator: "mutedForeground",
  punctuation: "mutedForeground",
  tag: "destructiveText",
  attribute: "warningText",
  label: "primaryText",
  invalid: "destructiveText",
} as const satisfies Readonly<
  Record<keyof NativeSyntaxTheme, keyof ThemeColors>
>;

const syntaxOf = (theme: Theme): NativeSyntaxTheme => {
  const role = (capture: keyof NativeSyntaxTheme): string =>
    theme.colors[nativeSyntaxRoles[capture]];
  return {
    comment: role("comment"),
    keyword: role("keyword"),
    string: role("string"),
    stringSpecial: role("stringSpecial"),
    escape: role("escape"),
    number: role("number"),
    boolean: role("boolean"),
    typeName: role("typeName"),
    typeBuiltin: role("typeBuiltin"),
    constructor: role("constructor"),
    function: role("function"),
    functionBuiltin: role("functionBuiltin"),
    macroName: role("macroName"),
    property: role("property"),
    constant: role("constant"),
    variable: role("variable"),
    variableSpecial: role("variableSpecial"),
    parameter: role("parameter"),
    operator: role("operator"),
    punctuation: role("punctuation"),
    tag: role("tag"),
    attribute: role("attribute"),
    label: role("label"),
    invalid: role("invalid"),
  };
};

/**
 * Scale a runtime default that was tuned to `base` pixels to a theme's own role
 * size. Rounding up keeps a gutter wide enough for the glyph; the multiply is
 * before the divide so an exact proportion (14 × 96 / 14) stays exact.
 */
const scaledMetric = (size: number, shippedAt: number, base: number): number =>
  Math.ceil((size * shippedAt) / base);

const metricsOf = (theme: Theme): NativeTextMetrics => {
  const { body, caption, codeBlock, h1, h2, h3, label } = theme.typography;
  return {
    codeTextSize: codeBlock.fontSize,
    codeLineHeight: codeBlock.lineHeight,
    codeGutterDigitWidth: scaledMetric(codeBlock.fontSize, 7, 12.5),
    codeGutterPaddingRight: theme.spacing.lg,
    diffTextSize: codeBlock.fontSize,
    diffLineHeight: codeBlock.lineHeight,
    diffFileHeaderHeight: label.lineHeight + 2 * theme.spacing.md,
    diffHunkHeaderHeight: caption.lineHeight + 2 * theme.spacing.xs,
    diffNoticeHeight: caption.lineHeight + 2 * theme.spacing["2xs"],
    diffBodyBottomPad: theme.spacing.md,
    diffGutterWidth: scaledMetric(codeBlock.fontSize, 36, 12),
    diffMarkerWidth: theme.spacing["2xl"],
    diffRowPaddingX: theme.spacing.xl,
    mdTextSize: body.fontSize,
    mdLineHeight: body.lineHeight,
    mdBlockGap: theme.spacing.lg,
    mdHeadingSizes: [h1, h2, h3, body].map((role) => role.fontSize),
    mdHeadingLineHeights: [h1, h2, h3, body].map((role) => role.lineHeight),
    mdTableCellPadding: theme.spacing.lg,
    mdTableMinColumnWidth: scaledMetric(body.fontSize, 96, 14),
    mdTableMinColumnContent: scaledMetric(body.fontSize, 48, 14),
    mdInlineCodeRadius: theme.radius.sm,
    mdCodePaddingX: theme.spacing.lg,
    mdCodePaddingY: theme.spacing.md,
    mdCodeRadius: theme.radius.lg,
    mdCodeHeaderPaddingY: theme.spacing.xs,
    mdCodeHeaderTextSize: caption.fontSize,
  };
};

/**
 * The `theme` prop for a native `<code>`, `<diff>` or `<markdown>`.
 *
 * The runtime's defaults are a dark Comet theme; a light app that omits this
 * prop paints every native text document dark. Each colour is a semantic role,
 * each syntax capture is a text role (never a solid fill), and the layout comes
 * from the type, spacing and radius scales, so a copied platform style or brand
 * theme reaches code, diffs and markdown without component source changing.
 *
 * `bg` is the raised `card` surface a code block, diff or document is painted
 * on. A document painted directly on the canvas overrides it:
 * `{ ...nativeTextTheme(theme), bg: theme.colors.background }`. The four tones
 * {@link nativeTextSurfaces} names are the whole set a document may paint on:
 * the opaque syntax palette is held to the body floor on every one
 * (`nativeSyntaxPairs`), and the suite holds the same palette through the
 * runtime's fixed 3.5% code-block ink wash on every one too. `foreground` is
 * omitted from the syntax pairs because the body pairs already hold it on all
 * four.
 *
 * A find bar does not read the `accent` field. The runtime seeds its default
 * `highlight` wash from that accent at 30% and 65%, and the ink is not readable
 * as a wash: identity dark measures 6.80:1 for body text at 30% and 2.81:1 at
 * 65%. Pass `nativeHighlight` instead.
 *
 * The runtime fades some of these values at fixed fractions (a diff line at
 * 92%, a marker at 90%, the accent bar at 55%, the row wash at 5.5%, a list
 * marker at 85%, the quote rail at 60% and its wash at 5%, and the code block's
 * ink wash at 3.5%). Those compositions are held by
 * `themeContrastFailures`; a role chosen for its opaque floor still has to
 * clear the faded one.
 *
 * @example
 * ```tsx
 * import { nativeTextTheme } from "@gpuixui/tokens";
 *
 * <markdown source={text} theme={nativeTextTheme(theme)} />;
 * ```
 */
export function nativeTextTheme(theme: Theme): NativeTextTheme {
  return {
    appearance: theme.mode,
    bg: theme.colors[nativeTextRoles.bg],
    border: theme.colors[nativeTextRoles.border],
    text: theme.colors[nativeTextRoles.text],
    textMuted: theme.colors[nativeTextRoles.textMuted],
    textFaint: theme.colors[nativeTextRoles.textFaint],
    textDim: theme.colors[nativeTextRoles.textDim],
    accent: theme.colors[nativeTextRoles.accent],
    caret: theme.colors[nativeTextRoles.caret],
    codeText: theme.colors[nativeTextRoles.codeText],
    codeWash: theme.colors[nativeTextRoles.codeWash],
    diffAdd: theme.colors[nativeTextRoles.diffAdd],
    diffDel: theme.colors[nativeTextRoles.diffDel],
    diffHunkBg: theme.colors[nativeTextRoles.diffHunkBg],
    fontSans: theme.typography.sans,
    fontMono: theme.typography.mono,
    syntax: syntaxOf(theme),
    metrics: metricsOf(theme),
  };
}
