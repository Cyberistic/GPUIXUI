import { brandText, brandTextOn, type Theme } from "./index.js";
import { extendTheme, lightTheme } from "./theme.js";

export const linkStyles = (theme: Theme) => ({
  resting: { color: brandText(theme) },
  hover: { color: brandText(theme), backgroundColor: theme.colors.hover },
  pressed: { color: brandText(theme), backgroundColor: theme.colors.active },
  row: { color: brandText(theme), backgroundColor: theme.colors.selected },
});

export const paleBrand = extendTheme(lightTheme, {
  colors: { primary: "#C9B8FF" },
});

export const messageLinkStyles = (theme: Theme) => ({
  color: brandTextOn(theme, "infoSoft"),
  backgroundColor: theme.colors.infoSoft,
});
