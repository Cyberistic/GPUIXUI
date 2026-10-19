import { extendTheme, getTheme, nativeTextTheme } from "./index.js";

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
