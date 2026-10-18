import { selectionStyle, type Theme } from "./index.js";

/** The application root: native text selection wears the theme's wash. */
export const appRootStyle = (theme: Theme) => selectionStyle(theme);

/** Chrome that must not be selectable: toolbars, tab strips, window controls. */
export const chromeStyle = { userSelect: "none" as const };

/**
 * Content on a filled action: a user-authored chat bubble. The bubble paints the
 * brand fill, so its selectable text takes the inverse veil.
 */
export const filledContentStyle = (theme: Theme) => ({
  ...selectionStyle(theme, "fill"),
  backgroundColor: theme.colors.primary,
  color: theme.colors.primaryForeground,
});

/**
 * A filled control's chrome: the label is not selectable. Its fill steps to
 * `xHover`/`xActive` under the pointer, where one neutral veil cannot hold the
 * label at every contrast level; selectable content keeps its resting fill
 * (`filledContentStyle`).
 */
export const filledActionChrome = (theme: Theme) => ({
  ...selectionStyle(theme, "fill"),
  ...chromeStyle,
});
