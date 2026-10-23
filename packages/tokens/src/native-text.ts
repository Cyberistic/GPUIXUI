/**
 * The theme a GPUix native text host takes.
 *
 * `<input>`, `<textarea>` and `<code>` are drawn by the runtime's text engine
 * rather than by the style system, so the palette reaches them through a
 * `theme` prop instead of the properties `styles.ts` resolves. A host given no
 * theme layers its fields on GPUix's **built-in dark theme** (pinned
 * `@gpuix/native@0.11.0` typings, `GpuixTheme`: "layers on top of the built-in
 * dark theme (or light, via `appearance`)"), so a field in a light theme would
 * paint a placeholder and a caret chosen for a dark surface while its own fill,
 * value and selection wash come from this package. That is the gap this seam
 * closes: one call turns a `Theme` into the object the host takes.
 *
 * The roles are the ones the contrast table measures for a field: the value's
 * role is `inputForeground` on the fill, the placeholder is `placeholder` on the
 * fill at the secondary floor, and the caret is the `primary` mark on the fill at
 * the non-text floor. `nativeTextFills` names the fills the library's fields
 * paint — a plain field paints `input`, while a composite field (search, tag
 * and mention fields, the chat composer, the inline edit, the colour picker's
 * hex field) paints the page role, so the host has to be told which one its
 * values and placeholder sit on.
 *
 * Only a `<code>`, `<diff>` and `<markdown>` host paints its ink from this
 * object: at the pinned release an `<input>`/`<textarea>` paints its value from
 * the element's own `style.color` (`custom_elements/input.rs`), so `text` never
 * reaches a field and a host handed only this object paints the platform
 * default — near-black on a dark fill. Pass the role as a property too
 * ({@link nativeTextTheme} carries the example); the playground's `field-ink`
 * probe measured the difference off a captured frame.
 *
 * The palette is not the only thing a host takes from this object: a `<code>`
 * host sizes its block from the runtime theme's `metrics`, so the type scale's
 * block role (`typography.codeBlock`) reaches it the same way. The runtime's
 * own code metrics are 12.5/18 (`packages/native/src/theme.rs`'s `Metrics`),
 * which is not this library's scale. The same object carries the **spacing**
 * scale: every inset and gap a document host paints is a step, so a fence's
 * padding, a table cell's, a diff row's and the gap between two blocks move with
 * a brand's `spacing` instead of staying at the runtime's own Comet numbers.
 *
 * A `<markdown>` host is the document host: its body and headings take the
 * scale's own roles, its inline code is the page ink on a `muted` chip
 * (`codeText`/`codeWash` — the runtime's violet is a second syntax palette this
 * package does not own), its table rules take `border`, and its ordered list
 * numbers, bullet discs and block-quote rail are the accent at fixed shares of
 * it — so the seam derives that accent for the composite rather than handing
 * over the fill role ({@link nativeAccent}).
 *
 * A fenced code block inside that document is a surface of its own: the host
 * lays {@link nativeFenceInk} of a neutral ink over the fill it was handed and
 * another {@link nativeFenceHeaderInk} under the language strip, so the syntax
 * palette is read on that composite and not only on the page
 * ({@link nativeFenceFill}). The strip's fill is three points from the block it
 * labels — under the perceptibility floor — and the rule the runtime draws under
 * it is what carries the boundary; the label itself is measured on the strip.
 *
 * A `<diff>` host paints three more roles, and the runtime derives a row's wash
 * from one of them: an added line's ink is `diffAdd` with the row tinted
 * {@link nativeDiffWash} of that same colour over the fill, a removed line's is
 * `diffDel`, a hunk header sits on `diffHunkBg` and its file path is `textDim`.
 * Without them a diff in a light theme paints the runtime's built-in green and
 * red — designed for its own dark palette — and no theme role reaches it.
 *
 * One role the runtime does **not** read: an empty `<input>`/`<textarea>` shapes
 * its placeholder with a fixed `#8F8F8F` (`custom_elements/input.rs` at the
 * pinned release), so `textFaint` reaches a `<code>`'s gutter numbers and a
 * `<diff>`'s meta rows but never a field's placeholder. The `placeholder` role
 * is still the faint role this package paints itself (a number field's
 * unavailable steppers) and the one the contrast table holds on both fills; a
 * component that needs a themed placeholder in its field has to paint the text
 * instead of handing the host one.
 */

