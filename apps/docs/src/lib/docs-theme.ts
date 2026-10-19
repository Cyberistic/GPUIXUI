import {
  darkTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  type ThemeColors,
} from "@gpuixui/tokens";

/**
 * Fumadocs reads these variables; each is pinned to a library semantic role.
 * `app.css` writes the same mapping, and `styles/theme.test.ts` proves the two
 * agree in both modes so the docs identity cannot drift from the library.
 */
export const DOCS_COLOR_ROLES = {
  "--color-fd-background": "background",
  "--color-fd-foreground": "foreground",
  "--color-fd-muted": "muted",
  "--color-fd-muted-foreground": "mutedForeground",
  "--color-fd-popover": "popover",
  "--color-fd-popover-foreground": "popoverForeground",
  "--color-fd-card": "card",
  "--color-fd-card-foreground": "cardForeground",
  "--color-fd-border": "border",
  "--color-fd-primary": "primary",
  "--color-fd-primary-foreground": "primaryForeground",
  "--color-fd-secondary": "secondary",
  "--color-fd-secondary-foreground": "secondaryForeground",
  "--color-fd-accent": "accent",
  "--color-fd-accent-foreground": "accentForeground",
  "--color-fd-ring": "ring",
  "--color-fd-overlay": "overlay",
} as const satisfies Record<`--color-fd-${string}`, keyof ThemeColors>;

/** The two library themes' colour roles, as the docs tables and tests read them. */
export const themeColors = {
  light: lightTheme.colors,
  dark: darkTheme.colors,
} as const;

/**
 * The two high-contrast palettes, read from the same package entry. They are a
 * separate map rather than a third mode: contrast is its own axis (plan 514).
 */
export const highContrastColors = {
  light: highContrastLightTheme.colors,
  dark: highContrastDarkTheme.colors,
} as const satisfies Record<"light" | "dark", ThemeColors>;
