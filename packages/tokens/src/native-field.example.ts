import { getTheme, nativeFieldTheme, type Theme } from "./index.js";

/**
 * A native search field: typed text takes the field colour and the caret the
 * accent's readable ink. GPUix 0.10.0 reads no other paint from the `theme`
 * prop.
 */
export const searchField = (theme: Theme) => ({
  style: { color: theme.colors.inputForeground },
  theme: nativeFieldTheme(theme),
});

/** The same field on the dark identity, for a quick preview. */
export const darkSearchField = searchField(getTheme("dark"));