import { blend } from "./color.js";
import { opaqueRgb } from "./measure.js";
import {
  contrastFloorsFor,
  contrastRatio,
  type ContrastFloors,
} from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import { statusTone } from "./styles.js";
import { syntaxColors, type SyntaxColors } from "./syntax.js";
import type { Theme, ThemeMode } from "./theme.js";

/**
 * The fills a field paints, which decide the surface the host's value,
 * placeholder and caret are measured on. `input` is a plain field's fill;
 * `background` is the page role a composite field paints as its own fill.
 */
export const nativeTextFills = ["input", "background"] as const;

/** One fill a field paints. */
export type NativeTextFill = (typeof nativeTextFills)[number];

/**
 * The share of a diff line's own ink the runtime lays under it as that row's
 * wash: a `<diff>` row tints itself `0.055` of `diffAdd` or `diffDel` over the
 * fill (`packages/native/src/custom_elements/diff.rs` at the pinned
 * `@gpuix/native@0.11.0`), so the two jobs share one value. The contract
 * therefore measures the ink twice — on the fill and on the wash it derives —
 * and measures the wash itself against the fill, because a row a reader cannot
 * find is not a changed line.
 */
export const nativeDiffWash = 0.055;

/**
 * The share of a neutral ink a `<markdown>` host lays under a fenced code block:
 * the runtime paints the fence `0.035` of black (on a light fill) or white (on a
 * dark one) over the document's own fill (`packages/native/src/markdown/render.rs`
 * at the pinned `@gpuix/native@0.11.0`), so the block has a surface of its own
 * rather than borrowing the page. The ink is neutral and derived from the host's
 * `bg` lightness, not from a role: no token carries it, so the fence fill is a
 * composite this seam measures rather than a value a theme names
 * ({@link nativeFenceFill}).
 */
export const nativeFenceInk = 0.035;

/**
 * The share of the same neutral ink the fence's **language strip** lays over the
 * fence body, which the runtime paints as a second wash (`0.02`) under the strip
 * and above the block's own fill.
 *
 * The two washes are three points apart, so the strip's own fill is under the
 * 1.05:1 perceptibility floor over the fence in every light style (the tightest
 * is the Windows XP look's 1.041:1). The strip is carried by its **rule** — the
 * runtime draws a `border` under the strip and around the block — the way a
 * field's resting edge carries it (§7 of the design system), so the fill is
 * recorded as measured rather than treated as a boundary.
 */
export const nativeFenceHeaderInk = 0.02;

/** The neutral ink a document's fence lays down for a fill of this lightness. */
const fenceInk = (fill: string): string | undefined => {
  const rgb = opaqueRgb(fill);
  if (rgb === undefined) {
    return undefined;
  }
  const channel = (at: number): number =>
    Number.parseInt(rgb.slice(at, at + 2), 16);
  // The runtime picks the ink from the host's `bg` in HSL (`bg.l < 0.5`, read
  // from the theme object's `bg` field, which this seam sets to the fill). HSL
  // lightness is the mean of the widest and narrowest channel, so a saturated
  // fill is not mistaken for a dark one.
  const widest = Math.max(channel(1), channel(3), channel(5));
  const narrowest = Math.min(channel(1), channel(3), channel(5));
  return (widest + narrowest) / 2 / 255 < 0.5 ? "#FFFFFF" : "#000000";
};

