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
 */

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
  /** Placeholder and other faint text, measured on {@link bg}. */
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
  };
}
