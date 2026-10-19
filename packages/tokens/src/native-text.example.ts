import { getTheme, nativeTextTheme } from "./index.js";

const theme = getTheme("dark");

/** A markdown or code document on a raised `card` surface. */
export const markdownDocument = { theme: nativeTextTheme(theme) };

/** The same document painted directly on the canvas: only `bg` moves. */
export const canvasDocument = {
  theme: { ...nativeTextTheme(theme), bg: theme.colors.background },
};

/** A diff viewer uses the same prop; every field follows the theme. */
export const diffViewer = { theme: nativeTextTheme(theme) };