/**
 * The fill a `<markdown>` host paints under a fenced code block.
 *
 * The host lays {@link nativeFenceInk} of a neutral ink over the fill it was
 * handed, so the tokens inside a fence are read on a surface this package does
 * not name: a dark style's page is lifted, and a token that cleared the page can
 * miss its floor there. Pass the same role the host was handed
 * (`theme.colors[fill]`, for a `fill` in {@link nativeTextFills}).
 *
 * A value the contract cannot measure — a perceptual colour — resolves to
 * `undefined` rather than to a guessed ink, the rule the other derived colours
 * follow.
 *
 * @example
 * ```ts
 * import { nativeFenceFill, nativeTextTheme, syntaxColors, themes } from "@gpuixui/tokens";
 *
 * const host = nativeTextTheme(themes.dark, "background");
 * // The fence is the composite a keyword is read on, not the page:
 * const fence = nativeFenceFill(themes.dark.colors.background);
 * ```
 */
export function nativeFenceFill(fill: string): string | undefined {
  const ink = fenceInk(fill);
  return ink === undefined ? undefined : blend(fill, ink, nativeFenceInk);
}

/**
 * The fill the fence's **language strip** paints: {@link nativeFenceHeaderInk}
 * of the same neutral ink over {@link nativeFenceFill}.
 *
 * A strip that differs from its block by three points is not a boundary, and the
 * runtime does not ask it to be one — the rule under the strip and around the
 * block is. This is the surface the language label is read on, so the label's
 * floor is measured here.
 */
export function nativeFenceHeaderFill(fill: string): string | undefined {
  const body = nativeFenceFill(fill);
  const ink = fenceInk(fill);
  return body === undefined || ink === undefined
    ? undefined
    : blend(body, ink, nativeFenceHeaderInk);
}

/**
 * The layout numbers a native text host takes from the theme.
 *
 * A host lays its rows out from the runtime theme's metrics rather than from
 * `StyleDesc`, so the type scale reaches it through here — the code block, a
 * diff's rows and a rendered document's body and headings — and so does the
 * spacing scale, through every inset and gap a document host paints: a fence's
 * padding, a table cell's, a diff row's, the gutter's gap and the gap between
 * two blocks. The runtime's own numbers are Comet's (`theme.rs`'s `Metrics`),
 * and one of them is not a step in this scale at all, so without the seam a
 * brand that retunes `spacing` grew the component tree and left a rendered
 * document at another design system's rhythm.
 *
 * What stays the runtime's is what a spacing step cannot describe: the columns
 * a line number, marker and accent bar are laid in, the minimum widths a table
 * column may shrink to, and the fixed row heights a diff's virtualizer measures
 * without laying the row out. Those are a row model, not padding.
 */
export interface NativeTextMetrics {
  /** Code type size in pixels, from `typography.codeBlock`. */
  readonly codeTextSize: number;
  /** Code line height in pixels, from `typography.codeBlock`. */
  readonly codeLineHeight: number;
  /** A diff line's type size, from `typography.codeBlock`. */
  readonly diffTextSize: number;
  /** A diff line's leading, from `typography.codeBlock`. */
  readonly diffLineHeight: number;
  /** A rendered document's body size, from `typography.body`. */
  readonly mdTextSize: number;
  /** A rendered document's body leading, from `typography.body`. */
  readonly mdLineHeight: number;
  /** `[h1, h2, h3, h4to6]` sizes, from the scale's heading roles and `body`. */
  readonly mdHeadingSizes: number[];
  /** The same headings' leadings. */
  readonly mdHeadingLineHeights: number[];
  /** A markdown code card's corner, from `radius.lg`. */
  readonly mdCodeRadius: number;
  /**
   * The language strip a fence paints above its code, from `caption`. The
   * runtime's own is `11` (`packages/native/src/theme.rs`'s `Metrics`), a size
   * no role in the scale carries, so a brand's quiet label role stopped at the
   * one label a document paints.
   */
  readonly mdCodeHeaderTextSize: number;
  /** An inline code chip's corner, from `radius.sm`. */
  readonly mdInlineCodeRadius: number;
  /** The gutter's right inset, from `spacing.lg`. */
  readonly codeGutterPaddingRight: number;
  /** A diff row's horizontal inset, from `spacing.xl`. */
  readonly diffRowPaddingX: number;
  /** The pad under a diff's last row, from `spacing.md`. */
  readonly diffBodyBottomPad: number;
  /** The gap between two document blocks, from `spacing.lg`. */
  readonly mdBlockGap: number;
  /** A document table cell's inset on every side, from `spacing.lg`. */
  readonly mdTableCellPadding: number;
  /** A fenced code card's horizontal inset, from `spacing.lg`. */
  readonly mdCodePaddingX: number;
  /** A fenced code card's vertical inset, from `spacing.md`. */
  readonly mdCodePaddingY: number;
  /** The language strip's vertical inset, from `spacing.xs`. */
  readonly mdCodeHeaderPaddingY: number;
}

