import { selectionStyle, type Theme } from "./index.js";

/** The application root: native text selection wears the theme's wash. */
export const appRootStyle = (theme: Theme) => selectionStyle(theme);

/** Chrome that must not be selectable: toolbars, tab strips, window controls. */
export const chromeStyle = { userSelect: "none" as const };
