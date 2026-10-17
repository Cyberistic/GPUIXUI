import { createContext, useContext, type ReactNode } from "react";
import { lightTheme, type Theme } from "./theme.js";

const ThemeContext = createContext<Theme>(lightTheme);

/** Props for {@link ThemeProvider}. */
export interface ThemeProviderProps {
  /** The resolved theme for this subtree. */
  readonly theme: Theme;
  /** The subtree that reads the theme. */
  readonly children?: ReactNode;
}

/**
 * Supply a theme to descendant hooks. Nested providers scope a brand theme to
 * a subtree. Without a provider, {@link useTheme} returns the light theme.
 *
 * There is no OS appearance detection: GPUix exposes no appearance query, so
 * the application owns the mode switch and passes the resolved theme.
 */
export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

/** Read the nearest theme, or the light theme when no provider exists. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