/**
 * The subset of GPUix's `GpuixTheme` this package fills in. Structurally
 * compatible with the runtime's type, whose fields are all optional.
 */
export interface NativeTextTheme {
  /** The appearance the host's own defaults follow. */
  readonly appearance: ThemeMode;
  /** The fill behind the value, from the field's own fill role. */
  readonly bg: string;
  /**
   * The ink a `<code>`, `<diff>` and `<markdown>` host paints. A field does not
   * read it: an `<input>`/`<textarea>` paints its value from the element's
   * `color`, which a field hands over beside this object (see the example).
   */
  readonly text: string;
  /** Secondary text inside the host, from `mutedForeground`. */
  readonly textMuted: string;
  /**
   * The faint role, measured on {@link bg}. It reaches a `<code>`'s gutter
   * numbers and a `<diff>`'s meta rows; an `<input>`'s placeholder is fixed by
   * the runtime and does not read it (see the module comment).
   */
  readonly textFaint: string;
  /**
   * The accent a document host paints its own marks in, from `primary` and
   * derived for the 85% composite a list number is drawn at ({@link nativeAccent}).
   */
  readonly accent: string;
  /** Caret colour, the `primary` mark on {@link bg}. */
  readonly caret: string;
  /** UI family, from `typography.sans`. */
  readonly fontSans: string;
  /** Monospace family, from `typography.mono`. */
  readonly fontMono: string;
  /** Code block type, from {@link NativeTextMetrics}. */
  readonly metrics: NativeTextMetrics;
  /** The added-line ink and the hue of its row wash, from the `success` tone. */
  readonly diffAdd: string;
  /** The removed-line ink and the hue of its row wash, from `destructive`. */
  readonly diffDel: string;
  /** The hunk header's fill: the `muted` role, the chrome stripe. */
  readonly diffHunkBg: string;
  /** The diff's file-path chrome, from `mutedForeground`. */
  readonly textDim: string;
  /**
   * An inline code run's ink: the page's own `foreground`, so a document's code
   * reads as prose in a chip rather than as a second syntax palette.
   */
  readonly codeText: string;
  /** The chip behind an inline code run, from `muted`. */
  readonly codeWash: string;
  /** Table rules and dividers a rendered document draws, from `border`. */
  readonly border: string;
  /**
   * The token colours a `<code>` host highlights with, from
   * {@link syntaxColors}: the runtime reads them from this field and paints its
   * own dark-default palette when it is absent.
   */
  readonly syntax: SyntaxColors;
}

/**
 * The shares a document host paints its accent at, measured from the runtime's
 * markdown renderer (`packages/native/src/markdown/render.rs` at the pinned
 * `@gpuix/native@0.11.0`): an ordered list's number and an unordered list's disc
 * are `opacity(accent, 0.85)`, a block quote's rail is `0.6`, and the wash behind
 * its copy is `0.05`. The numbers are labels a reader reads, so the marker share
 * is the one the accent has to carry.
 */
