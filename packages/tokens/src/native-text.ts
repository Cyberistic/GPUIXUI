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
 * The roles are the ones the contrast table measures for a field: the value is
 * `inputForeground` on the fill, the placeholder is `placeholder` on the fill
 * at the secondary floor, and the caret is the `primary` mark on the fill at
 * the non-text floor. `nativeTextFills` names the fills the library's fields
 * paint — a plain field paints `input`, while a composite field (search, tag
 * and mention fields, the chat composer, the inline edit, the colour picker's
 * hex field) paints the page role, so the host has to be told which one its
 * values and placeholder sit on.
 *
 * The palette is not the only thing a host takes from this object: a `<code>`
 * host sizes its block from the runtime theme's `metrics`, so the type scale's
 * block role (`typography.codeBlock`) reaches it the same way. The runtime's
 * own code metrics are 12.5/18 (`packages/native/src/theme.rs`'s `Metrics`),
 * which is not this library's scale.
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

import { statusTone } from "./styles.js";
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
 * The layout numbers a native text host takes from the theme.
 *
 * A `<code>` host lays its block out with the runtime theme's code metrics
 * rather than with `StyleDesc`, so the type scale reaches it through here.
 */
export interface NativeTextMetrics {
  /** Code type size in pixels, from `typography.codeBlock`. */
  readonly codeTextSize: number;
  /** Code line height in pixels, from `typography.codeBlock`. */
  readonly codeLineHeight: number;
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
  /** The value the reader typed or the code being shown. */
  readonly text: string;
  /** Secondary text inside the host, from `mutedForeground`. */
  readonly textMuted: string;
  /**
   * The faint role, measured on {@link bg}. It reaches a `<code>`'s gutter
   * numbers and a `<diff>`'s meta rows; an `<input>`'s placeholder is fixed by
   * the runtime and does not read it (see the module comment).
   */
  readonly textFaint: string;
  /** Accent the host paints for its own marks, from `primary`. */
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
}

/**
 * The theme a native text host takes for one of a field's fills.
 *
 * @example
 * ```tsx
 * import { nativeTextTheme } from "@gpuixui/tokens";
 *
 * <input theme={nativeTextTheme(theme)} style={{ backgroundColor: theme.colors.input }} />
 * // A composite field paints the page role instead, so the host is told which
 * // surface its placeholder is measured on:
 * <input theme={nativeTextTheme(theme, "background")} />
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
    accent: theme.colors.primary,
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
    },
    // The tone's readable role, not its solid fill: the ink is painted as text
    // (a file's `+12`, a line's marker and number) and the same value is the
    // wash's hue. A fill role is designed to carry `xForeground`, so it is the
    // wrong role to read — light `warning` measures 1.78:1 on the page.
    diffAdd: statusTone(theme, "success").foreground,
    diffDel: statusTone(theme, "destructive").foreground,
    diffHunkBg: theme.colors.muted,
    textDim: theme.colors.mutedForeground,
  };
}
