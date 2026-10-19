import {
  extendTheme,
  getTheme,
  nativeTextTheme,
  type NativeTextTheme,
} from "./index.js";

const theme = getTheme("dark");

/** A markdown or code document on a raised `card` surface. */
export const markdownDocument = { theme: nativeTextTheme(theme) };

/** The same document painted directly on the canvas: only `bg` moves. */
export const canvasDocument = {
  theme: { ...nativeTextTheme(theme), bg: theme.colors.background },
};

/** A diff viewer uses the same prop; every field follows the theme. */
export const diffViewer = { theme: nativeTextTheme(theme) };

/**
 * A brand with a larger code role. The runtime's fixed gutter proportions are
 * resolved against the theme's own `codeBlock` size, so the line-number gutter
 * widens with the type instead of overlapping it.
 */
export const largeCodeTheme = {
  theme: nativeTextTheme(
    extendTheme(theme, {
      typography: {
        code: { fontSize: 26, lineHeight: 36 },
        codeBlock: { fontSize: 24, lineHeight: 34 },
      },
    }),
  ),
};

const shippedDocument = nativeTextTheme(theme);

/**
 * A brand that owns the runtime's two token-less chrome metrics. Both are
 * optional members of `NativeTextMetrics`; the bridge leaves them unset so the
 * runtime's 28px gutter floor and 3px diff bar apply, and a brand sets either on
 * the returned object without a cast.
 */
export const customChromeTheme: { readonly theme: NativeTextTheme } = {
  theme: {
    ...shippedDocument,
    metrics: {
      ...shippedDocument.metrics,
      codeGutterMinWidth: 36,
      diffAccentBarWidth: 2,
    },
  },
};