export const nativeAccentShares = {
  marker: 0.85,
  rail: 0.6,
  wash: 0.05,
} as const;

/**
 * The fills a rendered document sits on — the page, a card, a floating surface
 * and a `muted` strip — the same content tones the selection and find washes are
 * measured on.
 */
export const nativeAccentSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
] as const;

/** One fill a rendered document sits on. */
export type NativeAccentSurface = (typeof nativeAccentSurfaces)[number];

/**
 * The granularity of the accent's derivation: 2% of the way from the brand to
 * the theme's foreground per step, so a document keeps as much of the brand as
 * the surface allows.
 */
const ACCENT_STEPS = 50;

/**
 * The accent a document host paints its own marks in.
 *
 * The host never paints the accent solid: a list number and a bullet are 85% of
 * it over the document's fill, so the role is read through that composite — and
 * the fill role is not readable there. Measured over the 18 shipped,
 * high-contrast, platform and authored styles, `primary` at the marker share
 * lands under the 4.5:1 label floor in **11 of them** — every light style, plus
 * Dark · macOS (3.97:1) and Dark · Linux (4.10:1) — the tightest being Windows XP
 * (Luna) light's `muted` strip at **3.09:1** (the base theme's page reads
 * 4.00:1), while the same colour as a solid mark clears the 3:1 floor — which is
 * why no existing contract saw it.
 *
 * The answer is the theme's own `primary`, moved toward its `foreground` by the
 * smallest 2% step whose marker composite clears the floor on every fill a
 * document can sit on, and whose rail composite stays visible (1.05:1). A theme
 * whose brand already reads returns it unchanged; one the renderer cannot
 * measure is returned unchanged rather than guessed at, the rule the other
 * derived text colours follow.
 *
 * @example
 * ```ts
 * import { nativeAccent, nativeAccentShares, alpha, type Theme } from "@gpuixui/tokens";
 *
 * const marker = alpha(nativeAccent(theme), nativeAccentShares.marker);
 * ```
 */
export function nativeAccent(
  theme: Theme,
  floors: ContrastFloors = contrastFloorsFor(theme),
): string {
  const carries = (colour: string): boolean =>
    nativeAccentSurfaces.every((surface) => {
      const fill = theme.colors[surface];
      const label = contrastRatio(
        blend(fill, colour, nativeAccentShares.marker),
        fill,
      );
      const rail = contrastRatio(
        blend(fill, colour, nativeAccentShares.rail),
        fill,
      );
      return (
        (label === undefined || label >= floors.secondary) &&
        (rail === undefined || rail >= decorativeFloor)
      );
    });
  return (
    Array.from({ length: ACCENT_STEPS + 1 }, (_, step) =>
      blend(theme.colors.primary, theme.colors.foreground, step / ACCENT_STEPS),
    ).find(carries) ?? theme.colors.foreground
  );
}

/**
 * The theme a native text host takes for one of a field's fills.
 *
 * The object does not paint a field's value on its own: pass the role as the
 * element's `color` beside it, the pair the contrast table measures on the fill.
 *
 * @example
 * ```tsx
 * import { nativeTextTheme } from "@gpuixui/tokens";
 *
 * <input
 *   theme={nativeTextTheme(theme)}
 *   style={{
 *     backgroundColor: theme.colors.input,
 *     color: theme.colors.inputForeground,
 *   }}
 * />
 * // A composite field paints the page role instead, so the host is told which
 * // surface its placeholder is measured on:
 * <input
 *   theme={nativeTextTheme(theme, "background")}
 *   style={{
 *     backgroundColor: theme.colors.background,
 *     color: theme.colors.inputForeground,
 *   }}
 * />
 * ```
 */
