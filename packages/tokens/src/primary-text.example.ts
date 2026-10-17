import { textStyle, type Theme } from "./index.js";

/**
 * Brand-toned text and icons on the surfaces they are painted on. `primary` is
 * a fill — it carries `primaryForeground` — so a link, label or icon reads
 * `primaryText` instead: the role stays readable on the canvas and on the
 * `hover` / `active` washes the Link variant paints behind its own label.
 */
export const primaryTextStyles = (theme: Theme) => ({
  link: { ...textStyle(theme, "label"), color: theme.colors.primaryText },
  hovered: {
    backgroundColor: theme.colors.hover,
    color: theme.colors.primaryText,
  },
  pressed: {
    backgroundColor: theme.colors.active,
    color: theme.colors.primaryText,
  },
  icon: {
    width: theme.iconSize.md,
    height: theme.iconSize.md,
    color: theme.colors.primaryText,
  },
});