export function nativeTextTheme(
  theme: Theme,
  fill: NativeTextFill = "input",
): NativeTextTheme {
  return {
    appearance: theme.mode,
    bg: theme.colors[fill],
    text: theme.colors.inputForeground,
    textMuted: theme.colors.mutedForeground,
    textFaint: theme.colors.placeholder,
    // A document host paints this at 85% behind its list numbers and bullets, so
    // the role is derived for that composite rather than handed over raw.
    accent: nativeAccent(theme),
    caret: theme.colors.primary,
    fontSans: theme.typography.sans,
    fontMono: theme.typography.mono,
    // A `<code>` host sizes its block from the runtime theme, not from a style
    // property, so the scale's block role is handed over here. The runtime's
    // own default is 12.5/18 (`packages/native/src/theme.rs`'s `Metrics`), which
    // is not this library's type scale: without this a brand's `codeBlock` role
    // stops at the code host while every other role reaches it.
    metrics: {
      codeTextSize: theme.typography.codeBlock.fontSize,
      codeLineHeight: theme.typography.codeBlock.lineHeight,
      // A diff is code, so it follows the block role rather than the runtime's
      // own 12/21: a brand that changes its code scale expects both.
      diffTextSize: theme.typography.codeBlock.fontSize,
      diffLineHeight: theme.typography.codeBlock.lineHeight,
      // A rendered document is prose, so its body and headings are the scale's.
      mdTextSize: theme.typography.body.fontSize,
      mdLineHeight: theme.typography.body.lineHeight,
      mdHeadingSizes: [
        theme.typography.h1.fontSize,
        theme.typography.h2.fontSize,
        theme.typography.h3.fontSize,
        theme.typography.body.fontSize,
      ],
      mdHeadingLineHeights: [
        theme.typography.h1.lineHeight,
        theme.typography.h2.lineHeight,
        theme.typography.h3.lineHeight,
        theme.typography.body.lineHeight,
      ],
      mdCodeRadius: theme.radius.lg,
      // A fence's language strip is a quiet label rather than code, so it
      // follows the scale's label role; the runtime's own 11 belongs to no role
      // and would stay put while the rest of a brand's type moved.
      mdCodeHeaderTextSize: theme.typography.caption.fontSize,
      mdInlineCodeRadius: theme.radius.sm,
      // The document host's insets and gaps are padding, so they are the
      // spacing scale's: the runtime's own are Comet's (10 and 5 are not steps
      // here), and a brand that retunes spacing expects a document to follow.
      codeGutterPaddingRight: theme.spacing.lg,
      diffRowPaddingX: theme.spacing.xl,
      diffBodyBottomPad: theme.spacing.md,
      mdBlockGap: theme.spacing.lg,
      mdTableCellPadding: theme.spacing.lg,
      mdCodePaddingX: theme.spacing.lg,
      mdCodePaddingY: theme.spacing.md,
      // A language strip is a tight label strip, so it takes the hairline-
      // adjacent step rather than a card's inset.
      mdCodeHeaderPaddingY: theme.spacing.xs,
    },
    // The tone's readable role, not its solid fill: the ink is painted as text
    // (a file's `+12`, a line's marker and number) and the same value is the
    // wash's hue. A fill role is designed to carry `xForeground`, so it is the
    // wrong role to read — light `warning` measures 1.78:1 on the page.
    diffAdd: statusTone(theme, "success").foreground,
    diffDel: statusTone(theme, "destructive").foreground,
    diffHunkBg: theme.colors.muted,
    textDim: theme.colors.mutedForeground,
    // Inline code is prose in a chip: the runtime's own violet ink and 10% wash
    // are a second syntax palette no token owns, while the page ink on the muted
    // surface is the pair the contrast table already measures at the body floor.
    codeText: theme.colors.foreground,
    codeWash: theme.colors.muted,
    border: theme.colors.border,
    syntax: syntaxColors(theme),
    // The runtime reads a code block's token colours from here and paints its
    // own dark-default palette when the field is absent, so a light theme's
    // block would be highlighted for a dark canvas.
  };
}
